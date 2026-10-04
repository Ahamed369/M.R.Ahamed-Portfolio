import { useEffect, useRef, useState } from 'react';
import type { AppProps } from '../components/Desktop';
import { usePersisted } from '../system/useStore';
import { useSettings } from '../system/SettingsContext';

/**
 * v10.3 — Translate. Uses the free MyMemory translation API (no key, no account).
 * If the network is unavailable, it says so instead of guessing.
 *
 * Each language has: the MyMemory code (ISO 639-1, or zh-CN), the BCP-47 tag
 * used for speech, an English name, its native name and its text direction.
 */
interface Lang {
  code: string; // MyMemory langpair code
  tts: string; // BCP-47 tag for speechSynthesis
  name: string;
  native: string;
  rtl?: boolean;
}
const LANGS: Lang[] = [
  { code: 'en', tts: 'en-US', name: 'English', native: 'English' },
  { code: 'si', tts: 'si-LK', name: 'Sinhala', native: 'සිංහල' },
  { code: 'ta', tts: 'ta-IN', name: 'Tamil', native: 'தமிழ்' },
  { code: 'ar', tts: 'ar-SA', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'ur', tts: 'ur-PK', name: 'Urdu', native: 'اردو', rtl: true },
  { code: 'hi', tts: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
  { code: 'fr', tts: 'fr-FR', name: 'French', native: 'Français' },
  { code: 'de', tts: 'de-DE', name: 'German', native: 'Deutsch' },
  { code: 'es', tts: 'es-ES', name: 'Spanish', native: 'Español' },
  { code: 'it', tts: 'it-IT', name: 'Italian', native: 'Italiano' },
  { code: 'pt', tts: 'pt-PT', name: 'Portuguese', native: 'Português' },
  { code: 'ru', tts: 'ru-RU', name: 'Russian', native: 'Русский' },
  { code: 'tr', tts: 'tr-TR', name: 'Turkish', native: 'Türkçe' },
  { code: 'zh-CN', tts: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'ja', tts: 'ja-JP', name: 'Japanese', native: '日本語' },
  { code: 'ko', tts: 'ko-KR', name: 'Korean', native: '한국어' },
  { code: 'ms', tts: 'ms-MY', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'id', tts: 'id-ID', name: 'Indonesian', native: 'Bahasa Indonesia' },
];
const langOf = (c: string) => LANGS.find((l) => l.code === c);
const label = (l: Lang) => (l.name === l.native ? l.name : `${l.name} — ${l.native}`);
const dirOf = (c: string): 'rtl' | 'ltr' => (langOf(c)?.rtl ? 'rtl' : 'ltr');

type Lng = 'en' | 'si' | 'ta';
const L = {
  from: { en: 'From language', si: 'මූලාශ්‍ර භාෂාව', ta: 'மூல மொழி' },
  to: { en: 'To language', si: 'ඉලක්ක භාෂාව', ta: 'இலக்கு மொழி' },
  swap: { en: 'Swap languages', si: 'භාෂා මාරු කරන්න', ta: 'மொழிகளை மாற்று' },
  enter: { en: 'Enter text', si: 'පෙළ ඇතුළත් කරන්න', ta: 'உரையை உள்ளிடவும்' },
  textAria: { en: 'Text to translate', si: 'පරිවර්තනය කළ යුතු පෙළ', ta: 'மொழிபெயர்க்க வேண்டிய உரை' },
  listen: { en: 'Listen', si: 'අසන්න', ta: 'கேளுங்கள்' },
  stop: { en: 'Stop', si: 'නවත්වන්න', ta: 'நிறுத்து' },
  clear: { en: 'Clear', si: 'මකන්න', ta: 'அழி' },
  copy: { en: 'Copy translation', si: 'පරිවර්තනය පිටපත් කරන්න', ta: 'மொழிபெயர்ப்பை நகலெடு' },
  copied: { en: 'Copied', si: 'පිටපත් විය', ta: 'நகலெடுக்கப்பட்டது' },
  copyFail: { en: 'Couldn’t copy — select the text and copy it manually.', si: 'පිටපත් කළ නොහැකි විය — පෙළ තෝරා අතින් පිටපත් කරන්න.', ta: 'நகலெடுக்க முடியவில்லை — உரையைத் தேர்ந்தெடுத்து கைமுறையாக நகலெடுக்கவும்.' },
  save: { en: 'Save to recents', si: 'සුරකින්න', ta: 'சேமி' },
  savedOk: { en: 'Saved', si: 'සුරැකිණි', ta: 'சேமிக்கப்பட்டது' },
  saved: { en: 'Saved', si: 'සුරැකි', ta: 'சேமித்தவை' },
  clearSaved: { en: 'Clear all', si: 'සියල්ල මකන්න', ta: 'அனைத்தையும் அழி' },
  translation: { en: 'Translation', si: 'පරිවර්තනය', ta: 'மொழிபெயர்ப்பு' },
  translating: { en: 'Translating…', si: 'පරිවර්තනය වෙමින්…', ta: 'மொழிபெயர்க்கப்படுகிறது…' },
  offline: { en: 'You’re offline. Translation needs an internet connection — nothing was translated.', si: 'ඔබ අන්තර්ජාලයට සම්බන්ධ නැත. පරිවර්තනයට අන්තර්ජාලය අවශ්‍යයි — කිසිවක් පරිවර්තනය නොවීය.', ta: 'நீங்கள் இணைப்பில் இல்லை. மொழிபெயர்ப்புக்கு இணையம் தேவை — எதுவும் மொழிபெயர்க்கப்படவில்லை.' },
  failed: { en: 'Translation isn’t available right now — the translation service couldn’t be reached. Check your internet connection and try again.', si: 'දැනට පරිවර්තනය ලබා ගත නොහැක — පරිවර්තන සේවාවට සම්බන්ධ විය නොහැකි විය. අන්තර්ජාල සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.', ta: 'இப்போது மொழிபெயர்ப்பு கிடைக்கவில்லை — மொழிபெயர்ப்பு சேவையை அணுக முடியவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.' },
  limit: { en: 'The free translation service’s daily limit has been reached. Please try again later.', si: 'නොමිලේ පරිවර්තන සේවාවේ දෛනික සීමාව ඉක්මවා ඇත. පසුව නැවත උත්සාහ කරන්න.', ta: 'இலவச மொழிபெயர்ப்பு சேவையின் தினசரி வரம்பு முடிந்தது. பின்னர் மீண்டும் முயற்சிக்கவும்.' },
  same: { en: 'Pick two different languages to translate.', si: 'පරිවර්තනයට වෙනස් භාෂා දෙකක් තෝරන්න.', ta: 'மொழிபெயர்க்க இரண்டு வெவ்வேறு மொழிகளைத் தேர்ந்தெடுக்கவும்.' },
  retry: { en: 'Try again', si: 'නැවත උත්සාහ කරන්න', ta: 'மீண்டும் முயற்சி' },
  noVoice: { en: 'No {lang} voice is installed on this device, so it can’t be read aloud.', si: 'මෙම උපාංගයේ {lang} හඬක් ස්ථාපනය කර නැති නිසා ශබ්ද නඟා කියවිය නොහැක.', ta: 'இந்த சாதனத்தில் {lang} குரல் நிறுவப்படவில்லை, எனவே உரக்கப் படிக்க முடியாது.' },
  noSpeech: { en: 'This browser doesn’t support reading text aloud.', si: 'මෙම බ්‍රව්සරය පෙළ ශබ්ද නඟා කියවීමට සහාය නොදක්වයි.', ta: 'இந்த உலாவி உரையை உரக்கப் படிப்பதை ஆதரிக்கவில்லை.' },
  speakFail: { en: 'Couldn’t read this aloud.', si: 'මෙය ශබ්ද නඟා කියවිය නොහැකි විය.', ta: 'இதை உரக்கப் படிக்க முடியவில்லை.' },
  foot: { en: 'Translations by MyMemory (translated.net). Text is sent to their service only when you type.', si: 'පරිවර්තන MyMemory (translated.net) මගිනි. ඔබ ටයිප් කරන විට පමණක් පෙළ ඔවුන්ගේ සේවාවට යවනු ලැබේ.', ta: 'மொழிபெயர்ப்புகள் MyMemory (translated.net) மூலம். நீங்கள் தட்டச்சு செய்யும் போது மட்டுமே உரை அவர்களின் சேவைக்கு அனுப்பப்படும்.' },
} satisfies Record<string, Record<Lng, string>>;

/* ── original inline icons ── */
const Ic = {
  speaker: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 9.2c0-.6.5-1.1 1.1-1.1h2.6l4-3.4c.7-.6 1.8-.1 1.8.8v13c0 .9-1.1 1.4-1.8.8l-4-3.4H5.1c-.6 0-1.1-.5-1.1-1.1V9.2Z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M16.3 9.2a4 4 0 0 1 0 5.6M18.8 6.7a7.6 7.6 0 0 1 0 10.6" />
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2.6" fill="currentColor" />
    </svg>
  ),
  clear: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".18" />
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m9 9 6 6m0-6-6 6" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M15.5 5.6A2.6 2.6 0 0 0 13 4.5H7.1a2.6 2.6 0 0 0-2.6 2.6V13a2.6 2.6 0 0 0 1.1 2.1" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="m5.5 12.5 4.2 4.2 8.8-9.4" />
    </svg>
  ),
  star: (on: boolean) => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M12 3.8l2.4 5 5.4.7-4 3.7 1 5.4L12 16l-4.8 2.6 1-5.4-4-3.7 5.4-.7L12 3.8Z"
      />
    </svg>
  ),
  swap: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4.5 8.5h14m0 0-3.5-3.5m3.5 3.5L15 12M19.5 15.5h-14m0 0L9 12m-3.5 3.5L9 19" />
    </svg>
  ),
  warn: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M10.3 4.3a2 2 0 0 1 3.4 0l7.4 12.8a2 2 0 0 1-1.7 3H4.6a2 2 0 0 1-1.7-3l7.4-12.8Z" opacity=".2" />
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 9v4.5m0 3v.1" />
    </svg>
  ),
};

