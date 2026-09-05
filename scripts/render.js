/**
 * render.js — Canvas animation loop and drawing functions.
 *
 * Handles the main animation frame loop, gear/wheel rendering,
 * timeline visualization, and audio trigger detection based on
 * the rotating master wheel's position.
 *
 * The master wheel completes one full rotation every 4 beats (one "measure"),
 * so the visual speed is: radiansPerSecond = BPM × π/2 / 60.
 */
import { getActivePhraseStep, getActiveWheelStep, getMeshedWheelAngle } from './math.js';
import { updateVoiceStepsForCycle } from './lanes.js';

/** Cache for pre-rendered gear body Path2D objects, keyed by tooth count + radii. */
const _gearBodyCache = {};

/** Pre-allocated scratch buffers for A/B dot masks, grown on demand. */
let _scratchA = new Uint8Array(0);
let _scratchB = new Uint8Array(0);

// ── Static layer + sprite caching ───────────────────────────────────────
// Per-frame canvas work is dominated by redrawing content that only changes
// when meters, voice patterns, or the visible master cycle change. Gears are
// pre-rendered to rotating sprites and the timelines to offscreen layers, so
// a frame is a handful of drawImage blits plus the moving playhead and flash
// dots instead of hundreds of path fills.

/** Pre-rendered gear sprites, keyed by teeth/radii/color + content signature. */
const _gearSpriteCache = new Map();
const GEAR_SPRITE_CACHE_MAX = 24;

/** Checksums of every lane's selection so layer/sprite caches invalidate on edits. */
function computePatternChecksum(lanes) {
    let h = 0;
    const addLane = (voices, mult) => {
        voices.forEach((voice, vi) => {
            for (let i = 0; i < voice.selected.length; i++) {
                if (voice.selected[i]) h = (h + (i + 1) * (vi + 1) * mult) | 0;
            }
        });
    };
    addLane(lanes.master.voices, 3);
    addLane(lanes.Aphrase.voices, 5);
    addLane(lanes.Bphrase.voices, 7);
    for (let i = 0; i < lanes.Awheel.selected.length; i++) if (lanes.Awheel.selected[i]) h = (h + (i + 1) * 11) | 0;
    for (let i = 0; i < lanes.Bwheel.selected.length; i++) if (lanes.Bwheel.selected[i]) h = (h + (i + 1) * 13) | 0;
    return h;
}

/** Cheap fingerprint of the master-wheel A/B dot pattern (phase included). */
function computeDotsSignature(state, lanes) {
    let h = 0;
    for (let i = 0; i < lanes.Awheel.selected.length; i++) if (lanes.Awheel.selected[i]) h = (h + (i + 1) * 31) | 0;
    for (let i = 0; i < lanes.Bwheel.selected.length; i++) if (lanes.Bwheel.selected[i]) h = (h + (i + 1) * 37) | 0;
    return `${h}_${state.phaseA}_${state.phaseB}`;
}

/**
 * Updates flash counters and lastActive tracking for visual step highlighting.
 * Audio triggers are handled independently by the audio scheduler loop.
 */
function processTriggers(state, lanes, active, channels) {
    if (active.master !== state.lastActive.master) {
        lanes.master.voices.forEach((voice) => {
            if (voice.selected[active.master] && !voice.channel?.silenced) state.flash.custom = 12;
        });
        state.lastActive.master = active.master;
    }

    if (active.Aphrase !== state.lastActive.Aphrase) {
        lanes.Aphrase.voices.forEach((voice) => {
            if (voice.selected[active.Aphrase] && !voice.channel?.silenced) state.flash.A = 12;
        });
        state.lastActive.Aphrase = active.Aphrase;
    }

    if (lanes.Awheel.selected[((active.master % state.mainTeeth) + state.mainTeeth) % state.mainTeeth] && !lanes.Awheel.channel?.silenced) state.flash.A = 12;

    if (active.Bphrase !== state.lastActive.Bphrase) {
        lanes.Bphrase.voices.forEach((voice) => {
            if (voice.selected[active.Bphrase] && !voice.channel?.silenced) state.flash.B = 12;
        });
        state.lastActive.Bphrase = active.Bphrase;
    }

    if (lanes.Bwheel.selected[((active.master % state.mainTeeth) + state.mainTeeth) % state.mainTeeth] && !lanes.Bwheel.channel?.silenced) state.flash.B = 12;
}

/**
 * Pre-renders a gear body (polygon, center hole, spokes, top indicator) into an
 * offscreen sprite. The content is static per tooth count + radii + color, so
 * it is drawn once and blitted with a rotation transform per frame.
 */
function getGearSprite(teeth, rInner, rOuter, color, isMobile) {
    const key = `${teeth}_${rInner.toFixed(2)}_${rOuter.toFixed(2)}_${color}_${isMobile}`;
    if (_gearSpriteCache.has(key)) return _gearSpriteCache.get(key);
    if (_gearSpriteCache.size >= GEAR_SPRITE_CACHE_MAX) _gearSpriteCache.clear();

    const pad = 20;
    const size = Math.ceil((rOuter + pad) * 2);
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const g = off.getContext('2d');
    g.translate(size / 2, size / 2);

    // Gear body — pre-rendered Path2D (shape is static per tooth count + radii)
    const bodyKey = `${teeth}_${rInner}_${rOuter}`;
    if (!_gearBodyCache[bodyKey]) {
        const path = new Path2D();
        const numPoints = teeth * 2;
        for (let i = 0; i < numPoints; i++) {
            const r = (i % 2 === 0) ? rOuter : rInner;
            const theta = (i * Math.PI) / teeth - Math.PI / 2;
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
        }
        path.closePath();
        _gearBodyCache[bodyKey] = path;
    }
    g.fillStyle = color;
    g.strokeStyle = '#ffffff';
    g.lineWidth = isMobile ? 1.5 : 2.5;
    g.fill(_gearBodyCache[bodyKey]);
    g.stroke(_gearBodyCache[bodyKey]);

    // Center hole
    g.beginPath();
    g.arc(0, 0, rInner * 0.22, 0, 2 * Math.PI);
    g.fillStyle = '#08080c';
    g.fill();
    g.stroke();

    // Spoke lines — always 4 spokes at quarter-turn positions (the master beat)
    if (!isMobile) {
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        for (let q = 0; q < 4; q++) {
            const theta = q * Math.PI / 2 - Math.PI / 2;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(rInner * Math.cos(theta), rInner * Math.sin(theta));
            g.stroke();
        }
    }

    // Top position indicator dot — marks the reference tooth (start of rotation)
    g.fillStyle = '#ffffff';
    g.shadowBlur = isMobile ? 0 : 6;
    g.shadowColor = color;
    g.beginPath();
    g.arc(0, -rOuter + (rOuter * 0.12), Math.max(3, rOuter * 0.08), 0, 2 * Math.PI);
    g.fill();
    g.shadowBlur = 0;

    const sprite = { canvas: off, half: size / 2 };
    _gearSpriteCache.set(key, sprite);
    return sprite;
}

let _masterDotsSprite = null;
let _masterDotsSig = '';

/**
 * Pre-renders the A-pulse/B-pulse spokes and dots that decorate the master
 * wheel into a sprite sharing the master gear's footprint. The pattern only
 * changes when a wheel selection or phase is edited, so this redraws rarely
 * instead of stroking up to mainTeeth spokes + dots every frame.
 */
