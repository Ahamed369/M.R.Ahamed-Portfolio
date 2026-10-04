import { useContext, useEffect, useRef, useState } from 'react';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { IOS } from './ios/ctx';

/**
 * v10.3 — tiny first-time hints. Each one appears once (flag kept in this
 * browser), hides by itself after a few seconds or at the first touch / click,
 * never blocks anything (pointer-events: none) and is never shown again.
 *   • iPhone / iPad Home Screen: "Swipe for more pages" chevron by the page dots
 *   • iPhone Home Screen: "Pull down here for Control Centre" at the top-right corner
 *   • Mac desktop: "Right-click the desktop to edit widgets", after the first idle minute
 * Mounted by <Onboarding>, which pauses them while the welcome guide is open.
 */
type Hint = 'pages' | 'cc' | 'macWidgets';
const KEY = 'mra-hints-v103';
const seen = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
};
const markSeen = (h: Hint) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...seen(), [h]: Date.now() }));
  } catch {
    /* ignore */
  }
};

const TXT: Record<Hint, Record<'en' | 'si' | 'ta', string>> = {
  pages: { en: 'Swipe for more pages', si: 'තවත් පිටු සඳහා swipe කරන්න', ta: 'மேலும் பக்கங்களுக்கு swipe செய்யுங்கள்' },
  cc: { en: 'Pull down here for Control Centre', si: 'Control Centre සඳහා මෙතැනින් පහළට අදින්න', ta: 'Control Centre-க்கு இங்கிருந்து கீழே இழுக்கவும்' },
  macWidgets: { en: 'Right-click the desktop to edit widgets', si: 'Widgets සංස්කරණයට desktop එක මත right-click කරන්න', ta: 'Widgets-ஐத் திருத்த desktop-இல் right-click செய்யுங்கள்' },
};
const SHOW_MS = 4200;

export function FirstHints({ device, paused }: { device: 'mac' | 'ipad' | 'iphone'; paused: boolean }) {
  const sys = useSystem();
  const { settings } = useSettings();
  const ios = useContext(IOS);
  const lang = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const [hint, setHint] = useState<{ h: Hint; x?: number; y?: number } | null>(null);
  const hintRef = useRef(hint);
  hintRef.current = hint;
  const ready = sys.phase === 'ready' && !sys.locked && !sys.asleep && !paused;
  const onHome = !!ios && ios.current === null && ios.panel === 'none' && !ios.edit;

  // hide on the first interaction or after a few seconds
  useEffect(() => {
    if (!hint) return;
    const hide = () => setHint(null);
    const t = window.setTimeout(hide, hint.h === 'macWidgets' ? SHOW_MS + 1800 : SHOW_MS);
    const arm = window.setTimeout(() => {
      window.addEventListener('pointerdown', hide, true);
      window.addEventListener('keydown', hide, true);
      window.addEventListener('wheel', hide, true);
    }, 250);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(arm);
      window.removeEventListener('pointerdown', hide, true);
      window.removeEventListener('keydown', hide, true);
      window.removeEventListener('wheel', hide, true);
    };
  }, [hint]);

  // iPhone / iPad Home Screen hints (one after the other)
  useEffect(() => {
    if (device === 'mac' || !ready || !onHome || hintRef.current) return;
    const s = seen();
    const next: Hint | null = !s.pages ? 'pages' : device === 'iphone' && !s.cc ? 'cc' : null;
    if (!next) return;
    const t = window.setInterval(() => {
      if (hintRef.current) return;
      // wait until no notification banner is on screen
      if (document.querySelector('.nf-banner-wrap, .ob-back')) return;
      const shell = document.querySelector<HTMLElement>('.ios-shell');
      if (!shell) return;
      const sr = shell.getBoundingClientRect();
      const k = shell.offsetWidth ? sr.width / shell.offsetWidth : 1;
      if (next === 'pages') {
        const dots = document.querySelector<HTMLElement>('.ios-dots');
        const dr = dots?.getBoundingClientRect();
        // only worth a hint when there is more than one page
        if (dots && dots.children.length < 2) return void (markSeen('pages'), window.clearInterval(t));
        const y = dr && dr.height ? (dr.top - sr.top) / k : shell.offsetHeight - 150;
        markSeen('pages');
        setHint({ h: 'pages', y });
      } else {
        markSeen('cc');
        setHint({ h: 'cc' });
      }
      window.clearInterval(t);
    }, 1400);
    return () => window.clearInterval(t);
  }, [device, ready, onHome, hint]);

  // Mac: after the first idle minute on the desktop
  useEffect(() => {
    if (device !== 'mac' || !ready || seen().macWidgets) return;
    let t = 0;
    const arm = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (seen().macWidgets || document.querySelector('.ob-back')) return;
        markSeen('macWidgets');
        setHint({ h: 'macWidgets' });
      }, 60000);
    };
    arm();
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    evs.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    return () => {
      window.clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [device, ready]);

  // leaving the Home Screen hides an iOS hint at once
  useEffect(() => {
    if (hintRef.current && hintRef.current.h !== 'macWidgets' && !onHome) setHint(null);
  }, [onHome]);

  if (!hint) return null;
  const calm = settings.reduceMotion ? ' fh-calm' : '';
  const text = TXT[hint.h][lang];
  if (hint.h === 'pages')
    return (
      <div className={`fh fh-pages${calm}`} style={{ top: Math.max(60, (hint.y ?? 0) - 40) }} role="status" lang={lang}>
        <span>{text}</span>
        <svg viewBox="0 0 24 12" aria-hidden="true">
          <path d="M3 6h16M14 1.5 19 6l-5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  if (hint.h === 'cc')
    return (
      <div className={`fh fh-cc${calm}`} role="status" lang={lang}>
        <svg viewBox="0 0 12 24" aria-hidden="true">
          <path d="M6 3v16M1.5 14 6 19l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{text}</span>
      </div>
    );
  return (
    <div className={`fh fh-mac${calm}`} role="status" lang={lang}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2.5" y="2.5" width="11" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 2.5v5.5h5.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span>{text}</span>
    </div>
  );
}
