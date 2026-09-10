// Headless simulation: Week 1 Mon–Sun (with a "Try another way" switch and a missed Wednesday), then Week 2 Monday.
// Runs the real core against fake-indexeddb, re-opening the app every day to prove memory across days.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { openDB } from '../src/core/db.js';
import { createApp } from '../src/core/app.js';

const content = JSON.parse(readFileSync(new URL('../public/content/anya.json', import.meta.url)));
let clock = new Date(2026, 8, 7, 16, 0, 0); // Mon 7 Sep 2026, 4pm
const now = () => new Date(clock);
const minutes = m => { clock = new Date(clock.getTime() + m * 60000); };
const setDay = (y, m, d) => { clock = new Date(y, m - 1, d, 16, 0, 0); };
const db = await openDB(indexedDB);
const open = () => createApp({ db, content, now });
const log = (...a) => console.log(...a);

async function runDay({ way, doSwitch = false, hardstopBeforeCheck = false, wrong = [], selfCaught = 0, expectStreakBefore }) {
  const app = await open();
  const home = await app.getHome();
  log(`\n=== ${home.today} (${home.info.dayType}) streak before: ${home.streak.count} ${home.streak.state}; ${home.yesterday?.text || 'no yesterday'}`);
  if (expectStreakBefore) assert.equal(home.streak.state, expectStreakBefore, 'streak state before session');
  const s = await app.getSession();
  assert.ok(s, 'session exists');
  assert.equal(s.step, 'welcome');
  await s.tick(30000); await s.finishWelcome();
  if (s.day.dayType === 'learn') {
    assert.equal(s.day.learn.currentWay, way, 'default way');
    if (doSwitch) { await s.switchWay(); log(`  pressed "Try another way": ${way} -> ${s.day.learn.currentWay}`); }
    const w = s.day.learn.currentWay;
    await s.tick(6 * 60000); minutes(6);
    if (w === 2) {
      const v = await app.pickVideo(s.info.weekEntry, s.day.dayIdx);
      await app.recordVideo({ weekId: s.day.weekId, title: v.title, url: v.url, watched: true, quizTaps: v.quiz.map(q => ({ q: q.q, chosen: q.answer, correct: true })) });
      log(`  watched video: ${v.title}`);
    }
    await s.completeWay(w, { kind: ['lesson', 'quiz', 'boxes', 'game'][w - 1], ok: true }, w === 3 ? s.info.weekEntry.week.way3_words.map(x => x.word) : ['hill', 'miss']);
    log(`  Way ${w} done; way words: ${s.day.wayWords.map(x => x.word).join(', ')}`);
  }
  // reopen mid-day: must resume, not duplicate
  const app2 = await open(); const s2 = await app2.getSession();
  assert.equal(s2.day.startedAt, s.day.startedAt, 'reopen resumes same record');
  log(`  flow: ${s2.flow.join(' > ')}`);
  // Ear check (hears a word, taps a spelling): answer all but one correctly
  const ear = async () => { if (s2.step !== 'ear') return; for (let i = 0; i < s2.day.ear.length; i++) { const it = s2.day.ear[i]; await s2.answerEar(i, i === 1 ? it.options.find(o => o !== it.word) : it.word); await s2.tick(15000); } log(`  ear check: ${s2.day.ear.map(e => `${e.word}(${e.source[0]})${e.correct ? '✓' : '·'}`).join(' ')}`); await s2.advance(); };
  await ear();
  assert.equal(s2.step, 'write');
  log(`  words today: ${s2.day.words.map(x => `${x.word}[${x.source}${x.ruleId !== s2.day.weekId ? ':' + x.ruleId : ''}]`).join(', ')}`);
  for (let i = 0; i < s2.day.words.length; i++) { await s2.tick(hardstopBeforeCheck ? 2 * 60000 : 40000); minutes(0.7); if (s2.step !== 'write') break; await s2.nextWord(); }
  if (hardstopBeforeCheck) { assert.equal(s2.step, 'hardstop', 'hard stop fired at 15 min'); log('  HARD STOP at 15 minutes (mid-activity) -> "Done for today"'); }
  else {
    await ear();
    if (s2.step === 'pick') { for (let i = 0; i < s2.day.pick.length; i++) { const it = s2.day.pick[i]; await s2.answerPick(i, it.text); } log(`  which sentence?: ${s2.day.pick.map(p => `[${p.target}] ${p.correct ? '✓' : '·'}`).join(' ')}`); await s2.advance(); }
    if (s2.step === 'sentences') { log(`  write sentences: ${s2.day.sentences.map(x => x.sentence).join(' / ')}`); while (s2.step === 'sentences') { await s2.tick(60000); await s2.nextSentence(); } }
    assert.equal(s2.step, 'check'); await s2.tick(60000);
  }
  const marks = s2.checkList.map(x => !wrong.includes(x.word));
  await s2.parentCheck({ marks, selfCaught });
  assert.equal(s2.step, 'done');
  const st = await app2.streak();
  log(`  parent check done (${s2.day.parentCheck.correct}/${s2.day.parentCheck.total}, self-caught ${selfCaught}); minutes ${(s2.day.activeMs / 60000).toFixed(1)}; counts: ${s2.day.countsForStreak}; streak now ${st.count} ${st.state}`);
  const home2 = await app2.getHome();
  log(`  done screen preview -> ${home2.tomorrow.text}`);
  return s2.day;
}

