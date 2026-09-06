import { previousWeekEntries } from './schedule.js';
import { seedFrom, mulberry32, shuffle } from './rng.js';

// Spaced automatic revision: pick the previous rule served longest ago (never-served first, oldest week first),
// then the word from that rule served least recently.
export function pickRevisionWord(content, schedule, weekEntry, revisions, dateStr) {
  const prev = previousWeekEntries(schedule, weekEntry).filter(e => e.weekId !== weekEntry.weekId);
  if (!prev.length) return null;
  const seenRule = new Map();
  for (const e of prev) if (!seenRule.has(e.weekId)) seenRule.set(e.weekId, e);
  const auto = revisions.filter(r => r.type === 'auto');
  const lastByRule = {}; const lastByWord = {};
  for (const r of auto) { lastByRule[r.ruleId] = max(lastByRule[r.ruleId], r.date); lastByWord[r.word] = max(lastByWord[r.word], r.date); }
  const rules = [...seenRule.values()].sort((a, b) => cmp(lastByRule[a.weekId], lastByRule[b.weekId]) || a.start.localeCompare(b.start));
  const rule = rules[0];
  const pool = [...rule.week.taught, ...rule.week.daily_transfer];
  const rnd = mulberry32(seedFrom('rev' + dateStr));
  const sorted = shuffle(pool, rnd).sort((a, b) => cmp(lastByWord[a], lastByWord[b]));
  return { word: sorted[0], ruleId: rule.weekId, source: 'revision' };
}
function max(a, b) { return !a || b > a ? b : a; }
function cmp(a, b) { if (!a && !b) return 0; if (!a) return -1; if (!b) return 1; return a.localeCompare(b); }

// "Old rules" shelf: rules whose week has ended (or fully known), in schedule order.
export function finishedRules(content, schedule, dateStr, fullyKnown = {}) {
  const out = []; const seen = new Set();
  for (const e of schedule) {
    if (e.week.mixed || seen.has(e.weekId)) continue;
    if (e.end < dateStr || fullyKnown[e.weekId]) { seen.add(e.weekId); out.push(e); }
  }
  return out;
}
// 3 words for an old-rule mini session
export function oldRuleWords(week, dateStr) {
  const rnd = mulberry32(seedFrom('old' + week.rule_id + dateStr));
  return shuffle([...week.taught, ...week.daily_transfer], rnd).slice(0, 3).map(word => ({ word, source: 'oldrule', ruleId: week.rule_id }));
}
