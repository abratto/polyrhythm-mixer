# Changelog
## v1.28.0 — 2026-10-07

### Added
- **Getting-started help.** The welcome modal leads with a quick-start guide and keeps detailed mixer explanations in an expandable section.
- **Visualization discovery.** The quick start points users to the polyrhythm visualization and its alternate views.

### Changed
- **Visualization starts collapsed.** The mixer opens with its controls in view; Reset Mixer also collapses the visualization.

## v1.27.0 — 2026-10-05

### Changed
- **Step grids wrap again.** Dense meters and phrase lengths flow onto extra rows instead of scrolling horizontally, and a sparse lane's cells still grow to fill the width. This reverts the v1.26.0 fixed-width horizontal-scroll grids.
- **Grouping lanes wrap at group boundaries.** Each row holds a whole number of groups, so a group's pulse substeps never straddle a row break and the pulse underlay and group rectangles stay aligned at every width.
- **Softer grouping playhead styling.** The grouping column playhead and the active group box's ring are toned down to match the Rhythm Tracks playhead while staying clearly visible over the boxes.

### Fixed
- **Grouping and step playheads stay aligned to the grid.** The column is positioned from the rendered cell it marks rather than a fraction of the container width, so it no longer drifts off the pulse boxes because of the column gap or a wrapped/overflowing row.
- **The sub-playhead keeps sweeping wrapped grouping lanes.** It now follows its pulse cell onto the correct row instead of being hidden behind the per-group highlight.
- **Every grouping box shows equal pulse substeps.** Fixed boxes that showed unequal or no substeps in dense polyrhythms (e.g. 6 against 7).

## v1.26.1 — 2026-10-04

### Fixed
- **Expanded left rails no longer lose controls on small screens.** On stacked layouts the rail kept a fixed width while its full-width contents (selects, faders, edit chips, header cycle nav) overflowed and were silently clipped by `overflow-x: hidden`. The rail now grows to the row width and every cluster can shrink, so all controls stay visible; collapsed rails remain a single compact line.
- **Offset markers no longer read as white borders.** The grouping boxes' start-pulse markers used a pure white border/ring/glow that popped harshly inside the bright grouping rectangles; they are now tinted with each lane's accent color (subtler ring, no outer glow) across all themes.

## v1.26.0 — 2026-10-04

### Added
- **Global toolbar.** The transport, tempo/master controls, theme picker, status readout, and Save/Load/Share/Help now live in a single top menu bar, decoupled from the sequence lanes (brand + file menus, transport, and global settings as three bands).
- **Shared horizontal step scroll.** All step grids scroll together as one aligned track while the fixed row headers stay put; dense meters/phrase lengths scroll instead of wrapping.

### Changed
- **Compact row headers with disclosure sub-rows.** Each voice header now shows a disclosure triangle, voice name, instrument, and persistent `S`/`M` chips; volume, Clear, edit ops, and nudge move into the expandable sub-row, leaving the header readable while collapsed.
- **Grouping lane controls moved into the rail.** Each grouping lane's Grouping, Phrase Length, Offset, and remove controls now live in that lane's expandable left rail instead of an always-visible toolbar above the grid, so the lane reads as one compact header + grid.
- **All left rails start collapsed**, including on load and after Reset, for a uniform compact layout.
- **Grouping lane cycle nav + help moved into the row header** (next to the voice picker / S / M), removing the now-empty toolbar row so grouping rows sit as tightly spaced as the Rhythm Track rows.
- **Rails stay open while editing.** Interacting with a rail control (grouping, phrase length, offset, etc.) no longer re-collapses the rail — only the `▸/▾` disclosure toggles it. Expand/collapse state is preserved across lane rebuilds.
- **Fixed-width, aligned step columns.** Step boxes are a constant width so columns line up across lanes and the grid scrolls horizontally when the pattern is longer than the lane.
- **Mobile toolbar restacked.** On narrow screens the toolbar orders transport first, then file menus, then settings, with the collapse toggle pinned top-right.

