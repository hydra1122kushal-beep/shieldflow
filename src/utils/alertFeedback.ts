// Manages browser vibration (navigator.vibrate) and Web Audio API alert siren

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
}

/**
 * Called when the user taps the "Enable alerts" button on entry.
 * Unlocks Web Audio API and sends a short confirmation pulse.
 */
export function armAlertsUserGesture(): { audioReady: boolean; vibrateSupported: boolean; vibrated: boolean } {
  let audioReady = false;
  let vibrated = false;
  const vibrateSupported = isVibrationSupported();

  try {
    const ctx = getAudioContext();
    if (ctx) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      audioReady = true;
    }
  } catch {
    audioReady = false;
  }

  try {
    if (vibrateSupported) {
      vibrated = navigator.vibrate([120, 60, 120]);
    }
  } catch {
    vibrated = false;
  }

  return { audioReady, vibrateSupported, vibrated };
}

/**
 * Triggers the required vibration pattern [300, 100, 300, 100, 600]
 * plus a short two-tone cybersecurity alarm beep.
 */
export function triggerDLPAlertHardware(playBeep = true): { vibrated: boolean; vibrateSupported: boolean } {
  const vibrateSupported = isVibrationSupported();
  let vibrated = false;

  try {
    if (vibrateSupported) {
      vibrated = navigator.vibrate([300, 100, 300, 100, 600]);
    }
  } catch {
    vibrated = false;
  }

  if (playBeep) {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        const now = ctx.currentTime;
        // Double urgent pulse beep (960Hz -> 720Hz -> 960Hz)
        const timings = [
          { start: 0, dur: 0.16, freq: 960 },
          { start: 0.22, dur: 0.16, freq: 720 },
          { start: 0.44, dur: 0.28, freq: 960 },
        ];
        timings.forEach((t) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(t.freq, now + t.start);
          gain.gain.setValueAtTime(0.14, now + t.start);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t.start + t.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + t.start);
          osc.stop(now + t.start + t.dur);
        });
      }
    } catch {
      // Ignore audio block if user hasn't clicked yet
    }
  }

  return { vibrated, vibrateSupported };
}
