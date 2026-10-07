import { useEffect, useRef, useState, type FormEvent } from 'react';
import { allSkills, education, experience, personal, projects, socials, spokenLanguages } from '../data/portfolio';
import { LAUNCH_ITEMS } from '../system/launch';
import { useLaunch } from '../system/useLaunch';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import { useMusic } from '../system/MusicContext';
import { readStore, writeStore } from '../system/storage';
import { islandAssistant } from '../system/island';
import { startTimer } from '../system/timer';
import { nextWallpaper, wallpaperName } from '../system/wallpaperCycle';
import { usePrefFlag } from '../system/prefs';

interface Msg {
  from: 'you' | 'siri';
  text: string;
  action?: { label: string; run: () => void };
}

type SR = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

const SUGGESTIONS = ['Who is M.R. Ahamed?', 'What are his skills?', 'Open projects', 'Show contact options', 'Set a timer for 5 minutes', 'Play music', 'Next wallpaper', 'Find Dock settings', 'Dark mode'];

/** A Siri-style portfolio assistant (not Apple’s Siri) that answers from the portfolio data only. */
export default function SiriApp() {
  const launch = useLaunch();
  const wm = useWM();
  const { update } = useSettings();
  const music = useMusic();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'siri', text: `Hi, I’m the assistant for ${personal.name}’s portfolio (not Apple’s Siri). Ask about his skills, projects, education or how to reach him — or say “open projects”, “set a timer for 5 minutes”, “next wallpaper” or “find Dock settings”.` }]);
  const [q, setQ] = useState('');
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState<boolean>(() => readStore('mra-siri', { speak: false }).speak);
  const recRef = useRef<SR | null>(null);
  const [thinking, setThinking] = useState(false);
  const assistantOn = usePrefFlag('siri-on', true); // Settings → Assistant
  const endRef = useRef<HTMLDivElement>(null);

  const Rec = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;

  // v10.3.2 fix — braces matter: newer Chrome returns a Promise from scrollIntoView(), and React
  // would treat a returned value as the effect's clean-up function ("q is not a function" crash)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, thinking]);
  useEffect(() => () => {
    recRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  // v10.2 — live state for the Dynamic Island
  useEffect(() => () => islandAssistant('idle'), []);
  const say = (text: string) => {
    if (!speak || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onstart = () => islandAssistant('speaking');
    u.onend = () => islandAssistant('idle');
    u.onerror = () => islandAssistant('idle');
    // v9 — voice chosen in System Settings → Intelligence & Siri
    const vn = readStore<{ voice?: string }>('mra-siri', {}).voice;
    const v = vn ? window.speechSynthesis.getVoices().find((x) => x.name === vn) : undefined;
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };

  const answer = (raw: string): Msg => {
    const t = raw.toLowerCase().trim();
    const has = (...w: string[]) => w.some((x) => t.includes(x));

    // commands
    const openM = t.match(/^(open|launch|start|show me)\s+(.+)$/);
    if (openM) {
      const name = openM[2].replace(/\bapp\b/, '').trim();
      const item = LAUNCH_ITEMS.find((i) => i.label.toLowerCase() === name) ?? LAUNCH_ITEMS.find((i) => i.label.toLowerCase().includes(name) || (i.keywords ?? '').toLowerCase().split(' ').includes(name));
      if (item) {
        launch(item.action, item.label);
        return { from: 'siri', text: `Opening ${item.label}.` };
      }
    }
    // v10.2 — more commands
    const go = (_label: string, run: () => void, text: string): Msg => (run(), { from: 'siri', text });
    if (/^(open|show)( me)? (my |his )?skills?$/.test(t)) return go('Skills', () => wm.open('notes'), 'Opening Skills.');
    if (/^(open|show)( me)? (the |his )?education$/.test(t)) return go('Education', () => wm.open('finder', { folder: 'education' }), 'Opening Education.');
    if (/^(open|show)( me)? (the |his )?experience$/.test(t)) return go('Experience', () => wm.open('finder', { folder: 'all' }), 'Opening Experience.');
    if (/^(open|show)( me)? (the |his )?projects?$/.test(t)) return go('Projects', () => wm.open('xcode'), 'Opening Projects.');
    if (/^(open|show)( me)? (the |his )?(cv|resume|résumé)$/.test(t)) return go('CV', () => wm.open('preview'), 'Opening the CV.');
    if (/(contact options|open contact|how (can|do) i (contact|reach))/.test(t)) return { from: 'siri', text: `Email ${personal.email}, call ${personal.phone}, or message him on WhatsApp.`, action: { label: 'Open Hire Me', run: () => wm.open('hireme') } };
    if (/^(open|show)( the)? learning( hub)?$/.test(t)) return go('Learning Hub', () => wm.open('learning'), 'Opening the Learning Hub.');
    const timerM = t.match(/(?:set|start)(?: a)? timer (?:for )?(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/);
    if (timerM) {
      const n = Number(timerM[1]);
      const unit = timerM[2][0];
      const ms = n * (unit === 's' ? 1000 : unit === 'h' ? 3600000 : 60000);
      startTimer(ms);
      return { from: 'siri', text: `Timer set for ${n} ${unit === 's' ? 'second' : unit === 'h' ? 'hour' : 'minute'}${n === 1 ? '' : 's'}. You’ll see it in the Dynamic Island.`, action: { label: 'Open Clock', run: () => wm.open('clock', { tab: 'timer' }) } };
    }
    if (/(next|change|another|new) wallpaper/.test(t)) {
      const id = nextWallpaper(1);
      return { from: 'siri', text: `Wallpaper changed to ${wallpaperName(id)}.`, action: { label: 'Wallpaper settings', run: () => wm.open('settings', { pane: 'wallpaper' }) } };
    }
    if (/(previous|last) wallpaper/.test(t)) {
      const id = nextWallpaper(-1);
      return { from: 'siri', text: `Wallpaper changed to ${wallpaperName(id)}.` };
    }
    const findM = t.match(/^(?:find|search|show)(?: the)? (.+?) settings?$/) ?? t.match(/^settings? (?:for )?(.+)$/);
    if (findM) return go('Settings', () => wm.open('settings', { q: findM[1] }), `Searching Settings for “${findM[1]}”.`);
    if (has('reduce motion')) return (update({ reduceMotion: true }), { from: 'siri', text: 'Reduce Motion is on.' });
    if (has('full motion')) return (update({ reduceMotion: false }), { from: 'siri', text: 'Full motion is back on.' });
    if (has('dark mode')) return (update({ appearance: 'dark' }), { from: 'siri', text: 'Dark Mode is on.' });
    if (has('light mode')) return (update({ appearance: 'light' }), { from: 'siri', text: 'Light Mode is on.' });
    if (has('play music', 'play a song', 'play some music')) return (music.play(), { from: 'siri', text: `Playing “${music.track.title}”.` });
    if (has('pause', 'stop music')) return (music.pause(), { from: 'siri', text: 'Paused.' });
    if (has('timer')) return (wm.open('clock', { tab: 'timer' }), { from: 'siri', text: 'Here’s the timer.' });
    if (has('what time', 'the time')) return { from: 'siri', text: `It’s ${new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} for you — and ${new Date().toLocaleTimeString('en-US', { timeZone: personal.timezone, hour: 'numeric', minute: '2-digit' })} in ${personal.city}.` };
    if (has('date', 'what day')) return { from: 'siri', text: `Today is ${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.` };

    // portfolio questions
    const project = projects.find((p) => t.includes(p.name.toLowerCase()) || (p.name.split(' ')[0].length > 4 && t.includes(p.name.toLowerCase().split(' ')[0])));
    if (project)
      return {
        from: 'siri',
        text: `${project.name} — ${project.category}${project.period ? ` (${project.period})` : ''}. ${project.description} Built with ${Object.values(project.stack).flat().slice(0, 6).join(', ')}.`,
        action: { label: 'Open in Xcode', run: () => wm.open('xcode', { project: project.id }) },
      };
    if (has('who', 'about him', 'about ahamed', 'introduce', 'yourself'))
      return { from: 'siri', text: `${personal.name} is a ${personal.headline} based in ${personal.location}. ${personal.status}.`, action: { label: 'Open About Me', run: () => wm.open('about') } };
    if (has('skill', 'tech', 'stack', 'language', 'know'))
      return has('speak', 'spoken')
        ? { from: 'siri', text: `He speaks ${spokenLanguages.map((l) => l.name).join(', ')}.` }
        : { from: 'siri', text: `His skills include ${allSkills.slice(0, 18).join(', ')} and more.`, action: { label: 'See skills in Notes', run: () => wm.open('notes') } };
    if (has('project', 'built', 'work on', 'portfolio'))
      return { from: 'siri', text: `He has ${projects.length} projects, including ${projects.slice(0, 5).map((p) => p.name).join(', ')}.`, action: { label: 'Browse projects', run: () => wm.open('xcode') } };
    if (has('study', 'education', 'degree', 'university', 'school', 'sliit'))
      return { from: 'siri', text: education.map((e) => `${e.qualification} — ${e.institution} (${e.period})`).join('. ') + '.', action: { label: 'Open Education', run: () => wm.open('finder', { folder: 'education' }) } };
    if (has('experience', 'business', 'job', 'work'))
      return { from: 'siri', text: experience.slice(0, 4).map((e) => `${e.role} — ${e.title}`).join('. ') + '.', action: { label: 'Open Experience', run: () => wm.open('finder', { folder: 'all' }) } };
    if (has('contact', 'email', 'phone', 'call', 'reach', 'hire'))
      return { from: 'siri', text: `Email ${personal.email} or call ${personal.phone}. He’s ${personal.status.toLowerCase()}.`, action: { label: 'Open Contacts', run: () => wm.open('contacts') } };
    if (has('where', 'live', 'location', 'from'))
      return { from: 'siri', text: `He’s based in ${personal.location}.`, action: { label: 'Show in Maps', run: () => wm.open('maps') } };
    if (has('github')) return { from: 'siri', text: `His GitHub is ${socials.github}.`, action: { label: 'Open GitHub', run: () => window.open(socials.github, '_blank', 'noopener') } };
    if (has('linkedin')) return { from: 'siri', text: 'Here’s his LinkedIn.', action: { label: 'Open LinkedIn', run: () => window.open(socials.linkedin, '_blank', 'noopener') } };
    if (has('cv', 'resume', 'résumé')) return { from: 'siri', text: 'Here’s his CV.', action: { label: 'Open CV', run: () => wm.open('preview') } };
    if (has('hello', 'hi', 'hey')) return { from: 'siri', text: 'Hello! What would you like to know?' };
    if (has('thank')) return { from: 'siri', text: 'You’re welcome!' };
    return { from: 'siri', text: 'I can only answer questions about this portfolio. Want me to search the web?', action: { label: `Search “${raw}”`, run: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(raw)}`, '_blank', 'noopener') } };
  };

  // v10.3 — a short "thinking" beat (shown here and in the Dynamic Island) before the answer
  const thinkT = useRef(0);
  useEffect(() => () => window.clearTimeout(thinkT.current), []);
  const ask = (text: string) => {
    const v = text.trim();
    if (!v || thinking) return;
    setMsgs((m) => [...m, { from: 'you', text: v }]);
    setQ('');
    setThinking(true);
    islandAssistant('thinking');
    const reduced = document.documentElement.dataset.motion === 'reduced';
    thinkT.current = window.setTimeout(() => {
      const a = answer(v);
      setThinking(false);
      setMsgs((m) => [...m, a]);
      if (speak && 'speechSynthesis' in window) say(a.text);
      else islandAssistant('idle');
    }, reduced ? 150 : 650);
  };

  const listen = () => {
    if (!Rec) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const r = new Rec();
    r.lang = 'en-US';
    r.interimResults = false;
    r.onresult = (e) => ask(e.results[0][0].transcript);
    r.onend = () => (setListening(false), islandAssistant(window.speechSynthesis?.speaking ? 'speaking' : 'idle'));
    r.onerror = () => (setListening(false), islandAssistant('idle'));
    recRef.current = r;
    setListening(true);
    islandAssistant('listening');
    r.start();
  };

  if (!assistantOn)
    return (
      <div className="sr sr-off">
        <div className="sr-orb" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h2>Assistant is turned off</h2>
        <p>Turn it on in Settings → Assistant to ask about {personal.name}’s skills, projects and contact details.</p>
        <button
          type="button"
          className="sr-act"
          onClick={() => {
            const st = readStore<{ flags: Record<string, boolean>; choices: Record<string, string> }>('mra-settings-app-v5', { flags: {}, choices: {} });
            writeStore('mra-settings-app-v5', { ...st, flags: { ...st.flags, 'siri-on': true } });
            window.dispatchEvent(new Event('mra-prefs'));
          }}
        >
          Turn On Assistant
        </button>
      </div>
    );

  return (
    <div className="sr">
      <div className="sr-log scroll-smooth">
        {msgs.map((m, i) => (
          <div key={i} className={`sr-msg ${m.from}`}>
            <p>{m.text}</p>
            {m.action && (
              <button type="button" className="sr-act" onClick={m.action.run}>
                {m.action.label}
              </button>
            )}
          </div>
        ))}
        {thinking && (
          <div className="sr-msg siri sr-thinking" aria-label="Thinking">
            <p>
              <i />
              <i />
              <i />
            </p>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="sr-chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className={`sr-orb ${listening ? 'listening' : ''}`} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <form
        className="sr-bar"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={listening ? 'Listening…' : 'Ask the assistant…'} aria-label="Ask the assistant" data-nodictation />
        {Rec && (
          <button type="button" className={`sr-mic ${listening ? 'on' : ''}`} onClick={listen} aria-label={listening ? 'Stop listening' : 'Speak'}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className={`sr-mic ${speak ? 'on' : ''}`}
          onClick={() => {
            setSpeak((s) => {
              writeStore('mra-siri', { ...readStore<Record<string, unknown>>('mra-siri', {}), speak: !s });
              if (s) window.speechSynthesis?.cancel();
              return !s;
            });
          }}
          aria-pressed={speak}
          aria-label="Speak answers aloud"
          title="Speak answers aloud"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9h4l5-4v14l-5-4H4Z" />
            <path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </form>
    </div>
  );
}