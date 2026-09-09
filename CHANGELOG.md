# Changelog

## v1.16.2 — 2026-09-09

### Fixed
- Refresh the Polyrhythm Beat Scheme label when loading a saved rhythm with a different meter.

## v1.16.1 — 2026-09-05

### Fixed (performance)
- The visualization gallery had reintroduced per-frame work that the v1.13.9 layer-caching pass had removed, bringing audio/visual jitter back on low-end tablets. Output is pixel-identical; the frame budget is restored:
  - The Voice view's lyric strip is pre-rendered to a sprite once per meter/font — a frame is one blit plus the active syllable (full alpha, underline) and the spoken-prefix dim, instead of re-flowing and re-rasterizing every syllable at the draw rate.
  - The meter legend (title + descriptors) is baked into the cached static layer, and the "Cycle X of N" counter into the per-cycle layer — previously drawn live (3 text fills + 2 measurements) on every frame of every view.
  - The static layers reuse persistent offscreen buffers instead of allocating a fresh full-canvas layer once per master cycle (the allocation + GC of the old buffer was a periodic hitch).
  - The Master Beat 1-2-3-4 flash loop resolves its bands once per strip build and idles at 250ms while the transport is stopped, instead of re-querying the DOM at display refresh rate.
  - Pattern/dots cache signatures are refreshed on a 4-frame stride, and the per-frame flash check no longer allocates.
- Added `npm run test:frames` (scripts/frame-probe.js): a CPU-throttled per-view frame-delta profiler for tracking render-cost regressions.

## v1.16.0 — 2026-08-18

### Added
- A gallery of five toggleable round visualizations (Gears | Rings | Align | Voice | Shapes), each built on the cached-sprite architecture:
  - **Rings**: clock-face dial — outer pulse grid, numbered meter rings, innermost 4/4 beat ring, sweeping hand, and marks that flash as the hand crosses them.
  - **Align**: coincidence map — three lanes (4/4 beat, Meter A, Meter B) with connectors at every tick where meter pulses coincide, and crisp flashes as the playhead crosses each mark.
  - **Voice**: the Anlo Ewe verbalization (C. K. Ladzekpo) — the measure spoken as syllables: **Kpla** (both meters, both hands), **Ka** (Meter A, strong hand), **Tu** (Meter B, weak hand); the current syllable is shown large with the full spoken sequence lit underneath.
  - **Phase**: a cosine-Lissajous curve in its bounding box — the downbeat at the resolution corner, wall touches firing each meter's pulses, lobe counts on the walls, and a tension halo on the trace point.
  - **Shapes**: each meter's pulses joined into a numbered polygon (hexagon, square, star) with sweep flashes.
- A shared meter-descriptor legend (master-cycle line + "Meter A (n beats per cycle) · n groups of n beats") drawn identically above the timelines in every view.
- Text-measurement caching so the text-based views add no per-frame layout cost.

### Changed
- The visualization "?" help text rewritten for the five views in plain language.

## v1.15.0 — 2026-08-18

### Added
- Nested meter rings inside the master wheel: a circular clock-face view of the measure, complementing the side gears. The innermost orange ring always divides the cycle into 4 equal parts (the 4/4 reference beat); pink and cyan rings carry Meter A's and Meter B's pulse marks. A radial indicator sweeps once per measure, crossing each ring's mark k exactly when that meter's pulse k fires — coincidences read as the hand lining up marks from two rings at once. Rings sit at fixed radii (3:2, Meter A outer / Meter B inner) so they never resize when meters change; the ratio reads by counting marks.
- The visualization "?" help text was rewritten in plainer language, with a concrete 6-against-4 example and a new Rings section.

## v1.13.9 — 2026-08-18

### Changed (performance)
- Fixed the pronounced audio + visual jitter on low-end tablets. Three changes:
  - A main-thread stall no longer replays every skipped step in one frame (visual catch-up is bounded, mirroring the audio scheduler), transport readout/mini-playhead DOM writes only happen on change, and glow effects no longer run on coarse-pointer devices.
  - The canvas is composited from pre-rendered layers: gear bodies and the A/B pulse spokes+dots are cached sprites, and the timelines (full-pattern, master-cycle) are offscreen layers rebuilt only when the meter/pattern state or playing cycle changes. A frame is now a handful of blits plus the moving playhead.
  - Instruments are pre-rendered once to audio buffers (per A/B variant), so a hit creates two audio nodes instead of three to six, with no per-hit automation; live synthesis remains the fallback.

