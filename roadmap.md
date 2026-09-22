# Roadmap

## Performance

### ~~AudioNode pooling~~ ✗ Not viable
Evaluated and dropped: oscillator nodes are one-shot (they cannot be restarted),
so recycling them raises invalid-state errors. `pool.js` is now a plain
`createOscillator` factory. Steady-state synthesis is already avoided by
pre-rendering each instrument to an audio buffer (`instruments.js`), which plays
through a single gain node per hit.

### AudioWorklet synthesis (future)
Replace the entire instrument dispatch with a single `AudioWorkletProcessor`
running in the audio render thread. Benefits: sample-accurate timing, zero
main-thread GC from audio, polyphonic voice management with shared resources.
Requires rewriting all 50+ instruments as DSP code (sine/triangle/square waves,
envelopes, biquad filters) inside the worklet's `process()` method.
Estimated effort: 500–800 lines.

### Web Worker scheduler timer (if still needed on low-end devices)
Move the scheduler's wake-up `setTimeout` into a Web Worker so wake-ups are not
delayed by main-thread rendering; the lookahead can then be reduced. Pair with
`audioCtx.outputLatency` compensation for tighter audio/visual sync.

### Timeline marker batching
Multiple `drawTimelineMarker` calls each do their own `save/restore` + `beginPath` +
`fill` + `stroke`. Batch same-color dots into a single `beginPath` block. Only
affects layer rebuilds (edits), not steady playback.

### Teeth index precomputation
`(i * state.teethA + state.phaseA) % state.mainTeeth` computed in several loop
bodies every frame. Precompute a `Uint16Array` lookup once per meter change.

---

## Code Quality

### Split lane-ui.js
`lane-ui.js` (~1,700 lines) still mixes lane config, pattern editing, voice-row
rendering, cycle navigation, the Master Beat strip, rail collapse, mix dimming,
and playhead marking. Candidate split — lane-config / lane-render / cycle-nav /
master-beat-strip / lane-mix / lane-playhead — behind the existing `lanes.js`
facade so imports don't churn.

### Fold the Master Beat rAF into the main loop
The Master Beat strip runs its own `requestAnimationFrame` loop alongside the
canvas loop; driving it from the main frame would remove the duplicate callback.

### Normalize CSS indentation
`main.css` has mixed 8-space and 0-space indentation (notably the volume-fader
block around line 984).

### Move inline styles to CSS
A few inline `style=` attributes in `index.html` and `.style.*` assignments in JS
should use CSS classes.

### Normalize naming
`shareDeps` in `app.js` vs `deps` in consuming modules.

---

## Features

### Per-channel effect controls
Reverb send, filter cutoff, pan per channel.

### Export as WAV
Download a recording of the current pattern as an audio file.

### MIDI output
Send note-on/off events to external hardware or DAW via Web MIDI API.
