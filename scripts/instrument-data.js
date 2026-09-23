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
    family: 'membrane',
    label: 'Bass Drum (Kick)',
    params: [
      { k: 'volScale', v: 100, label: 'Volume', unit: '%', lo: 10, hi: 100, step: 1, gloss: 'Relative volume for this instrument.' },
      { k: 'startFreq', v: 135, label: 'Start Frequency', unit: 'Hz', lo: 20, hi: 300, step: 1, gloss: 'Initial pitch at strike.' },
      { k: 'endFreq',   v: 38,  label: 'End Frequency',   unit: 'Hz', lo: 15, hi: 200, step: 1, gloss: 'Resting pitch after sweep.' },
      { k: 'sweepTime', v: 0.12,label: 'Sweep Duration',  unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'How fast the pitch drops.' },
      { k: 'decay',     v: 0.14,label: 'Decay',           unit: 's',  lo: 0.01, hi: 1.0, step: 0.005, gloss: 'Total sound duration.' }
    ]
  },

  tom: {
    family: 'membrane',
    label: 'Synth Electronic Tom',
    params: [
      { k: 'volScale', v: 80, label: 'Volume', unit: '%', lo: 10, hi: 100, step: 1, gloss: 'Relative volume.' },
      { k: 'startFreq', v: 160, label: 'Start Frequency', unit: 'Hz', lo: 30, hi: 500, step: 1, gloss: 'Initial pitch.' },
      { k: 'endFreq',   v: 80,  label: 'End Frequency',   unit: 'Hz', lo: 15, hi: 300, step: 1, gloss: 'Resting pitch.' },
      { k: 'sweepTime', v: 0.2, label: 'Sweep Duration',  unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'Pitch drop time.' },
      { k: 'decay',     v: 0.22,label: 'Decay',           unit: 's',  lo: 0.01, hi: 1.0, step: 0.005, gloss: 'Total duration.' }
    ]
  },

  talking_drum: {
    family: 'membrane',
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
    family: 'membrane',
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
    family: 'hybrid',
    label: 'Bongo (Low) — Hembra',
    params: [
      { k: 'baseFreq',    v: 145,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 300, step: 1, gloss: 'Fundamental pitch (D3 for Hembra).' },
      { k: 'pitchBend',   v: 1.10, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Pitch drop after the strike — a percussive transient, not a melody.' },
      { k: 'pitchBendTime', v: 0.015, label: 'Pitch Bend Time', unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Keep it short (~15 ms) or the strike reads as an 808 "pew".' },
      { k: 'bodyVol',     v: 0.72, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental level — tight and dry.' },
      { k: 'bodyDecay',   v: 0.35, label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 0.8, step: 0.01, gloss: 'Short, tight fundamental.' },
      { k: 'overRatio',   v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'First membrane mode (Bessel zero) — the "wood and skin".' },
      { k: 'overVol',     v: 0.16, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Wood/skin character on top of the fundamental.' },
      { k: 'overDecay',   v: 0.12, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'Absolute time; damps faster than the body so it never rings metallic.' },
      { k: 'overRatio2',  v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Second membrane mode — midrange shell presence.' },
      { k: 'overVol2',    v: 0.08, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Extremely subtle.' },
      { k: 'overDecay2',  v: 0.06, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'Absolute time; dies almost immediately.' },
      { k: 'noiseFreq',   v: 4000, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Thin-skin crack.' },
      { k: 'noiseQ',      v: 2.0,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Resonant "chirp".' },
      { k: 'noiseVol',    v: 0.38, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Sharp transient level.' },
      { k: 'noiseDecay',  v: 0.01, label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: '10 ms — a perfect, sharp transient.' }
    ]
  },

  bongo_high: {
    family: 'hybrid',
    label: 'Bongo (High) — Macho',
    params: [
      { k: 'baseFreq',    v: 240,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 400, step: 1, gloss: 'A major sixth above the Hembra (145 Hz) — the classic cutting interval. (193 Hz = a perfect fourth.)' },
      { k: 'pitchBend',   v: 1.08, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Tighter skin deflects slightly less than the Hembra.' },
      { k: 'pitchBendTime', v: 0.01, label: 'Pitch Bend Time', unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Very fast (~10 ms) recovery — a transient, not a melodic drop.' },
      { k: 'bodyVol',     v: 0.65, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Lower than the Hembra — higher frequencies cut through the mix.' },
      { k: 'bodyDecay',   v: 0.18, label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 0.6, step: 0.01, gloss: 'Smallest head, fastest damping of all bongos.' },
      { k: 'overRatio',   v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'First membrane mode (Bessel zero) — physics as for any circular head.' },
      { k: 'overVol',     v: 0.18, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slightly more prominent on a tightly tuned Macho.' },
      { k: 'overDecay',   v: 0.09, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'Absolute time; half the body decay.' },
      { k: 'overRatio2',  v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Second membrane mode.' },
      { k: 'overVol2',    v: 0.10, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Very quick metallic ring.' },
      { k: 'overDecay2',  v: 0.04, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'Absolute time; vanishes almost instantly.' },
      { k: 'noiseFreq',   v: 5200, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Fingers on highly tensioned skin — the crack.' },
      { k: 'noiseQ',      v: 2.5,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Sharper, tighter “tick”.' },
      { k: 'noiseVol',    v: 0.42, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slightly louder slap relative to its own body.' },
      { k: 'noiseDecay',  v: 0.008,label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: '8 ms — a pure, instantaneous transient.' }
    ]
  },

  bongo_high_slap: {
    family: 'hybrid',
    label: 'Bongo Slap (High) — Macho Golpe Seco',
    params: [
      { k: 'baseFreq',    v: 240,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 400, step: 1, gloss: 'Same tuning as the Macho open tone.' },
      { k: 'pitchBend',   v: 1.15, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Pressing into the skin raises tension, so a slightly higher bend than the open tone.' },
      { k: 'pitchBendTime', v: 0.005, label: 'Pitch Bend Time', unit: 's',  lo: 0.002, hi: 0.05, step: 0.001, gloss: 'Dies immediately — the tone is trapped by the hand.' },
      { k: 'bodyVol',     v: 0.15, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Barely audible; the fundamental is choked out.' },
      { k: 'bodyDecay',   v: 0.04, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Instant decay.' },
      { k: 'overRatio',   v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'First membrane mode.' },
      { k: 'overVol',     v: 0.02, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Almost zero. Trapped skin cannot ring.' },
      { k: 'overDecay',   v: 0.02, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Killed almost instantly.' },
      { k: 'overRatio2',  v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Second membrane mode.' },
      { k: 'overVol2',    v: 0.01, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Negligible.' },
      { k: 'overDecay2',  v: 0.01, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Vanishes at once.' },
      { k: 'noiseFreq',   v: 6000, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Shifted very high for a bright crack.' },
      { k: 'noiseQ',      v: 3.0,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'High Q gives the noise filter a distinct, pitched "ping".' },
      { k: 'noiseVol',    v: 0.85, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The transient is the loudest part of this stroke.' },
      { k: 'noiseDecay',  v: 0.03, label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: '30 ms gives the crack some physical weight.' }
    ]
  },

  bongo_low_mute: {
    family: 'hybrid',
    label: 'Bongo Mute (Low) — Hembra Tapao',
    params: [
      { k: 'baseFreq',    v: 145,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 300, step: 1, gloss: 'Same tuning as the Hembra open tone.' },
      { k: 'pitchBend',   v: 1.02, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Almost no bend; the hand prevents the skin from stretching freely.' },
      { k: 'pitchBendTime', v: 0.01, label: 'Pitch Bend Time', unit: 's',  lo: 0.002, hi: 0.08, step: 0.001, gloss: 'Quick settle.' },
      { k: 'bodyVol',     v: 0.45, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Still has some volume to provide a rhythmic pulse.' },
      { k: 'bodyDecay',   v: 0.05, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.4, step: 0.005, gloss: 'Extremely short ring.' },
      { k: 'overRatio',   v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'First membrane mode.' },
      { k: 'overVol',     v: 0.0,  label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Absolute zero — the damped membrane cannot ring.' },
      { k: 'overDecay',   v: 0.01, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Muted immediately.' },
      { k: 'overRatio2',  v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Second membrane mode.' },
      { k: 'overVol2',    v: 0.0,  label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Absolute zero.' },
      { k: 'overDecay2',  v: 0.01, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Muted immediately.' },
      { k: 'noiseFreq',   v: 1200, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Low filter frequency — a "thwap", not a "crack".' },
      { k: 'noiseQ',      v: 0.5,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Low Q prevents any resonant ringing in the noise band.' },
      { k: 'noiseVol',    v: 0.25, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Quiet attack.' },
      { k: 'noiseDecay',  v: 0.015,label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Short and blunt.' }
    ]
  },

  conga_low: {
    family: 'hybrid',
    label: 'Conga (Low)',
    params: [
      { k: 'baseFreq',    v: 110,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 250, step: 1, gloss: 'Sits in the bass pocket (around A2) — the Tumba is the bass anchor of the family.' },
      { k: 'pitchBend',   v: 1.08, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Pronounced: the looser, thicker skin displaces further on impact.' },
      { k: 'pitchBendTime', v: 0.06, label: 'Pitch Bend Time', unit: 's',  lo: 0.01, hi: 0.15, step: 0.001, gloss: '60 ms — takes longer to recover its resting tension than the tighter Quinto.' },
      { k: 'bodyVol',     v: 0.85, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The fundamental is the absolute star of the Tumba.' },
      { k: 'bodyDecay',   v: 0.85, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 1.2, step: 0.01, gloss: 'The large barrel allows a long, booming sustain — the "dooooom".' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'First shell overtone.' },
      { k: 'shellVol1',   v: 0.15, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Quieter than the Quinto — overtones don\'t speak as loudly on a looser head.' },
      { k: 'shellDecay1', v: 0.35, label: 'Shell Decay 1',    unit: 's',  lo: 0.02, hi: 0.8, step: 0.005, gloss: 'Damps out before the main body, leaving a pure low-end tail.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Second shell overtone.' },
      { k: 'shellVol2',   v: 0.08, label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Barely there — just enough to give the impact a woody quality.' },
      { k: 'shellDecay2', v: 0.2,  label: 'Shell Decay 2',    unit: 's',  lo: 0.01, hi: 0.6, step: 0.005, gloss: 'Steeper drop-off than the first overtone.' },
      { k: 'slapFreq',    v: 2200, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 6000, step: 10, gloss: 'A full 1000 Hz below the Quinto — thick skin produces a darker transient.' },
      { k: 'slapQ',       v: 1.0,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Lower Q for a broader, fatter hand impact.' },
      { k: 'slapVol',     v: 0.45, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slightly quieter: the hand pushes through the skin rather than bouncing off.' },
      { k: 'slapDecay',   v: 0.035,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.12, step: 0.001, gloss: '35 ms — the thickest skin means the longest contact before release; overlaps the 60 ms pitch bend.' }
    ]
  },

  conga_middle: {
    family: 'hybrid',
    label: 'Conga (Middle)',
    params: [
      { k: 'baseFreq',    v: 185,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 350, step: 1, gloss: 'Sits in the gap between the 110 Hz Tumba and the 290 Hz Quinto — the harmonic bridge.' },
      { k: 'pitchBend',   v: 1.07, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Intermediate skin thickness yields a moderate deflection.' },
      { k: 'pitchBendTime', v: 0.05, label: 'Pitch Bend Time', unit: 's',  lo: 0.01, hi: 0.15, step: 0.001, gloss: '50 ms — fast enough to retain punch, slow enough to feel heavy.' },
      { k: 'bodyVol',     v: 0.75, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental weight — the rhythmic glue.' },
      { k: 'bodyDecay',   v: 0.70, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 1.2, step: 0.01, gloss: 'Sustains longer than the Quinto (0.55 s) but stays out of the Tumba\'s way (0.85 s).' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Warm midrange presence.' },
      { k: 'shellVol1',   v: 0.20, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Balanced between the Quinto\'s 0.25 and the Tumba\'s 0.15.' },
      { k: 'shellDecay1', v: 0.32, label: 'Shell Decay 1',    unit: 's',  lo: 0.02, hi: 0.8, step: 0.005, gloss: 'Overtone damping — between the Quinto and Tumba.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Second shell overtone.' },
      { k: 'shellVol2',   v: 0.10, label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Balanced woody quality.' },
      { k: 'shellDecay2', v: 0.18, label: 'Shell Decay 2',    unit: 's',  lo: 0.01, hi: 0.6, step: 0.005, gloss: 'Steeper drop-off than the first overtone.' },
      { k: 'slapFreq',    v: 2700, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 6000, step: 10, gloss: 'Warmer than the Quinto\'s 3200 Hz crack, brighter than the Tumba\'s 2200 Hz thud.' },
      { k: 'slapQ',       v: 1.2,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'A balanced resonance.' },
      { k: 'slapVol',     v: 0.48, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Mid-weight hand impact.' },
      { k: 'slapDecay',   v: 0.03, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.12, step: 0.001, gloss: '30 ms — overlaps the 50 ms pitch bend for a realistic physical strike.' }
    ]
  },

  conga_high: {
    family: 'hybrid',
    label: 'Conga (High)',
    params: [
      { k: 'baseFreq',    v: 290,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 500, step: 1, gloss: 'Quinto tuning — more "belly" than 313 Hz while staying high and cutting.' },
      { k: 'pitchBend',   v: 1.06, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.4, step: 0.01, gloss: 'Thick cowhide stretches under the hand then recovers — without this it sounds like a plastic tom.' },
      { k: 'pitchBendTime', v: 0.04, label: 'Pitch Bend Time', unit: 's',  lo: 0.01, hi: 0.12, step: 0.001, gloss: '40 ms — slower than a bongo, creating the classic conga "dooom".' },
      { k: 'bodyVol',     v: 0.65, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental carries the drum\'s weight.' },
      { k: 'bodyDecay',   v: 0.55, label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 0.9, step: 0.01, gloss: 'Open tones sustain on the deep shell.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Clash between circular skin modes and tubular shell resonances.' },
      { k: 'shellVol1',   v: 0.25, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Quinto overtones are brighter and more prominent than the Tumba\'s.' },
      { k: 'shellDecay1', v: 0.3,  label: 'Shell Decay 1',    unit: 's',  lo: 0.02, hi: 0.6, step: 0.005, gloss: 'Rings longer than a bongo overtone, but still decays before the fundamental.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Second shell resonance.' },
      { k: 'shellVol2',   v: 0.12, label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Prominence of the second overtone.' },
      { k: 'shellDecay2', v: 0.15, label: 'Shell Decay 2',    unit: 's',  lo: 0.01, hi: 0.5, step: 0.005, gloss: 'Steeper drop-off than the first overtone.' },
      { k: 'slapFreq',    v: 3200, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 6000, step: 10, gloss: 'Thick skin gives a darker, woodier attack than the 4000+ Hz bongo crack.' },
      { k: 'slapQ',       v: 1.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Wider Q for a "fatter" hand impact.' },
      { k: 'slapVol',     v: 0.5,  label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Flesh-on-cowhide transient.' },
      { k: 'slapDecay',   v: 0.025,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: '25 ms — thick skin deflects slightly longer than a bongo.' }
    ]
  },

  conga_low_bass: {
    family: 'hybrid',
    label: 'Conga Bass (Low)',
    params: [
      { k: 'baseFreq',    v: 110,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 250, step: 1, gloss: 'Same root as the Tumba open tone — the lowest frequency normally produced in an Afro-Cuban ensemble.' },
      { k: 'pitchBend',   v: 1.15, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.5, step: 0.01, gloss: 'Extremely deep — the full palm stretches the center of the skin heavily, creating a "bowing" recovery.' },
      { k: 'pitchBendTime', v: 0.08, label: 'Pitch Bend Time', unit: 's',  lo: 0.01, hi: 0.2, step: 0.001, gloss: '80 ms — slow, rolling recovery as the air wave rebounds inside the barrel.' },
      { k: 'bodyVol',     v: 0.90, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The fundamental is everything here.' },
      { k: 'bodyDecay',   v: 0.90, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 1.5, step: 0.01, gloss: 'Sustains even longer than the open tone — no competing overtones to drain it.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for continuity; a centered strike kills edge resonance.' },
      { k: 'shellVol1',   v: 0.02, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Almost zero — the palm suppresses the asymmetric modes.' },
      { k: 'shellDecay1', v: 0.05, label: 'Shell Decay 1',    unit: 's',  lo: 0.01, hi: 0.4, step: 0.005, gloss: 'Dies immediately.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Kept for continuity.' },
      { k: 'shellVol2',   v: 0.0,  label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Eliminated entirely.' },
      { k: 'shellDecay2', v: 0.01, label: 'Shell Decay 2',    unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Eliminated.' },
      { k: 'slapFreq',    v: 400,  label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 4000, step: 10, gloss: 'Shifted drastically down — the heavy, hollow "whump" of a flat palm.' },
      { k: 'slapQ',       v: 0.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Very low Q. No metallic or ringing characteristics allowed.' },
      { k: 'slapVol',     v: 0.45, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Dark palm impact.' },
      { k: 'slapDecay',   v: 0.04, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.15, step: 0.001, gloss: 'Long, blunt transient impact.' }
    ]
  },

  conga_middle_bass: {
    family: 'hybrid',
    label: 'Conga Bass (Middle)',
    params: [
      { k: 'baseFreq',    v: 185,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 350, step: 1, gloss: 'Same root as the Tres Dos open tone.' },
      { k: 'pitchBend',   v: 1.12, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.5, step: 0.01, gloss: 'Deep center strike.' },
      { k: 'pitchBendTime', v: 0.06, label: 'Pitch Bend Time', unit: 's',  lo: 0.01, hi: 0.2, step: 0.001, gloss: '60 ms — tighter skin recovers slightly faster than the Tumba.' },
      { k: 'bodyVol',     v: 0.85, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The fundamental carries the downbeat.' },
      { k: 'bodyDecay',   v: 0.75, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 1.5, step: 0.01, gloss: 'Anchors the pattern without muddying the Tumba\'s low end.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for continuity; a centered strike kills edge resonance.' },
      { k: 'shellVol1',   v: 0.03, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Almost zero.' },
      { k: 'shellDecay1', v: 0.05, label: 'Shell Decay 1',    unit: 's',  lo: 0.01, hi: 0.4, step: 0.005, gloss: 'Dies immediately.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Kept for continuity.' },
      { k: 'shellVol2',   v: 0.0,  label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Eliminated.' },
      { k: 'shellDecay2', v: 0.01, label: 'Shell Decay 2',    unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Eliminated.' },
      { k: 'slapFreq',    v: 600,  label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 4000, step: 10, gloss: 'Still dark, but physically pitched up slightly due to the smaller drum diameter.' },
      { k: 'slapQ',       v: 0.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Flat, blunt resonance.' },
      { k: 'slapVol',     v: 0.45, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Dark palm impact.' },
      { k: 'slapDecay',   v: 0.035,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.15, step: 0.001, gloss: 'Long, blunt transient.' }
    ]
  },

  conga_high_bass: {
    family: 'hybrid',
    label: 'Conga Bass (High)',
    params: [
      { k: 'baseFreq',    v: 290,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 500, step: 1, gloss: 'Same root as the Quinto open tone.' },
      { k: 'pitchBend',   v: 1.10, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.5, step: 0.01, gloss: 'The extremely tight skin limits how far the palm can push it.' },
      { k: 'pitchBendTime', v: 0.05, label: 'Pitch Bend Time', unit: 's',  lo: 0.01, hi: 0.2, step: 0.001, gloss: '50 ms recovery.' },
      { k: 'bodyVol',     v: 0.80, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental weight.' },
      { k: 'bodyDecay',   v: 0.60, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 1.5, step: 0.01, gloss: 'Tight, hollow punch reminiscent of a basketball bouncing.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for continuity.' },
      { k: 'shellVol1',   v: 0.05, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The high tension means a tiny bit of edge resonance bleeds through.' },
      { k: 'shellDecay1', v: 0.08, label: 'Shell Decay 1',    unit: 's',  lo: 0.01, hi: 0.4, step: 0.005, gloss: 'Very short ring.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Kept for continuity.' },
      { k: 'shellVol2',   v: 0.0,  label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Eliminated.' },
      { k: 'shellDecay2', v: 0.01, label: 'Shell Decay 2',    unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Eliminated.' },
      { k: 'slapFreq',    v: 800,  label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 4000, step: 10, gloss: 'Higher, tighter thump.' },
      { k: 'slapQ',       v: 0.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Flat, blunt resonance.' },
      { k: 'slapVol',     v: 0.50, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Dark palm impact.' },
      { k: 'slapDecay',   v: 0.03, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.15, step: 0.001, gloss: 'Tight transient.' }
    ]
  },

  conga_slap: {
    family: 'hybrid',
    label: 'Conga Slap',
    params: [
      { k: 'baseFreq',  v: 260,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 450, step: 1, gloss: 'Slightly higher for a more distinct slap pitch.' },
      { k: 'bodyVol',   v: 0.25, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Almost silent body — the slap IS the sound.' },
      { k: 'bodyDecay', v: 0.06, label: 'Body Decay',       unit: 's',  lo: 0.02, hi: 0.3, step: 0.005, gloss: 'Instant body cut — the tone is just a hint.' },
      { k: 'slapFreq',  v: 4500, label: 'Slap Filter Freq', unit: 'Hz', lo: 1000, hi: 8000, step: 10, gloss: 'Sharpest crack of all congas — brightest possible snap.' },
      { k: 'slapQ',     v: 2.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Strong resonance — the defining conga slap pop.' },
      { k: 'slapVol',   v: 0.70, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The crack IS the sound — loud, sharp, immediate.' },
      { k: 'slapDecay', v: 0.015,label: 'Slap Decay',       unit: 's',  lo: 0.002, hi: 0.06, step: 0.001, gloss: 'Very short transient.' }
    ]
  },

  conga_low_press: {
    family: 'hybrid',
    label: 'Conga Press (Low)',
    params: [
      { k: 'baseFreq',    v: 110,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 250, step: 1, gloss: 'Same tuning as the Tumba open tone.' },
      { k: 'pitchBend',   v: 1.02, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.2, step: 0.005, gloss: 'The hand traps the skin, preventing it from stretching freely.' },
      { k: 'pitchBendTime', v: 0.02, label: 'Pitch Bend Time', unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Settles quickly under the resting hand.' },
      { k: 'bodyVol',     v: 0.50, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Retains a bit more low-end weight despite being muted.' },
      { k: 'bodyDecay',   v: 0.08, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Choked — fighting thick, heavy cowhide.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for consistency; volume 0 deadens it.' },
      { k: 'shellVol1',   v: 0.0,  label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — the resting hand kills all symmetric vibration.' },
      { k: 'shellDecay1', v: 0.01, label: 'Shell Decay 1',    unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Deadened.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Kept for consistency.' },
      { k: 'shellVol2',   v: 0.0,  label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — no overtones.' },
      { k: 'shellDecay2', v: 0.01, label: 'Shell Decay 2',    unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Deadened.' },
      { k: 'slapFreq',    v: 1000, label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 4000, step: 10, gloss: 'Very dark, heavy thud — flesh, not a crack.' },
      { k: 'slapQ',       v: 0.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Low Q prevents resonant ringing in the noise band.' },
      { k: 'slapVol',     v: 0.45, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The blunt impact is the sound.' },
      { k: 'slapDecay',   v: 0.025,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'The thick hide takes slightly longer to settle under the hand.' }
    ]
  },

  conga_middle_press: {
    family: 'hybrid',
    label: 'Conga Press (Middle)',
    params: [
      { k: 'baseFreq',    v: 185,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 350, step: 1, gloss: 'Same tuning as the Tres Dos open tone.' },
      { k: 'pitchBend',   v: 1.02, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.2, step: 0.005, gloss: 'The hand traps the skin.' },
      { k: 'pitchBendTime', v: 0.015, label: 'Pitch Bend Time', unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Quick recovery.' },
      { k: 'bodyVol',     v: 0.45, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Thicker than the Quinto, tighter than the Tumba.' },
      { k: 'bodyDecay',   v: 0.07, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Slightly longer mass than the Quinto, but still heavily choked.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for consistency; volume 0 deadens it.' },
      { k: 'shellVol1',   v: 0.0,  label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — overtones completely deadened.' },
      { k: 'shellDecay1', v: 0.01, label: 'Shell Decay 1',    unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Deadened.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Kept for consistency.' },
      { k: 'shellVol2',   v: 0.0,  label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — no overtones.' },
      { k: 'shellDecay2', v: 0.01, label: 'Shell Decay 2',    unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Deadened.' },
      { k: 'slapFreq',    v: 1400, label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 4000, step: 10, gloss: 'Warmer, darker impact.' },
      { k: 'slapQ',       v: 0.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Low Q prevents resonant ringing.' },
      { k: 'slapVol',     v: 0.40, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The most heavily used press sound — a percussive bed.' },
      { k: 'slapDecay',   v: 0.02, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Short, blunt transient.' }
    ]
  },

  conga_high_press: {
    family: 'hybrid',
    label: 'Conga Press (High)',
    params: [
      { k: 'baseFreq',    v: 290,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 500, step: 1, gloss: 'Same tuning as the Quinto open tone.' },
      { k: 'pitchBend',   v: 1.02, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.2, step: 0.005, gloss: 'The hand traps the skin, preventing it from stretching freely.' },
      { k: 'pitchBendTime', v: 0.015, label: 'Pitch Bend Time', unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Quick recovery on the highly tensioned head.' },
      { k: 'bodyVol',     v: 0.40, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Muffled.' },
      { k: 'bodyDecay',   v: 0.06, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Choked instantly.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for consistency; volume 0 deadens it.' },
      { k: 'shellVol1',   v: 0.0,  label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — overtones completely deadened by the resting hand.' },
      { k: 'shellDecay1', v: 0.01, label: 'Shell Decay 1',    unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Deadened.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Kept for consistency.' },
      { k: 'shellVol2',   v: 0.0,  label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — no overtones.' },
      { k: 'shellDecay2', v: 0.01, label: 'Shell Decay 2',    unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Deadened.' },
      { k: 'slapFreq',    v: 1800, label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 4000, step: 10, gloss: 'Dropped from 3200 Hz — a blunt impact, not a sharp crack.' },
      { k: 'slapQ',       v: 0.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Low Q to prevent any resonant ringing in the noise band.' },
      { k: 'slapVol',     v: 0.35, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Tightest and sharpest of the three presses, but still no crack.' },
      { k: 'slapDecay',   v: 0.015,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Short and tight.' }
    ]
  },

  conga_low_slap: {
    family: 'hybrid',
    label: 'Conga Slap (Low)',
    params: [
      { k: 'baseFreq',    v: 110,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 250, step: 1, gloss: 'Same tuning as the Tumba open tone.' },
      { k: 'pitchBend',   v: 1.10, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'Hand violently stretches the thick, loose skin.' },
      { k: 'pitchBendTime', v: 0.02, label: 'Pitch Bend Time', unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Slap stretches the skin fast.' },
      { k: 'bodyVol',     v: 0.25, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Tumba retains slightly more body even when slapped.' },
      { k: 'bodyDecay',   v: 0.08, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Fundamental choked by the palm.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'First asymmetric skin mode excited by the edge strike.' },
      { k: 'shellVol1',   v: 0.30, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Boosted — the galleta effect makes overtones louder than the body.' },
      { k: 'shellDecay1', v: 0.25, label: 'Shell Decay 1',    unit: 's',  lo: 0.01, hi: 0.5, step: 0.005, gloss: 'The heavy shell rings a bit longer.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Second asymmetric mode.' },
      { k: 'shellVol2',   v: 0.25, label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Also excited by the edge strike.' },
      { k: 'shellDecay2', v: 0.15, label: 'Shell Decay 2',    unit: 's',  lo: 0.01, hi: 0.4, step: 0.005, gloss: 'Steeper drop-off than the first overtone.' },
      { k: 'attackTime',  v: 0.005,label: 'Overtone Attack',  unit: 's',  lo: 0, hi: 0.03, step: 0.001, gloss: 'Micro-ramp so the crack is heard before the shell resonance blossoms.' },
      { k: 'slapFreq',    v: 2800, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Very dark, heavy transient.' },
      { k: 'slapQ',       v: 3.0,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Resonant "ping" inside the noise.' },
      { k: 'slapVol',     v: 0.75, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Transient dominates the stroke.' },
      { k: 'slapDecay',   v: 0.03, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Thickest skin yields the longest contact time.' }
    ]
  },

  conga_middle_slap: {
    family: 'hybrid',
    label: 'Conga Slap (Middle)',
    params: [
      { k: 'baseFreq',    v: 185,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 350, step: 1, gloss: 'Same tuning as the Tres Dos open tone.' },
      { k: 'pitchBend',   v: 1.12, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'Intermediate skin, sharp deflection.' },
      { k: 'pitchBendTime', v: 0.015, label: 'Pitch Bend Time', unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Fast recovery.' },
      { k: 'bodyVol',     v: 0.20, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Choked by the palm.' },
      { k: 'bodyDecay',   v: 0.06, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Dies instantly.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'First asymmetric skin mode.' },
      { k: 'shellVol1',   v: 0.35, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Boosted above the body — the galleta effect.' },
      { k: 'shellDecay1', v: 0.18, label: 'Shell Decay 1',    unit: 's',  lo: 0.01, hi: 0.5, step: 0.005, gloss: 'Sharp, ringing decay.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Second asymmetric mode.' },
      { k: 'shellVol2',   v: 0.30, label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Heavily excited by the edge strike.' },
      { k: 'shellDecay2', v: 0.12, label: 'Shell Decay 2',    unit: 's',  lo: 0.01, hi: 0.4, step: 0.005, gloss: 'Steeper drop-off.' },
      { k: 'attackTime',  v: 0.005,label: 'Overtone Attack',  unit: 's',  lo: 0, hi: 0.03, step: 0.001, gloss: 'Micro-ramp so the crack is heard before the shell resonance blossoms.' },
      { k: 'slapFreq',    v: 3800, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Darker crack than the Quinto.' },
      { k: 'slapQ',       v: 3.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Still highly resonant.' },
      { k: 'slapVol',     v: 0.80, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Transient dominates the stroke.' },
      { k: 'slapDecay',   v: 0.025,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'A thicker, warmer pop.' }
    ]
  },

  conga_high_slap: {
    family: 'hybrid',
    label: 'Conga Slap (High)',
    params: [
      { k: 'baseFreq',    v: 290,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 500, step: 1, gloss: 'Same tuning as the Quinto open tone.' },
      { k: 'pitchBend',   v: 1.15, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'Drastic bend as the hand violently stretches the highly tensioned skin.' },
      { k: 'pitchBendTime', v: 0.01, label: 'Pitch Bend Time', unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Snaps back almost instantly.' },
      { k: 'bodyVol',     v: 0.15, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental almost completely choked by the palm.' },
      { k: 'bodyDecay',   v: 0.05, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Dies instantly.' },
      { k: 'shellRatio1', v: 1.5,  label: 'Shell Ratio 1',    unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'First asymmetric skin mode.' },
      { k: 'shellVol1',   v: 0.40, label: 'Shell Vol 1',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Massive boost — the skin rings harmonically above the body.' },
      { k: 'shellDecay1', v: 0.15, label: 'Shell Decay 1',    unit: 's',  lo: 0.01, hi: 0.5, step: 0.005, gloss: 'Sharp, ringing decay.' },
      { k: 'shellRatio2', v: 2.2,  label: 'Shell Ratio 2',    unit: '',   lo: 1.5, hi: 4.0, step: 0.01, gloss: 'Second asymmetric mode.' },
      { k: 'shellVol2',   v: 0.35, label: 'Shell Vol 2',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Also heavily excited by the edge strike.' },
      { k: 'shellDecay2', v: 0.10, label: 'Shell Decay 2',    unit: 's',  lo: 0.01, hi: 0.4, step: 0.005, gloss: 'Steeper drop-off.' },
      { k: 'attackTime',  v: 0.005,label: 'Overtone Attack',  unit: 's',  lo: 0, hi: 0.03, step: 0.001, gloss: 'Micro-ramp so the crack is heard before the shell resonance blossoms.' },
      { k: 'slapFreq',    v: 4500, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Pushed very high for the Quinto — the loudest, most piercing stroke.' },
      { k: 'slapQ',       v: 4.0,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Very high Q creates a resonant, metallic "ping" inside the noise.' },
      { k: 'slapVol',     v: 0.85, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Transient dominates completely.' },
      { k: 'slapDecay',   v: 0.02, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Fast, sharp transient.' }
    ]
  },

  // ── Batá family (skin-on-shell, three drums + strokes) ─────────────────

  bata_low: {
    family: 'hybrid',
    label: 'Batá Drum (Low)',
    params: [
      { k: 'baseFreq',       v: 150,  label: 'Base Frequency',    unit: 'Hz', lo: 60, hi: 300, step: 1, gloss: 'Deep, humming Iyá fundamental.' },
      { k: 'pitchBend',      v: 1.03, label: 'Pitch Bend',        unit: '',   lo: 1.0, hi: 1.2, step: 0.005, gloss: 'Very subtle — batá tension straps are incredibly tight; the skin barely deflects.' },
      { k: 'pitchBendTime',  v: 0.02, label: 'Pitch Bend Time',   unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Settle time after the strike.' },
      { k: 'bodyVol',        v: 0.85, label: 'Body Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The heavy fardela makes the fundamental dominant.' },
      { k: 'bodyDecay',      v: 0.55, label: 'Body Decay',        unit: 's',  lo: 0.05, hi: 1.2, step: 0.01, gloss: 'The Iyá enú tone "sings" longer than congas.' },
      { k: 'overRatio1',     v: 1.54, label: 'Overtone Ratio',    unit: '',   lo: 1.1, hi: 3.0, step: 0.01, gloss: 'Inharmonic Bessel skin/shell clash.' },
      { k: 'overVol1',       v: 0.20, label: 'Overtone Volume',   unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Subdued — the fardela damps the higher asymmetric modes.' },
      { k: 'overDecay1',     v: 0.20, label: 'Overtone Decay',    unit: 's',  lo: 0.02, hi: 0.6, step: 0.01, gloss: 'Shell overtone damping.' },
      { k: 'chachaRatio',    v: 1.5,  label: 'Chachá Ratio',      unit: '',   lo: 1.0, hi: 4.0, step: 0.01, gloss: '1.5 (225 Hz) gives the classic perfect-fifth coupling of a well-tuned Iyá.' },
      { k: 'chachaVol',      v: 0.30, label: 'Chachá Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Strength of the sympathetic opposite-head resonance.' },
      { k: 'chachaAttack',   v: 0.03, label: 'Chachá Attack',     unit: 's',  lo: 0.001, hi: 0.15, step: 0.001, gloss: 'The air takes ~30 ms to traverse the hourglass and excite the opposite head.' },
      { k: 'chachaDecay',    v: 0.35, label: 'Chachá Decay',      unit: 's',  lo: 0.02, hi: 0.8, step: 0.01, gloss: 'The chachá swells, then sustains alongside the fundamental.' },
      { k: 'slapFreq',       v: 1500, label: 'Slap Filter Freq',  unit: 'Hz', lo: 200, hi: 5000, step: 10, gloss: 'The fardela thwack — no high-frequency crack because the paste kills ripples at the impact point.' },
      { k: 'slapQ',          v: 0.8,  label: 'Slap Q',            unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Low Q for a blunt, heavy impact.' },
      { k: 'slapVol',        v: 0.45, label: 'Slap Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Hand-on-fardela transient.' },
      { k: 'slapDecay',      v: 0.04, label: 'Slap Decay',        unit: 's',  lo: 0.005, hi: 0.2, step: 0.001, gloss: 'Short, heavy transient.' }
    ]
  },

  bata_middle: {
    family: 'hybrid',
    label: 'Batá Drum (Middle)',
    params: [
      { k: 'baseFreq',       v: 220,  label: 'Base Frequency',    unit: 'Hz', lo: 80, hi: 400, step: 1, gloss: 'Sits perfectly above the Iyá to carry the melody.' },
      { k: 'pitchBend',      v: 1.04, label: 'Pitch Bend',        unit: '',   lo: 1.0, hi: 1.2, step: 0.005, gloss: 'Slightly higher tension yields a slightly sharper deflection.' },
      { k: 'pitchBendTime',  v: 0.015,label: 'Pitch Bend Time',   unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Faster recovery than the massive Iyá skin.' },
      { k: 'bodyVol',        v: 0.80, label: 'Body Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental weight.' },
      { k: 'bodyDecay',      v: 0.45, label: 'Body Decay',        unit: 's',  lo: 0.05, hi: 1.2, step: 0.01, gloss: 'Rings clearly but decays faster to make room for complex phrasing.' },
      { k: 'overRatio1',     v: 1.54, label: 'Overtone Ratio',    unit: '',   lo: 1.1, hi: 3.0, step: 0.01, gloss: 'The hourglass shell mode remains the same.' },
      { k: 'overVol1',       v: 0.25, label: 'Overtone Volume',   unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slightly louder due to the smaller fardela.' },
      { k: 'overDecay1',     v: 0.15, label: 'Overtone Decay',    unit: 's',  lo: 0.02, hi: 0.6, step: 0.01, gloss: 'Shell overtone damping.' },
      { k: 'chachaRatio',    v: 1.6,  label: 'Chachá Ratio',      unit: '',   lo: 1.0, hi: 4.0, step: 0.01, gloss: '1.6 puts the coupled chachá right at 352 Hz — a slightly tense, "crying" harmony.' },
      { k: 'chachaVol',      v: 0.35, label: 'Chachá Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The coupling is very prominent on the Itótele.' },
      { k: 'chachaAttack',   v: 0.025,label: 'Chachá Attack',     unit: 's',  lo: 0.001, hi: 0.15, step: 0.001, gloss: 'Shorter drum means the air column excites the chachá faster.' },
      { k: 'chachaDecay',    v: 0.25, label: 'Chachá Decay',      unit: 's',  lo: 0.02, hi: 0.8, step: 0.01, gloss: 'The swell is quick and melodic.' },
      { k: 'slapFreq',       v: 2400, label: 'Slap Filter Freq',  unit: 'Hz', lo: 200, hi: 5000, step: 10, gloss: 'Brighter than the Iyá but darker than a conga slap — more natural rawhide in the transient.' },
      { k: 'slapQ',          v: 1.0,  label: 'Slap Q',            unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Balanced resonance.' },
      { k: 'slapVol',        v: 0.50, label: 'Slap Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'A solid, pronounced attack.' },
      { k: 'slapDecay',      v: 0.03, label: 'Slap Decay',        unit: 's',  lo: 0.005, hi: 0.2, step: 0.001, gloss: 'Sharp and articulate.' }
    ]
  },

  bata_high: {
    family: 'hybrid',
    label: 'Batá Drum (High)',
    params: [
      { k: 'baseFreq',       v: 300,  label: 'Base Frequency',    unit: 'Hz', lo: 100, hi: 500, step: 1, gloss: 'High tension provides a clear, cutting 300 Hz tone.' },
      { k: 'pitchBend',      v: 1.05, label: 'Pitch Bend',        unit: '',   lo: 1.0, hi: 1.2, step: 0.005, gloss: 'The extremely tight skin yields a very quick, sharp deflection.' },
      { k: 'pitchBendTime',  v: 0.01, label: 'Pitch Bend Time',   unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Snaps back almost instantly.' },
      { k: 'bodyVol',        v: 0.70, label: 'Body Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Less volume needed — ears are highly sensitive in this range.' },
      { k: 'bodyDecay',      v: 0.25, label: 'Body Decay',        unit: 's',  lo: 0.05, hi: 1.2, step: 0.01, gloss: 'Short decay: the drum must speak quickly and get out of the way to hold the grid.' },
      { k: 'overRatio1',     v: 1.54, label: 'Overtone Ratio',    unit: '',   lo: 1.1, hi: 3.0, step: 0.01, gloss: 'The hourglass shell mode.' },
      { k: 'overVol1',       v: 0.25, label: 'Overtone Volume',   unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The smaller fardela allows more natural skin inharmonicity to ring.' },
      { k: 'overDecay1',     v: 0.10, label: 'Overtone Decay',    unit: 's',  lo: 0.02, hi: 0.6, step: 0.01, gloss: 'Dies almost instantly.' },
      { k: 'chachaRatio',    v: 2.0,  label: 'Chachá Ratio',      unit: '',   lo: 1.0, hi: 4.0, step: 0.01, gloss: 'A pure octave (300 Hz fundamental / 600 Hz chachá) — assertive and clean, unlike the fractional Iyá/Itótele.' },
      { k: 'chachaVol',      v: 0.40, label: 'Chachá Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Highly prominent — the octave coupling gives the Okónkolo its "marching" quality.' },
      { k: 'chachaAttack',   v: 0.015,label: 'Chachá Attack',     unit: 's',  lo: 0.001, hi: 0.15, step: 0.001, gloss: 'Very short shell — the air wave hits the opposite head in roughly 15 ms.' },
      { k: 'chachaDecay',    v: 0.20, label: 'Chachá Decay',      unit: 's',  lo: 0.02, hi: 0.8, step: 0.01, gloss: 'Swells quickly and fades cleanly.' },
      { k: 'slapFreq',       v: 3500, label: 'Slap Filter Freq',  unit: 'Hz', lo: 200, hi: 5000, step: 10, gloss: 'Bright and snappy — the small fardela means fingers hit mostly pure, tight rawhide.' },
      { k: 'slapQ',          v: 1.5,  label: 'Slap Q',            unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Tighter resonance.' },
      { k: 'slapVol',        v: 0.55, label: 'Slap Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The attack is a major component of the Okónkolo\'s voice.' },
      { k: 'slapDecay',      v: 0.02, label: 'Slap Decay',        unit: 's',  lo: 0.005, hi: 0.2, step: 0.001, gloss: 'Fast, articulate transient.' }
    ]
  },

  bata_low_slap: {
    family: 'hybrid',
    label: 'Batá Slap (Low)',
    params: [
      { k: 'baseFreq',      v: 320,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 600, step: 1, gloss: 'Iyá slap register (D4–F4, 290–350 Hz). Woody, thudding clack.' },
      { k: 'pitchBend',     v: 1.15, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'Tight skin without fardela yields a sharp deflection on impact.' },
      { k: 'pitchBendTime', v: 0.015,label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Fast settle.' },
      { k: 'bodyVol',       v: 0.35, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Low fundamental — kept modest so the slap cracks rather than thuds.' },
      { k: 'bodyDecay',     v: 0.08, label: 'Body Decay',       unit: 's',  lo: 0.02, hi: 0.5, step: 0.005, gloss: 'Short — a thud would be longer and lower.' },
      { k: 'overRatio1',    v: 1.6,  label: 'Overtone 1 Ratio', unit: '',   lo: 1.1, hi: 3.0, step: 0.01, gloss: 'First inharmonic shell mode.' },
      { k: 'overVol1',      v: 0.34, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Boosted — the ringing crack that carries the stroke.' },
      { k: 'overDecay1',    v: 0.16, label: 'Overtone 1 Decay', unit: 's',  lo: 0.02, hi: 0.5, step: 0.005, gloss: 'Rings on past the body.' },
      { k: 'overRatio2',    v: 2.3,  label: 'Overtone 2 Ratio', unit: '',   lo: 1.1, hi: 4.0, step: 0.01, gloss: 'Second shell mode.' },
      { k: 'overVol2',      v: 0.20, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Bright upper partial.' },
      { k: 'overDecay2',    v: 0.13, label: 'Overtone 2 Decay', unit: 's',  lo: 0.02, hi: 0.4, step: 0.005, gloss: 'Rings on.' },
      { k: 'overRatio3',    v: 3.1,  label: 'Overtone 3 Ratio', unit: '',   lo: 1.1, hi: 5.0, step: 0.01, gloss: 'Third shell mode.' },
      { k: 'overVol3',      v: 0.12, label: 'Overtone 3 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'High sparkle.' },
      { k: 'overDecay3',    v: 0.10, label: 'Overtone 3 Decay', unit: 's',  lo: 0.02, hi: 0.4, step: 0.005, gloss: 'Ring length.' },
      { k: 'couplingFreq',  v: 150,  label: 'Enú Coupling Freq',unit: 'Hz', lo: 50, hi: 400, step: 1, gloss: 'Low sympathetic tone of the opposite (enú) head.' },
      { k: 'couplingVol',   v: 0.02, label: 'Coupling Volume',  unit: '',   lo: 0, hi: 0.5, step: 0.01, gloss: 'Barely present — too much low bloom reads as a thud.' },
      { k: 'couplingDelay', v: 0.002,label: 'Coupling Delay',   unit: 's',  lo: 0, hi: 0.02, step: 0.0005, gloss: 'Micro-delay before the coupled head responds.' },
      { k: 'couplingAttack',v: 0.008,label: 'Coupling Attack',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'Smoothed onset.' },
      { k: 'couplingDecay', v: 0.06, label: 'Coupling Decay',   unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Coupling length.' },
      { k: 'slapFreq',      v: 2800, label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 8000, step: 10, gloss: 'Iyá slap keeps more energy below 1 kHz — dense and dry.' },
      { k: 'slapQ',         v: 2.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'More resonant crack.' },
      { k: 'slapVol',       v: 0.62, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Attack transient level — the "thwack".' },
      { k: 'slapDecay',     v: 0.02, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Sharp transient.' }
    ]
  },

  bata_middle_slap: {
    family: 'hybrid',
    label: 'Batá Slap (Middle)',
    params: [
      { k: 'baseFreq',      v: 440,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 800, step: 1, gloss: 'Itótele slap register (G4–B4, 390–495 Hz). Centred mid-tone.' },
      { k: 'pitchBend',     v: 1.15, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'Sharp deflection on impact.' },
      { k: 'pitchBendTime', v: 0.01, label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Very fast settle.' },
      { k: 'bodyVol',       v: 0.50, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental level.' },
      { k: 'bodyDecay',     v: 0.11, label: 'Body Decay',       unit: 's',  lo: 0.02, hi: 0.5, step: 0.005, gloss: 'Dry — smaller diameter, higher tension.' },
      { k: 'overRatio1',    v: 1.6,  label: 'Overtone 1 Ratio', unit: '',   lo: 1.1, hi: 3.0, step: 0.01, gloss: 'First inharmonic shell mode.' },
      { k: 'overVol1',      v: 0.18, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Loudest overtone.' },
      { k: 'overDecay1',    v: 0.10, label: 'Overtone 1 Decay', unit: 's',  lo: 0.02, hi: 0.4, step: 0.005, gloss: 'Ring length.' },
      { k: 'overRatio2',    v: 2.4,  label: 'Overtone 2 Ratio', unit: '',   lo: 1.1, hi: 4.0, step: 0.01, gloss: 'Second shell mode.' },
      { k: 'overVol2',      v: 0.10, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Second mode.' },
      { k: 'overDecay2',    v: 0.08, label: 'Overtone 2 Decay', unit: 's',  lo: 0.02, hi: 0.4, step: 0.005, gloss: 'Ring length.' },
      { k: 'overRatio3',    v: 3.2,  label: 'Overtone 3 Ratio', unit: '',   lo: 1.1, hi: 5.0, step: 0.01, gloss: 'Third shell mode.' },
      { k: 'overVol3',      v: 0.05, label: 'Overtone 3 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Quietest mode.' },
      { k: 'overDecay3',    v: 0.06, label: 'Overtone 3 Decay', unit: 's',  lo: 0.02, hi: 0.4, step: 0.005, gloss: 'Ring length.' },
      { k: 'couplingFreq',  v: 220,  label: 'Enú Coupling Freq',unit: 'Hz', lo: 50, hi: 400, step: 1, gloss: 'Low sympathetic tone of the opposite (enú) head.' },
      { k: 'couplingVol',   v: 0.06, label: 'Coupling Volume',  unit: '',   lo: 0, hi: 0.5, step: 0.01, gloss: 'How much low bloom reaches the enú.' },
      { k: 'couplingDelay', v: 0.002,label: 'Coupling Delay',   unit: 's',  lo: 0, hi: 0.02, step: 0.0005, gloss: 'Micro-delay before the coupled head responds.' },
      { k: 'couplingAttack',v: 0.007,label: 'Coupling Attack',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'Smoothed onset.' },
      { k: 'couplingDecay', v: 0.05, label: 'Coupling Decay',   unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Coupling length.' },
      { k: 'slapFreq',      v: 4500, label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 8000, step: 10, gloss: 'Itótele slap bridges Iyá and Okónkolo brightness.' },
      { k: 'slapQ',         v: 2.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Resonant crack.' },
      { k: 'slapVol',       v: 0.55, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Attack transient level.' },
      { k: 'slapDecay',     v: 0.015,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Fast transient.' }
    ]
  },

  bata_high_slap: {
    family: 'hybrid',
    label: 'Batá Slap (High)',
    params: [
      { k: 'baseFreq',      v: 580,  label: 'Base Frequency',   unit: 'Hz', lo: 200, hi: 1200, step: 1, gloss: 'Okónkolo slap register (C5–E5, 520–660 Hz). Sharp and bright.' },
      { k: 'pitchBend',     v: 1.18, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'Maximum tension yields extreme, instantaneous deflection.' },
      { k: 'pitchBendTime', v: 0.008,label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Instantaneous.' },
      { k: 'bodyVol',       v: 0.40, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Needs less volume at this pitch.' },
      { k: 'bodyDecay',     v: 0.09, label: 'Body Decay',       unit: 's',  lo: 0.02, hi: 0.4, step: 0.005, gloss: 'Dies almost instantly.' },
      { k: 'overRatio1',    v: 1.7,  label: 'Overtone 1 Ratio', unit: '',   lo: 1.1, hi: 3.0, step: 0.01, gloss: 'First inharmonic shell mode.' },
      { k: 'overVol1',      v: 0.16, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Loudest overtone.' },
      { k: 'overDecay1',    v: 0.08, label: 'Overtone 1 Decay', unit: 's',  lo: 0.02, hi: 0.4, step: 0.005, gloss: 'Ring length.' },
      { k: 'overRatio2',    v: 2.5,  label: 'Overtone 2 Ratio', unit: '',   lo: 1.1, hi: 4.0, step: 0.01, gloss: 'Second shell mode.' },
      { k: 'overVol2',      v: 0.09, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Second mode.' },
      { k: 'overDecay2',    v: 0.06, label: 'Overtone 2 Decay', unit: 's',  lo: 0.02, hi: 0.4, step: 0.005, gloss: 'Ring length.' },
      { k: 'overRatio3',    v: 3.4,  label: 'Overtone 3 Ratio', unit: '',   lo: 1.1, hi: 5.0, step: 0.01, gloss: 'Third shell mode.' },
      { k: 'overVol3',      v: 0.04, label: 'Overtone 3 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Quietest mode.' },
      { k: 'overDecay3',    v: 0.05, label: 'Overtone 3 Decay', unit: 's',  lo: 0.02, hi: 0.4, step: 0.005, gloss: 'Ring length.' },
      { k: 'couplingFreq',  v: 300,  label: 'Enú Coupling Freq',unit: 'Hz', lo: 50, hi: 400, step: 1, gloss: 'Low sympathetic tone of the opposite (enú) head.' },
      { k: 'couplingVol',   v: 0.05, label: 'Coupling Volume',  unit: '',   lo: 0, hi: 0.5, step: 0.01, gloss: 'How much low bloom reaches the enú.' },
      { k: 'couplingDelay', v: 0.0015,label: 'Coupling Delay',  unit: 's',  lo: 0, hi: 0.02, step: 0.0005, gloss: 'Micro-delay before the coupled head responds.' },
      { k: 'couplingAttack',v: 0.005,label: 'Coupling Attack',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'Smoothed onset.' },
      { k: 'couplingDecay', v: 0.04, label: 'Coupling Decay',   unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Coupling length.' },
      { k: 'slapFreq',      v: 3800, label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 8000, step: 10, gloss: 'Okónkolo slap cuts through at ~3–4 kHz (very rapid, 30–50 ms).' },
      { k: 'slapQ',         v: 3.0,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Very tight resonance.' },
      { k: 'slapVol',       v: 0.6,  label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Attack transient level.' },
      { k: 'slapDecay',     v: 0.01, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Microscopic snap.' }
    ]
  },

  bata_low_press: {
    family: 'hybrid',
    label: 'Batá Press (Low)',
    params: [
      { k: 'baseFreq',      v: 150,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 300, step: 1, gloss: 'Iyá enú fundamental.' },
      { k: 'pitchBend',     v: 1.20, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.5, step: 0.01, gloss: 'Sharp 20% pitch spike from trapping the fardela under the hand.' },
      { k: 'pitchBendTime', v: 0.015,label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Faster than the open tone recovery.' },
      { k: 'bodyVol',       v: 0.60, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Still retains significant low-end weight.' },
      { k: 'bodyDecay',     v: 0.06, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Choked instantly.' },
      { k: 'overRatio1',    v: 1.54, label: 'Overtone Ratio',   unit: '',   lo: 1.1, hi: 3.0, step: 0.01, gloss: 'Kept for consistency; volume 0 eliminates it.' },
      { k: 'overVol1',      v: 0.0,  label: 'Overtone Volume',  unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — the pressed hand deadens the asymmetric modes.' },
      { k: 'overDecay1',    v: 0.01, label: 'Overtone Decay',   unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'chachaRatio',   v: 1.5,  label: 'Chachá Ratio',     unit: '',   lo: 1.0, hi: 4.0, step: 0.01, gloss: 'Kept for consistency; volume 0 kills coupling.' },
      { k: 'chachaVol',     v: 0.0,  label: 'Chachá Volume',    unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — a trapped head cannot push air through the hourglass to excite the chachá.' },
      { k: 'chachaAttack',  v: 0.01, label: 'Chachá Attack',    unit: 's',  lo: 0.001, hi: 0.15, step: 0.001, gloss: 'Dead coupling.' },
      { k: 'chachaDecay',   v: 0.01, label: 'Chachá Decay',     unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Dead coupling.' },
      { k: 'slapFreq',      v: 800,  label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 5000, step: 10, gloss: 'Muffled — pushing flesh into paste dampens high frequencies.' },
      { k: 'slapQ',         v: 0.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Flat, blunt resonance.' },
      { k: 'slapVol',       v: 0.40, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Muffled transient level.' },
      { k: 'slapDecay',     v: 0.02, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Short, choked transient.' }
    ]
  },

  bata_middle_press: {
    family: 'hybrid',
    label: 'Batá Press (Middle)',
    params: [
      { k: 'baseFreq',      v: 220,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 400, step: 1, gloss: 'Itótele enú fundamental.' },
      { k: 'pitchBend',     v: 1.25, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.5, step: 0.01, gloss: 'Higher tension yields an even sharper spike when pressed.' },
      { k: 'pitchBendTime', v: 0.012,label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Quick recovery.' },
      { k: 'bodyVol',       v: 0.50, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Muted syncopation level.' },
      { k: 'bodyDecay',     v: 0.05, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Shorter decay than the Iyá.' },
      { k: 'overRatio1',    v: 1.54, label: 'Overtone Ratio',   unit: '',   lo: 1.1, hi: 3.0, step: 0.01, gloss: 'Kept for consistency; volume 0 eliminates it.' },
      { k: 'overVol1',      v: 0.0,  label: 'Overtone Volume',  unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — deadened by the pressed hand.' },
      { k: 'overDecay1',    v: 0.01, label: 'Overtone Decay',   unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'chachaRatio',   v: 1.6,  label: 'Chachá Ratio',     unit: '',   lo: 1.0, hi: 4.0, step: 0.01, gloss: 'Kept for consistency; volume 0 kills coupling.' },
      { k: 'chachaVol',     v: 0.0,  label: 'Chachá Volume',    unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — no sympathetic resonance from a trapped head.' },
      { k: 'chachaAttack',  v: 0.01, label: 'Chachá Attack',    unit: 's',  lo: 0.001, hi: 0.15, step: 0.001, gloss: 'Dead coupling.' },
      { k: 'chachaDecay',   v: 0.01, label: 'Chachá Decay',     unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Dead coupling.' },
      { k: 'slapFreq',      v: 1200, label: 'Slap Filter Freq', unit: 'Hz', lo: 200, hi: 5000, step: 10, gloss: 'Slightly brighter muffle than the Iyá, but still completely choked.' },
      { k: 'slapQ',         v: 0.5,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 5.0, step: 0.1, gloss: 'Flat, blunt resonance.' },
      { k: 'slapVol',       v: 0.45, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Muffled transient level.' },
      { k: 'slapDecay',     v: 0.015,label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Short, choked transient.' }
    ]
  },

  // ── Ewe ensemble (Agbadza / Gahu) ──────────────────────────────────────

  ewe_kaganu: {
    family: 'hybrid',
    label: 'Ewe Drum (Kaganu)',
    params: [
      { k: 'baseFreq',      v: 380,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 600, step: 1, gloss: 'Very high fundamental — cuts through the whole ensemble.' },
      { k: 'pitchBend',     v: 1.03, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.2, step: 0.005, gloss: 'Minimal — sticks bounce off without stretching the skin deeply.' },
      { k: 'pitchBendTime', v: 0.01, label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Quick recovery.' },
      { k: 'bodyVol',       v: 0.65, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental level.' },
      { k: 'bodyDecay',     v: 0.15, label: 'Body Decay',       unit: 's',  lo: 0.03, hi: 0.6, step: 0.005, gloss: 'Short — the narrow carved shell lacks sustain.' },
      { k: 'overRatio1',    v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'First circular-membrane Bessel root.' },
      { k: 'overVol1',      v: 0.30, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Stick impacts excite higher asymmetric modes more than hands do.' },
      { k: 'overDecay1',    v: 0.08, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'Fast.' },
      { k: 'overRatio2',    v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Second Bessel root.' },
      { k: 'overVol2',      v: 0.15, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Midrange presence.' },
      { k: 'overDecay2',    v: 0.04, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.4, step: 0.005, gloss: 'Vanishes quickly.' },
      { k: 'noiseFreq',     v: 5500, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 10000, step: 10, gloss: 'Very bright — the "clack" of the wooden stick.' },
      { k: 'noiseQ',        v: 2.5,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Resonant ping.' },
      { k: 'noiseVol',      v: 0.70, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The stick attack leads this stroke.' },
      { k: 'noiseDecay',    v: 0.015,label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Fast, brittle transient.' }
    ]
  },

  ewe_kidi: {
    family: 'hybrid',
    label: 'Ewe Drum (Kidi)',
    params: [
      { k: 'baseFreq',      v: 210,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 400, step: 1, gloss: 'Lower than the Kaganu; talks directly with the master drum.' },
      { k: 'pitchBend',     v: 1.05, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.2, step: 0.005, gloss: 'Slightly more deflection than the Kaganu.' },
      { k: 'pitchBendTime', v: 0.02, label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Settle time.' },
      { k: 'bodyVol',       v: 0.75, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental level.' },
      { k: 'bodyDecay',     v: 0.30, label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 0.8, step: 0.01, gloss: 'The wider barrel lets the fundamental ring nicely.' },
      { k: 'overRatio1',    v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'First Bessel root.' },
      { k: 'overVol1',      v: 0.25, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Asymmetric mode level.' },
      { k: 'overDecay1',    v: 0.15, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.5, step: 0.005, gloss: 'Moderate.' },
      { k: 'overRatio2',    v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Second Bessel root.' },
      { k: 'overVol2',      v: 0.10, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Subtle midrange.' },
      { k: 'overDecay2',    v: 0.08, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.4, step: 0.005, gloss: 'Quick.' },
      { k: 'noiseFreq',     v: 4200, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 10000, step: 10, gloss: 'A darker, meatier stick impact than the Kaganu.' },
      { k: 'noiseQ',        v: 1.8,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Resonance.' },
      { k: 'noiseVol',      v: 0.65, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Stick attack.' },
      { k: 'noiseDecay',    v: 0.02, label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Slightly longer stick contact time.' }
    ]
  },

  ewe_kidi_press: {
    family: 'hybrid',
    label: 'Ewe Drum (Kidi Press)',
    params: [
      { k: 'baseFreq',      v: 210,  label: 'Base Frequency',   unit: 'Hz', lo: 80, hi: 400, step: 1, gloss: 'Same fundamental as the open Kidi strike.' },
      { k: 'pitchBend',     v: 1.15, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'High spike as the stick traps and stretches a small point on the skin.' },
      { k: 'pitchBendTime', v: 0.01, label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Recovers or dies almost instantly.' },
      { k: 'bodyVol',       v: 0.45, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Heavily muffled.' },
      { k: 'bodyDecay',     v: 0.04, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.2, step: 0.005, gloss: 'Instant — the stick prevents any resonance.' },
      { k: 'overRatio1',    v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Kept for continuity; volume 0 eliminates it.' },
      { k: 'overVol1',      v: 0.0,  label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — pinned skin cannot vibrate in its asymmetric modes.' },
      { k: 'overDecay1',    v: 0.01, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'overRatio2',    v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Kept for continuity.' },
      { k: 'overVol2',      v: 0.0,  label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero.' },
      { k: 'overDecay2',    v: 0.01, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'noiseFreq',     v: 3800, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Dropped from the open stick strike — pressing the stick dampens the highest frequencies.' },
      { k: 'noiseQ',        v: 0.8,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Lower Q removes the ringing "ping", leaving a blunt "thwack".' },
      { k: 'noiseVol',      v: 0.55, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Blunt wood transient.' },
      { k: 'noiseDecay',    v: 0.015,label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Fast, tight transient.' }
    ]
  },

  ewe_sogo: {
    family: 'hybrid',
    label: 'Ewe Drum (Sogo)',
    params: [
      { k: 'baseFreq',      v: 130,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 250, step: 1, gloss: 'A solid, warm lower-midrange anchor.' },
      { k: 'pitchBend',     v: 1.08, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'Played with hands, so the skin bends more like a conga.' },
      { k: 'pitchBendTime', v: 0.04, label: 'Pitch Bend Time',  unit: 's',  lo: 0.01, hi: 0.15, step: 0.001, gloss: 'Flexible, flesh-driven bend.' },
      { k: 'bodyVol',       v: 0.80, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Fundamental level.' },
      { k: 'bodyDecay',     v: 0.50, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 1.0, step: 0.01, gloss: 'Sustains smoothly.' },
      { k: 'overRatio1',    v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'First Bessel root.' },
      { k: 'overVol1',      v: 0.20, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Asymmetric mode level.' },
      { k: 'overDecay1',    v: 0.25, label: 'Overtone 1 Decay', unit: 's',  lo: 0.01, hi: 0.6, step: 0.005, gloss: 'Sustained shell ring.' },
      { k: 'overRatio2',    v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Second Bessel root.' },
      { k: 'overVol2',      v: 0.08, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Subtle.' },
      { k: 'overDecay2',    v: 0.15, label: 'Overtone 2 Decay', unit: 's',  lo: 0.01, hi: 0.5, step: 0.005, gloss: 'Moderate.' },
      { k: 'noiseFreq',     v: 2400, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Hand impact (flesh) — much darker than the Kaganu/Kidi stick strikes.' },
      { k: 'noiseQ',        v: 1.2,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Soft resonance.' },
      { k: 'noiseVol',      v: 0.55, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Flesh impact level.' },
      { k: 'noiseDecay',    v: 0.03, label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.1, step: 0.001, gloss: 'Hand contact time.' }
    ]
  },

  ewe_sogo_press: {
    family: 'hybrid',
    label: 'Ewe Drum (Sogo Press)',
    params: [
      { k: 'baseFreq',      v: 130,  label: 'Base Frequency',   unit: 'Hz', lo: 60, hi: 250, step: 1, gloss: 'Same fundamental as the open Sogo.' },
      { k: 'pitchBend',     v: 1.12, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'Pronounced spike, though slightly less sharp than the tighter Kidi.' },
      { k: 'pitchBendTime', v: 0.015,label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Quick recovery.' },
      { k: 'bodyVol',       v: 0.50, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Retains a bit more low-end presence due to the larger shell.' },
      { k: 'bodyDecay',     v: 0.05, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.2, step: 0.005, gloss: 'Choked instantly.' },
      { k: 'overRatio1',    v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Kept for continuity; volume 0 eliminates it.' },
      { k: 'overVol1',      v: 0.0,  label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — pinned skin cannot vibrate in its asymmetric modes.' },
      { k: 'overDecay1',    v: 0.01, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'overRatio2',    v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Kept for continuity.' },
      { k: 'overVol2',      v: 0.0,  label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero.' },
      { k: 'overDecay2',    v: 0.01, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'noiseFreq',     v: 2200, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'A much darker, heavier "thud" than the Kidi.' },
      { k: 'noiseQ',        v: 0.6,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Very flat resonance.' },
      { k: 'noiseVol',      v: 0.50, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Dark wood impact.' },
      { k: 'noiseDecay',    v: 0.02, label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Slightly longer physical contact time on the thicker skin.' }
    ]
  },

  ewe_atsimevu: {
    family: 'hybrid',
    label: 'Ewe Drum (Atsimevu)',
    params: [
      { k: 'baseFreq',      v: 85,   label: 'Base Frequency',   unit: 'Hz', lo: 40, hi: 200, step: 1, gloss: 'Deep bass, pushing a massive column of air.' },
      { k: 'pitchBend',     v: 1.12, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'Heavy deflection of the thick deer hide.' },
      { k: 'pitchBendTime', v: 0.06, label: 'Pitch Bend Time',  unit: 's',  lo: 0.01, hi: 0.2, step: 0.001, gloss: 'Slow recovery.' },
      { k: 'bodyVol',       v: 0.90, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The master drum is all about the fundamental.' },
      { k: 'bodyDecay',     v: 0.80, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 1.5, step: 0.01, gloss: 'Long, booming sustain from the massive carved log.' },
      { k: 'overRatio1',    v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'First Bessel root.' },
      { k: 'overVol1',      v: 0.15, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Subdued — the fundamental dominates.' },
      { k: 'overDecay1',    v: 0.35, label: 'Overtone 1 Decay', unit: 's',  lo: 0.02, hi: 0.8, step: 0.005, gloss: 'Long shell ring.' },
      { k: 'overRatio2',    v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Second Bessel root.' },
      { k: 'overVol2',      v: 0.05, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Barely present.' },
      { k: 'overDecay2',    v: 0.20, label: 'Overtone 2 Decay', unit: 's',  lo: 0.01, hi: 0.5, step: 0.005, gloss: 'Moderate.' },
      { k: 'noiseFreq',     v: 1800, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Very dark, heavy hand thud.' },
      { k: 'noiseQ',        v: 0.8,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Broad, heavy impact.' },
      { k: 'noiseVol',      v: 0.50, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Hand impact level.' },
      { k: 'noiseDecay',    v: 0.04, label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.12, step: 0.001, gloss: 'Hand contact time.' }
    ]
  },

  ewe_atsimevu_stick: {
    family: 'hybrid',
    label: 'Ewe Drum (Atsimevu Stick)',
    params: [
      { k: 'baseFreq',      v: 85,   label: 'Base Frequency',   unit: 'Hz', lo: 40, hi: 200, step: 1, gloss: 'Same deep fundamental as the hand strike.' },
      { k: 'pitchBend',     v: 1.04, label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.3, step: 0.01, gloss: 'The wooden stick bounces off without stretching the thick hide deeply.' },
      { k: 'pitchBendTime', v: 0.02, label: 'Pitch Bend Time',  unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Recovers much faster than the hand.' },
      { k: 'bodyVol',       v: 0.80, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slightly quieter fundamental than the heavy hand thump.' },
      { k: 'bodyDecay',     v: 0.60, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 1.5, step: 0.01, gloss: 'Less sustain of the deep root than the full weight of a hand strike.' },
      { k: 'overRatio1',    v: 1.593,label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'First Bessel root.' },
      { k: 'overVol1',      v: 0.25, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Boosted — the hard stick forces the edge of the skin to ring louder.' },
      { k: 'overDecay1',    v: 0.35, label: 'Overtone 1 Decay', unit: 's',  lo: 0.02, hi: 0.8, step: 0.005, gloss: 'Long shell ring.' },
      { k: 'overRatio2',    v: 2.135,label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.001, gloss: 'Second Bessel root.' },
      { k: 'overVol2',      v: 0.15, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Much more prominent with a stick hit.' },
      { k: 'overDecay2',    v: 0.20, label: 'Overtone 2 Decay', unit: 's',  lo: 0.01, hi: 0.5, step: 0.005, gloss: 'Moderate.' },
      { k: 'noiseFreq',     v: 3500, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Shifted drastically up from the hand thud to simulate the wooden "clack".' },
      { k: 'noiseQ',        v: 2.0,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 6.0, step: 0.1, gloss: 'Tighter resonance for a sharp, woody impact.' },
      { k: 'noiseVol',      v: 0.65, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Sharper and more piercing than the hand.' },
      { k: 'noiseDecay',    v: 0.015,label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Fast, brittle transient (15 ms).' }
    ]
  },

  snare: {
    family: 'hybrid',
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
    family: 'hybrid',
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
    family: 'hybrid',
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
    family: 'hybrid',
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
    family: 'hybrid',
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
    family: 'hybrid',
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
    family: 'hybrid',
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
  cajon_trad_bass: {
    family: 'cajon',
    label: 'Traditional Cajon Bass',
    params: [
      { k: 'cavityFreq', v: 70, label: 'Cavity Frequency', unit: 'Hz', lo: 40, hi: 150, step: 1, gloss: 'Helmholtz air cavity resonance.' },
      { k: 'cavityVol', v: 0.9, label: 'Cavity Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Cavity boom volume.' },
      { k: 'cavityDecay', v: 0.35, label: 'Cavity Decay', unit: 's', lo: 0.05, hi: 0.8, step: 0.01, gloss: 'Cavity resonance decay.' },
      { k: 'woodFreq', v: 120, label: 'Wood Frequency', unit: 'Hz', lo: 60, hi: 250, step: 1, gloss: 'Wooden tapa (front plate) resonance.' },
      { k: 'woodVol', v: 0.4, label: 'Wood Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Wood tone volume.' },
      { k: 'woodDecay', v: 0.12, label: 'Wood Decay', unit: 's', lo: 0.02, hi: 0.3, step: 0.005, gloss: 'Wood resonance decay.' },
      { k: 'palmFreq', v: 250, label: 'Palm LP Freq', unit: 'Hz', lo: 50, hi: 500, step: 10, gloss: 'Lowpass for palm impact noise.' },
      { k: 'palmVol', v: 0.3, label: 'Palm Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Palm impact noise volume.' },
      { k: 'palmDecay', v: 0.03, label: 'Palm Decay', unit: 's', lo: 0.005, hi: 0.1, step: 0.001, gloss: 'Palm impact decay.' }
    ]
  },
  cajon_trad_slap: {
    family: 'cajon',
    label: 'Traditional Cajon Slap',
    params: [
      { k: 'edgeFreq', v: 380, label: 'Edge Frequency', unit: 'Hz', lo: 150, hi: 600, step: 1, gloss: 'Corner edge resonance (triangle wave).' },
      { k: 'edgeVol', v: 0.3, label: 'Edge Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Edge resonance volume.' },
      { k: 'edgeDecay', v: 0.08, label: 'Edge Decay', unit: 's', lo: 0.01, hi: 0.2, step: 0.005, gloss: 'Edge ring decay.' },
      { k: 'crackFreq', v: 2500, label: 'Crack BP Freq', unit: 'Hz', lo: 500, hi: 5000, step: 10, gloss: 'Wood crack bandpass centre.' },
      { k: 'crackQ', v: 1.5, label: 'Crack Q', unit: '', lo: 0.5, hi: 4.0, step: 0.1, gloss: 'Crack filter Q.' },
      { k: 'crackVol', v: 0.6, label: 'Crack Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Crack noise volume.' },
      { k: 'crackDecay', v: 0.04, label: 'Crack Decay', unit: 's', lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Crack transient decay.' }
    ]
  },
  cajon_snare_bass: {
    family: 'cajon',
    label: 'Snare Cajon Bass',
    params: [
      { k: 'cavityFreq', v: 70, label: 'Cavity Frequency', unit: 'Hz', lo: 40, hi: 150, step: 1, gloss: 'Helmholtz air cavity resonance (shared body).' },
      { k: 'cavityVol', v: 0.9, label: 'Cavity Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Cavity boom volume.' },
      { k: 'cavityDecay', v: 0.35, label: 'Cavity Decay', unit: 's', lo: 0.05, hi: 0.8, step: 0.01, gloss: 'Cavity resonance decay.' },
      { k: 'woodFreq', v: 120, label: 'Wood Frequency', unit: 'Hz', lo: 60, hi: 250, step: 1, gloss: 'Wooden tapa resonance.' },
      { k: 'woodVol', v: 0.4, label: 'Wood Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Wood tone volume.' },
      { k: 'woodDecay', v: 0.12, label: 'Wood Decay', unit: 's', lo: 0.02, hi: 0.3, step: 0.005, gloss: 'Wood resonance decay.' },
      { k: 'palmFreq', v: 250, label: 'Palm LP Freq', unit: 'Hz', lo: 50, hi: 500, step: 10, gloss: 'Lowpass for palm impact noise.' },
      { k: 'palmVol', v: 0.3, label: 'Palm Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Palm impact noise volume.' },
      { k: 'palmDecay', v: 0.03, label: 'Palm Decay', unit: 's', lo: 0.005, hi: 0.1, step: 0.001, gloss: 'Palm impact decay.' },
      { k: 'snareFreq', v: 3000, label: 'Snare HP Freq', unit: 'Hz', lo: 500, hi: 6000, step: 10, gloss: 'Highpass for sympathetic snare rattle.' },
      { k: 'snareVol', v: 0.15, label: 'Snare Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Very quiet sympathetic rattle volume.' },
      { k: 'snareDecay', v: 0.06, label: 'Snare Decay', unit: 's', lo: 0.01, hi: 0.2, step: 0.001, gloss: 'Short sympathetic rattle decay.' }
    ]
  },
  cajon_snare_slap: {
    family: 'cajon',
    label: 'Snare Cajon Slap',
    params: [
      { k: 'edgeFreq', v: 380, label: 'Edge Frequency', unit: 'Hz', lo: 150, hi: 600, step: 1, gloss: 'Corner edge resonance.' },
      { k: 'edgeVol', v: 0.3, label: 'Edge Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Edge volume.' },
      { k: 'edgeDecay', v: 0.08, label: 'Edge Decay', unit: 's', lo: 0.01, hi: 0.2, step: 0.005, gloss: 'Edge decay.' },
      { k: 'crackFreq', v: 2500, label: 'Crack BP Freq', unit: 'Hz', lo: 500, hi: 5000, step: 10, gloss: 'Wood crack bandpass.' },
      { k: 'crackQ', v: 1.5, label: 'Crack Q', unit: '', lo: 0.5, hi: 4.0, step: 0.1, gloss: 'Crack Q.' },
      { k: 'crackVol', v: 0.5, label: 'Crack Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Crack volume (slightly quieter, snare dominates).' },
      { k: 'crackDecay', v: 0.04, label: 'Crack Decay', unit: 's', lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Crack decay.' },
      { k: 'buzzFreq', v: 3500, label: 'Buzz HP Freq', unit: 'Hz', lo: 1000, hi: 7000, step: 10, gloss: 'Highpass for snare wire buzz.' },
      { k: 'buzzVol', v: 0.6, label: 'Buzz Volume', unit: '', lo: 0, hi: 1, step: 0.01, gloss: 'Prominent snare buzz volume.' },
      { k: 'buzzDecay', v: 0.18, label: 'Buzz Decay', unit: 's', lo: 0.02, hi: 0.4, step: 0.01, gloss: 'Sustained snare wire buzz decay.' }
    ]
  },

  // ── Percussion Family (metals, woods, shakers, noise) ──────────────────

  cl_hihat: {
    family: 'percussion',
    label: 'Closed Hi-Hat',
    params: [
      { k: 'filterFreq', v: 7500, label: 'Filter Freq', unit: 'Hz', lo: 1000, hi: 12000, step: 50, gloss: 'Bandpass centre of the metallic "chick".' },
      { k: 'filterQ',    v: 1.0,  label: 'Filter Q',    unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Bandpass resonance.' },
      { k: 'noiseVol',   v: 0.65, label: 'Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Level of the burst.' },
      { k: 'decay',      v: 0.04, label: 'Decay',       unit: 's',  lo: 0.005, hi: 0.3, step: 0.001, gloss: 'Short, choked hi-hat.' }
    ]
  },

  op_hihat: {
    family: 'percussion',
    label: 'Open Hi-Hat',
    params: [
      { k: 'filterFreq', v: 7500, label: 'Filter Freq', unit: 'Hz', lo: 1000, hi: 12000, step: 50, gloss: 'Bandpass centre.' },
      { k: 'filterQ',    v: 1.0,  label: 'Filter Q',    unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Bandpass resonance.' },
      { k: 'noiseVol',   v: 0.55, label: 'Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Level of the burst.' },
      { k: 'decay',      v: 0.28, label: 'Decay',       unit: 's',  lo: 0.02, hi: 1.0, step: 0.005, gloss: 'Long, ringing open hi-hat.' }
    ]
  },

  shaker: {
    family: 'percussion',
    label: 'Percussion Shaker',
    params: [
      { k: 'filterFreq', v: 5500, label: 'Filter Freq', unit: 'Hz', lo: 500, hi: 12000, step: 50, gloss: 'Bandpass centre of the bead rattle.' },
      { k: 'filterQ',    v: 1.0,  label: 'Filter Q',    unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Bandpass resonance.' },
      { k: 'attack',     v: 0.015,label: 'Attack',      unit: 's',  lo: 0.001, hi: 0.06, step: 0.001, gloss: 'Quick swell simulates beads moving.' },
      { k: 'noiseVol',   v: 0.5,  label: 'Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Rattle level.' },
      { k: 'decay',      v: 0.07, label: 'Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.001, gloss: 'Total rattle length.' }
    ]
  },

  foot_tap: {
    family: 'percussion',
    label: 'Foot Tap',
    params: [
      { k: 'filterFreq', v: 180,  label: 'Filter Freq', unit: 'Hz', lo: 60, hi: 800, step: 5, gloss: 'Bandpass centre of the low click.' },
      { k: 'filterQ',    v: 1.0,  label: 'Filter Q',    unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Bandpass resonance.' },
      { k: 'noiseVol',   v: 0.8,  label: 'Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Click level.' },
      { k: 'decay',      v: 0.025,label: 'Decay',       unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Very short tap.' }
    ]
  },

  crash: {
    family: 'percussion',
    label: 'Crash Cymbal',
    params: [
      { k: 'filterFreq', v: 3000, label: 'Noise HP Freq', unit: 'Hz', lo: 1000, hi: 12000, step: 50, gloss: 'Highpass cutoff for the wash.' },
      { k: 'noiseVol',   v: 0.6,  label: 'Noise Volume',  unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Wash level.' },
      { k: 'noiseDecay', v: 0.8,  label: 'Noise Decay',   unit: 's',  lo: 0.1, hi: 2.0, step: 0.01, gloss: 'How long the wash sustains.' },
      { k: 'oscFreq',    v: 5200, label: 'Ring Freq',     unit: 'Hz', lo: 1000, hi: 12000, step: 50, gloss: 'Sustained sine resonance.' },
      { k: 'oscVol',     v: 0.08, label: 'Ring Volume',   unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Resonance level.' },
      { k: 'oscDecay',   v: 0.6,  label: 'Ring Decay',    unit: 's',  lo: 0.1, hi: 2.0, step: 0.01, gloss: 'Resonance sustain.' }
    ]
  },

  ride: {
    family: 'percussion',
    label: 'Ride Cymbal',
    params: [
      { k: 'filterFreq', v: 6000, label: 'Noise BP Freq', unit: 'Hz', lo: 1000, hi: 12000, step: 50, gloss: 'Bandpass centre of the ping.' },
      { k: 'filterQ',    v: 1.5,  label: 'Noise Q',       unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Ping resonance.' },
      { k: 'noiseVol',   v: 0.35, label: 'Noise Volume',  unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Wash level.' },
      { k: 'noiseDecay', v: 0.5,  label: 'Noise Decay',   unit: 's',  lo: 0.1, hi: 1.5, step: 0.01, gloss: 'Wash sustain.' },
      { k: 'oscFreq',    v: 6200, label: 'Bell Freq',     unit: 'Hz', lo: 1000, hi: 12000, step: 50, gloss: 'Sustained bell tone.' },
      { k: 'oscVol',     v: 0.15, label: 'Bell Volume',   unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Bell level.' },
      { k: 'oscDecay',   v: 0.4,  label: 'Bell Decay',    unit: 's',  lo: 0.1, hi: 1.5, step: 0.01, gloss: 'Bell sustain.' }
    ]
  },

  agogo: {
    family: 'percussion',
    label: 'Agogo Bell Accent',
    params: [
      { k: 'freqA',  v: 880, label: 'Pitch A-Wheel', unit: 'Hz', lo: 200, hi: 2000, step: 1, gloss: 'Pitch played on the A wheel.' },
      { k: 'freqB',  v: 587, label: 'Pitch B-Wheel', unit: 'Hz', lo: 200, hi: 2000, step: 1, gloss: 'Pitch played on the B wheel.' },
      { k: 'wave',   v: 0,   label: 'Sine?',        unit: '',   lo: 0, hi: 1, step: 1, gloss: '0 = sine, 1 = triangle.' },
      { k: 'vol',    v: 0.7, label: 'Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Bell level.' },
      { k: 'decay',  v: 0.18,label: 'Decay',        unit: 's',  lo: 0.02, hi: 1.0, step: 0.005, gloss: 'Ring length.' }
    ]
  },

  ping: {
    family: 'percussion',
    label: 'Crystal High Ping',
    params: [
      { k: 'freqA', v: 1400, label: 'Pitch A-Wheel', unit: 'Hz', lo: 200, hi: 4000, step: 1, gloss: 'Pitch played on the A wheel.' },
      { k: 'freqB', v: 950,  label: 'Pitch B-Wheel', unit: 'Hz', lo: 200, hi: 4000, step: 1, gloss: 'Pitch played on the B wheel.' },
      { k: 'vol',   v: 0.6,  label: 'Volume',        unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Tone level.' },
      { k: 'decay', v: 0.3,  label: 'Decay',         unit: 's',  lo: 0.02, hi: 1.5, step: 0.005, gloss: 'Ring length.' }
    ]
  },

  claves: {
    family: 'percussion',
    label: 'Claves',
    params: [
      { k: 'freq1',  v: 2000, label: 'Tone 1 Freq', unit: 'Hz', lo: 500, hi: 4000, step: 1, gloss: 'First wood tone.' },
      { k: 'freq2',  v: 2005, label: 'Tone 2 Freq', unit: 'Hz', lo: 500, hi: 4000, step: 1, gloss: 'Slightly detuned partner — creates the 5 Hz beat.' },
      { k: 'vol',    v: 0.6,  label: 'Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Click level.' },
      { k: 'decay',  v: 0.08, label: 'Decay',       unit: 's',  lo: 0.01, hi: 0.4, step: 0.001, gloss: 'Sharp wooden click.' }
    ]
  },

  woodblock: {
    family: 'percussion',
    label: 'Woodblock Clack',
    params: [
      { k: 'startFreq', v: 920, label: 'Start Frequency', unit: 'Hz', lo: 300, hi: 2000, step: 1, gloss: 'Initial pitch.' },
      { k: 'endFreq',   v: 680, label: 'End Frequency',   unit: 'Hz', lo: 200, hi: 2000, step: 1, gloss: 'Resting pitch after the sweep.' },
      { k: 'sweepTime', v: 0.04,label: 'Sweep Time',      unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Pitch drop duration.' },
      { k: 'vol',       v: 0.8, label: 'Volume',          unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Click level.' },
      { k: 'decay',     v: 0.08,label: 'Decay',           unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Total length.' }
    ]
  },

  rimshot: {
    family: 'percussion',
    label: 'Rimshot Click',
    params: [
      { k: 'freq',  v: 680, label: 'Frequency', unit: 'Hz', lo: 200, hi: 2000, step: 1, gloss: 'Triangle click pitch.' },
      { k: 'vol',   v: 1.0, label: 'Volume',    unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Click level.' },
      { k: 'decay', v: 0.04,label: 'Decay',     unit: 's',  lo: 0.005, hi: 0.2, step: 0.001, gloss: 'Total length.' }
    ]
  },

  temple_block: {
    family: 'percussion',
    label: 'Temple Block',
    params: [
      { k: 'freqA',     v: 1120, label: 'Pitch A-Wheel',  unit: 'Hz', lo: 300, hi: 2500, step: 1, gloss: 'Pitch played on the A wheel.' },
      { k: 'freqB',     v: 780,  label: 'Pitch B-Wheel',  unit: 'Hz', lo: 300, hi: 2500, step: 1, gloss: 'Pitch played on the B wheel.' },
      { k: 'pitchBend', v: 1.22, label: 'Pitch Bend',     unit: '',   lo: 1.0, hi: 1.5, step: 0.01, gloss: 'Initial bend before settling.' },
      { k: 'bendTime',  v: 0.035,label: 'Bend Time',      unit: 's',  lo: 0.005, hi: 0.1, step: 0.001, gloss: 'Settle time.' },
      { k: 'filterQ',   v: 7.0,  label: 'Filter Q',       unit: '',   lo: 0.5, hi: 12.0, step: 0.1, gloss: 'Bandpass resonance.' },
      { k: 'vol',       v: 0.82, label: 'Volume',         unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Strike level.' },
      { k: 'decay',     v: 0.09, label: 'Decay',          unit: 's',  lo: 0.01, hi: 0.4, step: 0.005, gloss: 'Total length.' }
    ]
  },

  castanets: {
    family: 'percussion',
    label: 'Castanets',
    params: [
      { k: 'noiseFreq', v: 3500, label: 'Noise BP Freq', unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Bandpass centre of the clatter.' },
      { k: 'noiseQ',    v: 5.0,  label: 'Noise Q',       unit: '',   lo: 0.5, hi: 10.0, step: 0.1, gloss: 'Clatter resonance.' },
      { k: 'noiseVol',  v: 0.7,  label: 'Noise Volume',  unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Clatter level.' },
      { k: 'noiseDecay',v: 0.03, label: 'Noise Decay',   unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Clatter length.' },
      { k: 'oscFreq',   v: 3500, label: 'Tone Freq',     unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Resonant wood tone.' },
      { k: 'oscVol',    v: 0.2,  label: 'Tone Volume',   unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Tone level.' },
      { k: 'oscDecay',  v: 0.04, label: 'Tone Decay',    unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Tone ring.' }
    ]
  },

  cowbell: {
    family: 'percussion',
    label: 'Analog Cowbell',
    params: [
      { k: 'freq1',      v: 540,  label: 'Osc 1 Freq',   unit: 'Hz', lo: 200, hi: 1500, step: 1, gloss: 'First square oscillator.' },
      { k: 'freq2',      v: 800,  label: 'Osc 2 Freq',   unit: 'Hz', lo: 200, hi: 1500, step: 1, gloss: 'Second square oscillator.' },
      { k: 'filterFreq', v: 1000, label: 'Filter Freq',  unit: 'Hz', lo: 200, hi: 4000, step: 10, gloss: 'Bandpass centre.' },
      { k: 'filterQ',    v: 1.0,  label: 'Filter Q',     unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Bandpass resonance.' },
      { k: 'vol',        v: 0.8,  label: 'Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Level.' },
      { k: 'decay',      v: 0.25, label: 'Decay',        unit: 's',  lo: 0.02, hi: 1.0, step: 0.005, gloss: 'Clank length.' }
    ]
  },

  cowbell_boca: {
    family: 'percussion',
    label: 'Cowbell Mouth (Boca)',
    params: [
      { k: 'baseFreq',      v: 520,  label: 'Base Frequency',   unit: 'Hz', lo: 200, hi: 1200, step: 1, gloss: 'A bright, mid-range fundamental.' },
      { k: 'pitchBend',     v: 1.0,  label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.1, step: 0.005, gloss: 'Absolute zero deflection — metal does not stretch.' },
      { k: 'pitchBendTime', v: 0.001,label: 'Pitch Bend Time',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'No envelope.' },
      { k: 'bodyVol',       v: 0.65, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Ringing iron fundamental.' },
      { k: 'bodyDecay',     v: 0.45, label: 'Body Decay',       unit: 's',  lo: 0.05, hi: 1.5, step: 0.01, gloss: 'Long, metallic sustain.' },
      { k: 'overRatio1',    v: 1.58, label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Complex non-integer ratio of folded steel.' },
      { k: 'overVol1',      v: 0.50, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Loud and fiercely competitive with the fundamental.' },
      { k: 'overDecay1',    v: 0.35, label: 'Overtone 1 Decay', unit: 's',  lo: 0.05, hi: 1.5, step: 0.01, gloss: 'Long clang.' },
      { k: 'overRatio2',    v: 2.24, label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Second dissonant mode.' },
      { k: 'overVol2',      v: 0.35, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Substantial.' },
      { k: 'overDecay2',    v: 0.25, label: 'Overtone 2 Decay', unit: 's',  lo: 0.05, hi: 1.5, step: 0.01, gloss: 'Moderate clang.' },
      { k: 'noiseFreq',     v: 4500, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 12000, step: 10, gloss: 'The "clink" of a thick wooden stick on a thin metal edge.' },
      { k: 'noiseQ',        v: 3.0,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Resonant metallic ping.' },
      { k: 'noiseVol',      v: 0.70, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Stick attack.' },
      { k: 'noiseDecay',    v: 0.02, label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Fast, sharp transient.' }
    ]
  },

  cowbell_centro: {
    family: 'percussion',
    label: 'Cowbell Body (Centro)',
    params: [
      { k: 'baseFreq',      v: 780,  label: 'Base Frequency',   unit: 'Hz', lo: 300, hi: 1600, step: 1, gloss: 'Shifted up — the center of the metal vibrates at a much higher frequency than the open edge.' },
      { k: 'pitchBend',     v: 1.0,  label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.1, step: 0.005, gloss: 'Absolute zero deflection.' },
      { k: 'pitchBendTime', v: 0.001,label: 'Pitch Bend Time',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'No envelope.' },
      { k: 'bodyVol',       v: 0.50, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Quieter than the Mouth stroke.' },
      { k: 'bodyDecay',     v: 0.12, label: 'Body Decay',       unit: 's',  lo: 0.02, hi: 0.6, step: 0.005, gloss: 'Extremely dry — the rigidity of the center damps the vibration immediately.' },
      { k: 'overRatio1',    v: 1.58, label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Same folded-steel ratio.' },
      { k: 'overVol1',      v: 0.20, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Overtones cannot ring freely when struck in the center.' },
      { k: 'overDecay1',    v: 0.08, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.4, step: 0.005, gloss: 'Short.' },
      { k: 'overRatio2',    v: 2.24, label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Second mode.' },
      { k: 'overVol2',      v: 0.10, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Subtle.' },
      { k: 'overDecay2',    v: 0.05, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: 'Very short.' },
      { k: 'noiseFreq',     v: 6500, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 12000, step: 10, gloss: 'Higher transient — the flat stick on the flat face gives a brighter, thinner "tock".' },
      { k: 'noiseQ',        v: 1.5,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Lower Q than the Mouth — a blunt impact, not a ringing ping.' },
      { k: 'noiseVol',      v: 0.60, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Blunt impact.' },
      { k: 'noiseDecay',    v: 0.01, label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.06, step: 0.001, gloss: 'Microscopic strike time.' }
    ]
  },

  clap: {
    family: 'percussion',
    label: 'Handclap',
    params: [
      { k: 'burstFreq',   v: 2000, label: 'Burst Freq',        unit: 'Hz', lo: 800, hi: 6000, step: 10, gloss: 'Broadband skin crack of the palms meeting.' },
      { k: 'burstQ',      v: 0.8,  label: 'Burst Q',           unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Wide band keeps the impacts noisy, not pitched.' },
      { k: 'burstCount',  v: 3,    label: 'Burst Count',       unit: '',   lo: 2, hi: 5, step: 1, gloss: 'Micro sub-impacts (the fingers/heel never land at once).' },
      { k: 'burstSpacing',v: 0.002,label: 'Burst Spacing',     unit: 's',  lo: 0.001, hi: 0.008, step: 0.0005, gloss: 'Gap between sub-impacts — keep the whole flutter under ~8 ms.' },
      { k: 'burstJitterPct', v: 0.12, label: 'Burst Jitter',   unit: '',   lo: 0, hi: 0.3, step: 0.01, gloss: 'Per-hit frequency spread — identical bursts phase-reinforce and sound like one.' },
      { k: 'burstVol',    v: 0.8,  label: 'Burst Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Level of the first sub-impact (later ones decay).' },
      { k: 'burstDecay',  v: 0.017,label: 'Burst Decay',       unit: 's',  lo: 0.005, hi: 0.04, step: 0.001, gloss: 'Per-impact length.' },
      { k: 'cupFreq',     v: 1000, label: 'Cup Freq',          unit: 'Hz', lo: 300, hi: 2500, step: 10, gloss: 'Cupped-palm cavity resonance — the hollow "pop".' },
      { k: 'cupQ',        v: 2.0,  label: 'Cup Q',             unit: '',   lo: 0.5, hi: 10.0, step: 0.1, gloss: 'A hollow pop, not a ringing bell.' },
      { k: 'cupVol',      v: 0.45, label: 'Cup Volume',        unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Level of the cupped resonance.' },
      { k: 'cupDecay',    v: 0.03, label: 'Cup Decay',         unit: 's',  lo: 0.005, hi: 0.12, step: 0.001, gloss: 'Cup pop length.' },
      { k: 'bodyFreq',    v: 320,  label: 'Body Freq',         unit: 'Hz', lo: 80, hi: 600, step: 1, gloss: 'Low fixed triangle "thick hands" (no sweep).' },
      { k: 'bodyVol',     v: 0.06, label: 'Body Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Barely perceptible — just grounds the smack.' },
      { k: 'bodyDecay',   v: 0.025,label: 'Body Decay',        unit: 's',  lo: 0.005, hi: 0.15, step: 0.001, gloss: 'Ends quickly so it does not muddy the mix.' },
      { k: 'tailFreq',    v: 2000, label: 'Tail Filter Freq',  unit: 'Hz', lo: 300, hi: 6000, step: 10, gloss: 'Room reflection band.' },
      { k: 'tailQ',       v: 0.5,  label: 'Tail Q',            unit: '',   lo: 0.3, hi: 4.0, step: 0.1, gloss: 'Very wide band for a natural breath of room.' },
      { k: 'tailVol',     v: 0.15, label: 'Tail Volume',       unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Level of the decay tail — kept low to stay dry.' },
      { k: 'tailDecay',   v: 0.08, label: 'Tail Decay',        unit: 's',  lo: 0.02, hi: 0.6, step: 0.005, gloss: 'Short — a single clap is dry.' }
    ]
  },

  maraca: {
    family: 'percussion',
    label: 'Maraca',
    params: [
      { k: 'filterFreq', v: 7000, label: 'Filter Freq', unit: 'Hz', lo: 1000, hi: 12000, step: 50, gloss: 'Bandpass centre.' },
      { k: 'filterQ',    v: 2.0,  label: 'Filter Q',    unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Bandpass resonance.' },
      { k: 'vol',        v: 0.4,  label: 'Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Grain level.' },
      { k: 'grains',     v: 12,   label: 'Grains',      unit: '',   lo: 4, hi: 24, step: 1, gloss: 'Number of beads.' },
      { k: 'grainRate',  v: 0.012,label: 'Grain Rate',  unit: 's',  lo: 0.004, hi: 0.04, step: 0.001, gloss: 'Spacing between beads.' },
      { k: 'grainDecay', v: 0.006,label: 'Grain Decay', unit: 's',  lo: 0.002, hi: 0.03, step: 0.001, gloss: 'Each bead hit length.' }
    ]
  },

  axatse_pa: {
    family: 'percussion',
    label: 'Axatse Thigh (Pa)',
    params: [
      { k: 'baseFreq',      v: 250,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 600, step: 1, gloss: 'Low-mid resonance of the hollowed gourd.' },
      { k: 'pitchBend',     v: 1.0,  label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.1, step: 0.005, gloss: 'No skin to stretch.' },
      { k: 'pitchBendTime', v: 0.001,label: 'Pitch Bend Time',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'No envelope.' },
      { k: 'bodyVol',       v: 0.45, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Audible, but secondary to the beads.' },
      { k: 'bodyDecay',     v: 0.15, label: 'Body Decay',       unit: 's',  lo: 0.02, hi: 0.5, step: 0.005, gloss: 'The gourd rings briefly against the leg.' },
      { k: 'overRatio1',    v: 1.5,  label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for continuity; volume 0 eliminates it.' },
      { k: 'overVol1',      v: 0.0,  label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — no symmetric overtones.' },
      { k: 'overDecay1',    v: 0.01, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'overRatio2',    v: 2.2,  label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for continuity.' },
      { k: 'overVol2',      v: 0.0,  label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero.' },
      { k: 'overDecay2',    v: 0.01, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'noiseFreq',     v: 2800, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 12000, step: 10, gloss: 'A darker, wider band of noise.' },
      { k: 'noiseQ',        v: 0.4,  label: 'Noise Q',          unit: '',   lo: 0.3, hi: 6.0, step: 0.1, gloss: 'Very low Q — the noise must be broad to sound like hundreds of beads.' },
      { k: 'noiseVol',      v: 0.85, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The dominant feature of the instrument.' },
      { k: 'noiseDecay',    v: 0.12, label: 'Noise Decay',      unit: 's',  lo: 0.01, hi: 0.4, step: 0.005, gloss: '120 ms — the beads wash over the shell rather than hitting at once.' }
    ]
  },

  axatse_ti: {
    family: 'percussion',
    label: 'Axatse Palm (Ti)',
    params: [
      { k: 'baseFreq',      v: 400,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 800, step: 1, gloss: 'Pitched up — the hand clamps the gourd.' },
      { k: 'pitchBend',     v: 1.0,  label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.1, step: 0.005, gloss: 'No skin to stretch.' },
      { k: 'pitchBendTime', v: 0.001,label: 'Pitch Bend Time',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'No envelope.' },
      { k: 'bodyVol',       v: 0.20, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Heavily muffled.' },
      { k: 'bodyDecay',     v: 0.05, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Dies instantly.' },
      { k: 'overRatio1',    v: 1.5,  label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for continuity; volume 0 eliminates it.' },
      { k: 'overVol1',      v: 0.0,  label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero — no symmetric overtones.' },
      { k: 'overDecay1',    v: 0.01, label: 'Overtone 1 Decay', unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'overRatio2',    v: 2.2,  label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Kept for continuity.' },
      { k: 'overVol2',      v: 0.0,  label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Zero.' },
      { k: 'overDecay2',    v: 0.01, label: 'Overtone 2 Decay', unit: 's',  lo: 0.005, hi: 0.2, step: 0.005, gloss: 'Eliminated.' },
      { k: 'noiseFreq',     v: 4800, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 12000, step: 10, gloss: 'Shifted much higher for a bright, cutting sizzle.' },
      { k: 'noiseQ',        v: 0.6,  label: 'Noise Q',          unit: '',   lo: 0.3, hi: 6.0, step: 0.1, gloss: 'Slightly tighter frequency band.' },
      { k: 'noiseVol',      v: 0.75, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Slightly quieter than the heavy thigh stroke.' },
      { k: 'noiseDecay',    v: 0.05, label: 'Noise Decay',      unit: 's',  lo: 0.005, hi: 0.3, step: 0.005, gloss: '50 ms — a faster, tighter bead impact against the flat hand.' }
    ]
  },

  palitos: {
    family: 'percussion',
    label: 'Palitos (Cáscara / Catá)',
    params: [
      { k: 'baseFreq',      v: 2400, label: 'Base Frequency',   unit: 'Hz', lo: 500, hi: 5000, step: 10, gloss: 'Pushed high — solid wood shells resonate at high frequencies.' },
      { k: 'pitchBend',     v: 1.0,  label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.2, step: 0.005, gloss: 'Wood does not stretch — strictly 1.0, a flat oscillator sounds rigid.' },
      { k: 'pitchBendTime', v: 0.001,label: 'Pitch Bend Time',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'Zero bend duration; no envelope to speak of.' },
      { k: 'bodyVol',       v: 0.65, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Rigid wood resonance level.' },
      { k: 'bodyDecay',     v: 0.05, label: 'Body Decay',       unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Extremely short — rigid bodies damp vibrations rapidly.' },
      { k: 'overRatio1',    v: 1.45, label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Inharmonic wood mode — breaks from circular-membrane Bessel ratios.' },
      { k: 'overVol1',      v: 0.50, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Loud, competing with the fundamental to create the "clack".' },
      { k: 'overDecay1',    v: 0.06, label: 'Overtone 1 Decay', unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Rings just fractionally longer than the body.' },
      { k: 'overRatio2',    v: 2.15, label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Second wood mode — the clashing cylinder frequencies.' },
      { k: 'overVol2',      v: 0.35, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Prominent competing overtone.' },
      { k: 'overDecay2',    v: 0.03, label: 'Overtone 2 Decay', unit: 's',  lo: 0.01, hi: 0.3, step: 0.005, gloss: 'Brief.' },
      { k: 'slapFreq',      v: 7000, label: 'Slap Filter Freq', unit: 'Hz', lo: 500, hi: 12000, step: 10, gloss: 'Very high — the snap of a hardwood dowel.' },
      { k: 'slapQ',         v: 4.0,  label: 'Slap Q',           unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'High Q gives a resonant, almost metallic "tick".' },
      { k: 'slapVol',       v: 0.75, label: 'Slap Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The attack is the dominant feature of this stroke.' },
      { k: 'slapDecay',     v: 0.01, label: 'Slap Decay',       unit: 's',  lo: 0.003, hi: 0.05, step: 0.001, gloss: 'Microscopic transient.' }
    ]
  },

  tambourine: {
    family: 'percussion',
    label: 'Tambourine',
    params: [
      { k: 'noiseFreq', v: 9000, label: 'Jingle Freq',  unit: 'Hz', lo: 2000, hi: 12000, step: 50, gloss: 'Bandpass centre of the jingles.' },
      { k: 'noiseQ',    v: 0.7,  label: 'Jingle Q',     unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Jingle resonance.' },
      { k: 'noiseVol',  v: 0.5,  label: 'Jingle Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Jingle level.' },
      { k: 'noiseDecay',v: 0.2,  label: 'Jingle Decay', unit: 's',  lo: 0.02, hi: 0.8, step: 0.005, gloss: 'Jingle ring.' },
      { k: 'bodyFreq',  v: 320,  label: 'Body Freq',    unit: 'Hz', lo: 80, hi: 800, step: 1, gloss: 'Frame body tone.' },
      { k: 'bodyVol',   v: 0.3,  label: 'Body Volume',  unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Body tone level.' },
      { k: 'bodyDecay', v: 0.15, label: 'Body Decay',   unit: 's',  lo: 0.02, hi: 0.6, step: 0.005, gloss: 'Body tone decay.' }
    ]
  },

  cabasa_shekere: {
    family: 'percussion',
    label: 'Cabasa / Shekere',
    params: [
      { k: 'filterFreq', v: 4200, label: 'Body BP Freq', unit: 'Hz', lo: 500, hi: 10000, step: 10, gloss: 'Bandpass centre of the hollow body.' },
      { k: 'filterQ',    v: 1.7,  label: 'Body Q',       unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Body resonance.' },
      { k: 'grains',     v: 9,    label: 'Grains',       unit: '',   lo: 3, hi: 20, step: 1, gloss: 'Number of bead clusters.' },
      { k: 'grainRate',  v: 0.012,label: 'Grain Rate',   unit: 's',  lo: 0.004, hi: 0.04, step: 0.001, gloss: 'Spacing between clusters.' },
      { k: 'accentVol',  v: 0.38, label: 'Accent Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume of every third accented cluster.' },
      { k: 'grainVol',   v: 0.22, label: 'Grain Volume', unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume of the unaccented clusters.' },
      { k: 'grainDecay', v: 0.026,label: 'Grain Decay',  unit: 's',  lo: 0.005, hi: 0.1, step: 0.001, gloss: 'Each cluster length.' }
    ]
  },

  guiro: {
    family: 'percussion',
    label: 'Guiro Scraper',
    params: [
      { k: 'filterFreq', v: 2600, label: 'Filter Freq', unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'Bandpass centre of the ridges.' },
      { k: 'filterQ',    v: 5.5,  label: 'Filter Q',    unit: '',   lo: 0.5, hi: 12.0, step: 0.1, gloss: 'Ridge resonance.' },
      { k: 'ridges',     v: 8,    label: 'Ridges',      unit: '',   lo: 3, hi: 20, step: 1, gloss: 'Number of ratchet steps.' },
      { k: 'ridgeRate',  v: 0.018,label: 'Ridge Rate',  unit: 's',  lo: 0.005, hi: 0.06, step: 0.001, gloss: 'Spacing between ridges.' },
      { k: 'accentVol',  v: 0.45, label: 'Accent Volume',unit: '',  lo: 0, hi: 1, step: 0.01, gloss: 'Volume of the first and last ridges.' },
      { k: 'ridgeVol',   v: 0.3,  label: 'Ridge Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Volume of the middle ridges.' },
      { k: 'ridgeDecay', v: 0.018,label: 'Ridge Decay', unit: 's',  lo: 0.005, hi: 0.08, step: 0.001, gloss: 'Each ridge length.' }
    ]
  },

  gankogui_low: {
    family: 'percussion',
    label: 'Gankogui Bell (Low)',
    params: [
      { k: 'baseFreq',      v: 340,  label: 'Base Frequency',   unit: 'Hz', lo: 100, hi: 800, step: 1, gloss: 'Solid, low-midrange fundamental — the parent bell.' },
      { k: 'pitchBend',     v: 1.0,  label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.1, step: 0.005, gloss: 'Absolute zero deflection. Metal does not yield.' },
      { k: 'pitchBendTime', v: 0.001,label: 'Pitch Bend Time',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'No envelope — iron is rigid.' },
      { k: 'bodyVol',       v: 0.60, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Strong, but shares the space with the clashing overtones.' },
      { k: 'bodyDecay',     v: 0.80, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 2.0, step: 0.01, gloss: 'Iron sustains heavily.' },
      { k: 'overRatio1',    v: 1.62, label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Highly dissonant folded-sheet-iron mode.' },
      { k: 'overVol1',      v: 0.45, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Massively boosted — almost as loud as the root.' },
      { k: 'overDecay1',    v: 0.70, label: 'Overtone 1 Decay', unit: 's',  lo: 0.05, hi: 2.0, step: 0.01, gloss: 'Rings almost as long as the body.' },
      { k: 'overRatio2',    v: 2.38, label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Second chaotic iron mode.' },
      { k: 'overVol2',      v: 0.35, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Loud competing overtone.' },
      { k: 'overDecay2',    v: 0.50, label: 'Overtone 2 Decay', unit: 's',  lo: 0.05, hi: 2.0, step: 0.01, gloss: 'Long iron ring.' },
      { k: 'noiseFreq',     v: 6500, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 12000, step: 10, gloss: 'High-frequency "clink" of the wooden stick on the metal edge.' },
      { k: 'noiseQ',        v: 4.0,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Very high Q creates a resonant, pitched "tick".' },
      { k: 'noiseVol',      v: 0.65, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The transient that sells the metal.' },
      { k: 'noiseDecay',    v: 0.015,label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Fast, brittle transient.' }
    ]
  },

  gankogui_high: {
    family: 'percussion',
    label: 'Gankogui Bell (High)',
    params: [
      { k: 'baseFreq',      v: 560,  label: 'Base Frequency',   unit: 'Hz', lo: 200, hi: 1200, step: 1, gloss: 'Sharp, cutting fundamental — the child bell.' },
      { k: 'pitchBend',     v: 1.0,  label: 'Pitch Bend',       unit: '',   lo: 1.0, hi: 1.1, step: 0.005, gloss: 'Absolute zero deflection.' },
      { k: 'pitchBendTime', v: 0.001,label: 'Pitch Bend Time',  unit: 's',  lo: 0.001, hi: 0.05, step: 0.001, gloss: 'Rigid iron.' },
      { k: 'bodyVol',       v: 0.55, label: 'Body Volume',      unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Less volume needed — ears are highly sensitive in this range.' },
      { k: 'bodyDecay',     v: 0.60, label: 'Body Decay',       unit: 's',  lo: 0.1, hi: 2.0, step: 0.01, gloss: 'Smaller mass means slightly shorter sustain than the low bell.' },
      { k: 'overRatio1',    v: 1.55, label: 'Overtone 1 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Tighter clang — shifted for the smaller cone.' },
      { k: 'overVol1',      v: 0.40, label: 'Overtone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Loud competing overtone.' },
      { k: 'overDecay1',    v: 0.50, label: 'Overtone 1 Decay', unit: 's',  lo: 0.05, hi: 2.0, step: 0.01, gloss: 'Long iron ring.' },
      { k: 'overRatio2',    v: 2.45, label: 'Overtone 2 Ratio', unit: '',   lo: 1.2, hi: 3.0, step: 0.01, gloss: 'Second chaotic mode of the smaller bell.' },
      { k: 'overVol2',      v: 0.30, label: 'Overtone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Substantial.' },
      { k: 'overDecay2',    v: 0.35, label: 'Overtone 2 Decay', unit: 's',  lo: 0.05, hi: 2.0, step: 0.01, gloss: 'Moderate ring.' },
      { k: 'noiseFreq',     v: 7500, label: 'Noise Filter Freq',unit: 'Hz', lo: 500, hi: 12000, step: 10, gloss: 'Shifted even higher — the smaller bell offers less mass against the stick.' },
      { k: 'noiseQ',        v: 4.5,  label: 'Noise Q',          unit: '',   lo: 0.5, hi: 8.0, step: 0.1, gloss: 'Razor-sharp resonance.' },
      { k: 'noiseVol',      v: 0.70, label: 'Noise Volume',     unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'The stick transient leads this strike.' },
      { k: 'noiseDecay',    v: 0.01, label: 'Noise Decay',      unit: 's',  lo: 0.003, hi: 0.08, step: 0.001, gloss: 'Microscopic strike time.' }
    ]
  },

  triangle: {
    family: 'percussion',
    label: 'Triangle',
    params: [
      { k: 'freq1',   v: 3600, label: 'Tone 1 Freq', unit: 'Hz', lo: 500, hi: 8000, step: 10, gloss: 'First partial.' },
      { k: 'vol1',    v: 0.5,  label: 'Tone 1 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'First partial level.' },
      { k: 'decay1',  v: 0.7,  label: 'Tone 1 Decay', unit: 's',  lo: 0.05, hi: 2.0, step: 0.01, gloss: 'First partial ring.' },
      { k: 'freq2',   v: 5400, label: 'Tone 2 Freq', unit: 'Hz', lo: 500, hi: 12000, step: 10, gloss: 'Bright upper partial.' },
      { k: 'vol2',    v: 0.22, label: 'Tone 2 Volume',unit: '',   lo: 0, hi: 1, step: 0.01, gloss: 'Upper partial level.' },
      { k: 'decay2',  v: 0.45, label: 'Tone 2 Decay', unit: 's',  lo: 0.05, hi: 2.0, step: 0.01, gloss: 'Upper partial ring.' }
    ]
  },

};
