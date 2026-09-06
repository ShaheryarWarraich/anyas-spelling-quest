import { addDays } from './dates.js';
// Parent-facing numbers. Never shown to the child.
export function fullyKnownMap(content, days) {
  const out = {};
  for (const w of content.weeks) {
    if (w.mixed) continue;
    const ways = new Set(days.filter(d => d.weekId === w.rule_id).flatMap(d => (d.learn?.waysDone || []).map(x => x.way)));
    const probes = days.filter(d => d.weekId === w.rule_id && d.dayType === 'probe' && d.probeScore);
    const bestProbe = Math.max(0, ...probes.map(p => p.probeScore.correct));
    out[w.rule_id] = ways.size >= 2 && bestProbe >= 8;
  }
  return out;
}
export function buildDashboard(content, schedule, dump, today) {
  const { days, videos, revisions, events, profile } = dump;
  const p = profile[0] || {};
  const fullyKnown = fullyKnownMap(content, days);
  const weeks = schedule.map(e => {
    const wd = days.filter(d => d.weekId === e.weekId && d.date >= addDays(e.start, -1) && d.date <= addDays(e.end, 1));
    const sessions = wd.map(d => ({
      date: d.date, dayType: d.dayType, bonus: !!d.bonus, status: d.status, minutes: +(d.activeMs / 60000).toFixed(1), countsForStreak: !!d.countsForStreak,
      ways: (d.learn?.waysDone || []).map(w => w.way), switches: (d.learn?.switches || []).length,
      transfer: score(d.words.filter(w => ['transfer', 'sentence'].includes(w.source))),
      taught: score(d.words.filter(w => w.source === 'taught')),
      revision: d.words.filter(w => w.source === 'revision').map(w => ({ word: w.word, ruleId: w.ruleId, mark: w.mark })),
      probe: d.probeScore || null, selfCaught: d.parentCheck?.selfCaught ?? null,
      exceptions: score(d.words.filter(w => w.source === 'exception')),
      ear: tally(d.ear), pick: tally(d.pick), earItems: (d.ear || []).map(e => ({ word: e.word, source: e.source, chosen: e.chosen, correct: e.correct })),
      pickItems: (d.pick || []).map(p => ({ text: p.text, target: p.target, chosen: p.chosen, correct: p.correct })),
      sentences: score(d.sentences || []),
      ruleTaps: d.words.filter(w => w.needsRuleTap).map(w => ({ word: w.word, ruleId: w.ruleId, tapped: w.ruleTap || null })),
      wayWords: (d.wayWords || []).map(w => ({ word: w.word, way: w.way, mark: w.mark })),
    }));
    const waysDone = [...new Set(sessions.flatMap(s => s.ways))].sort();
    const weekTransfer = sessions.reduce((a, s) => ({ correct: a.correct + s.transfer.correct, total: a.total + s.transfer.total }), { correct: 0, total: 0 });
    const sum = key => sessions.reduce((a, s) => ({ correct: a.correct + s[key].correct, total: a.total + s[key].total }), { correct: 0, total: 0 });
    const weekEar = sum('ear'), weekPick = sum('pick'), weekExceptions = sum('exceptions'), weekSentences = sum('sentences');
    return {
      weekId: e.weekId, ruleName: e.week.rule_name, start: e.start, end: e.end, repeat: e.repeat, iteration: e.iteration,
      sessions, sessionCount: sessions.length, waysDone, weekTransfer, weekEar, weekPick, weekExceptions, weekSentences,
      probes: sessions.filter(s => s.probe).map(s => ({ date: s.date, ...s.probe })),
      videos: videos.filter(v => v.date >= e.start && v.date <= e.end).map(v => ({ date: v.date, title: v.title, watched: v.watched, quizTaps: v.quizTaps || [] })),
      switches: sessions.reduce((a, s) => a + s.switches, 0),
      selfCaught: sessions.reduce((a, s) => a + (s.selfCaught || 0), 0),
      fullyKnown: e.week.mixed ? null : !!fullyKnown[e.weekId],
    };
  });
  const done = days.filter(d => d.countsForStreak).map(d => d.date).sort();
  return {
    today, child: content.child.name, startDate: p.startDate, repeats: p.repeats || [], lastSync: p.lastSync || null,
    streak: { count: done.length, lastDone: done[done.length - 1] || null, days: done },
    weeks, fullyKnown,
    revisions: revisions.map(r => ({ type: r.type, date: r.date, ruleId: r.ruleId, word: r.word || null, replayDate: r.replayDate || null, words: r.words || null })),
    switchPresses: events.filter(e => e.type === 'switch_way').map(e => ({ date: e.date, from: e.from, to: e.to })),
    dateJumps: events.filter(e => e.type === 'date_jump'),
    totals: { sessions: days.filter(d => d.status === 'complete').length, minutes: +(days.reduce((a, d) => a + d.activeMs, 0) / 60000).toFixed(1), videosWatched: videos.filter(v => v.watched).length },
  };
}
function score(items) { return { correct: items.filter(w => w.mark === true).length, total: items.length }; }
function tally(items) { const a = (items || []).filter(i => i.chosen !== null && i.chosen !== undefined); return { correct: a.filter(i => i.correct).length, total: a.length }; }
