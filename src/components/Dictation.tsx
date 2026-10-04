import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../system/SettingsContext';
import { CCIcon } from './ios/CCIcons';

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type RecCtor = new () => Rec;

const ctor = (): RecCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const editable = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLElement => {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.closest('[data-nodictation]')) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) return ['text', 'search', 'email', 'url', ''].includes(el.type) && !el.readOnly && !el.disabled;
  return el.isContentEditable;
};

/**
 * v10.1 — Dictation. When a text field has focus a small 🎤 button appears
 * next to it; tap it and speak — the words are typed into the field using the
 * browser's own speech recognition (nothing is sent anywhere by this site).
 */
export function Dictation() {
  const { settings } = useSettings();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [err, setErr] = useState('');
  const rec = useRef<Rec | null>(null);
  const supported = !!ctor();
  const on = settings.dictation !== false && supported;

  useEffect(() => {
    if (!on) return;
    const fin = (e: FocusEvent) => {
      const el = e.target as Element;
      if (editable(el)) {
        setTarget(el as HTMLElement);
        setRect((el as HTMLElement).getBoundingClientRect());
      }
    };
    const fout = () =>
      window.setTimeout(() => {
        const a = document.activeElement;
        if (!editable(a) && !rec.current) setTarget(null);
      }, 120);
    document.addEventListener('focusin', fin);
    document.addEventListener('focusout', fout);
    return () => {
      document.removeEventListener('focusin', fin);
      document.removeEventListener('focusout', fout);
    };
  }, [on]);

  // make room for the button inside the field
  useEffect(() => {
    if (!on || !target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    const prev = target.style.paddingRight;
    const cur = parseFloat(getComputedStyle(target).paddingRight) || 0;
    if (cur < 30) target.style.paddingRight = '32px';
    return () => {
      target.style.paddingRight = prev;
    };
  }, [on, target]);

  // keep the button next to the field while things scroll or resize
  useEffect(() => {
    if (!target) return;
    let raf = 0;
    const loop = () => {
      if (!target.isConnected) return setTarget(null);
      const r = target.getBoundingClientRect();
      setRect((o) => (o && o.top === r.top && o.right === r.right && o.bottom === r.bottom ? o : r));
      raf = window.setTimeout(loop, 250);
    };
    loop();
    return () => window.clearTimeout(raf);
  }, [target]);

  const stop = () => {
    rec.current?.stop();
  };
  const start = () => {
    const C = ctor();
    if (!C || !target) return;
    const r = new C();
    r.lang = settings.language === 'si' ? 'si-LK' : settings.language === 'ta' ? 'ta-LK' : navigator.language || 'en-GB';
    r.interimResults = true;
    r.continuous = false;
    setErr('');
    r.onresult = (e) => {
      let txt = '';
      let fin = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += res[0].transcript;
        else txt += res[0].transcript;
      }
      setInterim(txt);
      if (fin.trim()) {
        target.focus();
        const ok = document.execCommand('insertText', false, `${fin.trim()} `);
        if (!ok && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
          const proto = target instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          setter?.call(target, `${target.value}${fin.trim()} `);
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };
    r.onerror = (e) => setErr(e.error === 'not-allowed' ? 'Microphone access was not allowed.' : e.error === 'no-speech' ? 'Didn’t catch that — try again.' : 'Dictation isn’t available right now.');
    r.onend = () => {
      rec.current = null;
      setListening(false);
      setInterim('');
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      rec.current = null;
    }
  };

  if (!on || !target || !rect || rect.width < 120 || rect.height < 20) return null;
  // v10.2 — inside the field's right end (the field gets matching right padding), so it never
  // overhangs a rounded search box or gets clipped by the window edge
  const tall = target instanceof HTMLTextAreaElement || target.isContentEditable || rect.height > 48;
  const size = Math.max(22, Math.min(28, rect.height - 6));
  const top = tall ? rect.bottom - size - 6 : rect.top + (rect.height - size) / 2;
  const left = rect.right - size - 4;
  return (
    <>
      <button
        type="button"
        className={`dict-btn ${listening ? 'on' : ''}`}
        style={{ top, left, width: size, height: size }}
        aria-label={listening ? 'Stop dictation' : 'Dictate'}
        title={listening ? 'Stop dictation' : 'Dictate'}
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (listening ? stop() : start())}
      >
        <CCIcon n="mic" size={Math.round(size * 0.6)} />
      </button>
      {(listening || err) && (
        <div className="dict-pill" style={{ top: Math.max(4, rect.top - 34), left: Math.max(4, Math.min(window.innerWidth - 264, rect.left)) }} aria-live="polite">
          {listening ? (
            <>
              <i className="dict-wave" aria-hidden="true">
                <span />
                <span />
                <span />
              </i>
              {interim || 'Listening…'}
            </>
          ) : (
            err
          )}
        </div>
      )}
    </>
  );
}
