import React, { useEffect, useState } from 'react';
import PinPad from '../components/PinPad.jsx';
import { prettyDate } from '../../core/dates.js';
import { WAY_NAMES } from '../../core/app.js';

export default function ParentScreen({ app, onHome }) {
  const [ok, setOk] = useState(false);
  if (!ok) return <div className="screen center"><PinPad app={app} onOk={() => setOk(true)} onCancel={onHome} /></div>;
  return <Dashboard app={app} onHome={onHome} />;
}

function Dashboard({ app, onHome }) {
  const [d, setD] = useState(null); const [tab, setTab] = useState('overview'); const [msg, setMsg] = useState('');
  const reload = () => app.dashboard().then(setD);
  useEffect(() => { reload(); }, []);
  if (!d) return null;
  const pct = s => s.total ? `${s.correct}/${s.total}` : '–';
  return (
    <div className="screen parent">
      <div className="topbar"><h1>Grown-up area</h1><button className="btn secondary" onClick={onHome}>Back to Anya</button></div>
      <div className="small muted">App version: {typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev'} · <button className="btn ghost" style={{ minHeight: 0, padding: '2px 6px' }} onClick={async () => { try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch {} setTimeout(() => location.reload(), 1500); }}>Check for update</button></div>
      <div className="tabs">{['overview', 'weeks', 'ear', 'videos', 'revision', 'settings'].map(t => <button key={t} className={`btn ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
      {msg && <div className="parent-note">{msg}</div>}

      {tab === 'overview' && <>
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <div className="stat">Streak (days counted)<b>{d.streak.count}</b><span className="small muted">last: {d.streak.lastDone || '–'}</span></div>
          <div className="stat">Sessions completed<b>{d.totals.sessions}</b></div>
          <div className="stat">Total minutes<b>{d.totals.minutes}</b></div>
          <div className="stat">Videos watched<b>{d.totals.videosWatched}</b></div>
          <div className="stat">"Try another way"<b>{d.switchPresses.length}</b></div>
        </div>
        <h2>Rules</h2>
        <div className="small muted">Use <b>Mark done</b> when she already knows a rule but its history isn't on this device. <b>Undo</b> puts it back into her lessons.</div>
        <table><thead><tr><th>Week</th><th>Rule</th><th>Dates</th><th>Sessions</th><th>Ways done</th><th>Transfer (week)</th><th>Rule breakers</th><th>Ear check</th><th>Sentence pick</th><th>Sentences written</th><th>Probe</th><th>Self-caught</th><th>Fully known</th></tr></thead><tbody>
          {d.weeks.map(w => <tr key={w.weekId + w.start}><td>{w.iteration > 1 ? `${w.weekId} (repeat)` : w.weekId}</td><td>{w.ruleName}</td><td>{w.start} → {w.end}</td><td>{w.sessionCount}</td><td>{w.waysDone.map(x => <span className="tag ok" key={x}>Way {x}</span>)}</td><td>{pct(w.weekTransfer)}</td><td>{pct(w.weekExceptions)}</td><td>{pct(w.weekEar)}</td><td>{pct(w.weekPick)}</td><td>{pct(w.weekSentences)}</td><td>{w.probes.map(p => <span key={p.date} className="tag">{p.correct}/{p.total}</span>)}</td><td>{w.selfCaught}</td><td>{w.fullyKnown === null ? '–' : <div className="col" style={{ alignItems: 'flex-start', gap: 4 }}>
            {w.fullyKnownBy === 'lessons' ? <span className="tag ok">yes</span> : w.fullyKnownBy === 'grown-up' ? <span className="tag ok">yes · marked by you</span> : w.fullyKnown ? <span className="tag ok">yes</span> : <span className="tag">not yet</span>}
            {w.fullyKnownBy === 'grown-up'
              ? <button className="btn secondary" onClick={async () => { await app.unmarkRuleDone(w.weekId, w.iteration); setMsg(`${w.ruleName}: mark removed. It is back in her lessons.`); reload(); }}>Undo</button>
              : w.fullyKnownBy !== 'lessons' && <button className="btn secondary" onClick={async () => { if (!confirm(`Mark ${w.ruleName} as done? Its lessons are skipped, it counts as fully known and she gets its badge. You can undo this.`)) return; await app.markRuleDone(w.weekId, w.iteration); setMsg(`${w.ruleName} marked done and fully known.`); reload(); }}>Mark done</button>}
          </div>}</td></tr>)}
        </tbody></table>
        {d.dateJumps.length > 0 && <div className="parent-note"><b>Date jumps detected:</b> {d.dateJumps.map(j => `${j.from} → ${j.to}`).join(', ')}. Records are keyed by date, so nothing was lost.</div>}
        <Repeats app={app} d={d} setMsg={setMsg} reload={reload} />
      </>}

      {tab === 'weeks' && <Repeats app={app} d={d} setMsg={setMsg} reload={reload} />}
      {tab === 'weeks' && d.weeks.map(w => (
        <div key={w.weekId + w.start} className="card" style={{ textAlign: 'left' }}>
          <h2>{w.ruleName} · {w.start} → {w.end} {w.repeat && <span className="tag">repeat</span>}</h2>
          <div className="small muted">Watch for: {app.content.weeks.find(x => x.rule_id === w.weekId)?.watch_for}</div>
          <table><thead><tr><th>Date</th><th>Type</th><th>Min</th><th>Counts</th><th>Ways</th><th>Switches</th><th>Taught</th><th>Transfer</th><th>Breakers</th><th>Ear</th><th>Pick</th><th>Sentences</th><th>Revision</th><th>Probe</th><th>Self-caught</th><th>Way words</th><th>Rule taps</th></tr></thead><tbody>
            {w.sessions.map(s => <tr key={s.id}><td>{s.date}{s.seq > 1 && <span className="small muted"> #{s.seq}</span>}</td><td>{s.dayType}{s.slot != null && <span className="small muted"> ({['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.slot]} lesson)</span>}{s.bonus && <span className="tag">bonus</span>}{s.redo && <span className="tag">redo · {s.redoPart}</span>}{s.ahead && <span className="tag">ahead</span>} <span className="small muted">{s.status}</span></td><td>{s.minutes}</td><td>{s.countsForStreak ? '✓' : '–'}</td><td>{s.ways.join(', ')}</td><td>{s.switches}</td><td>{pct(s.taught)}</td><td>{pct(s.transfer)}</td><td>{pct(s.exceptions)}</td><td>{pct(s.ear)}</td><td>{pct(s.pick)}</td><td>{pct(s.sentences)}</td><td>{s.revision.map(r => <span key={r.word} className={`tag ${r.mark ? 'ok' : r.mark === false ? 'no' : ''}`}>{r.word} ({r.ruleId})</span>)}</td><td>{s.probe ? `${s.probe.correct}/${s.probe.total}` : '–'}{s.probe?.byRule && Object.keys(s.probe.byRule).length > 1 && <div className="small">{Object.entries(s.probe.byRule).map(([r, v]) => `${r} ${v.correct}/${v.total}`).join(' · ')}</div>}</td><td>{s.selfCaught ?? '–'}</td><td>{s.wayWords.map(x => <span key={x.word} className={`tag ${x.mark ? 'ok' : x.mark === false ? 'no' : ''}`}>{x.word}</span>)}</td><td>{s.ruleTaps.map(t => <span key={t.word} className={`tag ${t.tapped === t.ruleId ? 'ok' : 'no'}`}>{t.word}: {t.tapped || '–'}</span>)}</td></tr>)}
            {w.sessions.length === 0 && <tr><td colSpan="17" className="muted">No sessions yet.</td></tr>}
          </tbody></table>
          <div style={{ marginTop: 10 }}>{w.repeat
            ? <button className="btn secondary" onClick={async () => { await app.unmarkRepeat(w.weekId, w.start); setMsg(`Repeat of ${w.ruleName} removed.`); reload(); }}>Remove this repeat</button>
            : <button className="btn secondary" onClick={async () => { const r = await app.markRepeat(w.weekId); setMsg(`${w.ruleName} will repeat ${r.startsNext ? 'next' : 'after the rule she is on now'}.`); reload(); }}>Repeat this week</button>}</div>
        </div>
      ))}

      {tab === 'ear' && <>
        <div className="small muted">Verbal-to-written checks: she hears the word or sentence (no text) and taps a spelling. Wrong taps show what she confuses.</div>
        <table><thead><tr><th>Date</th><th>Week</th><th>Heard</th><th>Type</th><th>Tapped</th><th>Right?</th></tr></thead><tbody>
          {d.weeks.flatMap(w => w.sessions.flatMap(s => [...s.earItems.map((e, i) => <tr key={s.id + 'e' + i}><td>{s.date}</td><td>{w.weekId}</td><td>{e.word}</td><td>{e.source === 'exception' ? 'rule breaker' : 'word'}</td><td>{e.chosen ?? '–'}</td><td>{e.chosen == null ? '–' : e.correct ? '✓' : <span className="tag no">✗</span>}</td></tr>),
            ...s.pickItems.map((e, i) => <tr key={s.id + 'p' + i}><td>{s.date}</td><td>{w.weekId}</td><td>{e.text}</td><td>sentence ({e.target})</td><td>{e.chosen ?? '–'}</td><td>{e.chosen == null ? '–' : e.correct ? '✓' : <span className="tag no">✗</span>}</td></tr>)]))}
        </tbody></table></>}
      {tab === 'videos' && <table><thead><tr><th>Date</th><th>Week</th><th>Video</th><th>Watched</th><th>Quiz taps</th></tr></thead><tbody>
        {d.weeks.flatMap(w => w.videos.map((v, i) => <tr key={w.weekId + i}><td>{v.date}</td><td>{w.weekId}</td><td>{v.title}</td><td>{v.watched ? '✓' : '–'}</td><td>{v.quizTaps.map((t, k) => <span key={k} className={`tag ${t.correct ? 'ok' : 'no'}`}>{t.q} → {t.chosen}</span>)}</td></tr>))}
      </tbody></table>}

      {tab === 'revision' && <table><thead><tr><th>Date</th><th>Type</th><th>Rule</th><th>Detail</th></tr></thead><tbody>
        {d.revisions.map((r, i) => <tr key={i}><td>{r.date}</td><td>{r.type}</td><td>{r.ruleId}</td><td>{r.word || r.replayDate || (r.words && r.words.map(w => `${w.word} ${w.mark ? '✓' : '✗'}`).join(', '))}</td></tr>)}
        {d.revisions.length === 0 && <tr><td colSpan="4" className="muted">Nothing served yet. Automatic revision starts in Week 2.</td></tr>}
      </tbody></table>}

      {tab === 'settings' && <Settings app={app} d={d} setMsg={setMsg} reload={reload} />}
    </div>
  );
}

function Repeats({ app, d, setMsg, reload }) {
  if (!d.repeats.length) return null;
  const name = id => app.content.weeks.find(w => w.rule_id === id)?.rule_name || id;
  return (
    <div className="card" style={{ textAlign: 'left' }}>
      <h2>Repeats planned</h2>
      {d.repeats.map(r => (
        <div key={r.ruleId + r.startDate} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
          <span><b>{name(r.ruleId)}</b> repeats{r.by === 'child' ? ' (Anya chose this)' : ''}; plan order slot {r.startDate}</span>
          <button className="btn secondary" onClick={async () => { await app.unmarkRepeat(r.ruleId, r.startDate); setMsg(`Repeat of ${name(r.ruleId)} removed.`); reload(); }}>Remove repeat</button>
        </div>
      ))}
    </div>
  );
}

function RulesPanel({ app, setMsg, reload }) {
  const [info, setInfo] = useState(null); const [, bump] = useState(0);
  const refresh = async () => { setInfo(await app.storageInfo()); bump(x => x + 1); reload(); };
  useEffect(() => { app.storageInfo().then(setInfo); }, []);
  if (!info) return null;
  const sched = app.schedule();
  const marked = new Set((app.profile.doneRules || []).map(r => `${r.ruleId}|${r.iteration || 1}`));
  return (
    <div className="card" style={{ textAlign: 'left' }}>
      <h2>Rules and progress</h2>
      <div className="small muted">Saved on this device: <b>{info.lessons}</b> lessons{info.first ? ` (${info.first} → ${info.last})` : ''}. Storage kept permanently: {info.persisted === true ? 'yes' : info.persisted === false ? 'not granted by the browser' : 'unknown'}.</div>
      <div className="small muted" style={{ margin: '6px 0 10px' }}>If her progress was lost, mark the rules she already finished as done, or tap <b>Start here</b> on the rule she should do next. Nothing she played is deleted.</div>
      <table><thead><tr><th>Rule</th><th>Status</th><th></th></tr></thead><tbody>
        {sched.map(e => { const key = `${e.weekId}|${e.iteration}`; const isMarked = marked.has(key); return (
          <tr key={key}><td>{e.week.emoji} {e.week.rule_name}{e.repeat && <span className="tag">repeat</span>}</td>
            <td>{isMarked ? <span className="tag ok">marked done</span> : <span className="small muted">by her lessons</span>}</td>
            <td><div className="row" style={{ justifyContent: 'flex-start', gap: 6 }}>
              {isMarked
                ? <button className="btn secondary" onClick={async () => { await app.unmarkRuleDone(e.weekId, e.iteration); setMsg(`${e.week.rule_name} is back in her lessons.`); refresh(); }}>Undo done</button>
                : <button className="btn secondary" onClick={async () => { await app.markRuleDone(e.weekId, e.iteration); setMsg(`${e.week.rule_name} marked done.`); refresh(); }}>Mark done</button>}
              <button className="btn secondary" onClick={async () => { const n = await app.startFromRule(e.weekId); setMsg(`Her next lesson: ${n ? n.weekEntry.week.rule_name : 'none left'}.`); refresh(); }}>Start here</button>
            </div></td></tr>); })}
      </tbody></table>
    </div>
  );
}

function Settings({ app, d, setMsg, reload }) {
  const [pin, setPin] = useState(''); const [url, setUrl] = useState(app.profile.settings.sheetUrl || ''); const [start, setStart] = useState(app.profile.startDate);
  const download = async (name, text, type) => {
    const blob = new Blob([text], { type }); const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch {} }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  };
  return (
    <div className="col" style={{ alignItems: 'stretch' }}>
      <div className="card" style={{ textAlign: 'left' }}><h2>PIN</h2><div className="row" style={{ justifyContent: 'flex-start' }}><input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="New 4-digit PIN" inputMode="numeric" style={{ width: 200 }} /><button className="btn secondary" disabled={pin.length !== 4} onClick={async () => { await app.setPin(pin); setPin(''); setMsg('PIN changed.'); }}>Save PIN</button></div></div>
      <div className="card" style={{ textAlign: 'left' }}><h2>Export</h2><div className="row" style={{ justifyContent: 'flex-start' }}>
        <button className="btn secondary" onClick={async () => download(`anya-spelling-${d.today}.json`, JSON.stringify(await app.exportJSON(), null, 1), 'application/json')}>Export JSON</button>
        <button className="btn secondary" onClick={async () => { const files = await app.exportCSV(); for (const [n, t] of Object.entries(files)) await download(`anya-${n}`, t, 'text/csv'); }}>Export CSV (6 files)</button>
      </div></div>
      <div className="card" style={{ textAlign: 'left' }}><h2>Google Sheet sync (optional)</h2>
        <div className="small muted">Paste the Apps Script web app URL (see apps-script/SETUP.md). The app works fully without it.</div>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
        <div className="row" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
          <button className="btn secondary" onClick={async () => { await app.saveProfile({ settings: { ...app.profile.settings, sheetUrl: url.trim() } }); setMsg('Sheet URL saved.'); }}>Save URL</button>
          <button className="btn secondary" disabled={!url} onClick={async () => { try { await app.saveProfile({ settings: { ...app.profile.settings, sheetUrl: url.trim() } }); await app.syncToSheet(); setMsg('Sent to the sheet. Check it in a few seconds.'); } catch (e) { setMsg('Sync failed: ' + e.message); } }}>Sync now</button>
          <span className="small muted">last sync: {app.profile.lastSync || 'never'}</span>
        </div></div>
      <div className="card" style={{ textAlign: 'left' }}><h2>Plan start date</h2><div className="small muted">Week 1 starts on this Monday; later weeks follow. Change it to shift the whole plan.</div>
        <div className="row" style={{ justifyContent: 'flex-start' }}><input type="date" value={start} onChange={e => setStart(e.target.value)} style={{ width: 220 }} /><button className="btn secondary" onClick={async () => { await app.saveProfile({ startDate: start }); setMsg('Start date saved.'); reload(); }}>Save</button></div>
      </div>
      <RulesPanel app={app} setMsg={setMsg} reload={reload} />
      <div className="card" style={{ textAlign: 'left' }}><h2>Restore from a backup</h2>
        <div className="small muted">Pick a JSON file saved with <b>Export JSON</b>. It replaces the lessons on this device; the PIN stays the same.</div>
        <label className="btn secondary" style={{ marginTop: 8 }}>Choose backup file<input type="file" accept="application/json,.json" hidden onChange={async ev => { const f = ev.target.files[0]; if (!f) return; try { const data = JSON.parse(await f.text()); if (!confirm(`Replace the progress on this device with the backup from ${data.exportedAt || 'this file'}?`)) return; const n = await app.importJSON(data); setMsg(`Restored ${n} lessons.`); reload(); } catch (e) { setMsg('Could not restore: ' + e.message); } ev.target.value = ''; }} /></label>
      </div>
      <div className="card" style={{ textAlign: 'left' }}><h2>Danger zone</h2><button className="btn secondary" onClick={async () => { if (confirm('Erase ALL of Anya\'s progress on this device? Export first!')) { for (const s of app.db.stores) await app.db.clear(s); location.reload(); } }}>Erase all data</button></div>
    </div>
  );
}