function getMasterDotsSprite(state, lanes, rMainInner, markerRadius, dotRadius, isMobile, dotsSig) {
    if (_scratchA.length < state.mainTeeth) {
        _scratchA = new Uint8Array(state.mainTeeth);
        _scratchB = new Uint8Array(state.mainTeeth);
    }
    _scratchA.fill(0);
    _scratchB.fill(0);
    lanes.Awheel.selected.forEach((on, i) => {
        if (on) _scratchA[(i + state.phaseA) % state.mainTeeth] = 1;
    });
    lanes.Bwheel.selected.forEach((on, i) => {
        if (on) _scratchB[(i + state.phaseB) % state.mainTeeth] = 1;
    });

    const sig = `${state.mainTeeth}_${rMainInner.toFixed(2)}_${markerRadius.toFixed(2)}_${dotRadius.toFixed(2)}_${isMobile}_${dotsSig}`;
    if (_masterDotsSig === sig && _masterDotsSprite) return _masterDotsSprite;

    const pad = 20;
    const size = Math.ceil((rMainInner + pad) * 2) + 10;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const g = off.getContext('2d');
    g.translate(size / 2, size / 2);

    const aDots = _scratchA;
    const bDots = _scratchB;
    // Single pass per tooth: draw spokes and dots together
    for (let t = 0; t < state.mainTeeth; t++) {
        const aOn = aDots[t];
        const bOn = bDots[t];
        if (!aOn && !bOn) continue;
        const theta = (t / state.mainTeeth) * Math.PI * 2 - Math.PI / 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // Spoke from centre
        g.lineWidth = 4;
        g.shadowBlur = 0;
        if (aOn && bOn) g.strokeStyle = '#c07ae6';
        else if (aOn) g.strokeStyle = '#ff6b8f';
        else g.strokeStyle = '#6ef2ff';
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(rMainInner * cosT, rMainInner * sinT);
        g.stroke();

        // Dot(s) at the tooth — offset when both land on same tooth
        g.lineWidth = isMobile ? 1 : 2;
        g.shadowBlur = isMobile ? 0 : 10;
        g.strokeStyle = '#ffffff';
        if (aOn) {
            g.fillStyle = '#ff6b8f';
            g.shadowColor = '#ff6b8f';
            const rA = markerRadius + (aOn && bOn ? -5 : 0);
            g.beginPath();
            g.arc(rA * cosT, rA * sinT, dotRadius, 0, 2 * Math.PI);
            g.fill();
            g.stroke();
        }
        if (bOn) {
            g.fillStyle = '#6ef2ff';
            g.shadowColor = '#6ef2ff';
            const rB = markerRadius + (aOn && bOn ? 5 : 0);
            g.beginPath();
            g.arc(rB * cosT, rB * sinT, dotRadius, 0, 2 * Math.PI);
            g.fill();
            g.stroke();
        }
    }

    _masterDotsSprite = { canvas: off, half: size / 2 };
    _masterDotsSig = sig;
    return _masterDotsSprite;
}

// ── Nested meter circles ────────────────────────────────────────────────
// An experimental addition to the gear visualization: inside the master
// wheel, each meter renders as a concentric circle in its meter color,
// carrying N equally-spaced dot marks (one per pulse). A single radial
// indicator rotates once per measure (locked to the master angle), crossing
// each circle's marks in sequence — where the radial line crosses marks from
// two circles at once, that meter coincidence is visible as radial alignment.
//
// ── Rings view dial ─────────────────────────────────────────────────────
// A standalone clock-face visualization: the outermost ring carries one dot
// per master tick (the full polyrhythm grid, like a clock), the pink/cyan
// rings carry each meter's numbered pulses, and the innermost orange ring
// numbers the four quarter beats. A radial hand locked to the master angle
// sweeps once per measure, crossing mark k of each ring when pulse k fires.
const DIAL_RING_FRACTIONS = { master: 0.96, A: 0.66, B: 0.44, beat: 0.27 };

let _dialSprite = null;
let _dialSig = '';

