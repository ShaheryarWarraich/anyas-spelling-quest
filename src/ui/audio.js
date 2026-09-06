// Plays a word: pre-recorded file first (public/audio/<slug>.m4a), then speech synthesis as fallback.
export const slug = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '_');
const cache = new Map();
export function playWord(text, { slow = false } = {}) {
  return new Promise(resolve => {
    const url = `${import.meta.env.BASE_URL}audio/${slug(text)}.m4a`;
    let a = cache.get(url);
    if (!a) { a = new Audio(url); cache.set(url, a); }
    let fell = false;
    const fallback = () => { if (fell) return; fell = true; speak(text, slow).then(resolve); };
    a.onended = () => resolve();
    a.onerror = fallback;
    a.playbackRate = slow ? 0.7 : 1;
    a.currentTime = 0;
    a.play().catch(fallback);
  });
}
export function speak(text, slow = false) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = slow ? 0.6 : 0.85; u.lang = 'en-GB';
    u.onend = resolve; u.onerror = resolve;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  });
}
// Unlock audio on first tap (iOS)
export function primeAudio() {
  const a = new Audio(); a.muted = true; a.play().catch(() => {});
  if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(''); window.speechSynthesis.speak(u); }
}
