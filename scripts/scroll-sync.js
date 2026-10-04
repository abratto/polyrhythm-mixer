/**
 * scroll-sync.js — Keeps every step grid scrolled to the same horizontal
 * offset, so the fixed row headers can stay put while all lanes' grids move
 * together as one track (the DAW/DAW-plugin convention).
 *
 * This is presentation-only: it never touches pattern or transport state. It
 * registers a single capturing `scroll` listener on the document, finds the
 * scrollable `.voice-steps` grids, and mirrors the offset of whichever grid the
 * user (or the follow-playhead logic) scrolled onto the others.
 *
 * The programmatic writes re-fire `scroll` events; an `_applying` guard breaks
 * the feedback loop so we only propagate the user/library-initiated value.
 */

let _wired = false;
let _applying = false;

/** Returns the currently scrollable step grids (content wider than viewport). */
function scrollableGrids() {
    return Array.from(document.querySelectorAll('.voice-steps'))
        .filter((el) => el.scrollWidth > el.clientWidth + 1);
}

/** Mirrors `left` onto every scrollable grid except `source`. */
function applyScrollLeft(left, source) {
    if (_applying) return;
    _applying = true;
    for (const grid of scrollableGrids()) {
        if (grid === source) continue;
        if (Math.abs(grid.scrollLeft - left) < 1) continue;
        grid.scrollLeft = left;
    }
    _applying = false;
}

/**
 * Wires the shared-scroll behaviour once. Safe to call repeatedly.
 */
export function wireGridScrollSync() {
    if (_wired) return;
    _wired = true;

    document.addEventListener('scroll', (event) => {
        const target = event.target;
        if (!target || !target.classList || !target.classList.contains('voice-steps')) return;
        applyScrollLeft(target.scrollLeft, target);
    }, { capture: true, passive: true });
}
