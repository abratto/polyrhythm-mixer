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
Each wheel has a colored dot at its top position. When the dot passes the 12 o'clock position, it marks a beat subdivision. The master wheel's dot fires a quarter-note click at the stated BPM.

### Phase Offset
The phase sliders shift a meter wheel's starting position relative to the master wheel, measured in master teeth. This creates rhythmic displacement without changing the underlying meter relationship.

## Features

- **Interactive meters** — Choose values from 2–16 for each voice
- **Multi-voice layering** — Add independent voices to the master sequence, A phrase, and B phrase lanes. Each voice has its own pattern, instrument, volume, and mute control
- **Phrase sequencers** — Build patterns that span multiple master cycles
- **Wheel lanes** — Select which evenly-spaced placements within a cycle trigger sound
- **43 synthesized percussion instruments** — All generated in real-time via Web Audio API (no samples), including Batá drums (low/middle/high/slap), Conga drums (low/middle/high/slap), Cajón (bass/slap), Cabasa/Shekere, Guiro, and 33 others
- **Pattern preservation** — Changing phrase lengths or meters preserves existing patterns; new steps are appended, excess is truncated
- **Per-channel controls** — Sound selection, volume fader, and mute for each lane and voice
- **Master volume** — Global gain control
- **Tempo control** — 30–180 BPM, where 1 beat = 1/4 master cycle (quarter note)
- **Dual timelines** — Master cycle view (one rotation) and full pattern view (complete phrase repetition), both showing multi-voice layers
- **Local saved rhythms** — Save named grooves in your browser and reload them later without a backend
- **Share links** — Encode your entire setup (including all voices) into a URL

## How to Use

1. **Pick meters** — Select Meter A and Meter B to define the polyrhythm
2. **Set phrase lengths** — Choose how many master cycles each phrase spans
3. **Tap rhythms** — Click step boxes in the sequencer lanes to activate them
4. **Add voices** — Click "+ Voice" on the master, A phrase, or B phrase lanes to layer independent patterns with different instruments
5. **Adjust phase** — Shift each meter's starting position with the phase sliders
6. **Set tempo** — Use the BPM slider (30–180, quarter note = beat)
7. **Enable audio** — Press the green button to hear the mix
8. **Choose sounds** — Each lane and voice has its own instrument, volume, and mute control in the mixer console below
9. **Save or load** — Click "Save Rhythm" to store the current groove locally, or "Load Rhythm" to choose from saved grooves
10. **Share** — Click "Share Groove" to copy a URL with your current configuration

## Instrument Catalog

All sounds are synthesized in real-time using Web Audio oscillators, noise buffers, and filters:

- **Drums**: Kick, Snare, Tom, Rimshot, Handclap, Foot Tap, Electronic Snare, EDM Synth Kick
- **Hand Drums**: Conga (low/middle/high/slap), Bongo (low/high), Batá (low/middle/high/slap), Cajón (bass/slap), Djembe, Timbale, Talking Drum, Udu
- **Cymbals & Hats**: Closed Hi-Hat, Open Hi-Hat, Crash, Ride
- **Percussion**: Shaker, Maraca, Tambourine, Cabasa/Shekere, Guiro, Castanets, Claves, Woodblock, Temple Block, Cowbell, Agogo Bell, Gankogui Double Bell, Triangle, Crystal Ping, Hand Slap

## Technical Notes

- **No build step** — Runs as plain ES modules in the browser
- **Static site** — Hosted on GitHub Pages
- **Web Audio API** — All instruments are synthesized in real-time using oscillators, noise buffers, and filters
- **Canvas rendering** — Frame-rate-independent animation using `requestAnimationFrame` with delta-time calculation
- **Versioned sharing** — Share payloads include a version number with automatic migration from older formats (v0, v1 → v2)
- **Local persistence** — Saved rhythms use the same versioned payload format and are stored in `localStorage`
- **Performance** — Pre-generated noise buffer, reusable selection buffers, cached channel values, and incremental DOM updates

## Regression Smoke Test

The reusable browser smoke harness lives at `scripts/regression-smoke.js`. It is heavily commented for future agents and covers the flows most likely to regress: default first-pulse selections, Master Click, help text, save/load from a fresh page, current share links, legacy saved payloads, and legacy share links.

One-time setup:

```bash
npm install --save-dev playwright
npx playwright install chromium
```

Run:

```bash
node scripts/regression-smoke.js
```

Useful options:

```bash
HEADFUL=1 node scripts/regression-smoke.js
PORT=8010 node scripts/regression-smoke.js
BASE_URL=http://localhost:8000 node scripts/regression-smoke.js
```

The harness snapshots and restores the saved-rhythms `localStorage` key, so it should not leave test rhythms behind. When UI labels, selectors, or persistence fields change, update the smoke harness in the same commit.

## Share Links

The **Share Groove** button encodes the current state into a URL-safe Base64 string appended as an `s` query parameter. The payload includes:

- Meter values, phrase lengths, phase offsets, tempo
- Selected steps for all lanes and voices
- Per-voice sound selection, volume, and mute state
- Fixed channel settings (4-beat click, wheel lanes)

Opening a shared link restores the full configuration, including all voice layers. Invalid or corrupted share links are silently ignored and the app loads with defaults. Older share links (v0, v1) are automatically migrated to the current format.

## License

[MIT](LICENSE) — Free to use, modify, and distribute with attribution.
