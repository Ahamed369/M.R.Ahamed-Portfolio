import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  allSkills,
  cv,
  cvBusinessRole,
  education,
  leadership,
  personal,
  projects,
  skillNotes,
  socials,
  spokenLanguages,
  timeline,
  ventures,
} from '../data/portfolio';
import { useMusic } from '../system/MusicContext';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import { useSystem } from '../system/SystemContext';
import { usePersisted } from '../system/useStore';
import { sharePortfolio } from '../system/share';
import { LANGS } from '../system/i18n';
import { currentDevice, deviceWall, nextWallpaper, setDeviceWall, wallpaperName } from '../system/wallpaperCycle';
import { wallFor, wallpaperById } from '../data/media';
import { settingsApi } from '../system/SettingsContext';
import type { AppId, PortfolioMode } from '../system/types';

type Line = { kind: 'in' | 'out' | 'err'; content: ReactNode };

const PROMPT = 'ahamed@portfolio ~ %';

const HELP: [string, string][] = [
  ['whoami', 'who I am'],
  ['about', 'professional summary'],
  ['skills', 'technical skills by category'],
  ['projects', 'all projects (GitHub + CV)'],
  ['open <n|name>', 'open a project in Xcode'],
  ['experience', 'ventures & business experience'],
  ['education', 'degrees & diplomas'],
  ['leadership', 'leadership & activities'],
  ['languages', 'spoken languages'],
  ['repos', 'GitHub repositories'],
  ['social', 'all my social links'],
  ['photos', 'open Photos'],
  ['music', 'play / pause music'],
  ['timeline', 'my verified timeline'],
  ['github', 'open my GitHub'],
  ['linkedin', 'open my LinkedIn'],
  ['resume', 'open my CV'],
  ['contact', 'email / phone / compose'],
  ['theme [dark|light]', 'switch appearance'],
  ['open <section>', 'projects · skills · cv · contact · education · experience · learning…'],
  ['wallpaper [list|next|previous|dynamic|static|name]', 'change the wallpaper'],
  ['motion <reduce|full>', 'reduce or restore motion'],
  ['mode <name>', 'recruiter · client · developer · presentation · explore'],
  ['hire', 'Hire Me — availability, CV, book a call'],
  ['casestudy <name>', 'read a project case study'],
  ['ask <question>', 'ask the portfolio AI (e.g. ask does he know react)'],
  ['guestbook', 'sign the visitor guestbook'],
  ['share', 'share this portfolio'],
  ['download cv', 'download my CV (PDF)'],
  ['neofetch', 'system info, portfolio style'],
  ['lang <en|si|ta>', 'switch interface language'],
  ['date · uptime · pwd · ls · echo', 'classic shell basics'],
  ['history', 'commands you typed'],
  ['man <cmd>', 'help for one command'],
  ['sleep · restart · shutdown', 'power options (portfolio simulation)'],
  ['shortcuts', 'keyboard shortcuts'],
  ['clear', 'clear the screen'],
];
const COMMANDS = ['help', 'whoami', 'about', 'skills', 'projects', 'open', 'experience', 'education', 'leadership', 'languages', 'repos', 'social', 'photos', 'music', 'timeline', 'github', 'linkedin', 'resume', 'cv', 'contact', 'mail', 'theme', 'hire', 'casestudy', 'ask', 'guestbook', 'share', 'download', 'neofetch', 'lang', 'date', 'uptime', 'pwd', 'ls', 'echo', 'history', 'man', 'sleep', 'restart', 'shutdown', 'shortcuts', 'clear', 'exit', 'sudo'];
const HINTS = ['help', 'about', 'skills', 'projects', 'casestudy freshmart', 'hire', 'ask is he available', 'neofetch', 'contact'];
const BOOT = Date.now();

const ext = (href: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {href}
  </a>
);

