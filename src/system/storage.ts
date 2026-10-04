/** Safe localStorage helpers — storage may be unavailable (private mode, sandboxed iframes). */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

type WriteHook = (key: string, prevRaw: string | null, nextRaw: string) => void;
let hook: WriteHook | null = null;
/** v10 — lets the undo history / Recently Deleted watch visitor-content writes */
export function setWriteHook(h: WriteHook | null) {
  hook = h;
}

export function writeStore(key: string, value: unknown): void {
  try {
    const next = JSON.stringify(value);
    if (hook) {
      let prev: string | null = null;
      try {
        prev = window.localStorage.getItem(key);
      } catch {
        prev = null;
      }
      if (prev !== next) hook(key, prev, next);
    }
    window.localStorage.setItem(key, next);
  } catch {
    /* storage unavailable — settings stay in memory */
  }
}
