/**
 * v8 — "Install this portfolio" (Progressive Web App).
 * Captures the browser's beforeinstallprompt event so the Google Play
 * library and the Terminal can offer a real install button.
 */
import { useEffect, useState } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferred: BIPEvent | null = null;
let installed = false;
const EVT = 'mra-pwa-change';

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    window.dispatchEvent(new Event(EVT));
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    window.dispatchEvent(new Event(EVT));
  });
  try {
    installed = window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    /* ignore */
  }
}

export async function installPwa(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  await deferred.prompt();
  const c = await deferred.userChoice;
  deferred = null;
  window.dispatchEvent(new Event(EVT));
  return c.outcome;
}

export function usePwaInstall() {
  const [s, set] = useState({ available: !!deferred, installed });
  useEffect(() => {
    const on = () => set({ available: !!deferred, installed });
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return s;
}
