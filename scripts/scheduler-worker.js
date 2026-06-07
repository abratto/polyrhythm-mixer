/**
 * scheduler-worker.js — Web Worker that runs the audio scheduling loop
 * independently of the main thread. Computes which steps fire at which
 * precise hitTimes and posts trigger batches to the main thread for
 * AudioContext node creation.
 */

let _config = null;
let _lanes = null;
let _channels = null;
let _globalVolume = 1;
let _lastScheduledStep = 0;
let _lastScheduledQuarter = 0;
let _timer = null;

function _tick() {
    if (!_config || !_config.audioStartTime) {
        _timer = setTimeout(_tick, 20);
        return;
    }

    const rps = _config.tempo * Math.PI / 120;
    const stepSize = 2 * Math.PI / _config.mainTeeth;
    const stepDuration = stepSize / rps;
    const quarterDuration = 60 / _config.tempo;

    const now = performance.now() / 1000;
    const elapsed = now - _config.clockOrigin + _config.audioCtxAtOrigin;
    const lookahead = 0.05;
    const targetStep = Math.floor((elapsed + lookahead) / stepDuration);
    const targetQuarter = Math.floor((elapsed + lookahead) / quarterDuration);

    const triggers = [];

    for (let s = _lastScheduledStep + 1; s <= targetStep; s++) {
        const hitTime = _config.audioStartTime + s * stepDuration;
        _collectStepTriggers(s, hitTime, triggers);
    }
    _lastScheduledStep = Math.max(_lastScheduledStep, targetStep);

    for (let q = _lastScheduledQuarter + 1; q <= targetQuarter; q++) {
        const hitTime = _config.audioStartTime + q * quarterDuration;
        if (_channels && _channels.driver && !_channels.driver.muted) {
            triggers.push({ channelKey: 'driver', voiceIndex: null, hitTime, sound: _channels.driver.sound, volume: _channels.driver.volume * _channels.driver.gainScale * _globalVolume });
        }
    }
    _lastScheduledQuarter = Math.max(_lastScheduledQuarter, targetQuarter);

    if (triggers.length > 0) {
        self.postMessage({ type: 'triggers', triggers, lastScheduledStep: _lastScheduledStep, lastScheduledQuarter: _lastScheduledQuarter });
    }

    const audioNow = _config.audioCtxAtOrigin + (now - _config.clockOrigin);
    const nextStep = _config.audioStartTime + (_lastScheduledStep + 1) * stepDuration;
    const nextQuarter = _config.audioStartTime + (_lastScheduledQuarter + 1) * quarterDuration;
    const nextBoundary = Math.min(nextStep, nextQuarter);
    const delay = (nextBoundary - audioNow) * 1000 - 3;
    const boundedDelay = Math.max(5, Math.min(delay, 20));

    _timer = setTimeout(_tick, boundedDelay);
}

