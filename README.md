# Polyrhythm Mixer

A web-based tool for visualizing, sequencing, and mixing polyrhythms. Two interlocking gear-like wheels rotate inside a master wheel against a 4/4 beat, with interactive sequencer lanes and synthesized percussion sounds.

![6 against 4 polyrhythm visualization](images/polyrhythm-6-4.png)

## Origin

This project was inspired by earlier work at UC Berkeley's [Center for New Music and Audio Technologies (CNMAT)](https://cnmat.berkeley.edu/) by author **Alan Potosnak** and collaborators **Garo Hussenjian** and **Kit Anderson**, who built a MAX/MSP tool for creating polyrhythms for live performance. The web version preserves the same musical concepts — meter relationships, phrase structures, and phase offsets — in a portable, shareable format.

## Architecture

The **audio clock drives the visual**. The master wheel angle is computed from the Web Audio API's hardware clock (`audioCtx.currentTime`) rather than from frame deltas. A self-adjusting scheduling loop pre-schedules sounds at precise hit times ahead of the rendering thread, while `requestAnimationFrame` handles only the gear animation, step highlighting, and flash effects.

## Features

- **Polyrhythm sequencers** — Meter A and Meter B pulse lanes with individual tooth selection; each tooth lights up independently on click and triggers its own sound, gear dot, and spoke
- **Grouping voice lanes** — The Master lane plus a dynamic list of grouping lanes (equal divisions of the master cycle). Each lane is one voice, shows one step per group, and has its own grouping selector; **+ Voice** adds a new lane and **×** removes one
- **Independent groupings** — Each lane defaults to the chosen polyrhythm (e.g. 6 against 4 → 6- and 4-group lanes) and can be repointed at any divisor of the master cycle (including a single group) without affecting the others
- **Grouping offset** — Each group cell is subdivided into its pulses; the **Offset** nudge shifts where the grouping starts within its group (e.g. the four distinct 3-against-4s of a 3-against-4 frame)
- **Per-lane controls** — Instrument select, volume, solo, and mute are colocated with each sequencer
- **Master Beat reference strip** — 4/4 click track displayed alongside the polyrhythm beat scheme
- **Gear visualization** — Grey 4/4 spokes, pink (A) and cyan (B) meter spokes, and magenta overlap where they land on the same tooth; colored dots mark active pulse positions
- **Cycle navigation** — Multi-cycle phrase support with ◀/▶ browsing and auto-follow playhead
- **Instrument tuning pages** — Interactive parameter tuning for hybrid and membrane families (`tuners/hybrid.html`, `tuners/membrane.html`)
- **Synthesized percussion** — 16 instruments generated in real-time via Web Audio API (oscillators, noise, filters)
- **Tempo control** — 20–180 BPM, quarter-note = beat
- **Save / Load / Share** — Named rhythms stored in localStorage; share links encode full state as a URL parameter
- **Responsive layout** — Works on desktop and mobile

## Instrument Library

All sounds are synthesized in real-time:

- **Membrane**: Bass Drum (Kick), Synth Electronic Tom, Talking Drum, Udu Clay Pot
- **Hybrid**: Bongo Low (Hembra), Bongo High (Macho), Conga Low, Conga Middle, Conga High, Conga Slap, Snare Drum, Electronic Snare, Timbale, Hand Slap, EDM Synth Kick, Djembe, Frame Drum (Tar)
- **Cajón**: Traditional Cajon Bass, Traditional Cajon Slap, Snare Cajon Bass, Snare Cajon Slap

## How to Use

1. **Pick a polyrhythm** — Select Meter A and Meter B values (2–24)
2. **Enable audio** — Press Enable Audio (required by browser autoplay policy)
3. **Tap steps** — Click individual teeth in the Meter A / Meter B pulse lanes, or tap the grouping lanes in Rhythm Tracks
4. **Add grouping voice lanes** — In Rhythm Tracks, click **+ Voice** to add a lane; each lane has its own Grouping dropdown to pick any equal division of the master cycle (scoped to that lane)
5. **Set the offset** — Each group box is split into its pulses; nudge **Offset** to start the grouping on a different pulse (e.g. the four distinct 3-against-4s)
6. **Layer voices** — Click + Voice on the Master lane for layered master patterns; each grouping lane is a voice of its own
7. **Extend phrases** — Set a grouping lane's Phrase Length (or the Master) to 2–8 cycles for longer repeating patterns
8. **Choose sounds** — Each lane and voice has its own instrument select, volume, solo, and mute
9. **Save or Share** — Save stores rhythms locally; Share copies a URL encoding the full state

## Groupings & Offsets

The **Polyrhythm Beat Scheme** defines the *frame*: Meter A and Meter B set the master cycle to `LCM(A, B)` pulses. **Rhythm Tracks** then sequences that frame as a dynamic list of **grouping lanes**.

Each grouping lane is one voice and one **equal division** of the master cycle. Pick a group count (any divisor of the frame) and the lane shows one box per group. The default two lanes are the groupings of the chosen polyrhythm, and **+ Voice** adds more — each lane keeps its own Grouping menu, phrase length, instrument, and controls, independent of the others.

Each box is split into its pulses (the segment row along the bottom edge). The highlighted segment is where the grouping starts; the **Offset** nudge (`← 2/4 →`) slides that start by one pulse, wrapping within the group.

- **6 against 4** → frame of 12 pulses. The 6-group lane has 2 pulses per group, so each box splits into 2 segments; the 4-group lane splits into 3.
- **3 against 4** → frame of 12 pulses. The 3-group lane has 4 pulses per group, giving **four distinct start positions** — the four "3-against-4s" (the grouping starting on pulse 1, 2, 3, or 4 of its group).

Offset is per lane, so different lanes can sit at different phases. A grouping of **1** (the whole master cycle) fires once per cycle.

## Share Links & Versioning

Share payloads are compressed (DEFLATE) and Base64URL-encoded with a `z:` prefix. Each payload carries a version number with automatic migration on load (v0 → v5). Saved rhythms use the same format in localStorage.

## Technical Notes

- **No build step** — Plain ES modules served as a static site (GitHub Pages)
- **Audio-clock architecture** — All timing is derived from the Web Audio hardware clock; visual rendering is passive
- **Modular codebase** — `lane-ui.js`, `scheduler.js`, `render.js`, `share.js`, `instruments.js`, etc.
- **Shared synthesis data** — `instrument-data.js` is the single source of truth; both the app and tuner pages import from it
- **Per-tooth scheduling** — Each tooth in a wheel lane is independently scheduled, selected, and visualized
- **Grouping scheduling** — Grouping lanes fire on group onsets (`stepIndex ≡ phase mod groupSize`), so any group count — including a single group — fires once per cycle; the playhead derives its active step from the same helper

## Running Locally

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

## Regression Testing

```bash
npm install --save-dev playwright
npx playwright install chromium
node scripts/regression-smoke.js
```

## License

[MIT](LICENSE)
