# Roadmap

## Performance

### AudioWorklet synthesis
Every trigger creates new `OscillatorNode` / `GainNode` / `BiquadFilter` objects
that are never disconnected or pooled. At high BPM with dense patterns and
complex instruments (e.g. conga creates 11 nodes per hit), this generates
significant GC pressure and leaked nodes in the audio graph.

An `AudioWorkletProcessor` (registered via blob URL so no build step is needed)
would move all sample generation to the audio render thread behind a single
persistent `AudioWorkletNode`. The main thread would post scheduling batches and
the worklet would handle polyphonic voice management, envelope generation, and
filtering internally. This eliminates per-trigger node allocation entirely and
removes main-thread scheduling jitter.

**Estimated effort:** 500–800 lines — rewriting instrument functions into
worklet-processor voices.

### Audio node pooling (interim)
If AudioWorklet is out of reach, pool frequently-used nodes (`OscillatorNode`,
`GainNode`, `BiquadFilter`) and reuse "dead" nodes that have finished their
`stop()` time. Simpler than AudioWorklet but still cuts GC pressure.

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
- `audio.js` (1,746 lines) → `instruments.js` (1,248), `channels.js` (258),
  `scheduler.js` (214), `audio.js` (55)
- **`instruments.js`** — catalog, all `play*` functions, helpers, dispatch table
- **`channels.js`** — channel creation, DOM wiring, mixer controls, solo detection
- **`scheduler.js`** — timing loop, step scheduling, `playSingleChannel`
- **`audio.js`** — thin facade: `toggleAudio` + re-exports

### Split remaining files
- `lanes.js` (1,413 lines) → `lane-ui.js` (1,413), `lanes.js` (25-line re-export facade)

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