function _collectStepTriggers(stepIndex, hitTime, triggers) {
    if (!_config || !_lanes) return;
    const stepWithinCycle = ((stepIndex % _config.mainTeeth) + _config.mainTeeth) % _config.mainTeeth;
    const aps = _getActivePhraseStep(stepIndex, _config.phaseA, _config.teethA, _config.phraseStepsA);
    const bps = _getActivePhraseStep(stepIndex, _config.phaseB, _config.teethB, _config.phraseStepsB);
    const aws = _getActiveWheelStep(stepIndex, _config.phaseA, _config.teethA, _config.A);
    const bws = _getActiveWheelStep(stepIndex, _config.phaseB, _config.teethB, _config.B);

    // Master voices
    if (_lanes.masterVoices) {
        _lanes.masterVoices.forEach((voice, vi) => {
            if (voice.selected[stepWithinCycle]) {
                const ch = _channels && _channels.masterVoices && _channels.masterVoices[vi];
                if (ch && !ch.muted && ch.sound) {
                    triggers.push({ channelKey: 'masterVoices', voiceIndex: vi, hitTime, sound: ch.sound, volume: ch.volume * ch.gainScale * _globalVolume });
                }
            }
        });
    }

    // A phrase voices
    if (_lanes.AphraseVoices) {
        _lanes.AphraseVoices.forEach((voice, vi) => {
            if (voice.selected[aps]) {
                const ch = _channels && _channels.Avoices && _channels.Avoices[vi];
                if (ch && !ch.muted && ch.sound) {
                    triggers.push({ channelKey: 'Avoices', voiceIndex: vi, hitTime, sound: ch.sound, volume: ch.volume * ch.gainScale * _globalVolume });
                }
            }
        });
    }

    // A wheel
    if (_lanes.AwheelSelected && _lanes.AwheelSelected[aws]) {
        const ch = _channels && _channels.Awheel;
        if (ch && !ch.muted && ch.sound) {
            triggers.push({ channelKey: 'Awheel', voiceIndex: null, hitTime, sound: ch.sound, volume: ch.volume * ch.gainScale * _globalVolume });
        }
    }

    // B phrase voices
    if (_lanes.BphraseVoices) {
        _lanes.BphraseVoices.forEach((voice, vi) => {
            if (voice.selected[bps]) {
                const ch = _channels && _channels.Bvoices && _channels.Bvoices[vi];
                if (ch && !ch.muted && ch.sound) {
                    triggers.push({ channelKey: 'Bvoices', voiceIndex: vi, hitTime, sound: ch.sound, volume: ch.volume * ch.gainScale * _globalVolume });
                }
            }
        });
    }

    // B wheel
    if (_lanes.BwheelSelected && _lanes.BwheelSelected[bws]) {
        const ch = _channels && _channels.Bwheel;
        if (ch && !ch.muted && ch.sound) {
            triggers.push({ channelKey: 'Bwheel', voiceIndex: null, hitTime, sound: ch.sound, volume: ch.volume * ch.gainScale * _globalVolume });
        }
    }
}

function _getActivePhraseStep(masterStep, phaseShift, teethPerPulse, phraseLength) {
    if (teethPerPulse <= 0) return 0;
    return ((Math.floor((masterStep - phaseShift) / teethPerPulse) % phraseLength) + phraseLength) % phraseLength;
}

function _getActiveWheelStep(masterStep, phaseShift, teethPerPulse, wheelLength) {
    if (teethPerPulse <= 0) return 0;
    return ((Math.floor((masterStep - phaseShift) / teethPerPulse) % wheelLength) + wheelLength) % wheelLength;
}

self.onmessage = (e) => {
    const msg = e.data;
    switch (msg.type) {
        case 'init':
            _config = msg.config;
            _lanes = msg.lanes;
            _channels = msg.channels;
            _globalVolume = msg.globalVolume;
            _config.audioCtxAtOrigin = msg.audioCtxNow;
            _config.clockOrigin = performance.now() / 1000;
            // Seed tracking to current position
            if (_config) {
                const rps = _config.tempo * Math.PI / 120;
                const stepSize = 2 * Math.PI / _config.mainTeeth;
                const stepDuration = stepSize / rps;
                const quarterDuration = 60 / _config.tempo;
                const elapsed = _config.audioCtxAtOrigin - _config.audioStartTime;
                _lastScheduledStep = Math.floor(elapsed / stepDuration);
                _lastScheduledQuarter = Math.floor(elapsed / quarterDuration);
            }
            clearTimeout(_timer);
            _tick();
            break;
        case 'update':
            if (msg.config) Object.assign(_config, msg.config);
            if (msg.lanes) _lanes = msg.lanes;
            if (msg.channels) _channels = msg.channels;
            if (msg.globalVolume !== undefined) _globalVolume = msg.globalVolume;
            if (msg.audioCtxNow !== undefined) {
                _config.audioCtxAtOrigin = msg.audioCtxNow;
                _config.clockOrigin = performance.now() / 1000;
            }
            break;
        case 'stop':
            clearTimeout(_timer);
            _timer = null;
            break;
    }
};
