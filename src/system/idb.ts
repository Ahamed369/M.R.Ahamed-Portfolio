/** v10 — a tiny IndexedDB key/value store (uploaded sounds, larger blobs). Falls back to memory. */
const mem = new Map<string, unknown>();
let dbp: Promise<IDBDatabase | null> | null = null;

function db(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open('mra-v10', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
  return dbp;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const d = await db();
  if (!d) return mem.get(key) as T | undefined;
  return new Promise((res) => {
    try {
      const q = d.transaction('kv').objectStore('kv').get(key);
      q.onsuccess = () => res(q.result as T | undefined);
      q.onerror = () => res(mem.get(key) as T | undefined);
    } catch {
      res(mem.get(key) as T | undefined);
    }
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  mem.set(key, value);
  const d = await db();
  if (!d) return;
  await new Promise<void>((res) => {
    try {
      const t = d.transaction('kv', 'readwrite');
      if (value === undefined) t.objectStore('kv').delete(key);
      else t.objectStore('kv').put(value, key);
      t.oncomplete = () => res();
      t.onerror = () => res();
    } catch {
      res();
    }
  });
}
