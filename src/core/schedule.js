import { addDays, weekday, diffDays } from './dates.js';

// Build the effective week schedule: base weeks laid consecutively from profile.startDate,
// with repeats inserted (each repeat = {ruleId, startDate}); weeks at/after a repeat shift by 7 days.
// Past day records carry their own weekId, so history never changes when the schedule moves.
export function buildSchedule(content, profile = {}) {
  const start = profile.startDate || content.weeks[0].dates.start;
  let entries = content.weeks.map((w, i) => ({ weekIndex: i, weekId: w.rule_id, start: addDays(start, i * 7), repeat: false, iteration: 1 }));
  const repeats = [...(profile.repeats || [])].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const r of repeats) {
    const wi = content.weeks.findIndex(w => w.rule_id === r.ruleId);
    if (wi < 0) continue;
    entries = entries.map(e => e.start >= r.startDate ? { ...e, start: addDays(e.start, 7) } : e);
    const iteration = entries.filter(e => e.weekId === r.ruleId).length + 1;
    entries.push({ weekIndex: wi, weekId: r.ruleId, start: r.startDate, repeat: true, iteration });
  }
  entries.sort((a, b) => a.start.localeCompare(b.start));
  return entries.map(e => ({ ...e, end: addDays(e.start, 5), week: content.weeks[e.weekIndex] }));
}

export const DEFAULT_WAY_BY_DAY = [1, 1, 2, 3, 4]; // Mon..Fri

// What is today? Returns dayType: before | learn | probe | rest | after, plus the week entry.
export function getDayInfo(content, profile, dateStr) {
  const sched = buildSchedule(content, profile);
  const wd = weekday(dateStr);
  if (wd === 0) {
    // Rest day. A "Play anyway" bonus session uses next week's rule if the plan hasn't started yet, else the week just finished.
    const next = sched.find(e => e.start === addDays(dateStr, 1));
    const prev = [...sched].reverse().find(e => e.end < dateStr && !e.week.mixed);
    const started = sched.some(e => e.start <= dateStr);
    const bonusEntry = (!started && next) ? next : (prev || next || null);
    const bonus = bonusEntry ? { weekEntry: bonusEntry, dayIdx: 0, dayType: bonusEntry.week.mixed ? 'mixed' : 'learn', defaultWay: 1 } : null;
    return { dayType: 'rest', dateStr, schedule: sched, weekEntry: findWeekAround(sched, dateStr), bonus };
  }
  const entry = sched.find(e => dateStr >= e.start && dateStr <= e.end);
  if (!entry) {
    if (dateStr < sched[0].start) return { dayType: 'before', dateStr, schedule: sched, weekEntry: sched[0], startsIn: diffDays(dateStr, sched[0].start) };
    return { dayType: 'after', dateStr, schedule: sched, weekEntry: sched[sched.length - 1] };
  }
  const dayIdx = diffDays(entry.start, dateStr); // 0 Mon .. 5 Sat
  const dayType = dayIdx === 5 ? 'probe' : (entry.week.mixed ? 'mixed' : 'learn');
  return { dayType, dateStr, dayIdx, weekEntry: entry, schedule: sched, defaultWay: dayIdx < 5 ? DEFAULT_WAY_BY_DAY[dayIdx] : null };
}
function findWeekAround(sched, dateStr) {
  // On a Sunday, the "current" week is the one that just ended (for previews use the next one).
  return sched.find(e => dateStr >= addDays(e.start, -1) && dateStr <= addDays(e.end, 1)) || null;
}
export function nextWeekEntry(schedule, entry) {
  const i = schedule.indexOf(entry);
  return i >= 0 && i + 1 < schedule.length ? schedule[i + 1] : null;
}
// Weeks that ended before the given entry started (used for revision draws)
export function previousWeekEntries(schedule, entry) {
  return schedule.filter(e => e.start < entry.start && !e.week.mixed);
}
