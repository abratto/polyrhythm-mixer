/**
 * Creates an oscillator source node for one instrument strike.
 *
 * OscillatorNode instances are one-shot: once started, they cannot be started
 * again. Retaining and recycling them therefore causes invalid-state errors
 * after sustained playback. The instrument envelopes stop each source, letting
 * the browser reclaim it once its graph is no longer active.
 */
export function acquireOsc(ctx) {
    return ctx.createOscillator();
}
