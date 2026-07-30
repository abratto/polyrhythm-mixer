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

/** Cache for pre-rendered gear body Path2D objects, keyed by tooth count + radii. */
const _gearBodyCache = {};

/** Pre-allocated scratch buffers for A/B dot masks, grown on demand. */
let _scratchA = new Uint8Array(0);
let _scratchB = new Uint8Array(0);

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

    if (active.Awheel !== state.lastActive.Awheel) {
        if (lanes.Awheel.selected[active.Awheel] && !lanes.Awheel.channel?.silenced) state.flash.A = 12;
        state.lastActive.Awheel = active.Awheel;
    }

    if (active.Bphrase !== state.lastActive.Bphrase) {
        lanes.Bphrase.voices.forEach((voice) => {
            if (voice.selected[active.Bphrase] && !voice.channel?.silenced) state.flash.B = 12;
        });
        state.lastActive.Bphrase = active.Bphrase;
    }

    if (active.Bwheel !== state.lastActive.Bwheel) {
        if (lanes.Bwheel.selected[active.Bwheel] && !lanes.Bwheel.channel?.silenced) state.flash.B = 12;
        state.lastActive.Bwheel = active.Bwheel;
    }
}

/**
 * Draws a single gear (master wheel or meter wheel) on the canvas.
 * The gear is drawn as a polygon with alternating inner/outer radii to create teeth.
 * Includes a center hole, spoke lines, selected-step markers, and a top indicator dot.
 */
