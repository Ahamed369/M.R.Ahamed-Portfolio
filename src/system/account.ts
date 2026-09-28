/**
 * v8 — visitor account used before protected actions ("Get", "Install",
 * "Upload", "Download" in App Store, Google Drive, Google Photos, Google Play).
 *
 *  • Portfolio ID — a local demo account (just a display name, no password).
 *  • Sign in with Google — Google Identity Services, only when
 *    integrations.googleClientId is set. The portfolio receives the ID token
 *    Google returns (name, email, picture) and never sees a password.
 * Everything stays in this browser (localStorage).
 */
import { useEffect, useState } from 'react';
import { readStore, writeStore } from './storage';
import { notify } from './notify';

export interface Account {
  kind: 'portfolio' | 'google';
  name: string;
  email?: string;
  picture?: string;
  since: number;
}

const KEY = 'mra-account-v8';
const EVT = 'mra-account-change';
const ASK = 'mra-signin-request';

let cache: Account | null | undefined;
export function getAccount(): Account | null {
  if (cache === undefined) cache = readStore<{ a: Account | null }>(KEY, { a: null }).a;
  return cache;
}

export function setAccount(a: Account | null): void {
  cache = a;
  writeStore(KEY, { a });
  window.dispatchEvent(new Event(EVT));
  if (a) notify({ app: a.kind === 'google' ? 'Google' : 'Portfolio ID', icon: a.kind === 'google' ? 'google' : 'contacts', title: `Signed in as ${a.name}`, body: a.email ?? 'Demo account — stored only in this browser.' });
  else notify({ app: 'Portfolio ID', icon: 'contacts', title: 'Signed out' });
}

export function useAccount(): Account | null {
  const [a, setA] = useState(getAccount);
  useEffect(() => {
    const on = () => setA(getAccount());
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return a;
}

export interface SignInRequest {
  reason: string;
  resolve: (ok: boolean) => void;
}

/** Resolves true when the visitor is (or becomes) signed in. */
export function requireSignIn(reason: string): Promise<boolean> {
  if (getAccount()) return Promise.resolve(true);
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent<SignInRequest>(ASK, { detail: { reason, resolve } })));
}

export function onSignInRequest(fn: (r: SignInRequest) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<SignInRequest>).detail);
  window.addEventListener(ASK, h);
  return () => window.removeEventListener(ASK, h);
}

/** Decode the payload of a Google ID token (JWT) — display only, no verification needed client-side. */
export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    const json = decodeURIComponent(
      atob(part.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* ── Google Identity Services loader ── */
interface GsiWindow {
  google?: {
    accounts?: {
      id?: {
        initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; auto_select?: boolean; ux_mode?: string }) => void;
        renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
        disableAutoSelect?: () => void;
      };
    };
  };
}
let gsiPromise: Promise<boolean> | null = null;
export function loadGsi(): Promise<boolean> {
  if ((window as unknown as GsiWindow).google?.accounts?.id) return Promise.resolve(true);
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((res) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => res(!!(window as unknown as GsiWindow).google?.accounts?.id);
    s.onerror = () => {
      gsiPromise = null;
      res(false);
    };
    document.head.appendChild(s);
  });
  return gsiPromise;
}

export function renderGoogleButton(el: HTMLElement, clientId: string, onDone: (a: Account) => void): void {
  const id = (window as unknown as GsiWindow).google?.accounts?.id;
  if (!id) return;
  id.initialize({
    client_id: clientId,
    callback: (r) => {
      const p = decodeJwt(r.credential);
      if (!p) return;
      onDone({ kind: 'google', name: String(p.name ?? p.email ?? 'Google user'), email: p.email ? String(p.email) : undefined, picture: p.picture ? String(p.picture) : undefined, since: Date.now() });
    },
  });
  id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', logo_alignment: 'left', width: 280 });
}
