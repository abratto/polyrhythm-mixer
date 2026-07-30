/**
 * pool.js — OscillatorNode ring-buffer pool with overflow fallback.
 *
 * Pre-allocates SIZE nodes, then cycles through them. If the cycle wraps
 * in under MIN_SAFE_MS (meaning the pool is too small for the current
 * pattern density), new nodes are allocated instead of recycling — trading
 * occasional allocation for guaranteed audio integrity.
 */
const SIZE = 400;
const MIN_SAFE_MS = 2000;

const _pool = [];
let _created = 0;
let _idx = 0;
let _lastAllocTime = 0;

export function acquireOsc(ctx) {
    if (_created < SIZE) {
        _created++;
        _pool.push(ctx.createOscillator());
        _lastAllocTime = performance.now();
        return _pool[_pool.length - 1];
    }

    const now = performance.now();
    const elapsed = now - _lastAllocTime;

    // If we're recycling faster than MIN_SAFE_MS, the pool is undersized
    // for the current density. Allocate fresh to avoid cutting off audio.
    if (elapsed < MIN_SAFE_MS) {
        _created++;
        const osc = ctx.createOscillator();
        _pool.push(osc);
        _lastAllocTime = now;
        return osc;
    }

    const osc = _pool[_idx];
    _idx = (_idx + 1) % _pool.length;
    _lastAllocTime = now;

    try { osc.disconnect(); } catch (_) {}
    osc.type = 'sine';
    osc.frequency.cancelScheduledValues(0);

    return osc;
}
