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

### Split large files
- **`audio.js`** (1,760+ lines) — separate into `channels.js`, `instruments.js`,
  `scheduler.js`
- **`lanes.js`** (1,400+ lines) — separate lane creation, step buttons, playhead,
  edit controls
- **`main.css`** (1,800+ lines) — split into layout, buttons, lane, modal sections

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