export default function TerminalApp() {
  const wm = useWM();
  const { toggleAppearance, update, settings } = useSettings();
  const sys = useSystem();
  const music = useMusic();
  const [lines, setLines] = useState<Line[]>(() => [
    { kind: 'out', content: `Last login: ${new Date().toDateString()} on ttys001` },
    { kind: 'out', content: <>Welcome to {personal.name}’s portfolio shell. Type <b>help</b> to see commands.</> },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = usePersisted<string[]>('mra-terminal-history', []);
  const [hIdx, setHIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  const settingsNow = () => settingsApi.get();
  const run = (raw: string): Line[] | 'clear' => {
    const [cmd, ...rest] = raw.trim().split(/\s+/);
    const arg = rest.join(' ');
    const out = (content: ReactNode): Line => ({ kind: 'out', content });
    switch ((cmd ?? '').toLowerCase()) {
      case '':
        return [];
      case 'help':
        return [out(<div className="term-table">{HELP.map(([c, d]) => <div key={c}><b>{c}</b><span>{d}</span></div>)}</div>)];
      case 'whoami':
        return [out(`${personal.name} — ${personal.headline} · ${personal.location}`)];
      case 'about':
        return [out(personal.summary), out(personal.objective)];
      case 'skills':
        return [
          out(
            <div className="term-table">
              {skillNotes
                .filter((n) => !['about', 'languages'].includes(n.id))
                .map((n) => (
                  <div key={n.id}>
                    <b>{n.title}</b>
                    <span>{n.tags.join(', ')}</span>
                  </div>
                ))}
            </div>,
          ),
          out(`${allSkills.length} technologies total.`),
        ];
      case 'projects':
      case 'ls':
        return [
          out(
            <div className="term-table">
              {projects.map((p, i) => (
                <div key={p.id}>
                  <b>
                    {i + 1}. {p.name}
                  </b>
                  <span>
                    {p.category}
                    {p.repo ? ' · GitHub' : ' · CV'}
                  </span>
                </div>
              ))}
            </div>,
          ),
          out(<>Type <b>open 1</b> or <b>open city walk</b> to view one in Xcode.</>),
        ];
      case 'open':
      case 'cat': {
        // v10.2 — open sections by name
        const SECTIONS: Record<string, [AppId, Record<string, string> | undefined, string]> = {
          projects: ['xcode', undefined, 'Projects'],
          skills: ['notes', undefined, 'Skills'],
          cv: ['preview', undefined, 'the CV'],
          resume: ['preview', undefined, 'the CV'],
          contact: ['hireme', undefined, 'Contact'],
          education: ['finder', { folder: 'education' }, 'Education'],
          experience: ['finder', { folder: 'all' }, 'Experience'],
          settings: ['settings', undefined, 'Settings'],
          learning: ['learning', undefined, 'the Learning Hub'],
          weather: ['weather', undefined, 'Weather'],
          clock: ['clock', undefined, 'Clock'],
          notes: ['notes', undefined, 'Notes'],
        };
        const sec = SECTIONS[arg.toLowerCase().replace(/^learning hub$/, 'learning')];
        if (cmd.toLowerCase() === 'open' && sec) {
          wm.open(sec[0], sec[1]);
          return [out(`Opening ${sec[2]}…`)];
        }
        const n = Number(arg);
        const p = Number.isInteger(n) && n >= 1 ? projects[n - 1] : projects.find((x) => x.name.toLowerCase().includes(arg.toLowerCase()) || x.id === arg.toLowerCase());
        if (!arg || !p) return [{ kind: 'err', content: `open: project not found: ${arg || '(none)'} — try "projects"` }];
        wm.open('xcode', { project: p.id });
        return [out(<>Opening {p.name} in Xcode… {p.repo && ext(p.repo)}</>)];
      }
      case 'experience':
        return [
          ...ventures.map((v) => out(<><b>{v.company}</b> — {v.role} ({v.duration}) · {v.highlights.slice(1, 3).join(' · ')}</>)),
          out(<><b>{cvBusinessRole.title}</b> — {cvBusinessRole.period}</>),
        ];
      case 'education':
        return education.map((e) => out(<><b>{e.qualification}</b> — {e.institution} ({e.period})</>));
      case 'leadership':
        return leadership.map((l) => out(`${l.role} — ${l.org} (${l.period})`));
      case 'languages':
        return spokenLanguages.map((l) => out(`${l.name}: ${l.level}`));
      case 'repos':
        return projects
          .filter((p) => p.repo)
          .map((p) => out(<><b>{p.repo!.split('/').pop()}</b> — {ext(p.repo!)}</>));
      case 'social':
        return [
          out(<>GitHub: {ext(socials.github)}</>),
          out(<>LinkedIn: {ext(socials.linkedin)}</>),
          out(<>Instagram: {ext(socials.instagram)}</>),
          out(<>Facebook: {ext(socials.facebook)}</>),
          out(<>Threads: {ext(socials.threads)}</>),
          out(<>Spotify: {ext(socials.spotify)}</>),
        ];
      case 'photos':
        wm.open('photos');
        return [out('Opening Photos…')];
      case 'music':
        music.toggle();
        return [out(music.playing ? 'Paused.' : `Playing “${music.track.title}”…`)];
      case 'timeline':
        return timeline.map((t) => out(<><b>{t.start}{t.end ? ` – ${t.end}` : ''}</b> {t.title}</>));
      case 'github':
        window.open(socials.github, '_blank', 'noopener,noreferrer');
        return [out(ext(socials.github))];
      case 'linkedin':
        window.open(socials.linkedin, '_blank', 'noopener,noreferrer');
        return [out(ext(socials.linkedin))];
      case 'resume':
      case 'cv':
        wm.open('preview');
        return [out(<>Opening {cv.displayName}… <a href={cv.url} download={cv.fileName}>download</a></>)];
      case 'contact':
        return [
          out(<>Email: <a href={socials.email}>{personal.email}</a></>),
          out(<>Phone: <a href={personal.phoneHref}>{personal.phone}</a></>),
          out(<>LinkedIn: {ext(socials.linkedin)}</>),
          out(<>Type <b>mail</b> to open the composer.</>),
        ];
      case 'mail':
        wm.open('mail', { compose: '1' });
        return [out('Opening Mail…')];
      case 'theme':
        if (arg === 'dark' || arg === 'light') {
          update({ appearance: arg, autoAppearance: 'off' });
          return [out(`Appearance: ${arg}.`)];
        }
        toggleAppearance();
        return [out('Appearance toggled. (theme dark · theme light)')];
      case 'wallpaper': {
        const dev = currentDevice();
        const sub = arg.toLowerCase();
        if (!sub) return [out(`Current wallpaper: ${wallpaperName(deviceWall(settingsNow(), dev))} (${dev}). Try: wallpaper list · next · previous · dynamic · static · <name>`)];
        if (sub === 'list')
          return [
            out(
              <div className="term-table">
                {wallFor(dev).map((w) => (
                  <div key={w.id}>
                    <b>{w.id}</b>
                    <span>
                      {w.name} · {w.kind ?? 'photo'}
                    </span>
                  </div>
                ))}
              </div>,
            ),
          ];
        if (sub === 'next' || sub === 'previous' || sub === 'prev') return [out(`Wallpaper: ${wallpaperName(nextWallpaper(sub === 'next' ? 1 : -1))}`)];
        if (sub === 'dynamic') return [out(`Wallpaper: ${wallpaperName(nextWallpaper(1, (id) => ['dynamic', 'live'].includes(wallpaperById(id).kind ?? '')))}`)];
        if (sub === 'static') return [out(`Wallpaper: ${wallpaperName(nextWallpaper(1, (id) => ['photo', 'art'].includes(wallpaperById(id).kind ?? 'photo')))}`)];
        const w = wallFor(dev).find((x) => x.id === sub || x.name.toLowerCase() === sub);
        if (!w) return [{ kind: 'err', content: `wallpaper: no wallpaper called “${arg}” — try “wallpaper list”` }];
        setDeviceWall(w.id, dev);
        return [out(`Wallpaper: ${w.name}`)];
      }
      case 'motion':
        if (arg === 'reduce' || arg === 'full') {
          update({ reduceMotion: arg === 'reduce' });
          return [out(arg === 'reduce' ? 'Reduce Motion on — live wallpapers pause, transitions are simpler.' : 'Full motion on.')];
        }
        return [out(`Motion: ${settingsNow().reduceMotion ? 'reduced' : 'full'}. Try: motion reduce · motion full`)];
      case 'mode': {
        const m = arg.toLowerCase() as PortfolioMode;
        if (['explore', 'recruiter', 'client', 'developer', 'presentation'].includes(m)) {
          update({ portfolioMode: m, presentStep: 0 });
          return [out(`Portfolio mode: ${m}.`)];
        }
        return [out(`Mode: ${settingsNow().portfolioMode ?? 'explore'}. Try: mode recruiter · client · developer · presentation · explore`)];
      }
      case 'clear':
        return 'clear';
      case 'hire':
        wm.open('hireme');
        return [out('Opening Hire Me — availability, CV and Book a Call.')];
      case 'casestudy':
      case 'case': {
        const p = arg ? projects.find((x) => x.id === arg.toLowerCase() || x.name.toLowerCase().includes(arg.toLowerCase())) : projects[0];
        if (!p) return [{ kind: 'err', content: `No project matches “${arg}”. Try: ${projects.map((x) => x.id).join(', ')}` }];
        wm.open('casestudies', { project: p.id });
        return [out(`Opening the ${p.name} case study…`)];
      }
      case 'ask':
        wm.open('askai');
        return [out(arg ? `Opening Ask Me AI — paste your question: “${arg}”` : 'Opening Ask Me AI.')];
      case 'guestbook':
        wm.open('guestbook');
        return [out('Opening the Guestbook — thanks for signing! ✍️')];
      case 'share':
        void sharePortfolio();
        return [out('Opening the share sheet…')];
      case 'download': {
        const a = document.createElement('a');
        a.href = cv.url;
        a.download = cv.fileName;
        a.click();
        return [out(`Downloading ${cv.fileName}…`)];
      }
      case 'neofetch': {
        const up = Math.round((Date.now() - BOOT) / 60000);
        return [
          out(
            <pre className="term-neo">{`   ⌘⌘⌘⌘⌘⌘        ${personal.name.toLowerCase().replace(/\W/g, '')}@portfolio
  ⌘⌘      ⌘⌘      ----------------------
 ⌘⌘  </>  ⌘⌘     OS: Portfolio macOS-style (web)
 ⌘⌘       ⌘⌘     Host: ${personal.location}
  ⌘⌘      ⌘⌘      Role: ${personal.shortTitle}
   ⌘⌘⌘⌘⌘⌘        Uptime: ${up} min
                  Shell: zsh (portfolio)
                  Projects: ${projects.length} · Skills: ${allSkills.length}
                  Theme: ${settings.appearance} · Language: ${settings.language}
                  Status: ${personal.status}`}</pre>,
          ),
        ];
      }
      case 'lang': {
        const l = LANGS.find((x) => x.id === arg.toLowerCase() || x.label.toLowerCase() === arg.toLowerCase());
        if (!l) return [out(`Usage: lang en | si | ta   (current: ${settings.language})`)];
        update({ language: l.id });
        return [out(`Language set to ${l.native}.`)];
      }
      case 'date':
        return [out(new Date().toString())];
      case 'uptime':
        return [out(`up ${Math.max(1, Math.round((Date.now() - BOOT) / 60000))} min, 1 user, load averages: 0.42 0.37 0.31`)];
      case 'pwd':
        return [out('/Users/ahamed/portfolio')];
      case 'ls':
        return [out(<div className="term-table">{['About/', 'Projects/', 'CaseStudies/', 'Skills.md', 'Experience/', 'Education/', 'CV.pdf', 'Guestbook/'].map((f) => <div key={f}><b>{f}</b><span /></div>)}</div>)];
      case 'echo':
        return [out(arg)];
      case 'history':
        return [out(history.length ? history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n') : 'No history yet.')];
      case 'man': {
        const h = HELP.find(([c]) => c.split(/[\s·]/)[0] === arg.toLowerCase());
        return [out(h ? `${h[0]} — ${h[1]}` : `No manual entry for ${arg || '(nothing)'}. Try "help".`)];
      }
      case 'sleep':
        window.setTimeout(() => sys.sleep(), 400);
        return [out('Putting the display to sleep… press any key to wake.')];
      case 'restart':
        window.setTimeout(() => sys.restart(), 400);
        return [out('Restarting the portfolio…')];
      case 'shutdown':
        window.setTimeout(() => sys.shutdown(), 400);
        return [out('Shutting down the portfolio… (your computer stays on 🙂)')];
      case 'shortcuts':
        window.dispatchEvent(new Event('mra-shortcuts'));
        return [out('Opening the keyboard shortcuts sheet.')];
      case 'sudo':
        if (/hire/i.test(arg)) {
          wm.open('hireme');
          return [out('🎉 Access granted — great choice! Opening Hire Me…')];
        }
        return [{ kind: 'err', content: 'Nice try 🙂 — permission denied.' }];
      case 'exit':
        wm.close('terminal');
        return [];
      default:
        return [{ kind: 'err', content: `zsh: command not found: ${cmd} — type "help"` }];
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const res = run(input);
      if (input.trim()) setHistory((h) => [...h, input].slice(-100));
      setHIdx(-1);
      if (res === 'clear') setLines([]);
      else setLines((l) => [...l, { kind: 'in', content: input }, ...res]);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const i = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(i);
      setInput(history[i]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIdx < 0) return;
      const i = hIdx + 1;
      if (i >= history.length) {
        setHIdx(-1);
        setInput('');
      } else {
        setHIdx(i);
        setInput(history[i]);
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.toLowerCase();
      const [c0, ...restArgs] = v.split(' ');
      if (restArgs.length && ['open', 'casestudy', 'case', 'cat'].includes(c0)) {
        const a = restArgs.join(' ');
        const opts = projects.map((p) => p.id).filter((id) => id.startsWith(a));
        if (opts.length === 1) setInput(`${c0} ${opts[0]}`);
        else if (opts.length > 1) setLines((l) => [...l, { kind: 'out', content: opts.join('   ') }]);
        return;
      }
      if (restArgs.length && c0 === 'lang') {
        const opts = LANGS.map((l) => l.id).filter((id) => id.startsWith(restArgs.join(' ')));
        if (opts.length === 1) setInput(`lang ${opts[0]}`);
        return;
      }
      const opts = COMMANDS.filter((c) => c.startsWith(v));
      if (opts.length === 1) setInput(`${opts[0]} `);
      else if (opts.length > 1 && v) setLines((l) => [...l, { kind: 'out', content: opts.join('   ') }]);
    }
  };

  return (
    <div className="terminal scroll-smooth" onClick={() => inputRef.current?.focus()}>
      {lines.map((l, i) => (
        <div key={i} className={`term-line ${l.kind}`}>
          {l.kind === 'in' ? (
            <>
              <span className="term-prompt">{PROMPT}</span> {l.content}
            </>
          ) : (
            l.content
          )}
        </div>
      ))}
      <div className="term-line in live">
        <span className="term-prompt">{PROMPT}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          aria-label="Terminal input"
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
      <div className="term-hints" aria-label="Try these commands">
        <span>Try:</span>
        {HINTS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const res = run(h);
              setHistory((x) => [...x, h].slice(-100));
              if (res === 'clear') setLines([]);
              else setLines((l) => [...l, { kind: 'in', content: h }, ...res]);
              inputRef.current?.focus();
            }}
          >
            {h}
          </button>
        ))}
        <small>Tab completes · ↑↓ history · Ctrl+L clears</small>
      </div>
      <div ref={endRef} />
    </div>
  );
}