/** Find an installed voice for a BCP-47 tag: exact match first, then same base language. */
function findVoice(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | undefined {
  const norm = (s: string) => s.replace('_', '-').toLowerCase();
  const want = norm(tag);
  const base = want.split('-')[0];
  return voices.find((v) => norm(v.lang) === want) ?? voices.find((v) => norm(v.lang).split('-')[0] === base);
}
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const s = window.speechSynthesis;
  const now = s.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((res) => {
    const done = () => {
      s.removeEventListener('voiceschanged', done);
      res(s.getVoices());
    };
    s.addEventListener('voiceschanged', done);
    window.setTimeout(done, 1200);
  });
}

type State = 'idle' | 'loading' | 'error' | 'offline' | 'limit' | 'same';

export default function TranslateApp(_: AppProps) {
  const { settings } = useSettings();
  const lng: Lng = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const tx = (k: keyof typeof L) => L[k][lng];

  const [from, setFromRaw] = usePersisted('mra-tr-from', 'en');
  const [to, setToRaw] = usePersisted('mra-tr-to', 'si');
  const [text, setText] = useState('Hello! Thank you for visiting my portfolio.');
  const [out, setOut] = useState('');
  const [state, setState] = useState<State>('idle');
  const [attempt, setAttempt] = useState(0);
  const [recent, setRecent] = usePersisted<{ a: string; b: string; f: string; t: string }[]>('mra-tr-recent', []);
  const [note, setNote] = useState<{ text: string; kind: 'ok' | 'warn' } | null>(null);
  const [speaking, setSpeaking] = useState<'in' | 'out' | null>(null);
  const timer = useRef(0);
  const noteTimer = useRef(0);

  // keep only codes that exist (an older saved code would otherwise show a blank select)
  const setFrom = (c: string) => setFromRaw(langOf(c) ? c : 'en');
  const setTo = (c: string) => setToRaw(langOf(c) ? c : 'si');
  const fromC = langOf(from) ? from : 'en';
  const toC = langOf(to) ? to : 'si';

  const flash = (t: string, kind: 'ok' | 'warn' = 'ok') => {
    window.clearTimeout(noteTimer.current);
    setNote({ text: t, kind });
    noteTimer.current = window.setTimeout(() => setNote(null), kind === 'warn' ? 5000 : 1800);
  };
  useEffect(
    () => () => {
      window.clearTimeout(noteTimer.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  useEffect(() => {
    window.clearTimeout(timer.current);
    const q = text.trim();
    if (!q) {
      setOut('');
      setState('idle');
      return;
    }
    if (fromC === toC) {
      setOut('');
      setState('same');
      return;
    }
    const ctrl = new AbortController();
    timer.current = window.setTimeout(() => {
      if (!navigator.onLine) {
        setOut('');
        setState('offline');
        return;
      }
      setState('loading');
      fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q.slice(0, 480))}&langpair=${encodeURIComponent(fromC)}|${encodeURIComponent(toC)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 429 ? 'limit' : String(r.status)))))
        .then((j: { responseData?: { translatedText?: string }; responseStatus?: number | string; quotaFinished?: boolean }) => {
          const st = Number(j.responseStatus ?? 200);
          const t = j.responseData?.translatedText;
          if (j.quotaFinished || st === 429 || /MYMEMORY WARNING/i.test(t ?? '')) throw new Error('limit');
          if (!t || st !== 200) throw new Error('no result');
          setOut(t);
          setState('idle');
        })
        .catch((e: Error) => {
          if (e.name === 'AbortError') return;
          setOut('');
          setState(e.message === 'limit' ? 'limit' : navigator.onLine ? 'error' : 'offline');
        });
    }, 450);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer.current);
    };
  }, [text, fromC, toC, attempt]);

  // go back online → retry automatically
  useEffect(() => {
    const on = () => setAttempt((a) => a + 1);
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, []);

  const speak = async (s: string, code: string, which: 'in' | 'out') => {
    if (!s) return;
    if (!('speechSynthesis' in window)) return flash(tx('noSpeech'), 'warn');
    const synth = window.speechSynthesis;
    if (speaking === which) {
      synth.cancel();
      setSpeaking(null);
      return;
    }
    synth.cancel();
    const lang = langOf(code);
    const tag = lang?.tts ?? code;
    const voice = findVoice(await loadVoices(), tag);
    if (!voice) return flash(tx('noVoice').replace('{lang}', lang?.name ?? code), 'warn');
    const u = new SpeechSynthesisUtterance(s);
    u.lang = tag;
    u.voice = voice;
    u.onend = () => setSpeaking((x) => (x === which ? null : x));
    u.onerror = (ev) => {
      setSpeaking((x) => (x === which ? null : x));
      if (ev.error !== 'canceled' && ev.error !== 'interrupted') flash(tx('speakFail'), 'warn');
    };
    setSpeaking(which);
    synth.speak(u);
  };

  const isSaved = !!out && recent.some((r) => r.a === text.trim() && r.b === out && r.f === fromC && r.t === toC);
  const save = () => {
    if (!out) return;
    if (isSaved) {
      setRecent((r) => r.filter((x) => !(x.a === text.trim() && x.f === fromC && x.t === toC)));
      return;
    }
    setRecent((r) => [{ a: text.trim(), b: out, f: fromC, t: toC }, ...r.filter((x) => !(x.a === text.trim() && x.f === fromC && x.t === toC))].slice(0, 12));
    flash(tx('savedOk'));
  };
  const copy = () => {
    if (!out) return;
    const p = navigator.clipboard?.writeText(out);
    if (!p) return flash(tx('copyFail'), 'warn');
    p.then(() => flash(tx('copied'))).catch(() => flash(tx('copyFail'), 'warn'));
  };
  const name = (c: string) => langOf(c)?.name ?? c;
  const errMsg = state === 'offline' ? tx('offline') : state === 'limit' ? tx('limit') : state === 'same' ? tx('same') : state === 'error' ? tx('failed') : '';

  const options = LANGS.map((l) => (
    <option key={l.code} value={l.code}>
      {label(l)}
    </option>
  ));

  return (
    <div className="trn trn10">
      <div className="trn-langs">
        <select value={fromC} onChange={(e) => setFrom(e.target.value)} aria-label={tx('from')}>
          {options}
        </select>
        <button
          type="button"
          className="trn-swap"
          aria-label={tx('swap')}
          title={tx('swap')}
          onClick={() => {
            setFrom(toC);
            setTo(fromC);
            if (out) setText(out);
          }}
        >
          {Ic.swap}
        </button>
        <select value={toC} onChange={(e) => setTo(e.target.value)} aria-label={tx('to')}>
          {options}
        </select>
      </div>
      <div className="trn-panes">
        <div className="trn-pane">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={480}
            placeholder={tx('enter')}
            aria-label={tx('textAria')}
            dir={dirOf(fromC)}
            lang={langOf(fromC)?.tts}
            className={dirOf(fromC) === 'rtl' ? 'rtl' : ''}
          />
          <div className="trn-tools">
            <button type="button" onClick={() => void speak(text, fromC, 'in')} aria-label={speaking === 'in' ? tx('stop') : tx('listen')} title={speaking === 'in' ? tx('stop') : tx('listen')} disabled={!text.trim()} className={speaking === 'in' ? 'on' : ''}>
              {speaking === 'in' ? Ic.stop : Ic.speaker}
            </button>
            <button type="button" onClick={() => setText('')} aria-label={tx('clear')} title={tx('clear')} disabled={!text}>
              {Ic.clear}
            </button>
            <small>
              {name(fromC)} · {text.length}/480
            </small>
          </div>
        </div>
        <div className={`trn-pane out ${errMsg ? 'has-err' : ''}`}>
          <div className="trn-out" aria-live="polite" dir={errMsg ? undefined : dirOf(toC)} lang={errMsg ? undefined : langOf(toC)?.tts}>
            {errMsg ? (
              <div className="trn-err" role="alert">
                <span className="trn-err-ic">{Ic.warn}</span>
                <p>{errMsg}</p>
                {(state === 'error' || state === 'offline' || state === 'limit') && (
                  <button type="button" className="trn-retry" onClick={() => setAttempt((a) => a + 1)}>
                    {tx('retry')}
                  </button>
                )}
              </div>
            ) : state === 'loading' && !out ? (
              <span className="trn-ph trn-loading">{tx('translating')}</span>
            ) : out ? (
              <span className={state === 'loading' ? 'trn-stale' : ''}>{out}</span>
            ) : (
              <span className="trn-ph">{tx('translation')}</span>
            )}
          </div>
          <div className="trn-tools">
            <button type="button" onClick={() => void speak(out, toC, 'out')} aria-label={speaking === 'out' ? tx('stop') : tx('listen')} title={speaking === 'out' ? tx('stop') : tx('listen')} disabled={!out} className={speaking === 'out' ? 'on' : ''}>
              {speaking === 'out' ? Ic.stop : Ic.speaker}
            </button>
            <button type="button" onClick={copy} aria-label={tx('copy')} title={tx('copy')} disabled={!out}>
              {Ic.copy}
            </button>
            <button type="button" onClick={save} aria-label={tx('save')} aria-pressed={isSaved} title={tx('save')} disabled={!out} className={isSaved ? 'on star' : 'star'}>
              {Ic.star(isSaved)}
            </button>
            <small>{state === 'loading' ? tx('translating') : name(toC)}</small>
          </div>
        </div>
      </div>
      <div className={`trn-note ${note ? 'show' : ''} ${note?.kind ?? ''}`} role="status" aria-live="polite">
        {note && (
          <>
            {note.kind === 'ok' ? Ic.check : Ic.warn}
            <span>{note.text}</span>
          </>
        )}
      </div>
      {recent.length > 0 && (
        <div className="trn-recent">
          <div className="trn-recent-head">
            <h4>{tx('saved')}</h4>
            <button type="button" className="trn-link" onClick={() => setRecent([])}>
              {tx('clearSaved')}
            </button>
          </div>
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
              <b dir={dirOf(r.f)}>{r.a}</b>
              <span dir={dirOf(r.t)}>{r.b}</span>
              <small>
                {name(r.f)} → {name(r.t)}
              </small>
            </button>
          ))}
        </div>
      )}
      <p className="trn-foot">{tx('foot')}</p>
    </div>
  );
}