function getDialSprite(state, dialR, isMobile) {
    const sig = `${state.A}_${state.B}_${state.mainTeeth}_${dialR.toFixed(2)}_${isMobile}`;
    if (_dialSig === sig && _dialSprite) return _dialSprite;

    const pad = 28;
    const size = Math.ceil((dialR + pad) * 2);
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const g = off.getContext('2d');
    g.translate(size / 2, size / 2);

    const rMaster = dialR * DIAL_RING_FRACTIONS.master;
    const rA = dialR * DIAL_RING_FRACTIONS.A;
    const rB = dialR * DIAL_RING_FRACTIONS.B;
    const rBeat = dialR * DIAL_RING_FRACTIONS.beat;

    const drawRing = (r, color) => {
        g.strokeStyle = color;
        g.lineWidth = isMobile ? 1.5 : 2;
        g.beginPath();
        g.arc(0, 0, r, 0, 2 * Math.PI);
        g.stroke();
    };
    drawRing(rMaster, 'rgba(255,255,255,0.30)');
    drawRing(rA, 'rgba(255,51,102,0.55)');
    drawRing(rB, 'rgba(0,229,255,0.55)');
    drawRing(rBeat, 'rgba(255,145,0,0.60)');

    // Outermost ring: one dot per master tick — the full polyrhythm grid
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let t = 0; t < state.mainTeeth; t++) {
        const a = -Math.PI / 2 - (t * 2 * Math.PI) / state.mainTeeth;
        g.beginPath();
        g.arc(rMaster * Math.cos(a), rMaster * Math.sin(a), 3.5, 0, 2 * Math.PI);
        g.fill();
    }

    // Meter rings: numbered pulse marks (mark k = pulse k+1)
    const markRing = (N, r, color, dotR, fontPx) => {
        g.font = `bold ${fontPx}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        for (let k = 0; k < N; k++) {
            const a = -Math.PI / 2 - (k * 2 * Math.PI) / N;
            const x = r * Math.cos(a);
            const y = r * Math.sin(a);
            g.fillStyle = color;
            g.beginPath();
            g.arc(x, y, dotR, 0, 2 * Math.PI);
            g.fill();
            g.fillStyle = '#0a0a10';
            g.fillText(String(k + 1), x, y + 0.5);
        }
    };
    markRing(state.A, rA, '#ff3366', 8.5, 10);
    markRing(state.B, rB, '#00e5ff', 8.5, 10);
    markRing(4, rBeat, '#ff9100', 8.5, 10);

    _dialSprite = { canvas: off, half: size / 2, rTicks: rMaster, rMeterA: rA, rMeterB: rB, rBeat };
    _dialSig = sig;
    return _dialSprite;
}


/**
 * Shared top block for every round view: the master-cycle line (with the
 * cycle counter when the phrase spans multiple cycles) and the two meter
 * descriptors. Drawn once per frame so it is identical across views.
 */
// measureText forces font layout work, so widths are cached per font+text —
// the Voice view measures its syllables every frame, and words repeat.
const _textWidthCache = new Map();

function textWidth(ctx, text) {
    const key = ctx.font + '|' + text;
    let w = _textWidthCache.get(key);
    if (w === undefined) {
        w = ctx.measureText(text).width;
        _textWidthCache.set(key, w);
    }
    return w;
}

/** Shared sweep flash: lights the nearest mark of a ring as the hand crosses it. */
function drawRingFlash(ctx, N, r, cx, cy, color, dotR, mainAngle, isMobile) {
    const period = (2 * Math.PI) / N;
    const pos = (((mainAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
    const pNorm = pos / period;
    const k = Math.floor(pNorm) % N;
    const intensity = 1 - (pNorm - Math.floor(pNorm));
    if (intensity <= 0.03) return;
    const a = -Math.PI / 2 - k * period;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.35 + 0.45 * intensity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(r * Math.cos(a), r * Math.sin(a), dotR + 2.5, 0, 2 * Math.PI);
    ctx.fill();
    if (intensity > 0.55) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(r * Math.cos(a), r * Math.sin(a), dotR * 0.75, 0, 2 * Math.PI);
        ctx.fill();
    }
    ctx.restore();
}


// ── Voice view: Anlo Ewe verbalization (Kpla / Ka / Tu) ─────────────────
// For one master measure, every tick that fires a meter pulse becomes a
// spoken syllable: 'Kpla' when both meters strike together (both hands),
// 'Ka' for each lone Meter A pulse (strong hand), 'Tu' for each lone Meter
// B pulse (weak hand). Speaking the strip in time with the playhead taps
// and verbalizes the polyrhythm — C. K. Ladzekpo's hand-rhythm method.
//
// The strip (all syllables at rest alpha + the key line) only changes when
// the meters or font change, so it is pre-rendered to a sprite. A frame is
// a blit plus the active syllable, instead of re-flowing and re-rasterizing
// every syllable at the draw rate.
const VERBAL_COLORS = { Kpla: '#d8b4fe', Ka: '#ff6b8f', Tu: '#6ef2ff' };

function buildVerbalSequence(state) {
    const seq = [];
    for (let t = 0; t < state.mainTeeth; t++) {
        const aOn = t % state.teethA === 0;
        const bOn = t % state.teethB === 0;
        if (!aOn && !bOn) continue;
        seq.push({
            word: aOn && bOn ? 'Kpla' : aOn ? 'Ka' : 'Tu',
            kind: aOn && bOn ? 'Kpla' : aOn ? 'Ka' : 'Tu',
            tick: t
        });
    }
    return seq;
}

/** Offscreen context for cached width measurement (shared with textWidth). */
let _measureCtx = null;

let _verbalCache = null;

/**
 * Builds (once per meter/font signature) the verbal sequence, the wrapped
 * lyric-row layout, and a sprite holding every syllable at rest alpha plus
 * the key line. items[] runs parallel to seq[] and stores sprite-space
 * positions, so the live pass only has to look up the active word.
 */
function getVerbalView(state, stripMax, isMobile) {
    const sig = `${state.mainTeeth}_${state.teethA}_${state.teethB}_${stripMax}_${isMobile}`;
    if (_verbalCache && _verbalCache.sig === sig) return _verbalCache;

    const seq = buildVerbalSequence(state);
    const stripFont = `bold ${isMobile ? 15 : 18}px sans-serif`;
    const wordGap = 16;
    const lineHeight = 34;

    // Pass 1: break the syllables into rows (same wrapping as the lyrics).
    if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
    _measureCtx.font = stripFont;
    const rows = [];
    let cur = { items: [], width: 0 };
    for (const s of seq) {
        const w = textWidth(_measureCtx, s.word);
        const add = cur.items.length ? wordGap + w : w;
        if (cur.items.length && cur.width + add > stripMax) {
            rows.push(cur);
            cur = { items: [], width: 0 };
        }
        cur.items.push({ s, w });
        cur.width += add;
    }
    if (cur.items.length) rows.push(cur);

    // Pass 2: pre-render the strip sprite. Words keep the exact positions of
    // the old live pass (center-aligned at x, advancing x by width + gap).
    const padX = 40;
    const topPad = 26;            // first baseline, room for ascenders above
    const spriteW = stripMax + padX * 2;
    const nRows = rows.length;
    const spriteH = topPad + nRows * lineHeight + 12 + 22;
    const off = document.createElement('canvas');
    off.width = spriteW;
    off.height = spriteH;
    const g = off.getContext('2d');
    g.textAlign = 'center';
    g.font = stripFont;

    const items = [];
    const rowHalf = [];
    for (let ri = 0; ri < nRows; ri++) {
        const row = rows[ri];
        rowHalf.push(row.width / 2);
        const y = topPad + ri * lineHeight;
        let x = spriteW / 2 - row.width / 2;
        for (const item of row.items) {
            g.globalAlpha = 0.8;
            g.fillStyle = VERBAL_COLORS[item.s.kind];
            g.fillText(item.s.word, x, y);
            // x is stored relative to the sprite center so the live pass can
            // position straight onto the main canvas as cx + item.x.
            items.push({ s: item.s, w: item.w, x: x - spriteW / 2, y, row: ri });
            x += item.w + wordGap;
        }
    }
    g.globalAlpha = 1;
    g.font = '12px sans-serif';
    g.fillStyle = '#8a8a9c';
    g.fillText('Kpla = both meters together (both hands) — sounds like "Pla" · Ka = Meter A (strong hand) · Tu = Meter B (weak hand)', spriteW / 2, topPad + nRows * lineHeight + 12);

    _verbalCache = { sig, seq, items, rowHalf, sprite: off, spriteW, stripFont, topPad, lineHeight };
    return _verbalCache;
}

function drawVerbalizationView(ctx, state, cx, cy, dialR, timelineX, timelineWidth, masterCurrentCycle, isMobile) {
    const stepSize = (2 * Math.PI) / state.mainTeeth;
    const masterTick = ((Math.floor(state.mainAngle / stepSize) % state.mainTeeth) + state.mainTeeth) % state.mainTeeth;
    const v = getVerbalView(state, timelineWidth + 120, isMobile);
    const seq = v.seq;

    // The syllable to say right now: the last one whose tick has been reached
    let activeIdx = seq.length - 1;
    for (let i = 0; i < seq.length; i++) {
        if (seq[i].tick <= masterTick) activeIdx = i;
        else break;
    }
    const active = seq[activeIdx];
    const it = v.items[activeIdx];

    // Cached strip: every syllable at rest alpha + the key line, one blit.
    const stripTopY = cy + 70 - v.topPad;
    const stripLeftX = cx - v.spriteW / 2;
    ctx.drawImage(v.sprite, stripLeftX, stripTopY);

    // Dim the already-spoken prefix: one band per full row above the active
    // row, plus a partial band up to the active word on its own row.
    const rowBandTop = v.topPad + it.row * v.lineHeight - 22;
    const partialW = it.x - it.w / 2 + v.rowHalf[it.row];
    if (it.row > 0 || partialW > 0.5) {
        ctx.fillStyle = 'rgba(8,8,12,0.6)';
        if (it.row > 0) ctx.fillRect(stripLeftX, stripTopY + v.topPad - 22, v.spriteW, it.row * v.lineHeight);
        if (partialW > 0.5) ctx.fillRect(cx - v.rowHalf[it.row], stripTopY + rowBandTop, partialW, 32);
    }

    // Active syllable at full alpha with its white underline (redrawn live)
    ctx.font = v.stripFont;
    ctx.textAlign = 'center';
    ctx.fillStyle = VERBAL_COLORS[active.kind];
    const wordX = cx + it.x;
    const wordY = stripTopY + it.y;
    ctx.fillText(active.word, wordX, wordY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wordX - 4, wordY + 8);
    ctx.lineTo(wordX + it.w + 4, wordY + 8);
    ctx.stroke();

    // Big current syllable — what to say now
    ctx.font = `bold ${isMobile ? 44 : 60}px sans-serif`;
    ctx.fillStyle = VERBAL_COLORS[active.kind];
    ctx.fillText(active.word, cx, cy - 20);
}

// ── Align view: coincidence map + countdown ─────────────────────────────
// Three lanes (4/4 beat, Meter A, Meter B) share one measure laid out left
// to right. Vertical connectors mark every tick where meter pulses coincide,
// and a countdown states how many pulses remain until the next alignment —
// the question an ensemble player actually counts.
let _alignSprite = null;
let _alignSig = '';

function getAlignSprite(state, isMobile) {
    const laneWidth = 700;
    const sig = `${state.A}_${state.B}_${state.mainTeeth}_${isMobile}`;
    if (_alignSig === sig && _alignSprite) return _alignSprite;

    const labelW = 90;
    const laneSpan = 75;
    const w = laneWidth + labelW + 20;
    const h = laneSpan * 2 + 90;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const g = off.getContext('2d');
    const x0 = labelW + 10;
    const yBeat = 55;
    const yA = yBeat + laneSpan;
    const yB = yBeat + laneSpan * 2;

    const laneAxis = (y, color, label) => {
        g.strokeStyle = '#2d2d3d';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(x0 + laneWidth, y);
        g.stroke();
        g.fillStyle = color;
        g.font = 'bold 11px sans-serif';
        g.textAlign = 'right';
        g.fillText(label, x0 - 10, y + 4);
    };
    laneAxis(yBeat, '#ff9100', '4/4 beat');
    laneAxis(yA, '#ff3366', 'Meter A');
    laneAxis(yB, '#00e5ff', 'Meter B');

    const tickX = (t) => x0 + (t / state.mainTeeth) * laneWidth;
    const mark = (t, y, color, number) => {
        g.fillStyle = color;
        g.beginPath();
        g.arc(tickX(t), y, isMobile ? 7 : 8.5, 0, 2 * Math.PI);
        g.fill();
        if (number !== undefined) {
            g.fillStyle = '#0a0a10';
            g.font = `bold ${isMobile ? 9 : 10}px sans-serif`;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(String(number), tickX(t), y + 0.5);
        }
    };

    // Coincidence connectors first (under the marks)
    const coincideTicks = [];
    for (let t = 0; t < state.mainTeeth; t++) {
        if (t % state.teethA === 0 && t % state.teethB === 0) coincideTicks.push(t);
    }
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    coincideTicks.forEach(t => {
        g.beginPath();
        g.moveTo(tickX(t), yBeat - 18);
        g.lineTo(tickX(t), yB + 18);
        g.stroke();
    });

    for (let q = 0; q < 4; q++) mark((q * state.mainTeeth) / 4, yBeat, '#ff9100', q + 1);
    for (let k = 0; k < state.A; k++) mark(k * state.teethA, yA, '#ff3366', k + 1);
    for (let k = 0; k < state.B; k++) mark(k * state.teethB, yB, '#00e5ff', k + 1);
    coincideTicks.forEach(t => {
        g.strokeStyle = '#c07ae6';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(tickX(t), yA, isMobile ? 9 : 11, 0, 2 * Math.PI);
        g.stroke();
        g.beginPath();
        g.arc(tickX(t), yB, isMobile ? 9 : 11, 0, 2 * Math.PI);
        g.stroke();
    });

    return { canvas: off, width: w, height: h, labelW, x0, laneWidth, laneSpan, yBeat, yA, yB, coincideTicks };
}

function drawAlignView(ctx, state, cx, cy, dialR, timelineX, timelineWidth, masterCurrentCycle, isMobile) {
    const stepSize = (2 * Math.PI) / state.mainTeeth;
    const sprite = getAlignSprite(state, isMobile);
    // Shifted up so the lanes and countdown sit clear of the master cycle
    // timeline below (which starts around y = 395 with its markers).
    const originY = cy - sprite.laneSpan - 55;
    const originX = timelineX - (sprite.width - timelineWidth) / 2;
    ctx.drawImage(sprite.canvas, originX, originY);

    // Live playhead sweeping all three lanes
    const measureProgress = (((state.mainAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
    const px = originX + sprite.x0 + measureProgress * sprite.laneWidth;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, originY + sprite.yBeat - 26);
    ctx.lineTo(px, originY + sprite.yB + 26);
    ctx.stroke();

    // Sweep flashes: a mark lights crisply as the playhead crosses it —
    // full brightness for a short window after the crossing, no decay trail.
    const flashLane = (N, y, color, dotR) => {
        const period = (2 * Math.PI) / N;
        const pos = (((state.mainAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
        const pNorm = pos / period;
        const k = Math.floor(pNorm) % N;
        const sinceCrossing = pNorm - Math.floor(pNorm);
        if (sinceCrossing >= 0.22) return;
        const t = k * (state.mainTeeth / N);
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(originX + sprite.x0 + (t / state.mainTeeth) * sprite.laneWidth, y, dotR + 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    };
    flashLane(4, originY + sprite.yBeat, '#ff9100', 8.5);
    flashLane(state.A, originY + sprite.yA, '#ff6b8f', 8.5);
    flashLane(state.B, originY + sprite.yB, '#6ef2ff', 8.5);

}




// ── Shapes view: star polygons ──────────────────────────────────────────
// Each meter's N marks joined into a closed N-gon on its ring — hexagon for
// 6, square for 4, star polygons for odd meters. Both polygons stacked in
// one dial show the structural geometry of the ratio; the hand keeps it live.
let _shapesSprite = null;
let _shapesSig = '';

function getShapesSprite(state, dialR, isMobile) {
    const sig = `${state.A}_${state.B}_${state.mainTeeth}_${dialR.toFixed(2)}_${isMobile}`;
    if (_shapesSig === sig && _shapesSprite) return _shapesSprite;

    const pad = 28;
    const size = Math.ceil((dialR + pad) * 2);
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const g = off.getContext('2d');
    g.translate(size / 2, size / 2);

    const rMaster = dialR * DIAL_RING_FRACTIONS.master;
    const rA = dialR * DIAL_RING_FRACTIONS.A;
    const rB = dialR * DIAL_RING_FRACTIONS.B;

    const markAngle = (k, N) => -Math.PI / 2 - (k * 2 * Math.PI) / N;

    const ring = (r, color) => {
        g.strokeStyle = color;
        g.lineWidth = isMobile ? 1.5 : 2;
        g.beginPath();
        g.arc(0, 0, r, 0, 2 * Math.PI);
        g.stroke();
    };
    // Faint rings under the polygons — the reference beat (4/4) rides the
    // outermost circle, matching the rings view's outer pulse grid.
    ring(rMaster, 'rgba(255,145,0,0.35)');
    ring(rA, 'rgba(255,51,102,0.35)');
    ring(rB, 'rgba(0,229,255,0.35)');

    // Master pulse grid dots on the outer circle (like the rings view)
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let t = 0; t < state.mainTeeth; t++) {
        const a = markAngle(t, state.mainTeeth);
        g.beginPath();
        g.arc(rMaster * Math.cos(a), rMaster * Math.sin(a), 3.5, 0, 2 * Math.PI);
        g.fill();
    }

    const polygon = (N, r, color) => {
        g.strokeStyle = color;
        g.lineWidth = isMobile ? 1.5 : 2;
        g.beginPath();
        for (let k = 0; k <= N; k++) {
            const a = markAngle(k % N, N);
            const x = r * Math.cos(a);
            const y = r * Math.sin(a);
            if (k === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
        g.stroke();
        // Numbered vertex dots (matching the rings-view marks)
        g.font = `bold ${isMobile ? 9 : 10}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        for (let k = 0; k < N; k++) {
            const a = markAngle(k, N);
            const x = r * Math.cos(a);
            const y = r * Math.sin(a);
            g.fillStyle = color;
            g.beginPath();
            g.arc(x, y, 8.5, 0, 2 * Math.PI);
            g.fill();
            g.fillStyle = '#0a0a10';
            g.fillText(String(k + 1), x, y + 0.5);
        }
    };
    polygon(state.A, rA, '#ff3366');
    polygon(state.B, rB, '#00e5ff');
    polygon(4, rMaster, '#ff9100');

    _shapesSprite = { canvas: off, half: size / 2, rTicks: rMaster };
    _shapesSig = sig;
    return _shapesSprite;
}

