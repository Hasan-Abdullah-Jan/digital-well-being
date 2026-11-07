/**
 * Small, soft interaction sounds (generated tones in assets/sounds, no licensing issues).
 * Respects the Sounds setting and never interrupts the user's music.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { useSettings } from '@/store/settings';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  toggle: require('../../assets/sounds/toggle.wav'),
  success: require('../../assets/sounds/success.wav'),
  celebrate: require('../../assets/sounds/celebrate.wav'),
  breathe: require('../../assets/sounds/breathe.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const VOLUME: Record<SoundName, number> = { tap: 0.35, toggle: 0.45, success: 0.6, celebrate: 0.7, breathe: 0.5 };

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let configured = false;
let lastTap = 0;

function player(name: SoundName): AudioPlayer | null {
  try {
    if (!configured) {
      configured = true;
      // Mix with other audio and stay silent when the phone is on silent.
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    }
    const p = players[name] ?? (players[name] = createAudioPlayer(SOURCES[name]));
    p.volume = VOLUME[name];
    return p;
  } catch {
    return null;
  }
}

export function playSound(name: SoundName): void {
  if (!useSettings.getState().sounds) return;
  const now = Date.now();
  if (name === 'tap') {
    if (now - lastTap < 60) return; // avoid machine-gun clicks
    lastTap = now;
  }
  const p = player(name);
  if (!p) return;
  try {
    p.seekTo(0).catch(() => undefined);
    p.play();
  } catch {
    // Sound is decoration only; never break the app over it.
  }
}