// Week 1
setDay(2026, 9, 7); await runDay({ way: 1, selfCaught: 1 });                                        // Mon: Way 1
setDay(2026, 9, 8); await runDay({ way: 1, doSwitch: true, expectStreakBefore: 'active' });          // Tue: Way 1 -> switch to Way 2
setDay(2026, 9, 9); { const app = await open(); const h = await app.getHome(); log(`\n=== ${h.today} MISSED (no session opened) — streak ${h.streak.count} ${h.streak.state}`); }
setDay(2026, 9, 10); await runDay({ way: 3, wrong: ['dress'], expectStreakBefore: 'paused' });       // Thu: Way 3, streak paused, resumes
setDay(2026, 9, 11); await runDay({ way: 4, hardstopBeforeCheck: true, expectStreakBefore: 'active' }); // Fri: Way 4, hard stop
setDay(2026, 9, 12); { const d = await runDay({ way: null, wrong: ['jazz'], selfCaught: 2 }); assert.equal(d.dayType, 'probe'); assert.equal(d.probeScore.correct, 9); assert.equal(d.ear.length, 6); assert.equal(d.pick.length, 3); assert.equal(d.sentences.length, 2); assert.equal(d.parentCheck.total, 12, 'probe words + 2 sentences checked');
  const app = await open(); const recap = await app.weeklyRecap(app.info().weekEntry); log('  weekly recap:', JSON.stringify({ rule: recap.week.rule_name, days: recap.days, ways: recap.ways, videos: recap.videos, flowers: recap.flowers })); }
setDay(2026, 9, 13); { const app = await open(); const h = await app.getHome(); assert.equal(h.info.dayType, 'rest'); assert.equal(await app.getSession(), null); log(`\n=== ${h.today} Sunday rest day — streak ${h.streak.count} ${h.streak.state} (Sunday never counts as missed)`);
  assert.equal(h.info.bonus.weekEntry.weekId, 'FLOSS', 'Sunday bonus uses the week just finished');
  const b = await app.getSession(undefined, { bonus: true }); assert.ok(b && b.day.bonus, 'bonus session created'); assert.equal(b.day.dayType, 'learn');
  const again = await (await open()).getSession(); assert.equal(again.day.startedAt, b.day.startedAt, 'plain reopen resumes the bonus record');
  await b.tick(30000); await b.finishWelcome(); await b.tick(6 * 60000); await b.completeWay(1, { kind: 'ruletap', correct: true }, ['hill', 'miss']);
  while (b.step === 'write') { await b.tick(40000); await b.nextWord(); } await b.tick(60000); assert.equal(b.step, 'check'); await b.parentCheck({ marks: b.checkList.map(() => true), selfCaught: 0 });
  log(`  BONUS "Play anyway" session on Sunday: ${b.day.words.map(w => w.word).join(', ')} -> logged as bonus day (${b.day.weekId}), streak now ${(await app.streak()).count}`); }
// Week 2 Monday
setDay(2026, 9, 14); const w2 = await runDay({ way: 1, expectStreakBefore: 'active' });
assert.equal(w2.weekId, 'LONGV');
{ const days = await (await open()).days(); const thu = days.find(d => d.date === '2026-09-10'); assert.ok(thu.words.some(w => w.source === 'exception'), 'Wednesday onward includes a rule-breaker word'); assert.equal(thu.ear.length, 2, 'learn days from day 2 have a 2-item ear check'); }
const rev = w2.words.find(w => w.source === 'revision');
assert.ok(rev && rev.ruleId === 'FLOSS', 'Week 2 Monday draws one revision word from FLOSS');
log(`  revision word drawn: ${rev.word} (from ${rev.ruleId})`);

