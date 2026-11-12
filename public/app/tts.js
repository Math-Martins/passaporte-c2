import { state } from './main.js';

// Browser text-to-speech. Picks a voice for the configured accent when one exists.
export function speak(text, { slow = false } = {}) {
  if (!('speechSynthesis' in window)) return false;
  const lang = state.cfg?.accent || 'en-US';
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = slow ? 0.8 : 1;
  const voice = speechSynthesis.getVoices().find(v => v.lang === lang) || speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}
