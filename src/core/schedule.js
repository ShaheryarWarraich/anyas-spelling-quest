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

// What is today? Every day is a spelling day (no weekends off, no waiting for the start date).
// dayType is 'learn' | 'probe' | 'mixed' when the date falls inside a planned week, otherwise 'open'.
// The lesson she actually plays always comes from her progress (app.nextSlot), not from this.
export function getDayInfo(content, profile, dateStr) {
  const sched = buildSchedule(content, profile);
  const entry = sched.find(e => dateStr >= e.start && dateStr <= e.end);
  if (!entry) {
    const before = dateStr < sched[0].start;
    const near = before ? sched[0] : [...sched].reverse().find(e => e.start <= dateStr) || sched[sched.length - 1];
    return { dayType: 'open', dateStr, schedule: sched, weekEntry: near };
  }
  const dayIdx = diffDays(entry.start, dateStr); // 0 Mon .. 5 Sat
  const dayType = dayIdx === 5 ? 'probe' : (entry.week.mixed ? 'mixed' : 'learn');
  return { dayType, dateStr, dayIdx, weekEntry: entry, schedule: sched, defaultWay: dayIdx < 5 ? DEFAULT_WAY_BY_DAY[dayIdx] : null };
}
// A plan slot = one lesson: week entry + day index (0 Mon .. 5 Sat). Its planned date is start + dayIdx.
export function slotInfo(schedule, entry, dayIdx, dateStr) {
  const dayType = dayIdx === 5 ? 'probe' : (entry.week.mixed ? 'mixed' : 'learn');
  return { dayType, dateStr, dayIdx, weekEntry: entry, schedule, defaultWay: dayIdx < 5 ? DEFAULT_WAY_BY_DAY[dayIdx] : null, slotDate: addDays(entry.start, dayIdx) };
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
