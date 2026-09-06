// Local-date helpers. All dates in the app are "YYYY-MM-DD" strings in local time.
export function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0); }
export function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return toISO(d); }
export function weekday(s) { return parseISO(s).getDay(); } // 0 Sun .. 6 Sat
export function isSunday(s) { return weekday(s) === 0; }
export function mondayOf(s) { const w = weekday(s); return addDays(s, w === 0 ? -6 : 1 - w); }
export function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
export function prettyDate(s) {
  return parseISO(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
