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
  assert.equal(s2.step, 'write');
  log(`  words today: ${s2.day.words.map(x => `${x.word}[${x.source}${x.ruleId !== s2.day.weekId ? ':' + x.ruleId : ''}]`).join(', ')}`);
  for (let i = 0; i < s2.day.words.length; i++) { await s2.tick(hardstopBeforeCheck ? 2 * 60000 : 40000); minutes(0.7); if (s2.step !== 'write') break; await s2.nextWord(); }
  if (hardstopBeforeCheck) { assert.equal(s2.step, 'hardstop', 'hard stop fired at 15 min'); log('  HARD STOP at 15 minutes (mid-activity) -> "Done for today"'); }
  else { assert.equal(s2.step, 'check'); await s2.tick(60000); }
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
setDay(2026, 9, 12); { const d = await runDay({ way: null, wrong: ['jazz'], selfCaught: 2 }); assert.equal(d.dayType, 'probe'); assert.equal(d.probeScore.correct, 9);
  const app = await open(); const recap = await app.weeklyRecap(app.info().weekEntry); log('  weekly recap:', JSON.stringify({ rule: recap.week.rule_name, days: recap.days, ways: recap.ways, videos: recap.videos, flowers: recap.flowers })); }
setDay(2026, 9, 13); { const app = await open(); const h = await app.getHome(); assert.equal(h.info.dayType, 'rest'); assert.equal(await app.getSession(), null); log(`\n=== ${h.today} Sunday rest day — streak ${h.streak.count} ${h.streak.state} (Sunday never counts as missed)`); }
// Week 2 Monday
setDay(2026, 9, 14); const w2 = await runDay({ way: 1, expectStreakBefore: 'active' });
assert.equal(w2.weekId, 'LONGV');
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

const app = await open();
const dash = await app.dashboard();
const cal = await app.revisionCalendar();
assert.equal(dash.streak.count, 6, 'six counted days (Wed missed, Sunday rest)');
assert.equal(dash.switchPresses.length, 1);
assert.equal(dash.weeks[0].fullyKnown, true, 'FLOSS fully known: >=2 ways and probe >= 8');
assert.equal(cal.length, 6);
console.log('\n================ PARENT DASHBOARD ================');
console.log(JSON.stringify(dash, null, 1));
console.log('\n================ REVISION CALENDAR ================');
console.log(JSON.stringify(cal, null, 1));
const csv = await app.exportCSV();
console.log('\n================ sessions.csv ================\n' + csv['sessions.csv']);
console.log('\nALL ASSERTIONS PASSED');
