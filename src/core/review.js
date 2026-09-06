import { seedFrom, mulberry32, shuffle } from './rng.js';
// Verbal-to-written checks. She HEARS a word (no text) and taps the right spelling among sound-alike misspellings;
// or hears a sentence and taps the correctly spelled version. Never marked wrong on screen; logged for the parent.

// Pool of confusables across weeks (Week 6 draws from all)
export function confusablesFor(content, week) {
  if (week.mixed) return Object.assign({}, ...content.weeks.map(w => w.confusables || {}));
  return week.confusables || {};
}
export function earItems(content, week, n, dateStr, { exceptionShare = 0.34, exclude = new Set() } = {}) {
  const conf = confusablesFor(content, week);
  const rnd = mulberry32(seedFrom('ear' + dateStr));
  const ruleWords = week.mixed ? content.weeks.filter(w => !w.mixed).flatMap(w => [...w.taught, ...w.daily_transfer]) : [...week.taught, ...week.daily_transfer];
  const excWords = (week.mixed ? content.weeks.flatMap(w => w.exceptions || []) : (week.exceptions || [])).filter(e => !e.homophone).map(e => e.word);
  const nExc = Math.min(excWords.length, Math.round(n * exceptionShare));
  const pick = (list, k) => shuffle(list.filter(w => conf[w] && !exclude.has(w)), rnd).slice(0, k);
  const chosen = [...pick(excWords, nExc).map(w => ({ word: w, source: 'exception' })), ...pick(ruleWords, n - nExc).map(w => ({ word: w, source: 'rule' }))];
  return shuffle(chosen, rnd).map(it => ({ ...it, ruleId: ruleFor(content, it.word, week), options: shuffle([it.word, ...conf[it.word]], rnd), chosen: null, correct: null }));
}
export function sentencePicks(content, week, n, dateStr) {
  const conf = confusablesFor(content, week);
  const rnd = mulberry32(seedFrom('pick' + dateStr));
  const sentences = shuffle(week.review_sentences || [], rnd);
  const out = [];
  for (const s of sentences) {
    const targets = s.words.filter(w => conf[w]);
    if (!targets.length) continue;
    const t = targets[Math.floor(rnd() * targets.length)];
    const re = new RegExp(`\\b${t}\\b`, 'i');
    const options = shuffle([s.text, ...conf[t].map(d => s.text.replace(re, m => (m[0] === m[0].toUpperCase() ? d[0].toUpperCase() + d.slice(1) : d)))], rnd);
    out.push({ text: s.text, target: t, options, chosen: null, correct: null });
    if (out.length >= n) break;
  }
  return out;
}
export function sentencesToWrite(week, n, dateStr, avoid = []) {
  const rnd = mulberry32(seedFrom('sent' + dateStr));
  const all = shuffle(week.review_sentences || [], rnd);
  return [...all.filter(s => !avoid.includes(s.text)), ...all.filter(s => avoid.includes(s.text))].slice(0, n).map(s => ({ word: s.text, sentence: s.text, words: s.words, source: 'sentence-write', ruleId: week.rule_id }));
}
function ruleFor(content, word, week) {
  if (!week.mixed) return week.rule_id;
  const w = content.weeks.find(w => !w.mixed && ([...w.taught, ...w.daily_transfer].includes(word) || (w.exceptions || []).some(e => e.word === word)));
  return w ? w.rule_id : 'MIXED';
}
