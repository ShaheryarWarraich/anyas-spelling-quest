// Reproduces the reported problem: Anya finishes FLOSS (badge) on Thursday 10 Sep, before FLOSS's calendar week ends.
// The next lesson must be Long vowels at once, not blocked by dates. Also covers "Do a rule again".
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { openDB } from '../src/core/db.js';
import { createApp } from '../src/core/app.js';

const content = JSON.parse(readFileSync(new URL('../public/content/anya.json', import.meta.url)));
let clock = new Date(2026, 8, 7, 16, 0, 0);
const setDay = (y, m, d) => { clock = new Date(y, m - 1, d, 16, 0, 0); };
const db = await openDB(indexedDB, 'progress-test');
const open = () => createApp({ db, content, now: () => new Date(clock) });
const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Plays any session start to finish; `wrong` = words the grown-up marks ✗.
async function play(s, wrong = []) {
  await s.tick(30000); await s.finishWelcome();
  if (s.step === 'learn') { await s.tick(6 * 60000); await s.completeWay(s.day.learn.currentWay, { ok: true }, ['hill', 'miss']); }
  for (let guard = 0; guard < 50 && s.step !== 'check'; guard++) {
    if (s.step === 'ear') { for (let i = 0; i < s.day.ear.length; i++) await s.answerEar(i, s.day.ear[i].word); await s.advance(); }
    else if (s.step === 'pick') { for (let i = 0; i < s.day.pick.length; i++) await s.answerPick(i, s.day.pick[i].text); await s.advance(); }
    else if (s.step === 'sentences') { await s.tick(30000); await s.nextSentence(); }
    else if (s.step === 'write') { await s.tick(40000); await s.nextWord(); }
    else throw new Error('stuck at ' + s.step);
  }
  await s.tick(60000);
  await s.parentCheck({ marks: s.checkList.map(x => !wrong.includes(x.word)), selfCaught: 0 });
  return s.day;
}
const label = d => `${d.id} ${d.weekId} ${DAY[d.dayIdx] ?? '-'}${d.redo ? ' REDO ' + d.redoPart : ''}${d.ahead ? ' (ahead)' : ''}`;

// Mon 7 and Tue 8: normal lessons. Wed 9: missed.
setDay(2026, 9, 7); console.log('played', label(await play(await (await open()).getSession())));
setDay(2026, 9, 8); console.log('played', label(await play(await (await open()).getSession())));
// Thu 10: she carries on from where she left off (the Wed lesson, not skipped), then keeps going to the end of FLOSS.
setDay(2026, 9, 10);
let app = await open();
let s = await app.getSession();
assert.equal(s.day.weekId, 'FLOSS'); assert.equal(s.day.dayIdx, 2, 'missed Wednesday lesson is not lost: she continues with it');
console.log('played', label(await play(s)));
for (const want of [3, 4, 5]) { s = await app.getSession(undefined, { next: true }); assert.equal(s.day.dayIdx, want); console.log('played', label(await play(s, want === 5 ? ['jazz'] : []))); }
let home = await app.getHome();
assert.equal(home.fullyKnown.FLOSS, true, 'FLOSS badge earned on Thursday');
// THE BUG: next lesson must be Long vowels now, even though FLOSS's week (to Sat 12) and Long vowels' week (from Mon 14) say otherwise.
assert.ok(home.next, 'a next lesson is offered'); assert.equal(home.next.weekEntry.weekId, 'LONGV'); assert.equal(home.next.dayIdx, 0);
console.log(`\nThu 10 Sep after the FLOSS badge -> home offers: "${home.next.text}"`);
s = await app.getSession(undefined, { next: true });
assert.equal(s.day.weekId, 'LONGV', 'Long vowels starts on Thursday 10 Sep'); assert.ok(s.day.ahead);
console.log('started', label(s.day), '-> words:', s.day.words.map(w => w.word).join(', '));
assert.deepEqual((await app.oldRules()).map(e => e.weekId), ['FLOSS'], 'FLOSS is on the old-rules shelf without waiting for its calendar week to end');
await play(s);

// "Do a rule again" on the home screen
home = await app.getHome();
assert.deepEqual(home.redoRules.map(r => [r.ruleId, r.finished]), [['FLOSS', true], ['LONGV', false]]);
const parts = app.redoParts('FLOSS');
console.log('\nRedo menu for FLOSS:', parts.map(p => `${p.icon} ${p.label}`).join(' | '));
assert.deepEqual(parts.map(p => p.id), ['way1', 'way2-0', 'way2-1', 'way3', 'way4', 'probe']);
const nextBefore = (await app.peekNext()).dayIdx;
const r1 = await app.getSession(undefined, { redo: parts.find(p => p.id === 'way2-1') });
assert.ok(r1.day.redo); assert.equal(r1.day.weekId, 'FLOSS'); assert.equal(r1.day.learn.currentWay, 2); assert.equal(r1.day.videoUrl, content.weeks[0].way2_videos[1].url, 'redo plays the chosen video');
await play(r1);
const r2 = await app.getSession(undefined, { redo: parts.find(p => p.id === 'way3') });
assert.equal(r2.day.learn.currentWay, 3); await play(r2);
const r3 = await app.getSession(undefined, { redo: parts.find(p => p.id === 'probe') });
assert.equal(r3.day.dayType, 'probe'); await play(r3);
assert.equal((await app.peekNext()).dayIdx, nextBefore, 'redo lessons do not use up her plan lessons');
console.log('redo lessons played:', [r1, r2, r3].map(x => label(x.day)).join(' · '), '| plan still next:', (await app.peekNext()).text);
// Whole rule again while mid-Long-vowels: comes after Long vowels. Remove it, then move to between rules: comes next.
let q = await app.redoWholeRule('FLOSS');
assert.equal(q.startsNext, false);
let sched = app.schedule().map(e => e.weekId + (e.repeat ? '*' : ''));
assert.deepEqual(sched.slice(0, 4), ['FLOSS', 'LONGV', 'FLOSS*', 'BOSSYR'], 'whole-rule redo lands right after the rule she is on');
console.log('Whole FLOSS again (mid Long vowels) ->', sched.join(' > '));
await app.unmarkRepeat('FLOSS', q.startDate);
assert.deepEqual(app.schedule().map(e => e.weekId), content.weeks.map(w => w.rule_id), 'grown-up can remove it again');
// Parent repeat still works and is also placed by progress
q = await app.markRepeat('LONGV'); assert.equal(q.startsNext, false);
await app.unmarkRepeat('LONGV', q.startDate);
// Sunday: Play anyway uses the rule she is on
setDay(2026, 9, 13); app = await open(); home = await app.getHome();
assert.equal(home.bonusRule, 'Long vowels'); console.log('\nSun 13 Sep: Play anyway offers', home.bonusRule);
// Streak: one flower per day regardless of how many lessons
assert.equal((await app.streak()).count, 3, 'Mon, Tue, Thu = 3 flowers');
console.log('\nPROGRESS + REDO: ALL ASSERTIONS PASSED');
