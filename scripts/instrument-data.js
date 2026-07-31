/**
 * instrument-data.js — Exported parameter objects for each synthesis instrument.
 *
 * Separating the tunable numbers from the synthesis functions lets the tuner
 * HTML files import the same live values. Editing a number here updates both
 * the app sound and the tuner sliders.
 *
 * Each instrument may have its own param shape.  Key conventions:
 *   volScale / bodyVol / noiseVol — amplitude multipliers (0–1)
 *   Decay / Sweep — durations in seconds
 *   Freq / Ratio / Bend — frequencies in Hz or dimensionless multipliers
 */

export const instrumentData = {

  // ── Membrane Family ────────────────────────────────────────────────────

  kick: {
    label: 'Bass Drum (Kick)',
    params: [
      { k: 'startFreq', v: 135, label: 'Start Frequency', unit: 'Hz', lo: 20, hi: 300, step: 1, gloss: 'Initial pitch at strike.' },
      { k: 'endFreq',   v: 38,  label: 'End Frequency',   unit: 'Hz', lo: 15, hi: 200, step: 1, gloss: 'Resting pitch after sweep.' },
      { k: 'sweepTime', v: 0.12,label: 'Sweep Duration',  unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'How fast the pitch drops.' },
      { k: 'decay',     v: 0.14,label: 'Decay',           unit: 's',  lo: 0.01, hi: 1.0, step: 0.005, gloss: 'Total sound duration.' }
    ]
  },

  tom: {
    label: 'Synth Electronic Tom',
    params: [
      { k: 'startFreq', v: 160, label: 'Start Frequency', unit: 'Hz', lo: 30, hi: 500, step: 1, gloss: 'Initial pitch.' },
      { k: 'endFreq',   v: 80,  label: 'End Frequency',   unit: 'Hz', lo: 15, hi: 300, step: 1, gloss: 'Resting pitch.' },
      { k: 'sweepTime', v: 0.2, label: 'Sweep Duration',  unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'Pitch drop time.' },
      { k: 'decay',     v: 0.22,label: 'Decay',           unit: 's',  lo: 0.01, hi: 1.0, step: 0.005, gloss: 'Total duration.' }
    ]
  },

  talking_drum: {
    label: 'Talking Drum',
    params: [
      { k: 'startFreq', v: 115,  label: 'Start Frequency', unit: 'Hz', lo: 30, hi: 400, step: 1, gloss: 'Initial pitch before the rise.' },
      { k: 'peakFreq',  v: 245,  label: 'Peak Frequency',  unit: 'Hz', lo: 50, hi: 600, step: 1, gloss: 'Peak pitch mid-strike.' },
      { k: 'endFreq',   v: 175,  label: 'End Frequency',   unit: 'Hz', lo: 30, hi: 400, step: 1, gloss: 'Resting pitch.' },
      { k: 'riseTime',  v: 0.075,label: 'Rise Time',       unit: 's',  lo: 0.005, hi: 0.3, step: 0.001, gloss: 'Time to reach peak.' },
      { k: 'sweepTime', v: 0.22, label: 'Fall Time',       unit: 's',  lo: 0.01, hi: 0.5, step: 0.005, gloss: 'Time from peak to rest.' },
      { k: 'decay',     v: 0.24, label: 'Decay',           unit: 's',  lo: 0.02, hi: 1.0, step: 0.005, gloss: 'Total duration.' }
    ]
  },

  udu: {
    label: 'Udu Clay Pot',
    params: [
      { k: 'startMul',  v: 1.35, label: 'Start Multiplier',unit: '',   lo: 1.0, hi: 2.5, step: 0.01, gloss: 'Start = base × this.' },
      { k: 'baseFreq',  v: 125,  label: 'Base Frequency',   unit: 'Hz', lo: 30, hi: 400, step: 1, gloss: 'Core resonant frequency.' },
      { k: 'sweepTime', v: 0.07, label: 'Sweep Duration',   unit: 's',  lo: 0.005, hi: 0.3, step: 0.001, gloss: 'Settle time.' },
      { k: 'filterFreq',v: 700,  label: 'LP Filter Freq',   unit: 'Hz', lo: 100, hi: 2000, step: 10, gloss: 'Lowpass cutoff.' },
      { k: 'decay',     v: 0.28, label: 'Decay',            unit: 's',  lo: 0.02, hi: 1.0, step: 0.005, gloss: 'Total duration.' }
    ]
  },

  // ── Hybrid Family ──────────────────────────────────────────────────────

  bongo_low: {
    label: 'Bongo (Low) — Hembra',
    params: [
      { k: 'baseFreq',  v: 145,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 300, step: 1, gloss: 'Fundamental pitch.' },
      { k: 'pitchBend', v: 1.19, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Impact bend multiplier.' },
      { k: 'bodyVol',   v: 0.7,  label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental volume.' },
      { k: 'bodyDecay', v: 0.35, label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 0.8, step: 0.01, gloss: 'How long the body rings.' },
      { k: 'overRatio', v: 1.593,label: 'Overtone Ratio',    unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Bessel zero (1.593).' },
      { k: 'overVol',   v: 0.25, label: 'Overtone Volume',  unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Overtone triangle volume.' },
      { k: 'overDecay', v: 0.45, label: 'Over. Decay Fact.',unit: '',   lo: 0.1, hi: 1.0, step: 0.01, gloss: 'Overtone = bodyDecay × this.' },
      { k: 'noiseFreq', v: 3070, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Bandpass centre.' },
      { k: 'noiseQ',    v: 1.5,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Filter resonance.' },
      { k: 'noiseVol',  v: 0.4,  label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slap transient volume.' },
      { k: 'noiseDecay',v: 0.015,label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Slap duration.' }
    ]
  },

  bongo_high: {
    label: 'Bongo (High) — Macho',
    params: [
      { k: 'baseFreq',  v: 271,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 400, step: 1, gloss: 'Fundamental pitch.' },
      { k: 'pitchBend', v: 1.15, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Impact bend.' },
      { k: 'bodyVol',   v: 0.7,  label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental volume.' },
      { k: 'bodyDecay', v: 0.18, label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 0.6, step: 0.01, gloss: 'Shorter Macho sustain.' },
      { k: 'overRatio', v: 1.593,label: 'Overtone Ratio',    unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Bessel ratio.' },
      { k: 'overVol',   v: 0.3,  label: 'Overtone Volume',  unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'More prominent rim ring.' },
      { k: 'overDecay', v: 0.4,  label: 'Over. Decay Fact.',unit: '',   lo: 0.1, hi: 1.0, step: 0.01, gloss: 'Overtone decay factor.' },
      { k: 'noiseFreq', v: 4000, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Higher Macho slap.' },
      { k: 'noiseQ',    v: 1.8,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Filter Q.' },
      { k: 'noiseVol',  v: 0.45, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slap volume.' },
      { k: 'noiseDecay',v: 0.012,label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Slap duration.' }
    ]
  },

  conga_low: {
    label: 'Conga (Low)',
    params: [
      { k: 'baseFreq',  v: 130,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 250, step: 1, gloss: 'Fundamental.' },
      { k: 'bodyVol',   v: 0.7,  label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Sine volume.' },
      { k: 'bodyDecay', v: 0.2,  label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 0.8, step: 0.01, gloss: 'Overall decay.' },
      { k: 'overRatio1',v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'First triangle overtone.' },
      { k: 'overVol1',  v: 0.25, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume of first overtone.' },
      { k: 'overRatio2',v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Second triangle overtone.' },
      { k: 'overVol2',  v: 0.12, label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume of second overtone.' },
      { k: 'slapFreq',  v: 2500, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 6000, step: 10, gloss: 'Bandpass centre.' },
      { k: 'slapVol',   v: 0.30, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slap noise volume.' },
      { k: 'slapDecay', v: 0.025,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Slap duration.' }
    ]
  },

  conga_middle: {
    label: 'Conga (Middle)',
    params: [
      { k: 'baseFreq',  v: 160,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 300, step: 1, gloss: 'Fundamental.' },
      { k: 'bodyVol',   v: 0.65, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Sine volume.' },
      { k: 'bodyDecay', v: 0.18, label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 0.6, step: 0.01, gloss: 'Decay.' },
      { k: 'overRatio1',v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'First overtone.' },
      { k: 'overVol1',  v: 0.25, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume.' },
      { k: 'overRatio2',v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Second overtone.' },
      { k: 'overVol2',  v: 0.12, label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume.' },
      { k: 'slapFreq',  v: 2800, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 6000, step: 10, gloss: 'Bandpass centre.' },
      { k: 'slapVol',   v: 0.35, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slap volume.' },
      { k: 'slapDecay', v: 0.02, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Slap duration.' }
    ]
  },

  conga_high: {
    label: 'Conga (High)',
    params: [
      { k: 'baseFreq',  v: 195,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 400, step: 1, gloss: 'Fundamental.' },
      { k: 'bodyVol',   v: 0.6,  label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume.' },
      { k: 'bodyDecay', v: 0.15, label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 0.5, step: 0.01, gloss: 'Decay.' },
      { k: 'overRatio1',v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'First overtone.' },
      { k: 'overVol1',  v: 0.25, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume.' },
      { k: 'overRatio2',v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Second overtone.' },
      { k: 'overVol2',  v: 0.12, label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume.' },
      { k: 'slapFreq',  v: 3200, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 6000, step: 10, gloss: 'Bandpass centre.' },
      { k: 'slapVol',   v: 0.4,  label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slap volume.' },
      { k: 'slapDecay', v: 0.018,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Slap duration.' }
    ]
  },

  conga_slap: {
    label: 'Conga Slap',
    params: [
      { k: 'baseFreq',  v: 240,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 450, step: 1, gloss: 'Higher fundamental.' },
      { k: 'bodyVol',   v: 0.5,  label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Quieter than open tone.' },
      { k: 'bodyDecay', v: 0.08, label: 'Body Decay',       unit: 's',  lo: 0.02, hi: 0.3, step: 0.005, gloss: 'Short slap decay.' },
      { k: 'overRatio1',v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Overtone.' },
      { k: 'overVol1',  v: 0.2,  label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Overtone volume.' },
      { k: 'slapFreq',  v: 4000, label: 'Slap Filter Freq', unit: 'Hz', lo: 1000, hi: 8000, step: 10, gloss: 'High slap crack.' },
      { k: 'slapQ',     v: 2.0,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Slap resonance.' },
      { k: 'slapVol',   v: 0.6,  label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Dominant slap noise.' },
      { k: 'slapDecay', v: 0.015,label: 'Slap Decay',       unit: 's',  lo: 0.002, hi: 0.06, step: 0.001, gloss: 'Very short transient.' }
    ]
  },

  snare: {
    label: 'Snare Drum',
    params: [
      { k: 'bodyFreq',  v: 180,  label: 'Body Frequency',   unit: 'Hz', lo: 80, hi: 400, step: 1, gloss: 'Triangle body pitch.' },
      { k: 'bodyVol',   v: 0.35, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Body volume.' },
      { k: 'bodyDecay', v: 0.08, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Body decay.' },
      { k: 'noiseFreq', v: 1200, label: 'Noise HP Freq',    unit: 'Hz', lo: 200, hi: 5000, step: 10, gloss: 'Highpass for wire rattle.' },
      { k: 'noiseVol',  v: 0.65, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Snare noise volume.' },
      { k: 'noiseDecay',v: 0.12, label: 'Noise Decay',      unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Wire rattle duration.' }
    ]
  },

  electronic_snare: {
    label: 'Electronic Snare',
    params: [
      { k: 'bodyFreq',  v: 200,  label: 'Body Start Freq',  unit: 'Hz', lo: 60, hi: 400, step: 1, gloss: 'Sine start.' },
      { k: 'bodyEndFreq',v: 100,  label: 'Body End Freq',   unit: 'Hz', lo: 30, hi: 300, step: 1, gloss: 'Resting pitch.' },
      { k: 'bodySweep', v: 0.1,  label: 'Body Sweep',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Pitch drop.' },
      { k: 'bodyVol',   v: 0.5,  label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume.' },
      { k: 'bodyDecay', v: 0.1,  label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Decay.' },
      { k: 'noiseFreq', v: 2500, label: 'Noise BP Freq',    unit: 'Hz', lo: 500, hi: 6000, step: 10, gloss: 'Bandpass centre.' },
      { k: 'noiseQ',    v: 3.0,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Bandpass Q.' },
      { k: 'noiseVol',  v: 0.6,  label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Noise volume.' },
      { k: 'noiseDecay',v: 0.12, label: 'Noise Decay',      unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Noise decay.' }
    ]
  },

  timbale: {
    label: 'Timbale',
    params: [
      { k: 'bodyFreq',  v: 500,  label: 'Body Start Freq',  unit: 'Hz', lo: 100, hi: 800, step: 1, gloss: 'High sine start.' },
      { k: 'bodyEndFreq',v: 350,  label: 'Body End Freq',   unit: 'Hz', lo: 80, hi: 600, step: 1, gloss: 'Resting pitch.' },
      { k: 'bodySweep', v: 0.06, label: 'Body Sweep',       unit: 's',  lo: 0.005, hi: 0.2, step: 0.001, gloss: 'Fast drop.' },
      { k: 'bodyVol',   v: 0.6,  label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Body volume.' },
      { k: 'bodyDecay', v: 0.08, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.25, step: 0.005, gloss: 'Decay.' },
      { k: 'noiseFreq', v: 3000, label: 'Noise HP Freq',    unit: 'Hz', lo: 200, hi: 5000, step: 10, gloss: 'Highpass for rim.' },
      { k: 'noiseVol',  v: 0.25, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Noise volume.' },
      { k: 'noiseDecay',v: 0.03, label: 'Noise Decay',      unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Sharp metallic ring.' }
    ]
  },



  slap: {
    label: 'Hand Slap',
    params: [
      { k: 'noiseFreq', v: 2000, label: 'Noise BP Freq',    unit: 'Hz', lo: 500, hi: 5000, step: 10, gloss: 'Bandpass for slap.' },
      { k: 'noiseVol',  v: 0.55, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Noise volume.' },
      { k: 'noiseDecay',v: 0.05, label: 'Noise Decay',      unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Noise decay.' },
      { k: 'bodyFreq',  v: 800,  label: 'Body Start Freq',  unit: 'Hz', lo: 100, hi: 1200, step: 1, gloss: 'Sine start.' },
      { k: 'bodyEndFreq',v: 400,  label: 'Body End Freq',   unit: 'Hz', lo: 50, hi: 800, step: 1, gloss: 'Sine end.' },
      { k: 'bodySweep', v: 0.04, label: 'Body Sweep',       unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Pitch drop.' },
      { k: 'bodyVol',   v: 0.55, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Body volume.' },
      { k: 'bodyDecay', v: 0.06, label: 'Body Decay',       unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Body decay.' }
    ]
  },

  synth_kick: {
    label: 'EDM Synth Kick',
    params: [
      { k: 'bodyFreq',  v: 60,   label: 'Sub Start Freq',   unit: 'Hz', lo: 30, hi: 120, step: 1, gloss: 'Sub sine start.' },
      { k: 'bodyEndFreq',v: 30,   label: 'Sub End Freq',    unit: 'Hz', lo: 15, hi: 80, step: 1, gloss: 'Sub end.' },
      { k: 'bodySweep', v: 0.2,  label: 'Sub Sweep',        unit: 's',  lo: 0.03, hi: 0.4, step: 0.01, gloss: 'Sweep depth.' },
      { k: 'bodyVol',   v: 0.9,  label: 'Sub Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Sub volume.' },
      { k: 'bodyDecay', v: 0.25, label: 'Sub Decay',        unit: 's',  lo: 0.05, hi: 0.5, step: 0.01, gloss: 'Sub decay.' },
      { k: 'clickFreq', v: 4000, label: 'Click BP Freq',    unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Attack click bandpass.' },
      { k: 'clickQ',    v: 3.0,  label: 'Click Q',          unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Click Q.' },
      { k: 'clickVol',  v: 0.3,  label: 'Click Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Click volume.' },
      { k: 'clickDecay',v: 0.01, label: 'Click Decay',      unit: 's',  lo: 0.002, hi: 0.06, step: 0.001, gloss: 'Very short click.' }
    ]
  },

  // ── New: multi-layer Djembe ────────────────────────────────────────────

  djembe: {
    label: 'Djembe',
    params: [
      { k: 'bassFreq',    v: 55,   label: 'Bass Frequency',    unit: 'Hz', lo: 30, hi: 120, step: 1, gloss: 'Helmholtz cavity resonance.' },
      { k: 'bassPitchBend',v: 1.1, label: 'Bass Pitch Bend',   unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Cavity bend.' },
      { k: 'bassVol',     v: 0.85, label: 'Bass Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Sub volume.' },
      { k: 'bassDecay',   v: 0.45, label: 'Bass Decay',        unit: 's',  lo: 0.05, hi: 0.8, step: 0.01, gloss: 'Booming open tone.' },
      { k: 'skinRatio',   v: 5.5,  label: 'Skin Ratio',        unit: '',   lo: 2.0, hi: 8.0, step: 0.1, gloss: 'Skin = bassFreq × this.' },
      { k: 'skinPitchBend',v: 1.15,label: 'Skin Pitch Bend',   unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Skin bend.' },
      { k: 'skinVol',     v: 0.25, label: 'Skin Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Skin triangle volume.' },
      { k: 'skinDecay',   v: 0.15, label: 'Skin Decay',        unit: 's',  lo: 0.03, hi: 0.4, step: 0.01, gloss: 'Faster skin decay.' },
      { k: 'slapFreq',    v: 4500, label: 'Slap Filter Freq',  unit: 'Hz', lo: 1000, hi: 8000, step: 10, gloss: 'Bright slap transient.' },
      { k: 'slapQ',       v: 1.2,  label: 'Slap Q',            unit: '',   lo: 0.5, hi: 3.0, step: 0.1, gloss: 'Slap Q.' },
      { k: 'slapVol',     v: 0.5,  label: 'Slap Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slap volume.' },
      { k: 'slapDecay',   v: 0.04, label: 'Slap Decay',        unit: 's',  lo: 0.005, hi: 0.1, step: 0.001, gloss: 'Slap duration.' }
    ]
  },

  frame_drum: {
    label: 'Frame Drum (Tar)',
    params: [
      { k: 'baseFreq',       v: 95,   label: 'Base Frequency',       unit: 'Hz', lo: 50, hi: 200, step: 1, gloss: 'Membrane fundamental.' },
      { k: 'pitchBend',      v: 1.4,  label: 'Pitch Bend',           unit: '',   lo: 1.0, hi: 1.8, step: 0.01, gloss: '40% drop for thud.' },
      { k: 'bodyVol',        v: 0.8,  label: 'Body Volume',          unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental volume.' },
      { k: 'bodyDecay',      v: 0.22, label: 'Body Decay',           unit: 's',  lo: 0.05, hi: 0.5, step: 0.01, gloss: 'Shallow shell sustain.' },
      { k: 'overRatio',      v: 1.593,label: 'Overtone Ratio',        unit: '',   lo: 1.2, hi: 2.5, step: 0.001, gloss: 'Bessel edge tone.' },
      { k: 'overPitchBend',  v: 1.3,  label: 'Over. Pitch Bend',     unit: '',   lo: 1.0, hi: 1.6, step: 0.01, gloss: 'Overtone bend.' },
      { k: 'overVol',        v: 0.2,  label: 'Overtone Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Overtone volume.' },
      { k: 'overDecayFactor',v: 0.6,  label: 'Over. Decay Factor',   unit: '',   lo: 0.2, hi: 1.0, step: 0.01, gloss: 'Over decay factor.' },
      { k: 'noiseFreq',      v: 1500, label: 'Transient Freq',       unit: 'Hz', lo: 500, hi: 4000, step: 10, gloss: 'Mid flesh transient.' },
      { k: 'noiseQ',         v: 1.0,  label: 'Transient Q',          unit: '',   lo: 0.5, hi: 3.0, step: 0.1, gloss: 'Transient Q.' },
      { k: 'noiseVol',       v: 0.4,  label: 'Transient Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Flesh impact volume.' },
      { k: 'noiseDecay',     v: 0.02, label: 'Transient Decay',      unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Finger/thumb transient.' }
    ]
  },
};