function drawShapesView(ctx, state, cx, cy, dialR, isMobile) {
    const sprite = getShapesSprite(state, dialR, isMobile);
    ctx.drawImage(sprite.canvas, cx - sprite.half, cy - sprite.half);

    // Sweeping hand keeps the view live
    const handAngle = -Math.PI / 2 - state.mainAngle;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = isMobile ? 1 : 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sprite.rTicks * Math.cos(handAngle), sprite.rTicks * Math.sin(handAngle));
    ctx.stroke();
    ctx.restore();

    // Marks flash as the hand crosses them (like the rings view): the pulse
    // grid on the outer circle, then the polygons — reference beat outermost.
    drawRingFlash(ctx, state.mainTeeth, sprite.rTicks, cx, cy, 'rgba(255,255,255,0.95)', 3.5, state.mainAngle, isMobile);
    drawRingFlash(ctx, state.B, dialR * DIAL_RING_FRACTIONS.B, cx, cy, '#6ef2ff', 8.5, state.mainAngle, isMobile);
    drawRingFlash(ctx, state.A, dialR * DIAL_RING_FRACTIONS.A, cx, cy, '#ff6b8f', 8.5, state.mainAngle, isMobile);
    drawRingFlash(ctx, 4, dialR * DIAL_RING_FRACTIONS.master, cx, cy, '#ff9100', 8.5, state.mainAngle, isMobile);
}


