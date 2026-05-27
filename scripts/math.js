export function gcd(x, y) {
    while (y) {
        const t = y;
        y = x % y;
        x = t;
    }
    return Math.abs(x);
}

export function lcm(x, y) {
    if (x === 0 || y === 0) return 0;
    return Math.abs((x * y) / gcd(x, y));
}

export function reduceFraction(n, d) {
    const divisor = gcd(n, d);
    return `${n / divisor}/${d / divisor}`;
}

export function phraseStepsFor(meterValue, phraseCycles) {
    return meterValue * phraseCycles;
}

export function getActivePhraseStep(masterStep, phaseShift, teethPerPulse, phraseLength) {
    return ((Math.floor((masterStep - phaseShift) / teethPerPulse) % phraseLength) + phraseLength) % phraseLength;
}

export function getActiveWheelStep(masterStep, phaseShift, teethPerPulse, wheelLength) {
    return ((Math.floor((masterStep - phaseShift) / teethPerPulse) % wheelLength) + wheelLength) % wheelLength;
}
