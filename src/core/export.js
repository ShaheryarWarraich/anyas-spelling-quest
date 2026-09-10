export function toJSONExport(dump, content) {
  const profile = dump.profile.map(({ pinHash, ...p }) => p);
  return { app: 'anyas-spelling-quest', exportedAt: new Date().toISOString(), child: content.child, profile, days: dump.sessions, videos: dump.videos, revisions: dump.revisions, events: dump.events };
}
const esc = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = (headers, rows) => [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
export function toCSVExport(dump) {
  const sessions = csv(['id', 'date', 'seq', 'slot', 'ahead', 'weekId', 'dayType', 'status', 'minutes', 'countsForStreak', 'waysDone', 'switches', 'wordsCorrect', 'wordsTotal', 'transferCorrect', 'transferTotal', 'probeCorrect', 'probeTotal', 'selfCaught', 'exceptionCorrect', 'exceptionTotal', 'earCorrect', 'earTotal', 'pickCorrect', 'pickTotal', 'sentencesCorrect', 'sentencesTotal', 'bonus'],
    dump.sessions.map(d => {
      const tr = d.words.filter(w => ['transfer', 'sentence'].includes(w.source));
      return { id: d.id || d.date, date: d.date, seq: d.seq || 1, slot: d.bonus ? 'bonus' : d.redo ? `redo:${d.redoPart}` : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.dayIdx] ?? '', ahead: !!d.ahead, weekId: d.weekId, dayType: d.dayType, status: d.status, minutes: (d.activeMs / 60000).toFixed(1), countsForStreak: !!d.countsForStreak, waysDone: (d.learn?.waysDone || []).map(w => w.way).join(' '), switches: (d.learn?.switches || []).length, wordsCorrect: d.parentCheck?.correct ?? '', wordsTotal: d.parentCheck?.total ?? '', transferCorrect: tr.filter(w => w.mark).length, transferTotal: tr.length, probeCorrect: d.probeScore?.correct ?? '', probeTotal: d.probeScore?.total ?? '', selfCaught: d.parentCheck?.selfCaught ?? '',
        exceptionCorrect: d.words.filter(w => w.source === 'exception' && w.mark).length, exceptionTotal: d.words.filter(w => w.source === 'exception').length,
        earCorrect: (d.ear || []).filter(e => e.correct).length, earTotal: (d.ear || []).filter(e => e.chosen != null).length,
        pickCorrect: (d.pick || []).filter(e => e.correct).length, pickTotal: (d.pick || []).filter(e => e.chosen != null).length,
        sentencesCorrect: (d.sentences || []).filter(x => x.mark).length, sentencesTotal: (d.sentences || []).length, bonus: !!d.bonus };
    }));
  const words = csv(['session', 'date', 'weekId', 'word', 'source', 'ruleId', 'way', 'mark', 'ruleTap', 'sentence'],
    dump.sessions.flatMap(d => [...(d.wayWords || []), ...d.words, ...(d.sentences || [])].map(w => ({ session: d.id || d.date, date: d.date, weekId: d.weekId, word: w.word, source: w.source, ruleId: w.ruleId, way: w.way ?? '', mark: w.mark === null || w.mark === undefined ? '' : w.mark, ruleTap: w.ruleTap || '', sentence: w.sentence || '' }))));
  const videos = csv(['date', 'weekId', 'title', 'url', 'watched', 'quizTaps'], dump.videos.map(v => ({ ...v, quizTaps: JSON.stringify(v.quizTaps || []) })));
  const revisions = csv(['date', 'type', 'ruleId', 'word', 'replayDate', 'words'], dump.revisions.map(r => ({ ...r, words: r.words ? r.words.map(w => `${w.word}:${w.mark ? 1 : 0}`).join(' ') : '' })));
  const ear = csv(['date', 'weekId', 'kind', 'heard', 'options', 'chosen', 'correct'],
    dump.sessions.flatMap(d => [...(d.ear || []).map(e => ({ date: d.date, weekId: d.weekId, kind: 'word', heard: e.word, options: e.options.join(' | '), chosen: e.chosen ?? '', correct: e.chosen == null ? '' : e.correct })),
      ...(d.pick || []).map(p => ({ date: d.date, weekId: d.weekId, kind: 'sentence', heard: p.text, options: p.options.join(' | '), chosen: p.chosen ?? '', correct: p.chosen == null ? '' : p.correct }))]));
  const events = csv(['date', 'at', 'type', 'from', 'to', 'gap'], dump.events);
  return { 'sessions.csv': sessions, 'words.csv': words, 'ear-checks.csv': ear, 'videos.csv': videos, 'revisions.csv': revisions, 'events.csv': events };
}
