export function toJSONExport(dump, content) {
  const profile = dump.profile.map(({ pinHash, ...p }) => p);
  return { app: 'anyas-spelling-quest', exportedAt: new Date().toISOString(), child: content.child, profile, days: dump.days, videos: dump.videos, revisions: dump.revisions, events: dump.events };
}
const esc = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = (headers, rows) => [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
export function toCSVExport(dump) {
  const sessions = csv(['date', 'weekId', 'dayType', 'status', 'minutes', 'countsForStreak', 'waysDone', 'switches', 'wordsCorrect', 'wordsTotal', 'transferCorrect', 'transferTotal', 'probeCorrect', 'probeTotal', 'selfCaught'],
    dump.days.map(d => {
      const tr = d.words.filter(w => ['transfer', 'sentence'].includes(w.source));
      return { date: d.date, weekId: d.weekId, dayType: d.dayType, status: d.status, minutes: (d.activeMs / 60000).toFixed(1), countsForStreak: !!d.countsForStreak, waysDone: (d.learn?.waysDone || []).map(w => w.way).join(' '), switches: (d.learn?.switches || []).length, wordsCorrect: d.parentCheck?.correct ?? '', wordsTotal: d.parentCheck?.total ?? '', transferCorrect: tr.filter(w => w.mark).length, transferTotal: tr.length, probeCorrect: d.probeScore?.correct ?? '', probeTotal: d.probeScore?.total ?? '', selfCaught: d.parentCheck?.selfCaught ?? '' };
    }));
  const words = csv(['date', 'weekId', 'word', 'source', 'ruleId', 'way', 'mark', 'ruleTap', 'sentence'],
    dump.days.flatMap(d => [...(d.wayWords || []), ...d.words].map(w => ({ date: d.date, weekId: d.weekId, word: w.word, source: w.source, ruleId: w.ruleId, way: w.way ?? '', mark: w.mark === null || w.mark === undefined ? '' : w.mark, ruleTap: w.ruleTap || '', sentence: w.sentence || '' }))));
  const videos = csv(['date', 'weekId', 'title', 'url', 'watched', 'quizTaps'], dump.videos.map(v => ({ ...v, quizTaps: JSON.stringify(v.quizTaps || []) })));
  const revisions = csv(['date', 'type', 'ruleId', 'word', 'replayDate', 'words'], dump.revisions.map(r => ({ ...r, words: r.words ? r.words.map(w => `${w.word}:${w.mark ? 1 : 0}`).join(' ') : '' })));
  const events = csv(['date', 'at', 'type', 'from', 'to', 'gap'], dump.events);
  return { 'sessions.csv': sessions, 'words.csv': words, 'videos.csv': videos, 'revisions.csv': revisions, 'events.csv': events };
}
