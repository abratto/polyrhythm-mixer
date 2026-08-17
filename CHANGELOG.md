# Changelog

## v1.11.0 — 2026-08-17

### Changed
- The Meter A/B Phrase Length "?" help toggle now shares the right-aligned lane-view-actions row with its controls, matching the Master Phrase Length row (removed the dedicated header row that previously sat above each phrase-length selector).
- The cycle navigator/counter now always renders for the Master Phrase Length row, matching Meter A/B (previously it was hidden while the phrase was a single cycle).
- The "?" help button sits to the right of the cycle navigator/counter on every phrase row (Master, Meter A, Meter B) for a consistent layout.

## v1.10.0 — 2026-08-17

### Added
- Master Beat (4/4 click-track) reference strip now renders quarter divisions at their true time-fractions, measured from the pulse-cell geometry, so the beat lines cut through cells whenever the cycle length is not divisible by 4 (no rounding to cells).
- The active numbered beat (1/2/3/4) now flashes in sync with the Master Beat click track.

### Changed
- Master Beat strip aligns cell-for-cell with the Meter A/B pulse rows (removed the inner panel padding/border offset).
- Master Beat strip is always visible, no longer hidden by the left-rail collapse toggle.
- Instrument dropdown font colors now match each meter's phrase-length dropdown (Meter A, Meter B, and Master across the Rhythm Tracks and Polyrhythm Beat Scheme sections).

## v1.9.0 — 2026-08-16

### Changed
- The Rhythm Tracks "?" help toggle now shares the Master Phrase Length row (right-aligned), matching the pulse-lane help button placement.

## v1.8.0 — 2026-08-16

### Changed
- The Meter A/B Pulse help text now opens directly below the meter name and pulse picker rather than above it.

## v1.7.0 — 2026-08-16

### Changed
- The Meter A/B Pulse "?" help toggle now shares the row with the meter name and pulse picker instead of occupying its own header row, reclaiming vertical space.

## v1.6.0 — 2026-08-16

### Added
- The Meter A Pulse, Meter B Pulse, and Master Beat (4/4 click-track) left rails are now collapsible, matching the phrase-lane voice rails. They default to collapsed on load, on mixer reset, and when loading a saved rhythm.

### Changed
- Left-rail Solo/Mute controls for the Meter A/B pulse lanes are now left-justified.
- The Meter A/B Pulses selectors sit inline directly above each step sequencer. The redundant lane titles and the "Pulses" suffix were removed, and the per-meter help text was simplified.

## v1.5.0 — 2026-08-05

### Changed
- Reset Mixer now defaults the Meter A and Meter B phrase tracks to a single cycle (was 2) and sets their first voice to the tambourine sound. The phrase-length selectors also default to 1 cycle so the app starts in the same state it resets to.

## v1.4.0 — 2026-08-05

### Added
- Voice-lane controls are now grouped into Identity (voice label, instrument, remove), Mix (volume, solo, mute — shown as a distinct bordered tray), and Pattern (clear, randomize, reverse, copy, paste, nudge) clusters for clearer visual separation
- Mid-width (≤1024px) layout stacks the control clusters vertically so the mixer sub-panel stays distinct on tablets and narrow windows

## v1.3.13 — 2026-08-05

### Fixed
- Muted button now stays bright red while the rest of the channel controls dim, matching the visual behavior of the solo button

## v1.3.12 — 2026-08-05

### Fixed
- Oscillator and gain nodes now disconnect from the audio graph after playback completes, preventing GC accumulation that caused audible glitches during extended sessions

## v1.3.11 — 2026-07-31

### Fixed
- Completed noise sources now disconnect from their audio graph so dense percussion patterns release unused audio resources

## v1.3.10 — 2026-07-31

### Fixed
- Stopped playback no longer redraws the full canvas at display refresh rate, and complex rhythm views now cap visual rendering at 30 fps without affecting audio timing

## v1.3.9 — 2026-07-31

### Fixed
- Audio playback now resumes from the current clock position after a long tab or main-thread stall instead of replaying missed hits in a burst

## v1.3.8 — 2026-07-31

### Fixed
- Sustained playback now creates fresh one-shot oscillator sources instead of retaining and attempting to reuse stopped Web Audio nodes

## v1.3.7 — 2026-07-31

### Fixed
- Share links now fall back to uncompressed encoding in browsers without Compression Streams support

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