### Fixed
- Loading a saved rhythm / shared link no longer overwrites the compact `S`/`M` header labels with full words.
- **Collapsed left rails no longer reserve a tall empty box** on narrow screens. Below 1024px the rail stays beside the grid (rather than stacking into a full-width block), and on phones the collapsed rail shrinks to a single compact header line instead of a 236px-tall column — so rows sit tightly instead of being pushed apart.
- **Clear / Random / Reverse / Paste on a grouping lane** no longer drop the lane's offset marker and outlined pulse sub-grid. These voice-edit actions rebuilt the lane without the current frame state, so the grouping underlay/overlay (offset marker + sub-box outline) was skipped; the frame state is now threaded through.
- **No duplicate cycle nav on grouping lanes.** Rebuilding a lane (e.g. Clear) appended an extra `< AUTO >` control to the row header each time; the stale nav is now removed before the new one mounts.
- **Clearer grouping playheads.** The grouping lanes' column playhead borders (3px) and the active group box's inset ring (3px) are now thicker than the base 1px/2px styles, matching the Rhythm Tracks playhead's prominence so the moving playhead is unmistakable in the Groupings section.

## v1.25.1 — 2026-10-03

### Fixed
- **Duplicate beat/bar accents on grouping rectangles.** The overlay grouping rectangles still carried `step-beat`/`step-bar`/`step-alt` classes from the pre-overlay design, painting extra left-edge bars and alternating tints on top of the underlay's own grid marks. The rectangles now render clean, leaving the beat/bar grid to the underlay cells.

## v1.25.0 — 2026-10-03

### Added
- **Theme system rebuilt on CSS variables.** Every theme is now a small palette of custom properties (`--bg`, `--panel-*`, `--btn-*`, `--step-*`, `--accent-a/b/c`, `--playhead`, …) instead of a block of hardcoded overrides, so the whole app recolors from one small block per theme.
- **A theme dropdown.** The transport-bar toggle is now a `<select>` with the full list, and the choice persists to localStorage (legacy `cyberpunk`/`tokyo` values still resolve).
- **Seven African-diaspora flag themes** — Ghana, Cuba, Dominican Republic, Haiti, Puerto Rico, Jamaica, and Nigeria — mapping each flag's colors onto the Master / Meter A / Meter B accents with dark `color-mix` tints for the chrome.
- **Flag-colored title.** "Alan's Polyrhythm Mixer" is now a clipped left-to-right gradient echoing each theme's (or flag's) stripe order.

### Changed
- **Grouping lane colors follow the theme.** Each grouping lane now resolves its accent from a `--glane-N` token; flag themes supply primary/secondary/tertiary colors plus light/dark tints, while Original/Cyberpunk/Tokyo keep the original neon palette.
- **Original theme restored as an option.** The base scheme (dark chrome with orange/pink/cyan accents) is selectable again; Cyberpunk remains the default.
- **Fixed a latent bug** where the sequencer panel's inline background silently overrode every theme's panel color.
- **Mobile fixes.** The collapse/expand toggle is pinned to the top-right so it no longer overlaps or jumps when controls hide/show, and the grouping sub-playhead is no longer hidden on narrow screens (the wrap-aware playhead logic already steps it aside when a row actually wraps).

## v1.24.1 — 2026-10-03

### Changed
- **Grouping offset marker always reads "1".** The start subdivision previously counted up (1..subdivisions-per-group) as you nudged the offset; it now stays "1" to mark where the grouping's own "1" falls, while nudging still slides the marker and the toolbar keeps its `1/4`-style readout.

## v1.24.0 — 2026-10-03

### Added
- **Grouping lanes now overlay translucent rectangles on a shared pulse grid.** Each grouping lane draws an underlying master-pulse row (the same cell language as the Rhythm Tracks voices) with translucent grouping rectangles laid on top, aligned so every grouping edge lands exactly on a pulse boundary.
- **A sweeping sub-playhead in grouping lanes.** A vertical playhead now steps through the pulses inside each grouping box — matching the Rhythm Tracks playhead — replacing the old horizontal white/gold offset strip.
- **The offset/start subdivision is now numbered.** The grouping's start pulse is labelled with its 1-based count (1..subdivisions-per-group), advancing with each ←/→ nudge, so the count reads right off the subdivision the grouping starts from.
- **Cyberpunk / Tokyo theme toggle.** A transport-bar toggle switches the whole app between the Cyberpunk and Tokyo color schemes (persisted to localStorage).

