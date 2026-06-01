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
import { getActivePhraseStep, getActiveWheelStep } from './math.js';

/**
 * Checks which lane steps have become active since the last frame and
 * triggers sound + flash effects for any newly activated steps.
 * Uses lastActive tracking to fire each trigger only once per step transition.
 */
function processTriggers(state, lanes, playChannelSound, active) {
    if (active.master !== state.lastActive.master) {
        if (lanes.master.selected[active.master]) {
            state.flash.custom = 12;
            playChannelSound('custom');
        }
        state.lastActive.master = active.master;
    }

    if (active.Aphrase !== state.lastActive.Aphrase) {
        if (lanes.Aphrase.selected[active.Aphrase]) {
            state.flash.A = 12;
            playChannelSound('A');
        }
        state.lastActive.Aphrase = active.Aphrase;
    }

    if (active.Awheel !== state.lastActive.Awheel) {
        if (lanes.Awheel.selected[active.Awheel]) {
            state.flash.A = 12;
            playChannelSound('Awheel');
        }
        state.lastActive.Awheel = active.Awheel;
    }

    if (active.Bphrase !== state.lastActive.Bphrase) {
        if (lanes.Bphrase.selected[active.Bphrase]) {
            state.flash.B = 12;
            playChannelSound('B');
        }
        state.lastActive.Bphrase = active.Bphrase;
    }

    if (active.Bwheel !== state.lastActive.Bwheel) {
        if (lanes.Bwheel.selected[active.Bwheel]) {
            state.flash.B = 12;
            playChannelSound('Bwheel');
        }
        state.lastActive.Bwheel = active.Bwheel;
    }
}

/**
 * Draws a single gear (master wheel or meter wheel) on the canvas.
 * The gear is drawn as a polygon with alternating inner/outer radii to create teeth.
 * Includes a center hole, spoke lines, selected-step markers, and a top indicator dot.
 */
