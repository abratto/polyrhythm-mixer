# Roadmap

## Performance

## Performance

### ~~AudioNode pooling~~ 🚧 IN PROGRESS
Swap `createOscillator` / `createGain` / `createBiquadFilter` for pooled
versions. After each trigger's nodes finish (onended), they're disconnected
and returned to the pool instead of being GC'd. Eliminates ~90% of per-trigger
allocations with no architectural changes. ~100 lines.

### AudioWorklet synthesis (future)
Replace the entire instrument dispatch with a single `AudioWorkletProcessor`
running in the audio render thread. Benefits: sample-accurate timing, zero
main-thread GC from audio, polyphonic voice management with shared resources.
Requires rewriting all 50+ instruments as DSP code (sine/triangle/square waves,
envelopes, biquad filters) inside the worklet's `process()` method.
Estimated effort: 500–800 lines.

### Timeline marker batching
Multiple `drawTimelineMarker` calls each do their own `save/restore` + `beginPath` +
`fill` + `stroke`. Batch same-color dots into a single `beginPath` block.

### Teeth index precomputation
`(i * state.teethA + state.phaseA) % state.mainTeeth` computed in 6+ loop
bodies every frame. Precompute a `Uint16Array` lookup once per meter change.

### Canvas text rasterization avoidance
~8 `fillText` calls per frame for static labels. Cache rasterized text on an
offscreen canvas and `drawImage()` instead.

---

## Code Quality

### ~~Split large files~~ ✓ DONE
- `audio.js` (1,746 lines) → `instruments.js` (1,248), `channels.js` (263),
  `scheduler.js` (224), `audio.js` (66)
- `lanes.js` (1,413 lines) → `lane-ui.js` (1,413), `lanes.js` (22-line facade)
- Both use re-export facades so existing imports continue to work.

### Normalize CSS indentation
`main.css` has mixed 8-space, 4-space, and 0-space indentation.

### Move inline styles to CSS
6 label color inline styles in `index.html` and several `.style.*` assignments
in `lanes.js` should use CSS classes.

### Normalize naming
- `masterVoices` vs `Avoices` vs `Bvoices` (inconsistent capitalization)
- `shareDeps` in `app.js` vs `deps` in consuming modules

---

## Features

### Copy/paste for lanes
`copyLane` / `pasteLane` functions exist in `lanes.js` but are not wired to
any UI button. Wire them and add copy/paste buttons to lane edit controls.

### Per-channel effect controls
Reverb send, filter cutoff, pan per channel.

### Export as WAV
Download a recording of the current pattern as an audio file.

### MIDI output
Send note-on/off events to external hardware or DAW via Web MIDI API.