### Fixed
- Full Pattern Timeline playhead moves again (it was briefly frozen by the initial layer-caching change).

## v1.14.0 — 2026-08-18

### Added
- Pinned phrase lanes now loop their playhead highlight continuously over the pinned cycle, in sync with the audio loop, instead of only lighting while the master playhead sweeps through that cycle. The frozen position still shows while the transport is stopped.

## v1.13.8 — 2026-08-18

### Fixed
- Shared/saved rhythms with more than 4 master phrase cycles now rehydrate correctly (the restore clamp previously capped master phrase at 4 of 8).
- The Master Beat strip now always renders a single measure (4 quarter beats), so its 1-2-3-4 click animation stays clean regardless of screen width or master phrase cycle count.
- Meter A/B pulse lanes wrap in portrait (no more steps or beats cut off), and the sticky transport bar can collapse to a single row.

## v1.13.7 — 2026-08-18

### Fixed
- In portrait, the Meter A/B pulse lanes now wrap into a grid like the rhythm-track lanes, and the Master Beat cells shrink to fit, so no steps or quarter beats get cut off on narrow screens.

## v1.13.6 — 2026-08-18

### Fixed
- Meter A/B pulse-lane step boxes no longer truncate at the bottom in portrait (pulse strip min-height now matches the 42px step height).

### Added
- Collapse toggle on the sticky transport bar, shrinking it to a single row of transport controls to free up screen space in landscape.

## v1.13.5 — 2026-08-18

### Fixed
- Lane toolbars (master phrase length controls, buttons, cycle nav) and transport controls no longer spill off the right edge in mobile landscape. The wrapping rules now apply up to the 1024px breakpoint, covering landscape phones (720–926px) that previously fell through to the desktop layout.

## v1.13.4 — 2026-08-18

### Fixed
- Step sequences no longer overflow the mixer at very dense polyrhythms (e.g. 16 × 17 = 272 pulses). Cells keep a 24px floor and the lane scrolls horizontally when there are more than fit, with paged follow-playhead (the view flips a page as the playhead sweeps, hardware step-grid style).
- The playhead is now single per lane — multi-voice lanes previously drew one playhead bar per voice row.

### Added
- "Follow" toggle in the transport bar; manually scrolling a lane disables follow.
- Tempo floor lowered to 5 BPM.

## v1.13.3 — 2026-08-18

### Fixed
- Step sequences now use the conventional fixed-step + horizontal-scroll behaviour instead of wrapping. Cells keep a constant width and each lane scrolls when there are more steps than fit, preserving the single time axis and per-cycle grouping while never overflowing the mixer (covers extreme polyrhythms like 16 × 17 = 272 pulses).

## v1.13.2 — 2026-08-18

### Fixed
- Step sequences no longer overflow the mixer at extreme pulse counts (e.g. 16 × 17 = 272). The sequence grids now wrap onto extra rows when they can't fit on one line, instead of pushing the layout wider. Single-line layout is preserved for normal and moderate counts.

## v1.13.1 — 2026-08-18

### Fixed
- Meter A and Meter B pulse lanes no longer overflow the mixer at high pulse counts (e.g. 9 × 14 = 126 pulses). Their grids now shrink to fit the lane like the phrase grids do.

## v1.13.0 — 2026-08-18

### Added
- "Expand all / Collapse all" toolbar at the top of the left-rail panel that expands or collapses every collapsible control at once — the three pulse-section rails (Meter A Pulse, Meter B Pulse, Master Beat) and all per-voice phrase rails.

## v1.12.1 — 2026-08-18

### Fixed
- Pinned (non-following) phrase lanes now loop their visible cycle continuously instead of staying silent until the master playhead swept through that cycle. The audio now matches the already-parked visual playhead.

## v1.12.0 — 2026-08-17

### Changed
- The sticky top transport bar is now split into two left-aligned rows: a "commands" row (transport buttons + Save / Load / Share / Help) and a "settings" row (Tempo, Master Output, transport readout, and mini-playhead). Playback/file actions are now separated from the global timing and output controls, and the layout stays a stable two rows at every width instead of wrapping unpredictably.

## v1.11.1 — 2026-08-17

### Fixed
- Master Beat (4/4) strip now stays a single row on viewports at or below 720px, so its accurate quarter-overlay bands keep aligning cell-for-cell with the pulse rows (the responsive grid rule previously wrapped the strip and broke the linear band mapping).

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