function drawGear(ctx, cx, cy, rInner, rOuter, teeth, angle, color, highlightTop = false, flashIntensity = 0, selectedSteps = null) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;

    // Draw gear body as alternating inner/outer polygon
    ctx.beginPath();
    const numPoints = teeth * 2;
    for (let i = 0; i < numPoints; i++) {
        const r = (i % 2 === 0) ? rOuter : rInner;
        const theta = (i * Math.PI) / teeth - Math.PI / 2;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center hole
    ctx.beginPath();
    ctx.arc(0, 0, rInner * 0.22, 0, 2 * Math.PI);
    ctx.fillStyle = '#08080c';
    ctx.fill();
    ctx.stroke();

    // Spoke lines (every quarter of the gear)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < teeth; i += Math.max(1, Math.floor(teeth / 4))) {
        const theta = (i * 2 * Math.PI) / teeth - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rInner * Math.cos(theta), rInner * Math.sin(theta));
        ctx.stroke();
    }

    // Orange markers for selected steps on the master wheel
    if (selectedSteps && selectedSteps.some(Boolean)) {
        const markerRadius = rInner + ((rOuter - rInner) * 0.45);
        for (let i = 0; i < selectedSteps.length; i++) {
            if (!selectedSteps[i]) continue;
            const theta = (i / selectedSteps.length) * Math.PI * 2 - Math.PI / 2;
            const x = markerRadius * Math.cos(theta);
            const y = markerRadius * Math.sin(theta);

            ctx.save();
            ctx.fillStyle = '#ff9100';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff9100';
            ctx.beginPath();
            ctx.arc(x, y, Math.max(4, rOuter * 0.035), 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    // Top position indicator dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -rOuter + (rOuter * 0.08), Math.max(2, rOuter * 0.04), 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Flash indicator above the gear (glows when triggered)
    if (highlightTop) {
        ctx.save();
        ctx.translate(cx, cy - rOuter - 18);
        ctx.fillStyle = flashIntensity > 0 ? '#ffffff' : '#171721';
        if (flashIntensity > 0) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = color;
        }
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#fff';
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
function drawMasterCycleTimeline(ctx, state, lanes, startX, y, width) {
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
    for (let i = 0; i <= state.mainTeeth; i++) {
        const x = startX + (i / state.mainTeeth) * width;
        ctx.strokeStyle = i % Math.max(1, Math.floor(state.mainTeeth / 4)) === 0
            ? 'rgba(255,255,255,0.20)'
            : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = i % Math.max(1, Math.floor(state.mainTeeth / 4)) === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x, y + 18);
        ctx.stroke();
    }

    // Playhead position based on current master wheel angle
    const cycleProgress = (state.mainAngle % (2 * Math.PI)) / (2 * Math.PI);
    const playheadX = startX + cycleProgress * width;

    // Master wheel selected steps (orange dots)
    lanes.master.selected.forEach((on, i) => {
        if (!on) return;
        const x = startX + (i / state.mainTeeth) * width;
        drawTimelineMarker(ctx, x, y, '#ff9100', 'dot', 4);
    });

    // Wheel lane steps (diamonds, offset above/below axis)
    lanes.Awheel.selected.forEach((on, i) => {
        if (!on) return;
        const step = (i * state.teethA + state.phaseA) % state.mainTeeth;
        const x = startX + (step / state.mainTeeth) * width;
        drawTimelineMarker(ctx, x, y - 14, '#ff6b8f', 'diamond', 4);
    });

    lanes.Bwheel.selected.forEach((on, i) => {
        if (!on) return;
        const step = (i * state.teethB + state.phaseB) % state.mainTeeth;
        const x = startX + (step / state.mainTeeth) * width;
        drawTimelineMarker(ctx, x, y + 14, '#6ef2ff', 'diamond', 4);
    });

    // Phrase lane steps (triangles, further offset)
    lanes.Aphrase.selected.forEach((on, i) => {
        if (!on) return;
        const step = (i * state.teethA + state.phaseA) % state.mainTeeth;
        const x = startX + (step / state.mainTeeth) * width;
        drawTimelineMarker(ctx, x, y - 28, '#ff3366', 'up', 4);
    });

    lanes.Bphrase.selected.forEach((on, i) => {
        if (!on) return;
        const step = (i * state.teethB + state.phaseB) % state.mainTeeth;
        const x = startX + (step / state.mainTeeth) * width;
        drawTimelineMarker(ctx, x, y + 28, '#00e5ff', 'down', 4);
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
    const rowAY = yTop + 18;
    const rowBY = yTop + 46;
    const bottomY = yTop + 62;

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`FULL PATTERN TIMELINE (${totalCycles} master cycles)`, startX, yTop - 8);

    ctx.fillStyle = '#ff3366';
    ctx.fillText('A phrase', startX, rowAY - 8);

    ctx.fillStyle = '#00e5ff';
    ctx.fillText('B phrase', startX, rowBY - 8);

    // Timeline axes
    ctx.strokeStyle = '#2d2d3d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, rowAY);
    ctx.lineTo(startX + width, rowAY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, rowBY);
    ctx.lineTo(startX + width, rowBY);
    ctx.stroke();

    // Adaptive cycle label spacing
    let labelEvery = 1;
    if (totalCycles > 6) labelEvery = 2;
    if (totalCycles > 12) labelEvery = 4;
    if (totalCycles > 24) labelEvery = 8;

    // Cycle dividers and labels
    for (let c = 0; c <= totalCycles; c++) {
        const x = startX + (c / totalCycles) * width;

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

    // A phrase markers (repeating across the full pattern)
    const aRepeatSteps = state.phraseStepsA * state.teethA;
    lanes.Aphrase.selected.forEach((on, i) => {
        if (!on) return;
        for (let pos = i * state.teethA + state.phaseA; pos < totalSteps + state.phaseA; pos += aRepeatSteps) {
            const normalized = ((pos % totalSteps) + totalSteps) % totalSteps;
            const x = startX + (normalized / totalSteps) * width;
            drawTimelineMarker(ctx, x, rowAY, '#ff3366', 'dot', 4);
        }
    });

    // B phrase markers
    const bRepeatSteps = state.phraseStepsB * state.teethB;
    lanes.Bphrase.selected.forEach((on, i) => {
        if (!on) return;
        for (let pos = i * state.teethB + state.phaseB; pos < totalSteps + state.phaseB; pos += bRepeatSteps) {
            const normalized = ((pos % totalSteps) + totalSteps) % totalSteps;
            const x = startX + (normalized / totalSteps) * width;
            drawTimelineMarker(ctx, x, rowBY, '#00e5ff', 'dot', 4);
        }
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
export function startAnimation({ canvas, ctx, ui, state, lanes, playChannelSound, markCurrentButtons }) {
    let lastTime = null;

    function animate(timestamp) {
        ctx.fillStyle = '#08080c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (lastTime === null) {
            lastTime = timestamp;
        }

        // Delta time in seconds, clamped to avoid jumps after tab switch
        const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        // 1 beat = 1/4 master cycle (quarter note = BPM)
        // radians per second = BPM × (π/2) / 60
        const radiansPerSecond = state.tempo * Math.PI / 120;
        const angleDelta = radiansPerSecond * deltaTime;

        const prevMainAngle = state.mainAngle;
        state.mainAngle += angleDelta;

        // Calculate gear geometry
        const cx = canvas.width / 2;
        const cy = 205;
        const baseScale = 145;

        const rMainOuter = baseScale;
        const rMainInner = rMainOuter * 0.86;
        const rAOuter = baseScale * (state.teethA / state.mainTeeth);
        const rAInner = rAOuter * 0.72;
        const rBOuter = baseScale * (state.teethB / state.mainTeeth);
        const rBInner = rBOuter * 0.72;

        const cxA = cx - (rMainOuter + rAOuter) + 6;
        const cxB = cx + (rMainOuter + rBOuter) - 6;

        const stepSize = 2 * Math.PI / state.mainTeeth;
        const angles = {
            main: -state.mainAngle,
            A: (state.mainAngle - state.phaseA * stepSize) * (state.mainTeeth / state.teethA),
            B: (state.mainAngle - state.phaseB * stepSize) * (state.mainTeeth / state.teethB)
        };

        const currentStep = Math.floor(state.mainAngle / stepSize);
        const prevStep = Math.floor(prevMainAngle / stepSize);

        // Quarter-note click (every π/2 radians = every beat)
        const quarterSize = Math.PI / 2;
        const currentQuarter = Math.floor(state.mainAngle / quarterSize);
        const prevQuarter = Math.floor(prevMainAngle / quarterSize);

        if (currentQuarter !== prevQuarter) {
            state.flash.driver = 12;
            playChannelSound('driver');
        }

        // Step-level triggers for lane sounds
        if (currentStep !== prevStep) {
            const active = {
                master: ((currentStep % state.mainTeeth) + state.mainTeeth) % state.mainTeeth,
                Aphrase: getActivePhraseStep(currentStep, state.phaseA, state.teethA, state.phraseStepsA),
                Bphrase: getActivePhraseStep(currentStep, state.phaseB, state.teethB, state.phraseStepsB),
                Awheel: getActiveWheelStep(currentStep, state.phaseA, state.teethA, state.A),
                Bwheel: getActiveWheelStep(currentStep, state.phaseB, state.teethB, state.B)
            };

            markCurrentButtons(active);
            processTriggers(state, lanes, playChannelSound, active);
        }

        // Decay flash counters
        Object.keys(state.flash).forEach(k => {
            if (state.flash[k] > 0) state.flash[k]--;
        });

        // Draw gears
        drawGear(ctx, cx, cy, rMainInner, rMainOuter, state.mainTeeth, angles.main, '#7a8a9e', true, Math.max(state.flash.driver, state.flash.custom), lanes.master.selected);
        drawGear(ctx, cxA, cy, rAInner, rAOuter, state.teethA, angles.A, '#ff3366', true, state.flash.A);
        drawGear(ctx, cxB, cy, rBInner, rBOuter, state.teethB, angles.B, '#00e5ff', true, state.flash.B);

        // Labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`MASTER WHEEL (${state.mainTeeth} TEETH / LCM)`, cx, cy - rMainOuter - 32);
        ctx.fillText(`A: ${state.A} (${state.teethA}:${state.mainTeeth})`, cxA, cy + rAOuter + 50);
        ctx.fillText(`B: ${state.B} (${state.teethB}:${state.mainTeeth})`, cxB, cy + rBOuter + 50);

        // Timelines
        const timelineX = (canvas.width - 700) / 2;
        const timelineWidth = 700;

        drawMasterCycleTimeline(ctx, state, lanes, timelineX, 395, timelineWidth);
        drawFullPatternTimeline(ctx, state, lanes, timelineX, 450, timelineWidth);

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}
