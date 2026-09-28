/**
 * v8 — sharing.
 *  • sharePortfolio(): Web Share API where supported (phones, Safari, Edge),
 *    otherwise the in-portfolio Share sheet (Copy Link, Messages, Mail, Yahoo
 *    Mail, WhatsApp, Telegram, X, Facebook, LinkedIn, Threads).
 *  • deepLink(): shareable links that open a specific app / project, e.g.
 *    https://site/#/app/xcode?project=freshmart
 */
import { integrations, personal } from '../data/portfolio';
import type { AppId } from './types';

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

export function siteUrl(): string {
  if (integrations.siteUrl) return integrations.siteUrl.replace(/#.*$/, '');
  try {
    return window.location.href.replace(/#.*$/, '');
  } catch {
    return '';
  }
}

export function deepLink(app?: AppId, args?: Record<string, string>): string {
  const base = siteUrl();
  if (!app) return base;
  const q = args && Object.keys(args).length ? `?${new URLSearchParams(args).toString()}` : '';
  return `${base}#/app/${app}${q}`;
}

/** Parse "#/app/<id>?k=v" → { app, args } */
export function parseDeepLink(hash: string): { app: string; args: Record<string, string> } | null {
  const m = /^#\/app\/([a-z0-9-]+)(?:\?(.*))?$/i.exec(hash || '');
  if (!m) return null;
  const args: Record<string, string> = {};
  new URLSearchParams(m[2] ?? '').forEach((v, k) => (args[k] = v));
  return { app: m[1], args };
}

export const defaultShare = (): SharePayload => ({
  title: `${personal.name} — Portfolio`,
  text: `Check out ${personal.name}'s interactive macOS-style portfolio — ${personal.headline}.`,
  url: siteUrl(),
});

export interface ShareTarget {
  id: string;
  label: string;
  icon: string;
  href: (p: SharePayload) => string;
}

const enc = encodeURIComponent;
export const SHARE_TARGETS: ShareTarget[] = [
  { id: 'messages', label: 'Messages', icon: 'messages', href: (p) => `sms:?&body=${enc(`${p.text} ${p.url}`)}` },
  { id: 'mail', label: 'Mail', icon: 'mail', href: (p) => `mailto:?subject=${enc(p.title)}&body=${enc(`${p.text}\n\n${p.url}`)}` },
  { id: 'gmail', label: 'Gmail', icon: 'gmail', href: (p) => `https://mail.google.com/mail/?view=cm&fs=1&su=${enc(p.title)}&body=${enc(`${p.text}\n\n${p.url}`)}` },
  { id: 'yahoomail', label: 'Yahoo Mail', icon: 'yahoomail', href: (p) => `https://compose.mail.yahoo.com/?subject=${enc(p.title)}&body=${enc(`${p.text}\n\n${p.url}`)}` },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', href: (p) => `https://wa.me/?text=${enc(`${p.text} ${p.url}`)}` },
  { id: 'telegram', label: 'Telegram', icon: 'telegram', href: (p) => `https://t.me/share/url?url=${enc(p.url)}&text=${enc(p.text)}` },
  { id: 'x', label: 'X', icon: 'xapp', href: (p) => `https://twitter.com/intent/tweet?text=${enc(p.text)}&url=${enc(p.url)}` },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', href: (p) => `https://www.facebook.com/sharer/sharer.php?u=${enc(p.url)}` },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', href: (p) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(p.url)}` },
  { id: 'threads', label: 'Threads', icon: 'threads', href: (p) => `https://www.threads.net/intent/post?text=${enc(`${p.text} ${p.url}`)}` },
];

const EVT = 'mra-share-sheet';

/** Opens the native share sheet when available, otherwise the portfolio's own. */
export async function sharePortfolio(p: Partial<SharePayload> = {}, preferSheet = false): Promise<void> {
  const payload = { ...defaultShare(), ...p };
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
  if (!preferSheet && nav.share && (!nav.canShare || nav.canShare({ title: payload.title, text: payload.text, url: payload.url }))) {
    try {
      await nav.share({ title: payload.title, text: payload.text, url: payload.url });
      return;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return;
    }
  }
  window.dispatchEvent(new CustomEvent<SharePayload>(EVT, { detail: payload }));
}

export function onShareSheet(fn: (p: SharePayload) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<SharePayload>).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
