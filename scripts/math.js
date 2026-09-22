/**
 * math.js — Core arithmetic for polyrhythm calculations.
 *
 * Provides GCD/LCM for computing the master wheel size (the least common multiple
 * of meters A and B), the quarter-note grid, and the mapping from the master
 * cycle to the active step within each lane.
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
 * Number of steps between consecutive quarter-note beats for a lane of `n`
 * steps per cycle. One master cycle spans 4 quarter notes, so a lane step is a
 * "beat" exactly when it lands on a quarter-note tick.
 */
export function quarterBeatPeriod(n) {
    return n / gcd(n, 4);
}

/** True when `tick` (in master-tick units) falls on a quarter-note boundary. */
export function isOnQuarter(tick, mainTeeth) {
    const q = mainTeeth / 4;
    if (q === 0) return false;
    const r = ((tick % q) + q) % q;
    return Math.min(r, q - r) < 1e-6;
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