function drawGear(ctx, cx, cy, rInner, rOuter, teeth, angle, color, highlightTop = false, flashIntensity = 0, selectedSteps = null, isMobile = false) {
    const sprite = getGearSprite(teeth, rInner, rOuter, color, isMobile);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.drawImage(sprite.canvas, -sprite.half, -sprite.half);
    ctx.restore();

    // Orange markers for selected steps on the master wheel
    if (selectedSteps && selectedSteps.some(Boolean)) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        const markerRadius = rInner + ((rOuter - rInner) * 0.45);
        ctx.fillStyle = '#ff9100';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isMobile ? 1 : 2;
        ctx.shadowBlur = isMobile ? 0 : 10;
        ctx.shadowColor = '#ff9100';
        for (let i = 0; i < selectedSteps.length; i++) {
            if (!selectedSteps[i]) continue;
            const theta = (i / selectedSteps.length) * Math.PI * 2 - Math.PI / 2;
            const x = markerRadius * Math.cos(theta);
            const y = markerRadius * Math.sin(theta);
            ctx.beginPath();
            ctx.arc(x, y, Math.max(4, rOuter * 0.035), 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    // Reference dot above the gear — always visible in the gear's color
    if (highlightTop) {
        ctx.save();
        ctx.translate(cx, cy - rOuter - 18);
        ctx.fillStyle = flashIntensity > 0 ? '#ffffff' : color;
        if (flashIntensity > 0 && !isMobile) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = color;
        }
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
}

/** Draws a single marker (dot, triangle, or diamond) on a timeline. */
function drawTimelineMarker(ctx, x, y, color, shape = 'dot', size = 4) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;

    if (shape === 'dot') {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
    } else if (shape === 'up') {
        ctx.beginPath();
        ctx.moveTo(x, y - size - 2);
        ctx.lineTo(x - size, y + size);
        ctx.lineTo(x + size, y + size);
        ctx.closePath();
    } else if (shape === 'down') {
        ctx.beginPath();
        ctx.moveTo(x, y + size + 2);
        ctx.lineTo(x - size, y - size);
        ctx.lineTo(x + size, y - size);
        ctx.closePath();
    } else if (shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
    }

    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

/**
 * Draws the Master Cycle Timeline — a horizontal strip showing one full
 * rotation of the master wheel. Displays selected steps from all lanes
 * as colored markers, plus a playhead showing the current position.
 */
function drawMasterCycleTimeline(ctx, state, lanes, startX, y, width, cycleProgress, currentStep, stepSize, includePlayhead = true) {
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MASTER CYCLE TIMELINE', startX, y - 14);

    // Timeline axis
    ctx.strokeStyle = '#2d2d3d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + width, y);
    ctx.stroke();

    // Tick marks
    const pixelPerTooth = width / state.mainTeeth;
    const majorTickInterval = Math.max(1, Math.floor(state.mainTeeth / 4));
    for (let i = 0; i <= state.mainTeeth; i++) {
        const x = startX + i * pixelPerTooth;
        const isMajor = i % majorTickInterval === 0;
        ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x, y + 18);
        ctx.stroke();
    }

    // Master wheel selected steps (orange dots, one row per voice)
    const masterCurrentCycle = state.masterPhraseCycles > 1
        ? Math.floor(currentStep / state.mainTeeth) % state.masterPhraseCycles
        : 0;
    const cycleSlotStart = masterCurrentCycle * state.mainTeeth;
    const cycleSlotEnd = cycleSlotStart + state.mainTeeth;
    lanes.master.voices.forEach((voice, vi) => {
        const yOffset = vi * 10;
        for (let i = cycleSlotStart; i < cycleSlotEnd && i < voice.selected.length; i++) {
            if (!voice.selected[i]) continue;
            const x = startX + (i - cycleSlotStart) * pixelPerTooth;
            drawTimelineMarker(ctx, x, y - yOffset, '#ff9100', 'dot', 4);
        }
    });

    // Wheel lane steps (diamonds, offset above/below axis)
    lanes.Awheel.selected.forEach((on, i) => {
        if (!on) return;
        const step = (i + state.phaseA) % state.mainTeeth;
        drawTimelineMarker(ctx, startX + step * pixelPerTooth, y - 14, '#ff6b8f', 'diamond', 4);
    });

    lanes.Bwheel.selected.forEach((on, i) => {
        if (!on) return;
        const step = (i + state.phaseB) % state.mainTeeth;
        drawTimelineMarker(ctx, startX + step * pixelPerTooth, y + 14, '#6ef2ff', 'diamond', 4);
    });

    // Phrase lane steps (triangles, further offset, one row per voice)
    lanes.Aphrase.voices.forEach((voice, vi) => {
        const yOffset = 28 + vi * 10;
        voice.selected.forEach((on, i) => {
            if (!on) return;
            const step = (i * state.teethA + state.phaseA) % state.mainTeeth;
            drawTimelineMarker(ctx, startX + step * pixelPerTooth, y - yOffset, '#ff3366', 'up', 4);
        });
    });

    lanes.Bphrase.voices.forEach((voice, vi) => {
        const yOffset = 28 + vi * 10;
        voice.selected.forEach((on, i) => {
            if (!on) return;
            const step = (i * state.teethB + state.phaseB) % state.mainTeeth;
            drawTimelineMarker(ctx, startX + step * pixelPerTooth, y + yOffset, '#00e5ff', 'down', 4);
        });
    });

    // Playhead line — drawn live per frame (it moves continuously)
    if (includePlayhead) {
        const playheadX = startX + cycleProgress * width;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, y - 34);
        ctx.lineTo(playheadX, y + 34);
        ctx.stroke();
    }
}

/**
 * Draws the Full Pattern Timeline — shows how phrase patterns repeat
 * across multiple master cycles. Each row represents a phrase (A or B),
 * with markers showing where selected steps fall within the full pattern.
 */
function drawFullPatternTimeline(ctx, state, lanes, startX, yTop, width, includePlayhead = true) {
    const totalCycles = state.fullPatternCycles;
    const totalSteps = totalCycles * state.mainTeeth;
    const pixelPerStep = width / totalSteps;

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`FULL PATTERN TIMELINE (${totalCycles} master cycles)`, startX, yTop - 8);

    // Calculate row positions — master voices above A/B phrase rows
    const masterVoiceCount = lanes.master.voices.length;
    const aVoiceCount = lanes.Aphrase.voices.length;
    const bVoiceCount = lanes.Bphrase.voices.length;
    const rowHeight = 18;
    const masterStartY = yTop + 18;
    const aStartY = masterStartY + (masterVoiceCount * rowHeight) + 10;
    const bStartY = aStartY + (aVoiceCount * rowHeight) + 10;
    const bottomY = bStartY + (bVoiceCount * rowHeight) + 10;

    // Master voice labels
    lanes.master.voices.forEach((_, vi) => {
        const rowY = masterStartY + vi * rowHeight;
        ctx.fillStyle = '#ff9100';
        ctx.fillText(`Master${masterVoiceCount > 1 ? ` v${vi + 1}` : ''}`, startX, rowY - 4);
    });

    // A phrase labels
    lanes.Aphrase.voices.forEach((_, vi) => {
        const rowY = aStartY + vi * rowHeight;
        ctx.fillStyle = '#ff3366';
        ctx.fillText(`A phrase${aVoiceCount > 1 ? ` v${vi + 1}` : ''}`, startX, rowY - 4);
    });

    // B phrase labels
    lanes.Bphrase.voices.forEach((_, vi) => {
        const rowY = bStartY + vi * rowHeight;
        ctx.fillStyle = '#00e5ff';
        ctx.fillText(`B phrase${bVoiceCount > 1 ? ` v${vi + 1}` : ''}`, startX, rowY - 4);
    });

    // Timeline axes for master voices
    lanes.master.voices.forEach((_, vi) => {
        const rowY = masterStartY + vi * rowHeight;
        ctx.strokeStyle = '#2d2d3d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, rowY);
        ctx.lineTo(startX + width, rowY);
        ctx.stroke();
    });

    // Timeline axes for A voices
    lanes.Aphrase.voices.forEach((_, vi) => {
        const rowY = aStartY + vi * rowHeight;
        ctx.strokeStyle = '#2d2d3d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, rowY);
        ctx.lineTo(startX + width, rowY);
        ctx.stroke();
    });

    // Timeline axes for B voices
    lanes.Bphrase.voices.forEach((_, vi) => {
        const rowY = bStartY + vi * rowHeight;
        ctx.strokeStyle = '#2d2d3d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, rowY);
        ctx.lineTo(startX + width, rowY);
        ctx.stroke();
    });

    // Adaptive cycle label spacing
    let labelEvery = 1;
    if (totalCycles > 6) labelEvery = 2;
    if (totalCycles > 12) labelEvery = 4;
    if (totalCycles > 24) labelEvery = 8;

    // Cycle dividers and labels
    for (let c = 0; c <= totalCycles; c++) {
        const x = startX + c * pixelPerStep * state.mainTeeth;

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, yTop - 2);
        ctx.lineTo(x, bottomY);
        ctx.stroke();

        if (c < totalCycles && (c % labelEvery === 0)) {
            ctx.fillStyle = '#71717a';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            const segmentWidth = width / totalCycles;
            ctx.fillText(`C${c + 1}`, x + segmentWidth / 2, bottomY + 14);
        }
    }

    // Master voice markers (repeating across the full pattern, one row per voice)
    const masterRepeatSteps = state.masterPhraseSteps;
    lanes.master.voices.forEach((voice, vi) => {
        const rowY = masterStartY + vi * rowHeight;
        voice.selected.forEach((on, i) => {
            if (!on) return;
            for (let pos = i; pos < totalSteps; pos += masterRepeatSteps) {
                const x = startX + pos * pixelPerStep;
                drawTimelineMarker(ctx, x, rowY, '#ff9100', 'dot', 4);
            }
        });
    });

    // A phrase markers (repeating across the full pattern, one row per voice)
    const aRepeatSteps = state.phraseStepsA * state.teethA;
    lanes.Aphrase.voices.forEach((voice, vi) => {
        const rowY = aStartY + vi * rowHeight;
        voice.selected.forEach((on, i) => {
            if (!on) return;
            for (let pos = i * state.teethA + state.phaseA; pos < totalSteps + state.phaseA; pos += aRepeatSteps) {
                const normalized = ((pos % totalSteps) + totalSteps) % totalSteps;
                const x = startX + normalized * pixelPerStep;
                drawTimelineMarker(ctx, x, rowY, '#ff3366', 'dot', 4);
            }
        });
    });

    // B phrase markers (one row per voice)
    const bRepeatSteps = state.phraseStepsB * state.teethB;
    lanes.Bphrase.voices.forEach((voice, vi) => {
        const rowY = bStartY + vi * rowHeight;
        voice.selected.forEach((on, i) => {
            if (!on) return;
            for (let pos = i * state.teethB + state.phaseB; pos < totalSteps + state.phaseB; pos += bRepeatSteps) {
                const normalized = ((pos % totalSteps) + totalSteps) % totalSteps;
                const x = startX + normalized * pixelPerStep;
                drawTimelineMarker(ctx, x, rowY, '#00e5ff', 'dot', 4);
            }
        });
    });

    // Playhead showing progress through the full pattern — drawn live per
    // frame (it moves continuously), so the cached static layer skips it.
    if (includePlayhead) {
        const masterCyclesElapsed = state.mainAngle / (2 * Math.PI);
        const playheadProgress = (masterCyclesElapsed % totalCycles) / totalCycles;
        const playheadX = startX + playheadProgress * width;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, yTop - 4);
        ctx.lineTo(playheadX, bottomY);
        ctx.stroke();
    }
    return bottomY;
}