function drawGear(ctx, cx, cy, rInner, rOuter, teeth, angle, color, highlightTop = false, flashIntensity = 0, selectedSteps = null, isMobile = false) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isMobile ? 1.5 : 2.5;

    // Gear body — use pre-rendered Path2D (shape is static per tooth count + radii)
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
    ctx.fill(_gearBodyCache[bodyKey]);
    ctx.stroke(_gearBodyCache[bodyKey]);

    // Center hole
    ctx.beginPath();
    ctx.arc(0, 0, rInner * 0.22, 0, 2 * Math.PI);
    ctx.fillStyle = '#08080c';
    ctx.fill();
    ctx.stroke();

    // Spoke lines — always 4 spokes at quarter-turn positions (the master beat)
    if (!isMobile) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        for (let q = 0; q < 4; q++) {
            const theta = q * Math.PI / 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(rInner * Math.cos(theta), rInner * Math.sin(theta));
            ctx.stroke();
        }
    }

    // Orange markers for selected steps on the master wheel
    if (selectedSteps && selectedSteps.some(Boolean)) {
        const markerRadius = rInner + ((rOuter - rInner) * 0.45);
        ctx.save();
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

    // Top position indicator dot — marks the reference tooth (start of rotation)
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = isMobile ? 0 : 6;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(0, -rOuter + (rOuter * 0.12), Math.max(3, rOuter * 0.08), 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Reference dot above the gear — always visible in the gear's color
    if (highlightTop) {
        ctx.save();
        ctx.translate(cx, cy - rOuter - 18);
        ctx.fillStyle = flashIntensity > 0 ? '#ffffff' : color;
        if (flashIntensity > 0) {
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
function drawMasterCycleTimeline(ctx, state, lanes, startX, y, width, cycleProgress, currentStep, stepSize) {
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

    // Playhead line
    const playheadX = startX + cycleProgress * width;

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
        const step = (i * state.teethA + state.phaseA) % state.mainTeeth;
        drawTimelineMarker(ctx, startX + step * pixelPerTooth, y - 14, '#ff6b8f', 'diamond', 4);
    });

    lanes.Bwheel.selected.forEach((on, i) => {
        if (!on) return;
        const step = (i * state.teethB + state.phaseB) % state.mainTeeth;
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

    // Playhead line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, y - 34);
    ctx.lineTo(playheadX, y + 34);
    ctx.stroke();
}

/**
 * Draws the Full Pattern Timeline — shows how phrase patterns repeat
 * across multiple master cycles. Each row represents a phrase (A or B),
 * with markers showing where selected steps fall within the full pattern.
 */
function drawFullPatternTimeline(ctx, state, lanes, startX, yTop, width) {
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

    // Playhead showing progress through the full pattern
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
    const MIN_FRAME_MS = isMobile ? 33 : 0;
    let lastDrawTime = 0;

    // Lane rebuild queue — defer DOM rebuilds from the animation loop to avoid
    // innerHTML teardown + recreation mid-rAF, which guarantees a frame drop.
    const _laneRebuildQueue = [];
    function _requestDeferredRebuild(lane) {
        if (!_laneRebuildQueue.includes(lane)) _laneRebuildQueue.push(lane);
    }

    // Reused buffer for merging master voice selections.
    // Grow it on demand so higher meter pairs such as 17 against 18 still render correctly.

    function animate(timestamp) {
        try {
        // Dynamically resize canvas height as voices are added/removed
        const totalVoices = lanes.master.voices.length + lanes.Aphrase.voices.length + lanes.Bphrase.voices.length;
        const minCanvasHeight = 498 + totalVoices * 18 + 20;
        if (canvas.height !== minCanvasHeight) {
            canvas.height = minCanvasHeight;
        }

        // On mobile, throttle rendering to ~30fps; audio is handled by scheduler
        if (isMobile && timestamp - lastDrawTime < MIN_FRAME_MS) {
            requestAnimationFrame(animate);
            return;
        }
        lastDrawTime = timestamp;

        // Flush deferred lane rebuilds before drawing (avoids DOM churn during rAF)
        while (_laneRebuildQueue.length > 0) {
            const lane = _laneRebuildQueue.shift();
            buildLane(lane, state);
        }

        if (lastTime === null) {
            lastTime = timestamp;
        }

        // Delta time in seconds, clamped to avoid jumps after tab switch
        const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        ctx.fillStyle = '#08080c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

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
        if (ui && ui.transportReadout) {
            if (!state.playing) {
                ui.transportReadout.textContent = state.transport === 'paused' ? 'Paused' : 'Stopped';
            } else {
                const beat = Math.floor(state.mainAngle / (Math.PI / 2)) + 1;
                const cycleInPattern = ((Math.floor(state.mainAngle / (2 * Math.PI)) % state.fullPatternCycles) + state.fullPatternCycles) % state.fullPatternCycles + 1;
                ui.transportReadout.textContent = `Beat ${beat} / 4  ·  Cycle ${cycleInPattern} / ${state.fullPatternCycles}`;
            }
        }

        // Compact playhead in the sticky transport bar tracks master-cycle progress.
        const cycleProgress = (state.mainAngle % (2 * Math.PI)) / (2 * Math.PI);
        if (ui && ui.miniPlayhead) {
            ui.miniPlayhead.style.left = `${cycleProgress * 100}%`;
        }

          // Calculate gear geometry
          // All gears share the same module (tooth size) so teeth mesh properly.
          // The master gear has a fixed size, and smaller gears are scaled proportionally
          // but with a compression factor so they remain visible even at extreme ratios.
         const cx = canvas.width / 2;
         const cy = 205;
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
            let lastActive = null;
            for (let s = prevStep + 1; s <= currentStep; s++) {
                const active = {
                    master: ((s % state.masterPhraseSteps) + state.masterPhraseSteps) % state.masterPhraseSteps,
                    Aphrase: getActivePhraseStep(s, state.phaseA, state.teethA, state.phraseStepsA),
                    Bphrase: getActivePhraseStep(s, state.phaseB, state.teethB, state.phraseStepsB),
                    Awheel: getActiveWheelStep(s, state.phaseA, state.teethA, state.A),
                    Bwheel: getActiveWheelStep(s, state.phaseB, state.teethB, state.B)
                };
                lastActive = active;
                processTriggers(state, lanes, active, channels);
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

        // Decay flash counters
        const f = state.flash;
        if (f.driver > 0) f.driver--;
        if (f.custom > 0) f.custom--;
        if (f.A > 0) f.A--;
        if (f.B > 0) f.B--;

        // Draw gears — the master wheel now shows the A-pulse and B-pulse patterns
        // (pink and cyan dots) instead of the Master voice selected steps.
        drawGear(ctx, cx, cy, rMainInner, rMainOuter, state.mainTeeth, angles.main, '#7a8a9e', true, state.flash.driver, null, isMobile);

        // A-pulse and B-pulse dots on the master wheel, color-coded pink and cyan
        // Grow scratch buffers on demand (e.g. 17:18 → 306 teeth)
        if (_scratchA.length < state.mainTeeth) {
            _scratchA = new Uint8Array(state.mainTeeth);
            _scratchB = new Uint8Array(state.mainTeeth);
        }
        _scratchA.fill(0);
        _scratchB.fill(0);
        lanes.Awheel.selected.forEach((on, i) => {
            if (on) _scratchA[(i * state.teethA + state.phaseA) % state.mainTeeth] = 1;
        });
        lanes.Bwheel.selected.forEach((on, i) => {
            if (on) _scratchB[(i * state.teethB + state.phaseB) % state.mainTeeth] = 1;
        });
        const aDots = _scratchA;
        const bDots = _scratchB;
        const markerRadius = rMainInner + ((rMainOuter - rMainInner) * 0.45);
        const dotRadius = Math.max(4, rMainOuter * 0.035);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angles.main);
        // Single pass per tooth: draw spokes and dots together
        for (let t = 0; t < state.mainTeeth; t++) {
            const aOn = aDots[t];
            const bOn = bDots[t];
            if (!aOn && !bOn) continue;
            const theta = (t / state.mainTeeth) * Math.PI * 2 - Math.PI / 2;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            // Spoke from centre
            ctx.lineWidth = 4;
            ctx.shadowBlur = 0;
            if (aOn && bOn) ctx.strokeStyle = '#c07ae6';
            else if (aOn) ctx.strokeStyle = '#ff6b8f';
            else ctx.strokeStyle = '#6ef2ff';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(rMainInner * cosT, rMainInner * sinT);
            ctx.stroke();

            // Dot(s) at the tooth — offset when both land on same tooth
            ctx.lineWidth = isMobile ? 1 : 2;
            ctx.shadowBlur = isMobile ? 0 : 10;
            ctx.strokeStyle = '#ffffff';
            if (aOn) {
                ctx.fillStyle = '#ff6b8f';
                ctx.shadowColor = '#ff6b8f';
                const rA = markerRadius + (aOn && bOn ? -5 : 0);
                ctx.beginPath();
                ctx.arc(rA * cosT, rA * sinT, dotRadius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
            if (bOn) {
                ctx.fillStyle = '#6ef2ff';
                ctx.shadowColor = '#6ef2ff';
                const rB = markerRadius + (aOn && bOn ? 5 : 0);
                ctx.beginPath();
                ctx.arc(rB * cosT, rB * sinT, dotRadius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
        }
        ctx.restore();

        drawGear(ctx, cxA, cy, rAInner, rAOuter, state.teethA, angles.A, '#ff3366', true, state.flash.A, null, isMobile);
        drawGear(ctx, cxB, cy, rBInner, rBOuter, state.teethB, angles.B, '#00e5ff', true, state.flash.B, null, isMobile);

        // Labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        const currentCycle = state.masterPhraseCycles > 1
            ? Math.floor(currentStep / state.mainTeeth) % state.masterPhraseCycles
            : 0;
        ctx.fillText(`MASTER (${state.mainTeeth} TEETH / LCM)`, cx, cy - rMainOuter - 32);
        if (state.masterPhraseCycles > 1) {
            ctx.font = '11px sans-serif';
            ctx.fillStyle = '#ff9100';
            ctx.fillText(`C${currentCycle + 1} of ${state.masterPhraseCycles}`, cx, cy - rMainOuter - 50);
        }
        ctx.fillText(`METER A ${state.A} (${state.teethA}:${state.mainTeeth})`, cxA, cy + rAOuter + 50);
        ctx.fillText(`METER B ${state.B} (${state.teethB}:${state.mainTeeth})`, cxB, cy + rBOuter + 50);

        // Timelines
        const timelineX = (canvas.width - 700) / 2;
        const timelineWidth = 700;

        drawMasterCycleTimeline(ctx, state, lanes, timelineX, 395, timelineWidth, cycleProgress, currentStep, stepSize);
        drawFullPatternTimeline(ctx, state, lanes, timelineX, 450, timelineWidth);

        requestAnimationFrame(animate);
        } catch (err) { console.error('Animation error:', err); requestAnimationFrame(animate); }
    }

    requestAnimationFrame(animate);
}
