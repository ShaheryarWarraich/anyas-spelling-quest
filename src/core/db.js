// Tiny promise wrapper over IndexedDB. `idb` may be injected (fake-indexeddb in tests).
const STORES = {
  profile: { keyPath: 'id' },
  days: { keyPath: 'date' },
  videos: { keyPath: 'id', autoIncrement: true, indexes: [['date', 'date']] },
  revisions: { keyPath: 'id', autoIncrement: true, indexes: [['date', 'date']] },
  events: { keyPath: 'id', autoIncrement: true, indexes: [['date', 'date']] },
};
export function openDB(idb = globalThis.indexedDB, name = 'anya-spelling-quest') {
  return new Promise((resolve, reject) => {
    const req = idb.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [store, opt] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(store)) {
          const os = db.createObjectStore(store, { keyPath: opt.keyPath, autoIncrement: !!opt.autoIncrement });
          for (const [n, k] of opt.indexes || []) os.createIndex(n, k);
        }
      }
    };
    req.onsuccess = () => resolve(wrap(req.result));
    req.onerror = () => reject(req.error);
  });
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
    stores: Object.keys(STORES),
    async dump() { const out = {}; for (const s of Object.keys(STORES)) out[s] = await this.all(s); return out; },
  };
}
