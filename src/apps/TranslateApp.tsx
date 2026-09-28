import { useEffect, useRef, useState } from 'react';
import type { AppProps } from '../components/Desktop';
import { usePersisted } from '../system/useStore';

/**
 * v9 — Translate. Uses the free MyMemory translation API (no key, no account).
 * If the network is unavailable, it says so instead of guessing.
 */
const LANGS: [string, string][] = [
  ['en', 'English'],
  ['si', 'Sinhala'],
  ['ta', 'Tamil'],
  ['ar', 'Arabic'],
  ['hi', 'Hindi'],
  ['fr', 'French'],
  ['de', 'German'],
  ['es', 'Spanish'],
  ['it', 'Italian'],
  ['pt', 'Portuguese'],
  ['ru', 'Russian'],
  ['zh-CN', 'Chinese (Simplified)'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['ms', 'Malay'],
];

export default function TranslateApp(_: AppProps) {
  const [from, setFrom] = usePersisted('mra-tr-from', 'en');
  const [to, setTo] = usePersisted('mra-tr-to', 'si');
  const [text, setText] = useState('Hello! Thank you for visiting my portfolio.');
  const [out, setOut] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [recent, setRecent] = usePersisted<{ a: string; b: string; f: string; t: string }[]>('mra-tr-recent', []);
  const timer = useRef(0);

  useEffect(() => {
    window.clearTimeout(timer.current);
    const q = text.trim();
    if (!q) {
      setOut('');
      setState('idle');
      return;
    }
    const ctrl = new AbortController();
    timer.current = window.setTimeout(() => {
      setState('loading');
      fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q.slice(0, 480))}&langpair=${from}|${to}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j: { responseData?: { translatedText?: string }; responseStatus?: number }) => {
          const t = j.responseData?.translatedText;
          if (!t || (j.responseStatus && j.responseStatus !== 200)) throw new Error('no result');
          setOut(t);
          setState('idle');
        })
        .catch((e: Error) => {
          if (e.name === 'AbortError') return;
          setState('error');
        });
    }, 450);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer.current);
    };
  }, [text, from, to]);

  const speak = (s: string, lang: string) => {
    if (!('speechSynthesis' in window) || !s) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(s);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  };
  const save = () => out && setRecent((r) => [{ a: text.trim(), b: out, f: from, t: to }, ...r.filter((x) => x.a !== text.trim())].slice(0, 12));
  const name = (c: string) => LANGS.find((l) => l[0] === c)?.[1] ?? c;

  return (
    <div className="trn">
      <div className="trn-langs">
        <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From language">
          {LANGS.map(([c, l]) => (
            <option key={c} value={c}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="trn-swap"
          aria-label="Swap languages"
          onClick={() => {
            setFrom(to);
            setTo(from);
            if (out) setText(out);
          }}
        >
          ⇄
        </button>
        <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="To language">
          {LANGS.map(([c, l]) => (
            <option key={c} value={c}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="trn-panes">
        <div className="trn-pane">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={480} placeholder="Enter text" aria-label="Text to translate" />
          <div className="trn-tools">
            <button type="button" onClick={() => speak(text, from)} aria-label="Listen">
              🔊
            </button>
            <button type="button" onClick={() => setText('')} aria-label="Clear">
              ✕
            </button>
            <small>{text.length}/480</small>
          </div>
        </div>
        <div className="trn-pane out" aria-live="polite">
          <div className="trn-out">{state === 'loading' && !out ? 'Translating…' : state === 'error' ? 'Translation isn’t available right now — check your internet connection and try again.' : out || <span className="trn-ph">Translation</span>}</div>
          <div className="trn-tools">
            <button type="button" onClick={() => speak(out, to)} aria-label="Listen to translation" disabled={!out}>
              🔊
            </button>
            <button type="button" onClick={() => out && void navigator.clipboard?.writeText(out).catch(() => undefined)} aria-label="Copy translation" disabled={!out}>
              ⧉
            </button>
            <button type="button" onClick={save} aria-label="Save to recents" disabled={!out}>
              ☆
            </button>
            <small>{state === 'loading' ? '…' : name(to)}</small>
          </div>
        </div>
      </div>
      {recent.length > 0 && (
        <div className="trn-recent">
          <h4>Saved</h4>
          {recent.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setFrom(r.f);
                setTo(r.t);
                setText(r.a);
              }}
            >
              <b>{r.a}</b>
              <span>{r.b}</span>
              <small>
                {name(r.f)} → {name(r.t)}
              </small>
            </button>
          ))}
        </div>
      )}
      <p className="trn-foot">Translations by MyMemory (translated.net). Text is sent to their service only when you type.</p>
    </div>
  );
}