/**
 * Starts the main animation loop. Uses requestAnimationFrame with delta-time
 * calculation for frame-rate-independent rotation speed. Each frame:
 *   1. Clears and redraws the canvas
 *   2. Advances the master wheel angle based on BPM
 *   3. Detects step transitions and triggers audio/flash effects
 *   4. Draws all three gears and both timelines
 */
export function startAnimation({ canvas, ctx, ui, state, lanes, channels, markCurrentButtons, buildLane }) {
    let lastTime = null;
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    const THROTTLED_FRAME_MS = 33;
    const IDLE_FRAME_MS = 250;
    let lastDrawTime = 0;
    let _lastReadout = null;
    let _lastMiniPct = null;

    // Lane rebuild queue — defer DOM rebuilds from the animation loop to avoid
    // innerHTML teardown + recreation mid-rAF, which guarantees a frame drop.
    const _laneRebuildQueue = [];
    function _requestDeferredRebuild(lane) {
        if (!_laneRebuildQueue.includes(lane)) _laneRebuildQueue.push(lane);
    }

    // Offscreen static layers. Layer A holds everything that only changes when
    // meters, voice patterns, or the canvas size change (background, header,
    // meter legend, gear labels, full pattern timeline). Layer B holds the
    // master-cycle timeline, which additionally changes once per playing
    // master cycle.
    let _layerA = null;
    let _layerASig = null;
    let _layerB = null;
    let _layerBSig = null;
    let _fullPatternBottom = 0;

    // Reused buffer for merging master voice selections.
    // Grow it on demand so higher meter pairs such as 17 against 18 still render correctly.

    /**
     * Returns a scratch canvas with the requested size, reusing the existing
     * buffer when the dimensions already match. Assigning width/height resets
     * a canvas and reallocates its bitmap, so recreating a full-canvas layer
     * every master cycle (plus GC of the old buffer) caused periodic hitches
     * on low-end devices; in-place redraw avoids the churn entirely.
     */
    function _ensureScratchLayer(existing, w, h) {
        if (existing && existing.width === w && existing.height === h) return existing;
        const c = existing || document.createElement('canvas');
        if (!existing || c.width !== w) c.width = w;
        if (c.height !== h) c.height = h;
        return c;
    }

    // Cheap-dirty sensors for the cache signatures, refreshed on a stride
    // instead of every frame: the pattern checksum walks every lane's
    // selection array, and the dots signature walks both wheel lanes. An edit
    // is picked up within 4 frames (≈33-130ms), which is imperceptible, and
    // the per-frame cost drops to a couple of integer comparisons.
    let _frameNo = 0;
    let _cachedPatternChecksum = 0;
    let _cachedDotsSig = '';

    function animate(timestamp) {
        try {
        const totalVoices = lanes.master.voices.length + lanes.Aphrase.voices.length + lanes.Bphrase.voices.length;
        const f = state.flash;
        const hasActiveFlash = f.driver > 0 || f.custom > 0 || f.A > 0 || f.B > 0;

        // Keep a stopped transport visually current without redrawing the full
        // canvas at display refresh rate. Audio has its own scheduler.
        if (!state.playing && !hasActiveFlash) {
            lastTime = timestamp;
            setTimeout(() => requestAnimationFrame(animate), IDLE_FRAME_MS);
            return;
        }

        // Dynamically resize canvas height as voices are added/removed.
        // The timeline Y pushes down when there are many master voices, so the
        // full pattern timeline grows down from timelineY + 55 + its own rows.
        const approxTimelineBottom = Math.max(395, 205 + 145 + 10 + (lanes.master.voices.length - 1) * 10) + 55 + 58 + totalVoices * 18;
        if (canvas.height < approxTimelineBottom) {
            canvas.height = approxTimelineBottom;
        }

        // Audio is handled by its own scheduler, so cap expensive visual states
        // to ~30fps as well as coarse-pointer devices.
        const isComplex = state.mainTeeth > 120 || totalVoices > 6;
        if ((isMobile || isComplex) && timestamp - lastDrawTime < THROTTLED_FRAME_MS) {
            requestAnimationFrame(animate);
            return;
        }
        lastDrawTime = timestamp;

        // Flush deferred lane rebuilds before drawing (avoids DOM churn during rAF)
        while (_laneRebuildQueue.length > 0) {
            const lane = _laneRebuildQueue.shift();
            updateVoiceStepsForCycle(lane, state);
        }

        if (lastTime === null) {
            lastTime = timestamp;
        }

        // Delta time in seconds, clamped to avoid jumps after tab switch
        const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        // No per-frame clear: the opaque static layer (blitted below) covers
        // the whole canvas, replacing the old full-canvas fillRect.

        // 1 beat = 1/4 master cycle (quarter note = BPM)
        // radians per second = BPM × (π/2) / 60
        const radiansPerSecond = state.tempo * Math.PI / 120;
        const angleDelta = radiansPerSecond * deltaTime;

        const prevMainAngle = state.mainAngle;
        const prevAngleA = state.prevAngleA ?? 0;
        const prevAngleB = state.prevAngleB ?? 0;

        // Advance only while the transport is playing. The audio-clock path is
        // precise; the frame-accumulation path is the fallback before audio is
        // unlocked. When paused, mainAngle is frozen (both visual and audio).
        if (state.playing) {
            if (state.audioClockActive && state.audioCtx) {
                state.mainAngle = (state.audioCtx.currentTime - state.audioStartTime) * radiansPerSecond;
            } else {
                state.mainAngle += angleDelta;
            }
        }

        // Update the transport readout: a status when stopped/paused, otherwise
        // the live position (beat within the measure, cycle within the pattern).
        // Written only when the string changes — assigning textContent every
        // frame dirties the DOM and costs layout work on low-end devices.
        if (ui && ui.transportReadout) {
            if (!state.playing) {
                const status = state.transport === 'paused' ? 'Paused' : 'Stopped';
                if (_lastReadout !== status) { ui.transportReadout.textContent = status; _lastReadout = status; }
            } else {
                const beat = Math.floor(state.mainAngle / (Math.PI / 2)) + 1;
                const cycleInPattern = ((Math.floor(state.mainAngle / (2 * Math.PI)) % state.fullPatternCycles) + state.fullPatternCycles) % state.fullPatternCycles + 1;
                const readout = `Beat ${beat} / 4  ·  Cycle ${cycleInPattern} / ${state.fullPatternCycles}`;
                if (_lastReadout !== readout) { ui.transportReadout.textContent = readout; _lastReadout = readout; }
            }
        }

        // Compact playhead in the sticky transport bar tracks master-cycle progress.
        const cycleProgress = (state.mainAngle % (2 * Math.PI)) / (2 * Math.PI);
        if (ui && ui.miniPlayhead) {
            const pct = (cycleProgress * 100).toFixed(2);
            if (_lastMiniPct !== pct) { ui.miniPlayhead.style.left = `${pct}%`; _lastMiniPct = pct; }
        }

        // (Header text moved into the cached static layer — see ensureStaticLayers.)

          // Calculate gear geometry
          // All gears share the same module (tooth size) so teeth mesh properly.
          // The master gear has a fixed size, and smaller gears are scaled proportionally
          // but with a compression factor so they remain visible even at extreme ratios.
         const cx = canvas.width / 2;
         const cy = 218;
         const masterRadius = 145;           // fixed master wheel radius
         const compressionRatio = 0.55;      // compress size ratio for visibility

          // Master gear (fixed size)
         const rMainOuter = masterRadius;
         const rMainInner = rMainOuter * 0.86;

          // Smaller gears: proportional to master, compressed for visibility
         const rAOuter = masterRadius * (0.3 + 0.7 * (state.teethA / state.mainTeeth) * compressionRatio);
         const rAInner = rAOuter * 0.72;
         const rBOuter = masterRadius * (0.3 + 0.7 * (state.teethB / state.mainTeeth) * compressionRatio);
         const rBInner = rBOuter * 0.72;

        const cxA = cx - (rMainOuter + rAOuter) + 6;
        const cxB = cx + (rMainOuter + rBOuter) - 6;

        const stepSize = 2 * Math.PI / state.mainTeeth;
        const angles = {
            main: -state.mainAngle,
            A: getMeshedWheelAngle(state.mainAngle, state.phaseA, state.mainTeeth, state.teethA),
            B: getMeshedWheelAngle(state.mainAngle, state.phaseB, state.mainTeeth, state.teethB)
        };
        state.prevAngleA = angles.A;
        state.prevAngleB = angles.B;

        const currentStep = Math.floor(state.mainAngle / stepSize);
        const prevStep = Math.floor(prevMainAngle / stepSize);

        // Quarter-note click (every π/2 radians = every beat)
        const quarterSize = Math.PI / 2;
        const currentQuarter = Math.floor(state.mainAngle / quarterSize);
        const prevQuarter = Math.floor(prevMainAngle / quarterSize);

        if (currentQuarter !== prevQuarter) {
            state.flash.driver = 12;
        }

        // Flash the A and B wheel reference dots once per full rotation
        if (channels && channels.Awheel && !channels.Awheel.silenced) {
            const aRot = Math.floor(angles.A / (2 * Math.PI));
            const prevARot = Math.floor(prevAngleA / (2 * Math.PI));
            if (aRot !== prevARot) state.flash.A = 12;
        }
        if (channels && channels.Bwheel && !channels.Bwheel.silenced) {
            const bRot = Math.floor(angles.B / (2 * Math.PI));
            const prevBRot = Math.floor(prevAngleB / (2 * Math.PI));
            if (bRot !== prevBRot) state.flash.B = 12;
        }

        // Step-level visual tracking — audio handled by scheduler
        if (currentStep !== prevStep) {
            const previousActive = {
                master: state.lastActive.master,
                Aphrase: state.lastActive.Aphrase,
                Bphrase: state.lastActive.Bphrase,
                Awheel: state.lastActive.Awheel,
                Bwheel: state.lastActive.Bwheel
            };
            // Bound catch-up after a main-thread stall (GC, layout, etc.): the
            // audio-clock-derived mainAngle jumps forward, and replaying every
            // skipped step in one frame turns a single stall into a visible
            // multi-step jerk. Mirror the audio scheduler's catch-up clamp —
            // past MAX steps, jump to the current step without per-step replay
            // (the audio scheduler already drops the missed hits).
            const MAX_VISUAL_CATCH_UP_STEPS = 8;
            const catchUpSteps = currentStep - prevStep;
            let lastActive;
            if (catchUpSteps > MAX_VISUAL_CATCH_UP_STEPS) {
                lastActive = {
                    master: ((currentStep % state.masterPhraseSteps) + state.masterPhraseSteps) % state.masterPhraseSteps,
                    Aphrase: getActivePhraseStep(currentStep, state.phaseA, state.teethA, state.phraseStepsA),
                    Bphrase: getActivePhraseStep(currentStep, state.phaseB, state.teethB, state.phraseStepsB),
                    Awheel: getActiveWheelStep(currentStep, state.phaseA, state.teethA, state.A),
                    Bwheel: getActiveWheelStep(currentStep, state.phaseB, state.teethB, state.B)
                };
                state.lastActive = { ...lastActive };
            } else {
                for (let s = prevStep + 1; s <= currentStep; s++) {
                    lastActive = {
                        master: ((s % state.masterPhraseSteps) + state.masterPhraseSteps) % state.masterPhraseSteps,
                        Aphrase: getActivePhraseStep(s, state.phaseA, state.teethA, state.phraseStepsA),
                        Bphrase: getActivePhraseStep(s, state.phaseB, state.teethB, state.phraseStepsB),
                        Awheel: getActiveWheelStep(s, state.phaseA, state.teethA, state.A),
                        Bwheel: getActiveWheelStep(s, state.phaseB, state.teethB, state.B)
                    };
                    processTriggers(state, lanes, lastActive, channels);
                }
            }
            if (lastActive) markCurrentButtons(lastActive, previousActive);

            // Auto-follow cycle window for multi-cycle lanes
            if (state.masterPhraseCycles > 1 && state.followPlayhead.master) {
                const masterCycle = Math.floor(currentStep / state.mainTeeth) % state.masterPhraseCycles;
                if (masterCycle !== state.visibleCycle.master) {
                    state.visibleCycle.master = masterCycle;
                    _requestDeferredRebuild(lanes.master);
                }
            }

            if (state.phraseCyclesA > 1 && state.followPlayhead.Aphrase) {
                const aCycle = Math.floor(lastActive.Aphrase / state.A);
                if (aCycle !== state.visibleCycle.Aphrase) {
                    state.visibleCycle.Aphrase = aCycle;
                    _requestDeferredRebuild(lanes.Aphrase);
                }
            }

            if (state.phraseCyclesB > 1 && state.followPlayhead.Bphrase) {
                const bCycle = Math.floor(lastActive.Bphrase / state.B);
                if (bCycle !== state.visibleCycle.Bphrase) {
                    state.visibleCycle.Bphrase = bCycle;
                    _requestDeferredRebuild(lanes.Bphrase);
                }
            }
        }

        // Decay flash counters (f is bound at the top of the frame)
        if (f.driver > 0) f.driver--;
        if (f.custom > 0) f.custom--;
        if (f.A > 0) f.A--;
        if (f.B > 0) f.B--;

        // ── Static layers ──
        // Signature covers every input the layers depend on; a rebuild only
        // happens when one of them actually changes.
        if (_frameNo % 4 === 0) {
            _cachedPatternChecksum = computePatternChecksum(lanes);
            _cachedDotsSig = computeDotsSignature(state, lanes);
        }
        _frameNo++;
        const patternChecksum = _cachedPatternChecksum;
        const voiceCounts = `${lanes.master.voices.length}_${lanes.Aphrase.voices.length}_${lanes.Bphrase.voices.length}`;
        const masterCurrentCycle = state.masterPhraseCycles > 1
            ? Math.floor(currentStep / state.mainTeeth) % state.masterPhraseCycles
            : 0;
        const baseSig = [state.A, state.B, state.mainTeeth, state.teethA, state.teethB, state.masterPhraseCycles, state.phraseCyclesA, state.phraseCyclesB, state.masterPhraseSteps, state.phraseStepsA, state.phraseStepsB, state.fullPatternCycles, canvas.width, canvas.height, isMobile, voiceCounts, patternChecksum].join('|');

        // Timelines — push down when many master voices to avoid overlapping the gear
        const timelineX = (canvas.width - 700) / 2;
        const timelineWidth = 700;
        const masterVoiceCount = lanes.master.voices.length;
        const gearBottom = cy + rMainOuter;
        const minTimelineY = gearBottom + 10 + (masterVoiceCount - 1) * 10;
        const timelineY = Math.max(395, minTimelineY);

        if (baseSig !== _layerASig || !_layerA) {
            _layerA = _ensureScratchLayer(_layerA, canvas.width, canvas.height);
            const o = _layerA.getContext('2d');
            o.fillStyle = '#08080c';
            o.fillRect(0, 0, _layerA.width, _layerA.height);

            // Header: current polyrhythm displayed above the gears
            o.save();
            o.fillStyle = '#ffffff';
            o.font = 'bold 16px sans-serif';
            o.textAlign = 'center';
            o.fillText(`${state.A} against ${state.B} Polyrhythm`, canvas.width / 2, 12);
            o.restore();

            // Shared meter-descriptor legend, identical across views (the
            // per-cycle counter moves with layer B below). Baked into the
            // static layer so text is rasterized on meter change, not per frame.
            o.font = 'bold 13px sans-serif';
            o.textAlign = 'center';
            o.fillStyle = '#ffffff';
            o.fillText(`Master Cycle (${state.mainTeeth} pulses per cycle)`, canvas.width / 2, 30);
            o.font = 'bold 12px sans-serif';
            o.textAlign = 'left';
            const aText = `Meter A (${state.A} beats per cycle) · ${state.A} groups of ${state.teethA} beats`;
            const bText = `Meter B (${state.B} beats per cycle) · ${state.B} groups of ${state.teethB} beats`;
            const legendGap = 48;
            const wA = textWidth(o, aText);
            const wB = textWidth(o, bText);
            let legendX = canvas.width / 2 - (wA + legendGap + wB) / 2;
            o.fillStyle = '#ff6b8f';
            o.fillText(aText, legendX, 46);
            legendX += wA + legendGap;
            o.fillStyle = '#6ef2ff';
            o.fillText(bText, legendX, 46);

            // (Gear/meter labels are drawn live per mode — they move between
            // the gears and rings views, and text fills are cheap.)

            _fullPatternBottom = drawFullPatternTimeline(o, state, lanes, timelineX, timelineY + 55, timelineWidth, false);
            _layerASig = baseSig;
        }
        ctx.drawImage(_layerA, 0, 0);

        // (The meter legend now lives in the cached static layers above —
        // see the layer A/Layer B rebuild blocks.)

        const dialR = Math.min(170, cy - 24, timelineY - 12 - cy);

        if (state.vizMode === 'rings') {
            // ── Rings view: the standalone clock-face dial ──
            const dial = getDialSprite(state, dialR, isMobile);
            ctx.drawImage(dial.canvas, cx - dial.half, cy - dial.half);

            // Sweeping hand + current-pulse dots, locked to the master angle
            const handAngle = -Math.PI / 2 - state.mainAngle;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.strokeStyle = 'rgba(255,255,255,0.65)';
            ctx.lineWidth = isMobile ? 1 : 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(dial.rTicks * Math.cos(handAngle), dial.rTicks * Math.sin(handAngle));
            ctx.stroke();
            ctx.fillStyle = '#ff9100';
            ctx.beginPath();
            ctx.arc(dial.rBeat * Math.cos(handAngle), dial.rBeat * Math.sin(handAngle), isMobile ? 3.5 : 4.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#00e5ff';
            ctx.beginPath();
            ctx.arc(dial.rMeterB * Math.cos(handAngle), dial.rMeterB * Math.sin(handAngle), isMobile ? 3.5 : 4.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#ff3366';
            ctx.beginPath();
            ctx.arc(dial.rMeterA * Math.cos(handAngle), dial.rMeterA * Math.sin(handAngle), isMobile ? 3.5 : 4.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();

            // Sweep flashes: each mark lights briefly as the hand crosses it.
            // Only the master tick, Meter A, and Meter B rings flash (the beat
            // ring already carries the orange current-dot on the hand).
            drawRingFlash(ctx, state.mainTeeth, dial.rTicks, cx, cy, 'rgba(255,255,255,0.95)', 3.5, state.mainAngle, isMobile);
            drawRingFlash(ctx, state.A, dial.rMeterA, cx, cy, '#ff6b8f', 8.5, state.mainAngle, isMobile);
            drawRingFlash(ctx, state.B, dial.rMeterB, cx, cy, '#6ef2ff', 8.5, state.mainAngle, isMobile);
            drawRingFlash(ctx, 4, dial.rBeat, cx, cy, '#ff9100', 8.5, state.mainAngle, isMobile);
        } else if (state.vizMode === 'align') {
            drawAlignView(ctx, state, cx, cy, dialR, timelineX, timelineWidth, masterCurrentCycle, isMobile);
        } else if (state.vizMode === 'voice') {
            drawVerbalizationView(ctx, state, cx, cy, dialR, timelineX, timelineWidth, masterCurrentCycle, isMobile);
        } else if (state.vizMode === 'shapes') {
            drawShapesView(ctx, state, cx, cy, dialR, isMobile);
        } else {
            // ── Gears view: the mechanical construction ──

            // Master wheel + A/B pulse dots (pink/cyan, magenta on coincidence)
            drawGear(ctx, cx, cy, rMainInner, rMainOuter, state.mainTeeth, angles.main, '#7a8a9e', true, state.flash.driver, null, isMobile);
            const markerRadius = rMainInner + ((rMainOuter - rMainInner) * 0.45);
            const dotRadius = Math.max(4, rMainOuter * 0.035);
            const dotsSprite = getMasterDotsSprite(state, lanes, rMainInner, markerRadius, dotRadius, isMobile, _cachedDotsSig);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angles.main);
            ctx.drawImage(dotsSprite.canvas, -dotsSprite.half, -dotsSprite.half);
            ctx.restore();

            drawGear(ctx, cxA, cy, rAInner, rAOuter, state.teethA, angles.A, '#ff3366', true, state.flash.A, null, isMobile);
            drawGear(ctx, cxB, cy, rBInner, rBOuter, state.teethB, angles.B, '#00e5ff', true, state.flash.B, null, isMobile);
        }

        // Master-cycle timeline layer: rebuilt only when the playing master
        // cycle (or meter/pattern state) changes, then blitted. The playhead
        // is drawn live on top every frame.
        const sigB = `${baseSig}_${masterCurrentCycle}_${state.phaseA}_${state.phaseB}`;
        if (sigB !== _layerBSig || !_layerB) {
            _layerB = _ensureScratchLayer(_layerB, canvas.width, canvas.height);
            const o = _layerB.getContext('2d');
            // Layer B is transparent (blitted over opaque layer A), so a
            // reused buffer must be cleared before the redraw.
            o.clearRect(0, 0, _layerB.width, _layerB.height);
            // Per-cycle counter of the meter legend: drawn here because it
            // changes once per playing master cycle, like the timeline.
            if (state.masterPhraseCycles > 1) {
                o.font = 'bold 13px sans-serif';
                const wTitle = textWidth(o, `Master Cycle (${state.mainTeeth} pulses per cycle)`);
                o.font = '11px sans-serif';
                o.fillStyle = '#ff9100';
                o.textAlign = 'left';
                o.fillText(`Cycle ${masterCurrentCycle + 1} of ${state.masterPhraseCycles}`, canvas.width / 2 + wTitle / 2 + 6, 31);
            }
            drawMasterCycleTimeline(o, state, lanes, timelineX, timelineY, timelineWidth, 0, currentStep, stepSize, false);
            _layerBSig = sigB;
        }
        ctx.drawImage(_layerB, 0, 0);

        // Master-cycle playhead line — drawn live per frame
        const playheadX = timelineX + cycleProgress * timelineWidth;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, timelineY - 34);
        ctx.lineTo(playheadX, timelineY + 34);
        ctx.stroke();

        // Full-pattern playhead line — also drawn live per frame
        if (_fullPatternBottom > 0) {
            const fullYTop = timelineY + 55;
            const masterCyclesElapsed = state.mainAngle / (2 * Math.PI);
            const fullProgress = (masterCyclesElapsed % state.fullPatternCycles) / state.fullPatternCycles;
            const fullPlayheadX = timelineX + fullProgress * timelineWidth;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fullPlayheadX, fullYTop - 4);
            ctx.lineTo(fullPlayheadX, _fullPatternBottom);
            ctx.stroke();
        }

        requestAnimationFrame(animate);
        } catch (err) { console.error('Animation error:', err); requestAnimationFrame(animate); }
    }

    requestAnimationFrame(animate);
}
