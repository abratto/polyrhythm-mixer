/**
 * math.js — Core arithmetic for polyrhythm calculations.
 *
 * Provides GCD/LCM for computing the master wheel size (the least common multiple
 * of meters A and B), phrase step counts, and the mapping from the master cycle
 * to the active step within each lane.
 */

/** Greatest common divisor (Euclidean algorithm). */
export function gcd(x, y) {
    while (y) {
        const t = y;
        y = x % y;
        x = t;
    }
    return Math.abs(x);
}

/** Least common multiple — determines the master wheel tooth count. */
export function lcm(x, y) {
    if (x === 0 || y === 0) return 0;
    return Math.abs((x * y) / gcd(x, y));
}

/**
 * Returns the equal group sizes available for a frame of `frame` pulses,
 * smallest first. A group size `s` means the frame divides into `frame/s`
 * groups of `s` pulses, so `s` must divide the frame; we return
 * 2 ≤ s ≤ frame/2 (at least two groups, and no single all-encompassing group).
 *
 * A master voice "grouped by s" places one onset every s pulses.
 *
 * Example: 72 → [2, 3, 4, 6, 8, 9, 12, 18, 24, 36].
 */
export function groupingDivisors(frame) {
    if (!Number.isInteger(frame) || frame < 4) return [];
    const sizes = [];
    for (let s = 2; s <= Math.floor(frame / 2); s++) {
        if (frame % s === 0) sizes.push(s);
    }
    return sizes;
}

/** Reduce a fraction to its simplest form for display (e.g. "3/4"). */
export function reduceFraction(n, d) {
    const divisor = gcd(n, d);
    return `${n / divisor}/${d / divisor}`;
}

/**
 * Returns a boolean step pattern of `length` steps with an onset at step 0 and
 * every `groupSize` steps thereafter. Used to pre-tap a master voice for an
 * equal grouping; for a `length` that is a multiple of the frame (and a
 * `groupSize` dividing it) the grouping repeats seamlessly across cycles.
 */
export function groupedPattern(length, groupSize) {
    const pattern = new Array(length).fill(false);
    if (!Number.isInteger(groupSize) || groupSize < 1) return pattern;
    for (let i = 0; i < length; i++) {
        pattern[i] = (i % groupSize === 0);
    }
    return pattern;
}

/**
 * Converts a phrase length in master cycles to the number of phrase steps.
 * Each master cycle contributes `meterValue` steps to the phrase.
 */
export function phraseStepsFor(meterValue, phraseCycles) {
    return meterValue * phraseCycles;
}

/**
 * Given the current master step, computes which step of the phrase sequencer
 * is active. Accounts for phase shift and wraps correctly for negative values.
 */
export function getActivePhraseStep(masterStep, phaseShift, teethPerPulse, phraseLength) {
    return ((Math.floor((masterStep - phaseShift) / teethPerPulse) % phraseLength) + phraseLength) % phraseLength;
}

/**
 * Given the current master step, computes which step of the wheel lane is active.
 * Same logic as phrase steps but uses the wheel's own length (the meter value).
 */
export function getActiveWheelStep(masterStep, phaseShift, teethPerPulse, wheelLength) {
    return getActivePhraseStep(masterStep, phaseShift, teethPerPulse, wheelLength);
}

/**
 * Converts the master wheel angle into the drawn angle for a meshed meter wheel.
 *
 * `teethPerPulse` is the number of master teeth per meter pulse, so the secondary
 * wheel must rotate `mainTeeth / teethPerPulse` times faster than the master wheel
 * and in the opposite direction. Phase shift is stored in master-wheel teeth and is
 * translated into an angular offset before scaling.
 */
export function getMeshedWheelAngle(mainAngle, phaseShift, mainTeeth, teethPerPulse) {
    const stepSize = (2 * Math.PI) / mainTeeth;
    return (mainAngle - phaseShift * stepSize) * (mainTeeth / teethPerPulse);
}