### Changed
- **Selected grouping boxes read more clearly.** The active fill is more saturated, with a stronger border and left accent, while the underlying pulse grid still shows through.
- **Responsive controls re-arranged.** The transport bar and per-lane toolbars (Grouping / Phrase Length / Offset / Cycle) compact onto fewer rows on small screens; the Groupings heading stacks cleanly.
- **Step rows wrap instead of truncating.** When a lane's beats exceed its width the boxes flow onto a second row (with uniform sizing) rather than clipping; the column playhead steps aside for the per-button highlight in wrapped layouts.
- **Master Beat reference no longer clips.** The strip shrinks to fit the full cycle on one line, so dense meters (e.g. 6 against 7) no longer truncate on the right.
- Group boxes are left unnumbered now that the offset count lives on the start subdivision.

## v1.23.0 — 2026-10-02

### Added
- **Phase visualization mode.** Added a 2D phase-space view that maps Meter A and Meter B onto a shared looping path, with per-meter live counters and a visible 4/4 reference beat overlay.
- **3D phase visualization mode.** Added a second phase view that projects the same shared cycle into a 3D phase space, including fixed A/B/4 beat counters for easier reading while the figure rotates.

### Changed
- **Phase views were refined for readability.** The 2D and 3D layouts were enlarged, re-centered, and re-spaced; overlapping beat labels are merged when multiple beats land on the same point; counters were simplified to remove denominators and leading zeros.
- **The visualization chooser and control layout now behave correctly on phones.** Mobile CSS was tightened so the rhythm selectors, visualization tabs, sticky controls, and help `?` buttons stay within the app boundary on narrow portrait screens, with improved tap-target sizing.
- **Phase rendering and timeline drawing were cleaned up before release.** The 3D phase view now reuses cached geometry instead of rebuilding it every frame, and the master-cycle timeline no longer shows a duplicated marker set.

## v1.22.0 — 2026-10-01

### Added
- **Clock visualization mode.** Added a new visualization tab that presents the active polyrhythm as four synchronized counters: Meter A, Meter B, a 4/4 beat reference, and the shared master pulse.

### Changed
- **Clock correspondences now flash on real A/B coincidences.** The Clock view highlights only the moments where Meter A and Meter B actually land together within the cycle, rather than flashing on a broader cycle-start cue.
- **Visualization coverage updated for the new mode.** The mode picker copy and smoke coverage now include Clock alongside the existing visualizations.

## v1.21.0 — 2026-10-01

### Added
- **Orbit visualization mode.** Added a new visualization tab where the hand stays fixed at 12 o'clock and each meter's dots orbit at their own rate. This presents the polyrhythm as rotating layers that repeatedly meet the same reference line.

### Changed
- **Orbit now uses moving dots only.** Removed fixed pulse dots/number marks from Orbit so the view emphasizes motion and crossing behavior.
- **Crossing flash is geometry-locked.** Orbit dot flashes now trigger only when a dot reaches the 12 o'clock line (including shared downbeat alignment), instead of flashing from a broader rhythm-phase window.
- **Idle dot visibility improved.** Increased non-flashing Orbit dot brightness slightly to keep each ring readable while preserving clear contrast at the crossing flash.

## v1.20.1 — 2026-09-30

### Changed
- **Master Beat strip clarified and aligned.** The Master Beat reference now shares the same pulse-track span as the Master phrase row, so the quarter-beat overlay sits directly on top of the true pulse grid instead of drifting a few pixels left/right. The strip also now states the beat spacing explicitly: integer cases read e.g. `4 equal beats of 3 pulses each`, while fractional cases such as 3 against 5 read `4 equal beats across 15 pulses (3.75 pulses per beat)`. The pulse boxes under the overlay were given more contrast so the 4-beat division is easier to read against the underlying beat scheme.

