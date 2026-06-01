# Polyrhythm Mixer

A web-based tool for visualizing, sequencing, and mixing polyrhythms. Two interlocking gear-like wheels rotate inside a master wheel, with interactive sequencer lanes and synthesized percussion sounds.

## Origin

This project grew out of work at [CNMAT](https://cnmat.berkeley.edu/) (Center for New Music and Audio Technologies) at UC Berkeley, where the author built a MAX/MSP tool for creating polyrhythms for live performance. The web version preserves the same musical concepts — meter relationships, phrase structures, and phase offsets — in a portable, shareable format.

## How the Gears Work

The visualization uses a mechanical metaphor to make polyrhythms intuitive:

### Master Wheel (center, gray)
The master wheel is the common denominator. Its tooth count is the **least common multiple (LCM)** of meters A and B. One full rotation of the master wheel represents one complete polyrhythmic cycle — the point at which both meters realign at their starting positions.

### Meter Wheels (left = A, right = B)
Each meter wheel has a number of teeth proportional to its meter value. Because the wheels are mechanically coupled to the master wheel, they rotate at different speeds:

- Meter A completes `mainTeeth / A` rotations per master cycle
- Meter B completes `mainTeeth / B` rotations per master cycle

For example, in a 3:4 polyrhythm, the master wheel has 12 teeth. Wheel A has 4 teeth and rotates 3 times per master cycle. Wheel B has 3 teeth and rotates 4 times per master cycle. The point where all three wheels return to their starting position simultaneously is the LCM.

### Top Indicator Dots
Each wheel has a white dot at its top position. When the dot passes the 12 o'clock position, it marks a beat subdivision. The master wheel's dot fires a quarter-note click at the stated BPM.

### Phase Offset
The phase sliders shift a meter wheel's starting position relative to the master wheel, measured in master teeth. This creates rhythmic displacement without changing the underlying meter relationship.

## Features

- **Interactive meters** — Choose values from 2–16 for each voice
- **Phrase sequencers** — Build patterns that span multiple master cycles
- **Wheel lanes** — Select which evenly-spaced placements within a cycle trigger sound
- **30 synthesized percussion instruments** — All generated in real-time via Web Audio API (no samples)
- **Per-channel controls** — Sound selection, volume fader, and mute for each lane
- **Master volume** — Global gain control
- **Tempo control** — 30–180 BPM, where 1 beat = 1/4 master cycle (quarter note)
- **Dual timelines** — Master cycle view (one rotation) and full pattern view (complete phrase repetition)
- **Share links** — Encode your entire setup into a URL

## How to Use

1. **Pick meters** — Select Meter A and Meter B to define the polyrhythm
2. **Set phrase lengths** — Choose how many master cycles each phrase spans
3. **Tap rhythms** — Click step boxes in the sequencer lanes to activate them
4. **Adjust phase** — Shift each meter's starting position with the phase sliders
5. **Set tempo** — Use the BPM slider (30–180, quarter note = beat)
6. **Enable audio** — Press the green button to hear the mix
7. **Choose sounds** — Each lane has its own instrument, volume, and mute control
8. **Share** — Click Share to copy a URL with your current configuration

## Technical Notes

- **No build step** — Runs as plain ES modules in the browser
- **Static site** — Hosted on GitHub Pages
- **Web Audio API** — All instruments are synthesized in real-time using oscillators, noise buffers, and filters
- **Canvas rendering** — Frame-rate-independent animation using `requestAnimationFrame` with delta-time calculation
- **Versioned sharing** — Share payloads include a version number with automatic migration from older formats

## Share Links

The **Share** button encodes the current state into a URL-safe Base64 string appended as an `s` query parameter. The payload includes:

- Meter values, phrase lengths, phase offsets, tempo
- Selected steps for all lanes
- Per-channel sound selection, volume, and mute state

Opening a shared link restores the full configuration. Invalid or corrupted share links are silently ignored and the app loads with defaults.

## License

[MIT](LICENSE) — Free to use, modify, and distribute with attribution.
