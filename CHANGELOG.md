# Changelog

## v1.3.6 — 2026-07-31

### Fixed
- Saved rhythms and share links now preserve Meter B Pulse solo state

## v1.3.5 — 2026-07-31

### Fixed
- Reset Mixer now refreshes the Polyrhythm Beat Scheme summary to match the restored meter ratio

## v1.3.4 — 2026-07-31

### Fixed
- Phrase steps edited in later cycles now remain assigned to the displayed cycle after navigating or following the playhead
- Growing a master phrase no longer overwrites patterns already edited in existing cycles

## v1.3.3 — 2026-07-31

### Fixed
- Changing a phrase length (master, A, or B) no longer resets the wheel lane patterns — `rebuildSystem` now only recalculates wheel onsets when the polyrhythm ratio (A/B) actually changes

## v1.3.2 — 2026-07-31

### Fixed
- Restoring a cleared (fully empty) wheel lane pattern no longer falls back to the default onset pattern — a saved empty `aw.s = []` is now correctly restored as zero active teeth

## v1.3.1 — 2026-07-31

### Fixed
- Mute button selected state is now a vivid, bright red — matching the solo button's "lit-up" visual energy — with stronger inner ring and outer glow
- Solo button now auto-expands to fit "Soloed" + status dot without text clipping

## v1.3.0 — 2026-07-31

### Features
- Solo / Mute buttons now show a clear "on" state: bright gradient fill, inner ring, outer glow, and a leading status dot — visible at a glance even when the mouse is not hovering
- Selected-state hover/focus preserves the engaged look (higher specificity prevents the shared lane-accent hover glow from overriding it)

## v1.2.0 — 2026-07-31

### Features
- **+ Voice buttons relocated** to the bottom of each multi-voice lane, so adding voices never requires scrolling back up — each new voice row pushes the + Voice control further down

## v1.1.1 — 2026-07-31

### Fixed
- Per-voice lane controls (volume, solo, mute, clear) now appear after loading a shared link or saved rhythm — the lane DOM was being built before voice channels were linked, leaving the per-voice controls missing until a rebuild triggered by another action

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
