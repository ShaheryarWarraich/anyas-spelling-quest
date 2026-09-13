// Tiny promise wrapper over IndexedDB. `idb` may be injected (fake-indexeddb in tests).
const STORES = {
  profile: { keyPath: 'id' },
  sessions: { keyPath: 'id', indexes: [['date', 'date']] },
  videos: { keyPath: 'id', autoIncrement: true, indexes: [['date', 'date']] },
  revisions: { keyPath: 'id', autoIncrement: true, indexes: [['date', 'date']] },
  events: { keyPath: 'id', autoIncrement: true, indexes: [['date', 'date']] },
};
export function openDB(idb = globalThis.indexedDB, name = 'anya-spelling-quest') {
  return new Promise((resolve, reject) => {
    const req = idb.open(name, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [store, opt] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(store)) {
          const os = db.createObjectStore(store, { keyPath: opt.keyPath, autoIncrement: !!opt.autoIncrement });
          for (const [n, k] of opt.indexes || []) os.createIndex(n, k);
        }
      }
      // v1 kept one record per calendar day in `days`. The old store is never deleted: it stays as a backup,
      // and any record missing from `sessions` is copied across on every open (see healFromOldStore).
    };
    req.onsuccess = async () => { const w = wrap(req.result); try { await healFromOldStore(w); } catch (e) { console.warn('heal failed', e); } resolve(w); };
    req.onerror = () => reject(req.error);
  });
}
async function healFromOldStore(w) {
  if (!w.raw.objectStoreNames.contains('days')) return 0;
  const old = await new Promise((res, rej) => { const r = w.raw.transaction('days').objectStore('days').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  if (!old.length) return 0;
  const have = new Set((await w.all('sessions')).map(s => s.id));
  let n = 0;
  for (const d of old) { const id = d.id || d.date; if (!have.has(id)) { await w.put('sessions', { ...d, id, seq: d.seq || 1 }); n++; } }
  return n;
}
function wrap(raw) {
  const run = (store, mode, fn) => new Promise((resolve, reject) => {
    const tx = raw.transaction(store, mode);
    const r = fn(tx.objectStore(store));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return {
    raw,
    get: (s, k) => run(s, 'readonly', os => os.get(k)),
    put: (s, v) => run(s, 'readwrite', os => os.put(v)),
    add: (s, v) => run(s, 'readwrite', os => os.add(v)),
    del: (s, k) => run(s, 'readwrite', os => os.delete(k)),
    all: (s) => run(s, 'readonly', os => os.getAll()),
    clear: (s) => run(s, 'readwrite', os => os.clear()),
    stores: Object.keys(STORES), // `days` (v1 backup, if present) is deliberately not listed, so Erase leaves it alone
    async dump() { const out = {}; for (const s of Object.keys(STORES)) out[s] = await this.all(s); return out; },
  };
}
