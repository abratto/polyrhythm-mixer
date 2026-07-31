# Changelog

## v1.1.0 — 2026-07-31

### Features
- Lane control buttons (Clear, + Voice, Random/Reverse, Copy/Paste, Nudge, ?, Solo, Mute) restyled as raised, family-accented chips so they read as controls distinct from the flat step grid
- Per-lane accent stripe and hover glow keyed to each lane's color (Meter A/B pulse, Master, A/B phrase)
- Neutral-grey raised surface with brighter text for clearer visual hierarchy
- Nudge label text ("Nudge" / "Nudge Group") matched to the control-button text styling

## v1.0.2 — 2026-07-31

### Fixed
- Saving and restoring rhythms now correctly persists wheel lane beat schemes — removed a false-positive heuristic that incorrectly converted v4 tooth-level positions back to group-level indices

## v1.0.1 — 2026-07-31

### Fixed
- Saved rhythms from older versions (v2/v3) now correctly restore wheel lane patterns by converting group-level indices to tooth-level onset positions
- Inline safety net detects and converts old wheel lane data even if version migration doesn't run

## v1.0.0 — 2026-07-31

### Features
- Layered polyrhythm sequencer with independent Meter A and Meter B pulse lanes
- Multi-voice phrase lanes (Master, Meter A Phrase, Meter B Phrase) with per-voice editing
- Per-lane instrument selection, volume, solo, and mute — all colocated with each sequencer
- Master Beat reference strip (4/4 click track)
- Gear-based polyrhythm visualization with colored spokes, dots, and overlapping blend
- Cycle navigation (◀/▶) with auto-follow playhead — multi-cycle phrase support
- Save / Load / Share rhythms locally and via URL
- Audio playback via Web Audio API synthesis (16+ percussive instruments)
- Detailed instrument tuning pages (`tuners/hybrid.html`, `tuners/membrane.html`)
- Responsive layout for desktop and mobile
- Psychoacoustic parameter tunings for bongos and congas

### Instrument Library
- Bass Drum (Kick), Synth Electronic Tom, Talking Drum, Udu Clay Pot
- Bongo Low (Hembra), Bongo High (Macho)
- Conga Low, Conga Middle, Conga High, Conga Slap
- Snare Drum, Electronic Snare, Timbale, Hand Slap
- EDM Synth Kick, Djembe, Frame Drum (Tar)
- Traditional Cajon Bass/Slap, Snare Cajon Bass/Slap

### Technical
- Modular JavaScript architecture (`lane-ui.js`, `lanes.js`, `scheduler.js`, `render.js`, etc.)
- Per-tooth wheel lane selection with individual toggle support
- Group-based beat visualization with independent tooth control
- Self-adjusting audio scheduler loop with try-catch instrument safety
- Shared synthesis parameter store (`instrument-data.js`) — single source of truth for tuners and app
