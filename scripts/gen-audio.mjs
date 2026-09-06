// Generates one .m4a per word/sentence in public/content/anya.json using macOS `say` + afconvert.
// Usage: node scripts/gen-audio.mjs [voice]   (default voice: Karen)
import { readFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const voice = process.argv[2] || 'Karen';
const content = JSON.parse(readFileSync(new URL('../public/content/anya.json', import.meta.url)));
export const slug = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '_');
const items = new Set();
for (const w of content.weeks) {
  for (const k of ['taught', 'daily_transfer', 'probe']) (w[k] || []).forEach(x => items.add(x));
  for (const l of Object.values(w.probe_by_rule || {})) l.forEach(x => items.add(x));
  (w.daily_sentences || []).forEach(s => items.add(s.text));
  (w.review_sentences || []).forEach(s => items.add(s.text));
  (w.exceptions || []).forEach(e => items.add(e.word));
  (w.probe_sentences || []).forEach(s => items.add(s.text));
  (w.way3_words || []).forEach(x => items.add(x.word));
  (w.way1_pairs_by_day || []).flat().forEach(x => items.add(x.word));
  for (const s of w.way1_script || []) { if (Array.isArray(s.words)) s.words.forEach(x => items.add(x)); if (s.demo?.word) items.add(s.demo.word); if (s.demo?.to) items.add(s.demo.to); if (s.demo?.from) items.add(s.demo.from); (s.demo?.words || []).forEach(x => items.add(x)); (s.demo?.cols || []).forEach(c => c.words.forEach(x => items.add(x))); }
  const g = w.way4_game;
  if (g) { (g.yes || []).forEach(x => items.add(x)); (g.no || []).forEach(x => items.add(x)); (g.items || []).forEach(x => items.add(x.word)); if (g.base) items.add(g.base); (g.targets || []).filter(t => t.length > 2).forEach(x => items.add(x)); (g.distractors || []).forEach(x => items.add(x)); (g.words || []).forEach(x => items.add(x)); }
}
const dir = fileURLToPath(new URL('../public/audio/', import.meta.url));
mkdirSync(dir, { recursive: true });
let made = 0;
for (const text of items) {
  const out = dir + slug(text) + '.m4a';
  if (existsSync(out)) continue;
  const tmp = dir + slug(text) + '.aiff';
  execFileSync('say', ['-v', voice, '-r', '150', '-o', tmp, text]);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', tmp, out]);
  unlinkSync(tmp); made++;
}
console.log(`audio: ${items.size} items, ${made} new files in public/audio`);