## v1.20.0 — 2026-09-29

### Changed
- **The Polyrhythm Beat Scheme section is gone; the polyrhythm now lives in Rhythm Tracks.** The Meter A/B wheel lanes duplicated the grouping lanes (same onsets, tooth resolution) while being independently editable — so the audible pulse could silently disagree with the selected meters. The Meter A/B dropdowns and the beat-scheme summary now sit inline in the Rhythm Tracks heading; the two linked grouping lanes start pre-tapped with the canonical pulse (Percussion Shaker) and are ordinary, editable voices from there. The default groove is one clap cleaner — the wheel pulse and the grouping step-1 default no longer double the same onsets. The canvas visualizations are unchanged and now derive the pulse from meter state directly, so they always show the authoritative structure.
- **Grouping lifecycle, made predictable.** Any grouping lane can be deleted (all of them, even — an empty-state hint explains how to get back). Picking a polyrhythm re-asserts the skeleton: missing linked A/B lanes are recreated pre-tapped with the pulse, ahead of your lanes; lanes you customized are never clobbered. + Voice adds the smallest unused grouping instead of duplicating an existing one.
- Share/save payloads bump to **v6**: old wheel patterns fold into the linked grouping lanes' first voice (off-grid wheel hits survive as an extra voice), and wheel instrument/mute/solo settings carry over.
## v1.19.3 — 2026-09-29

### Changed
- **Batá high (Okónkolo) tuning:** body decay lengthened from 0.25 s to 0.34 s and overtone decay from 0.10 s to 0.20 s, so the enú tone rings a little longer.

## v1.19.2 — 2026-09-28

### Fixed
- **Playback went silent below ~80 BPM** (exact cutoff depended on the meter). The scheduler's stall-recovery reseed compared catch-up *time* against a fixed 0.25 s limit, but at slow tempos a single legitimate step already exceeds that (6×4 at 40 BPM has a 0.5 s step), so every normal advance was treated as a stall: step tracking was jumped to the target before the scheduling loop ran, swallowing every hit forever. The reseed now requires catching up by **more than one step**, which is the only case that can be a real stall. Verified in a headless-browser probe (90→40 BPM drag: 0 hits pre-fix, steady hits post-fix) and covered by a regression test asserting single steps schedule at slow tempos while genuine multi-step stalls still drop.

## v1.19.1 — 2026-09-23

### Fixed
- **No sound on iOS** (Safari and Chrome — both WebKit on iOS). iOS kept the audio session in `'auto'`, so WebAudio stayed silent and the hardware volume keys controlled the ringer. On the **Enable Audio** gesture the app now, synchronously: sets `navigator.audioSession.type = 'playback'` (Safari iOS 16.4+) to route to the media channel and ignore the mute switch, resumes the context unconditionally, and plays a short very-low-gain noise burst (a one-sample silent buffer is not always enough for iOS to start the session). Confirmed on an iPhone (iOS 18.7 / Safari 26.6.1).

## v1.19.0 — 2026-09-21

### Changed
- **Batá slaps (low / middle / high)** were rebuilt from the dry, click-only chachá strike back into a fuller coupled model, now fully tunable: a fast body, three inharmonic shell overtones, a micro-delayed **enú coupling** bloom, and a rawhide crack. Frequencies follow the matched batá registers — **Iyá ~320 Hz, Itótele ~440 Hz, Okónkolo ~580 Hz** — with attack cutoffs aligned to spec (Iyá keeps energy below 1 kHz; Okónkolo sits at ~3–4 kHz). The low slap was additionally retuned to read as a crack rather than a low thud.
- **Handclap** was rebuilt for realism on a four-layer model: a **micro-transient flutter** of 3 sub-impacts over ~6 ms (the fingers/heel never land at once), a cupped-palm "pop", a low triangle for mass, and a short room tail. Each sub-impact has a soft ~1 ms attack and per-hit frequency jitter, and each layer reads from an independent noise offset to avoid comb-filtering. The clap is **live-synthesized** (not pre-rendered) so the per-hit jitter can vary.
- **Default instruments** on a fresh load are now **Handclap** for the rhythm-tracks voice and both grouping voices (previously Bass Drum (Kick) and two Woodblock Clacks).

