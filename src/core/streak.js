import { addDays, isSunday } from './dates.js';

// A day counts for the streak when the parent check is done AND active time >= min minutes.
// The streak never resets: a missed weekday PAUSES it; Sundays are rest days.
export function computeStreak(days, todayStr, milestones = [5, 10, 20]) {
  const done = days.filter(d => d.countsForStreak).map(d => d.date).sort();
  const count = done.length;
  const lastDone = done[count - 1] || null;
  let state = 'none';
  if (count) {
    if (lastDone === todayStr) state = 'active';
    else {
      let prev = addDays(todayStr, -1);
      if (isSunday(prev)) prev = addDays(prev, -1);
      state = lastDone >= prev ? 'active' : 'paused';
    }
  }
  const stickers = milestones.filter(m => count >= m);
  const nextMilestone = milestones.find(m => count < m) || null;
  return { count, state, lastDone, flowers: done, stickers, nextMilestone };
}
