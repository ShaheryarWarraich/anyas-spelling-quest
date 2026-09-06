/**
 * Anya's Spelling Quest — Google Sheet sink.
 * The app POSTs its full JSON export here; this script rewrites five tabs:
 * Sessions, Words, Videos, Revisions, Events (plus a Meta tab with the last sync time).
 * Deploy as a Web App: Execute as "Me", Who has access "Anyone". See SETUP.md.
 */
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  writeSheet_(ss, 'Sessions',
    ['date', 'weekId', 'dayType', 'status', 'minutes', 'countsForStreak', 'waysDone', 'switches', 'wordsCorrect', 'wordsTotal', 'transferCorrect', 'transferTotal', 'probeCorrect', 'probeTotal', 'selfCaught', 'startedAt', 'completedAt'],
    (data.days || []).map(function (d) {
      var tr = (d.words || []).filter(function (w) { return w.source === 'transfer' || w.source === 'sentence'; });
      var pc = d.parentCheck || {};
      return [d.date, d.weekId, d.dayType, d.status, (d.activeMs / 60000).toFixed(1), !!d.countsForStreak,
        ((d.learn || {}).waysDone || []).map(function (w) { return w.way; }).join(' '), ((d.learn || {}).switches || []).length,
        pc.correct == null ? '' : pc.correct, pc.total == null ? '' : pc.total,
        tr.filter(function (w) { return w.mark; }).length, tr.length,
        d.probeScore ? d.probeScore.correct : '', d.probeScore ? d.probeScore.total : '', pc.selfCaught == null ? '' : pc.selfCaught, d.startedAt || '', d.completedAt || ''];
    }));

  writeSheet_(ss, 'Words', ['date', 'weekId', 'word', 'source', 'ruleId', 'way', 'mark', 'ruleTap', 'sentence'],
    (data.days || []).reduce(function (rows, d) {
      var all = (d.wayWords || []).concat(d.words || []);
      all.forEach(function (w) { rows.push([d.date, d.weekId, w.word, w.source, w.ruleId || '', w.way || '', w.mark == null ? '' : w.mark, w.ruleTap || '', w.sentence || '']); });
      return rows;
    }, []));

  writeSheet_(ss, 'Videos', ['date', 'weekId', 'title', 'url', 'watched', 'quizTaps'],
    (data.videos || []).map(function (v) { return [v.date, v.weekId, v.title, v.url, !!v.watched, JSON.stringify(v.quizTaps || [])]; }));

  writeSheet_(ss, 'Revisions', ['date', 'type', 'ruleId', 'word', 'replayDate', 'words', 'selfCaught'],
    (data.revisions || []).map(function (r) { return [r.date, r.type, r.ruleId || '', r.word || '', r.replayDate || '', (r.words || []).map(function (w) { return w.word + ':' + (w.mark ? 1 : 0); }).join(' '), r.selfCaught == null ? '' : r.selfCaught]; }));

  writeSheet_(ss, 'Events', ['date', 'at', 'type', 'from', 'to', 'gap', 'ruleId', 'startDate'],
    (data.events || []).map(function (ev) { return [ev.date, ev.at, ev.type, ev.from || '', ev.to || '', ev.gap || '', ev.ruleId || '', ev.startDate || '']; }));

  var meta = ss.getSheetByName('Meta') || ss.insertSheet('Meta');
  meta.clear();
  meta.getRange(1, 1, 3, 2).setValues([['lastSync', new Date().toISOString()], ['exportedAt', data.exportedAt || ''], ['child', (data.child || {}).name || '']]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

function doGet() { return ContentService.createTextOutput('Anya\'s Spelling Quest sink is running.'); }

function writeSheet_(ss, name, headers, rows) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sh.setFrozenRows(1);
}