## v1.18.2 — 2026-09-21

### Fixed
- **Noise-based instruments were silent on some mobile browsers** (shaker, hi-hats, claps, tambourine, and every other noise instrument — e.g. the Meter A/B shaker lanes), while oscillator instruments still sounded. The shared noise buffer was created lazily by whichever audio context first requested it; because pre-rendering runs first on an `OfflineAudioContext`, that context owned the buffer and every live hit borrowed it. Some mobile browsers refuse to play a buffer across contexts, so those instruments produced no sound. The buffer is now cached per context, keeping each render self-contained.

## v1.18.1 — 2026-09-21

### Fixed (performance)
- **Mini playhead** in the sticky transport bar moved with `left` every frame, forcing a style recalc + layout + paint of the bar. It now uses a compositor-only `translateX` with a cached track width (re-measured on resize).
- **Lane playhead** overlays wrote `opacity`, `left`, and `width` as percentages on every step boundary per lane, churning layout across the sequence at dense meters. The width is set once per step count and the position is a cached `translateX`, so only compositing runs per step.
- **Master-cycle timeline** (Layer B) was re-rasterized into a full-canvas offscreen buffer once per master cycle, dropping a frame at each measure boundary. The buffer is now sized to just the band the timeline occupies (~9× less clear/blit area), and the per-cycle counter is drawn live.
- **Per-hit gain allocation:** every prerendered-instrument hit allocated a fresh `GainNode`. Gains are now pooled and reused after their hit ends (buffer sources stay per-hit, as they are one-shot). Steady-state gain allocations drop from ~136 to ~2 per 10s at 12×18.
- **Hidden-tab playback:** hidden-tab timers are clamped to ~1s, but the scheduler pre-scheduled only 120ms of hits per wake-up, dropping audio once a tablet locked. The scheduling horizon now rises to 1.5s while `document.hidden` (and the catch-up reseed threshold scales with it), restoring on visibility.
- **Gear sprite cache** did a full flush at its size cap, forcing a burst of re-renders into one frame. It now evicts only the least-recently-used sprite.

### Changed (internal)
- The frame profiler (`npm run test:frames`) now reports a measure-boundary spike metric, pairing each frame delta with the master-cycle phase.

## v1.18.0 — 2026-09-21

### Added
- **Every instrument in the catalog is now tunable.** Instruments previously hardcoded in `instruments.js` were given editable parameter blocks in `instrument-data.js` and their synthesis functions refactored to read them, so what the tuners preview is exactly what the app plays.
  - **Bongos:** new **Bongo Slap (High)** (Macho golpe seco) and **Bongo Mute (Low)** (Hembra tapao).
  - **Congas:** retuned open tones plus new **bass/palma** (×3), **press/tapao** (×3), and **ringing slap/galleta** (×3) strokes, completing the stroke set across Tumba, Tres Dos, and Quinto.
  - **Batá:** the full ensemble (open tones, chachá strikes, and presses) is now parameter-driven and tuneable in the hybrid tuner. The old generic "Batá Slap" was retired in favour of the drum-specific chachá strikes.
  - **21 percussion instruments** (metals, bells, woods, shakers, and noise) are now tuneable: closed/open hi-hat, shaker, foot tap, crash, ride, agogo, ping, claves, woodblock, rimshot, temple block, castanets, cowbell, clap, maraca, tambourine, cabasa/shekere, guiro, gankogui, and triangle. Added **Palitos (Cáscara / Catá)**.
  - **Gankogui** is now two single iron bells (**Low** and **High**) in place of the paired double-bell strike; added **Cowbell Mouth (Boca)** and **Cowbell Body (Centro)** campana strokes.
  - **Ewe ensemble** (Agbadza/Gahu): **Kaganu**, **Kidi**, **Sogo**, **Atsimevu** (hand), **Atsimevu Stick**, plus **Kidi Press** and **Sogo Press**.
  - **Axatse** (Ewe gourd rattle): **Thigh (Pa)** and **Palm (Ti)** strokes.