// Revision mode on Week 2 Monday
{
  const app = await open();
  const ql = await app.quickLook('2026-09-08');
  log(`  quick look 2026-09-08 -> rule ${ql.week.rule_name}, ways ${ql.ways}, videos ${ql.videos.map(v => v.title)}, words ${ql.words.map(w => w.word)}`);
  const old = await app.oldRules(); log(`  old rules shelf: ${old.map(e => e.weekId)}`);
  const mini = app.startOldRule('FLOSS');
  await app.finishOldRule({ ruleId: 'FLOSS', words: mini.words, marks: [true, true, false], selfCaught: 1, activeMs: 3 * 60000 });
  log(`  old-rule mini session FLOSS: ${mini.words.map(w => w.word)}`);
}

// ---- No lock: after finishing a lesson she can go straight on to the next one ----
{
  const app = await open();
  const nx = await app.peekNext();
  assert.equal(nx.weekEntry.weekId, 'LONGV'); assert.equal(nx.dayIdx, 1, 'next lesson after Week 2 Monday is the Tuesday lesson');
  const s = await app.getSession(undefined, { next: true });
  assert.equal(s.day.id, '2026-09-14#2'); assert.equal(s.day.seq, 2); assert.equal(s.day.dayIdx, 1); assert.ok(s.day.ahead, 'marked as played ahead of plan');
  assert.equal(s.day.learn.currentWay, 1, 'Tuesday lesson = Way 1 again');
  assert.notDeepEqual(s.day.words.map(w => w.word), (await app.getDay('2026-09-14')).words.map(w => w.word), 'second lesson gets different words');
  const re = await (await open()).getSession(); assert.equal(re.day.id, '2026-09-14#2', 'reopening resumes the second lesson, no duplicate');
  await s.tick(30000); await s.finishWelcome(); await s.tick(6 * 60000); await s.completeWay(1, { kind: 'ruletap', correct: true }, ['cake', 'boat']);
  if (s.step === 'ear') { for (let i = 0; i < s.day.ear.length; i++) await s.answerEar(i, s.day.ear[i].word); await s.advance(); }
  while (s.step === 'write') { await s.tick(40000); await s.nextWord(); } await s.tick(60000);
  await s.parentCheck({ marks: s.checkList.map(() => true), selfCaught: 0 });
  const st = await app.streak();
  assert.equal(st.count, 7, 'a second lesson on the same day does not add a second flower');
  const home = await app.getHome();
  assert.equal(home.lessonsToday, 2); assert.equal(home.next.dayIdx, 2, 'home now offers the Wednesday lesson');
  log(`\n=== 2026-09-14 SECOND LESSON (no lock): ${s.day.id} = ${s.day.weekId} ${['Mon','Tue','Wed','Thu','Fri','Sat'][s.day.dayIdx]} lesson, words ${s.day.words.map(w => w.word).join(', ')}; streak still ${st.count}; home offers next: ${home.next.text}; ${home.tomorrow.text}`);
}
{
  setDay(2026, 9, 15);
  const app = await open(); const h = await app.getHome();
  const t = await app.getSession();
  assert.equal(t.day.dayIdx, 2, 'Tuesday: the Tuesday lesson was already done, so she gets the Wednesday lesson');
  assert.equal(t.day.learn.currentWay, 2);
  log(`=== 2026-09-15 opens on the ${['Mon','Tue','Wed','Thu','Fri','Sat'][t.day.dayIdx]} lesson (Way ${t.day.learn.currentWay}) because Tuesday's was played ahead; streak ${h.streak.count} ${h.streak.state}`);
  setDay(2026, 9, 14);
}

const app = await open();
const dash = await app.dashboard();
const cal = await app.revisionCalendar();
assert.equal(dash.streak.count, 7, 'seven counted days (Wed missed, Sunday bonus)');
assert.equal(dash.switchPresses.length, 1);
assert.equal(dash.weeks[0].fullyKnown, true, 'FLOSS fully known: >=2 ways and probe >= 8');
assert.equal(cal.length, 8, 'seven days plus the extra Monday lesson');
assert.ok(dash.weeks[0].sessions.some(s => s.bonus && s.date === '2026-09-13'), 'bonus day listed under FLOSS in the dashboard');
console.log('\n================ PARENT DASHBOARD ================');
console.log(JSON.stringify(dash, null, 1));
console.log('\n================ REVISION CALENDAR ================');
console.log(JSON.stringify(cal, null, 1));
const csv = await app.exportCSV();
console.log('\n================ sessions.csv ================\n' + csv['sessions.csv']);
console.log('\nALL ASSERTIONS PASSED');
