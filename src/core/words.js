import { seedFrom, mulberry32, shuffle } from './rng.js';
import { pickRevisionWord } from './revision.js';

// Build today's word list. Sources: taught | transfer | sentence | revision | mixed | probe
export function pickDailyWords({ content, info, days, revisions }) {
  const { weekEntry, dayType, dateStr, schedule } = info;
  const week = weekEntry.week;
  const seed = info.seed || dateStr;
  const rnd = mulberry32(seedFrom('words' + seed));
  const n = content.settings.daily_words || 5;

  if (dayType === 'probe') return probeWords(content, week, rnd);

  if (dayType === 'mixed') {
    // one word per earlier rule, she taps the rule before writing
    const rules = content.weeks.filter(w => !w.mixed);
    const items = rules.map(w => {
      const pool = shuffle([...w.taught, ...w.daily_transfer], rnd);
      const recent = shownThisWeek(days, weekEntry);
      return { word: pool.find(x => !recent.has(x)) || pool[0], source: 'mixed', ruleId: w.rule_id, needsRuleTap: true };
    });
    return shuffle(items, rnd).slice(0, n);
  }

  // learn day (words written inside Way 1's script count as "recent" so they are not doubled up today)
  const recent = shownThisWeek(days, weekEntry);
  for (const s of week.way1_script || []) if (Array.isArray(s.words)) s.words.forEach(x => recent.add(x));
  const fresh = (list) => { const s = shuffle(list, rnd); return [...s.filter(x => !recent.has(x)), ...s.filter(x => recent.has(x))]; };
  let taughtN = 3, transferN = 2;
  const revision = pickRevisionWord(content, schedule, weekEntry, revisions, seed);
  if (revision) taughtN = 2;
  const taught = fresh(week.taught).slice(0, taughtN).map(word => ({ word, source: 'taught', ruleId: week.rule_id }));
  let transfer;
  if (week.daily_sentences && week.daily_sentences.length) {
    transfer = shuffle(week.daily_sentences, rnd).slice(0, transferN).map(s => ({ word: s.text, source: 'sentence', ruleId: week.rule_id, sentence: s.text, words: s.words }));
  } else {
    transfer = fresh(week.daily_transfer).slice(0, transferN).map(word => ({ word, source: 'transfer', ruleId: week.rule_id }));
  }
  // From Wednesday, one transfer slot goes to a rule breaker so she meets every exception during the week.
  const exc = (week.exceptions || []).filter(e => !e.homophone).map(e => e.word);
  if ((info.dayIdx ?? 0) >= 2 && exc.length && transfer.length) {
    const served = new Set(); for (const d of days) for (const w of d.words || []) if (w.source === 'exception') served.add(w.word);
    const nextExc = [...exc.filter(w => !served.has(w)), ...exc.filter(w => served.has(w))][0];
    transfer[transfer.length - 1] = { word: nextExc, source: 'exception', ruleId: week.rule_id };
  }
  const items = [...taught, ...transfer];
  if (revision) items.push(revision);
  return shuffle(items, rnd);
}

function shownThisWeek(days, weekEntry) {
  const s = new Set();
  for (const d of days) if (d.weekId === weekEntry.weekId && (d.weekIteration || 1) === weekEntry.iteration) for (const w of d.words || []) s.add(w.word);
  return s;
}

export function probeWords(content, week, rnd) {
  if (week.probe_by_rule) {
    const items = [];
    for (const [ruleId, list] of Object.entries(week.probe_by_rule)) for (const word of list) items.push({ word, source: 'probe', ruleId });
    return shuffle(items, rnd);
  }
  if (week.probe_sentences && week.probe_sentences.length) {
    const items = [];
    for (const s of week.probe_sentences) for (const word of s.words) items.push({ word, source: 'probe', ruleId: week.rule_id, sentence: s.text });
    return items; // keep sentence order so the parent reads each sentence once
  }
  return week.probe.map(word => ({ word, source: 'probe', ruleId: week.rule_id }));
}