- **`tuners/percussion.html`** — new tuner page for the metals, bells, woods, and shakers.
- The tuner pages now preview the real synth (`scripts/instruments.js`) instead of duplicating inline synthesis, so tuning matches the app exactly; **Copy as Code** emits a pasteable `params:` block.
- Catalog instruments alphabetised by display label.

### Changed (internal)
- Introduced shared, parameter-driven renderers (`playCongaVariant`, `playBongoVariant`, `playBata*`, `playGankoguiBell`, `playCowbell*`, and others) so instrument families share one code path; removed the now-dead `createCongaTone`/`createBataTone`/`createMetalBellStrike` helpers.
- The bongo renderer accepts both numbered (`overRatio1`) and unnumbered (`overRatio`) first-overtone keys.
- Added a `MIN_GAIN` constant for exponential-decay floors and explicitly stop noise sources at the end of their transient.

## v1.17.2 — 2026-09-21

### Changed (internal cleanup)
- Removed dead code left over from the retired Meter A/B Phrase lanes, de-duplicated shared helpers (the quarter-note helpers now live in `math.js`; grouping uses `lcm`), and simplified unreachable branches. No behavior change.
- Added `npm test` (runs the fast suites) and wired the previously unlisted compression test as `test:compression`.
- Refreshed `roadmap.md`.

## v1.17.1 — 2026-09-21

### Fixed (performance)
- Playback no longer skips or plays unevenly on low-end tablets. The audio path was both audio-thread and main-thread bound:
  - Prerendered instruments were 3-second buffers played in full (the sound plus a long silent tail), so overlapping hits piled seconds of silence onto the audio thread and caused underruns. Each buffer now stores its real sounding length and plays only that span (`source.start(now, 0, duration)`), so nodes free on time.
  - The scheduler lookahead is raised from 50 ms to 120 ms, so a main-thread stall under that window is already pre-scheduled and still plays on time. The catch-up reseed is now time-based (250 ms) rather than a fixed 8 steps — which was ~150 ms at dense meters but ~1.8 s at sparse ones.
  - The per-frame canvas signature strings (voice counts / layer signature) are rebuilt on the existing 4-frame stride, so a frame allocates none of them.

## v1.17.0 — 2026-09-21

### Added
- **Rhythm Tracks grouping voice lanes** replace the fixed Meter A/B Phrase lanes. Each lane is one voice and one equal division of the master cycle; the default two lanes are the chosen polyrhythm's groupings (e.g. 6 against 4 → a 6-group and a 4-group lane). **+ Voice** adds a lane, **×** removes one, and each lane has its own Grouping selector (any divisor of the frame, including a single group), phrase length, instrument, volume, solo/mute, nudge, and per-voice edit controls.
- **Grouping offset.** Each group cell is split into its pulses; the highlighted segment marks where the grouping starts, and the **Offset** nudge (`← n/N →`) slides that start by one pulse, wrapping within the group. For 3 against 4, the 3-group lane's 4 pulses give the four distinct 3-against-4s. Offset is per lane and persists in share/save payloads.
- The meter range is extended to 24, so 18 against 24 (the 72-pulse frame) can be selected directly.
- Share payloads are now **v5**, with automatic migration from v0 → v5 (old A/B phrase lanes become the first two grouping lanes; a missing offset defaults to 0).

### Fixed
- A single-group grouping lane now fires once per cycle. Group onsets are detected directly (`stepIndex ≡ phase mod groupSize`) rather than by changes in the active step, which never changed for a one-group lane.

### Changed (performance)
- Editing one grouping lane's grouping or phrase length rebuilds only that lane, and unrelated system rebuilds no longer tear down every grouping lane.
- Step-follow no longer forces a synchronous layout for every voice on every step (scroller overflow is cached and invalidated on resize).
- Fewer per-step allocations in the render loop; dead grouping helpers removed.
- `npm run test:frames` (frame-probe) gains a `LANES` stress option.

### Docs
- README gains a "Groupings & Offsets" section; the per-lane "?" help and the help modal were updated.

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
