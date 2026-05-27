# polyrhythm-mixer

Web based polyrhythm mixer.

## Structure

This app is a static GitHub Pages site with plain browser ES modules:

- `/index.html` – entry page and UI markup
- `/styles/main.css` – all app styling
- `/scripts/app.js` – startup/bootstrap wiring
- `/scripts/dom.js` – DOM element lookup
- `/scripts/state.js` – shared state + derived meter calculations
- `/scripts/math.js` – math/timing helpers
- `/scripts/lanes.js` – sequencer lane data/building/interaction
- `/scripts/controls.js` – control/event wiring + help modal
- `/scripts/audio.js` – audio channels + synthesis/playback
- `/scripts/render.js` – canvas animation and trigger timing
- `/scripts/share.js` – share-link encode/decode + restore

## Share links

Use **Share Groove** to copy a URL with an `s` query parameter containing a compact URL-safe encoded mixer state payload. Opening that link restores meter/phrase/phase/tempo settings, lane selections, and mixer sound/volume/mute settings automatically.
