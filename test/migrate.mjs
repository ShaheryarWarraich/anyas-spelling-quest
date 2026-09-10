// Proves a device holding v1 data (one record per day in a `days` store) upgrades to v2 without losing anything.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { openDB } from '../src/core/db.js';

const NAME = 'migrate-test';
await new Promise((resolve, reject) => {
  const req = indexedDB.open(NAME, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    db.createObjectStore('profile', { keyPath: 'id' });
    db.createObjectStore('days', { keyPath: 'date' });
    for (const s of ['videos', 'revisions', 'events']) db.createObjectStore(s, { keyPath: 'id', autoIncrement: true }).createIndex('date', 'date');
  };
  req.onsuccess = () => {
    const tx = req.result.transaction(['days', 'profile'], 'readwrite');
    tx.objectStore('profile').put({ id: 'anya', startDate: '2026-09-07' });
    tx.objectStore('days').put({ date: '2026-09-07', weekId: 'FLOSS', weekIteration: 1, dayIdx: 0, status: 'complete', countsForStreak: true, words: [{ word: 'bell' }] });
    tx.objectStore('days').put({ date: '2026-09-08', weekId: 'FLOSS', weekIteration: 1, dayIdx: 1, status: 'complete', countsForStreak: true, words: [{ word: 'kiss' }] });
    tx.oncomplete = () => { req.result.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  };
  req.onerror = () => reject(req.error);
});

const db = await openDB(indexedDB, NAME);
const sessions = await db.all('sessions');
assert.equal(db.raw.version, 2);
assert.ok(!db.raw.objectStoreNames.contains('days'), 'old store removed');
assert.deepEqual(sessions.map(s => [s.id, s.seq, s.date, s.words[0].word]), [['2026-09-07', 1, '2026-09-07', 'bell'], ['2026-09-08', 1, '2026-09-08', 'kiss']]);
assert.equal((await db.get('profile', 'anya')).startDate, '2026-09-07', 'other stores untouched');
console.log('MIGRATION v1 -> v2 OK:', sessions.map(s => s.id).join(', '));
