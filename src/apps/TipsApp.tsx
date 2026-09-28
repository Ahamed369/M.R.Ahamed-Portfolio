import { useMemo, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import { personal } from '../data/portfolio';
import { AppIcon, type IconName } from '../components/AppIcons';
import { useWM } from '../system/WindowManager';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { useMusic } from '../system/MusicContext';
import { notify } from '../system/notify';

interface Ctx {
  wm: ReturnType<typeof useWM>;
  sys: ReturnType<typeof useSystem>;
  toggleAppearance: () => void;
  dark: boolean;
  music: ReturnType<typeof useMusic>;
  e: RMouseEvent<HTMLButtonElement>;
}

interface Tip {
  id: string;
  title: string;
  text: string;
  icon: IconName;
  keys?: string[][];
  run: (c: Ctx) => void;
}

interface Collection {
  id: string;
  title: string;
  blurb: string;
  colors: [string, string];
  tips: Tip[];
}

const COLLECTIONS: Collection[] = [
  {
    id: 'start',
    title: 'Get started',
    blurb: 'The essentials for finding your way around this desktop.',
    colors: ['#0a84ff', '#5e5ce6'],
    tips: [
      { id: 'spotlight', title: 'Search with Spotlight', text: 'Find any app, project or skill in a flash.', icon: 'finder', keys: [['⌘', 'Space'], ['Ctrl', 'Space']], run: ({ sys }) => sys.setOverlay('spotlight') },
      { id: 'launchpad', title: 'See every app in Launchpad', text: 'All the apps, laid out in a grid.', icon: 'launchpad', keys: [['F4']], run: ({ sys }) => sys.setOverlay('launchpad') },
      { id: 'mission', title: 'Mission Control', text: 'Spread out every open window at once.', icon: 'missioncontrol', keys: [['F3'], ['Ctrl', '↑']], run: ({ sys }) => sys.setOverlay('missioncontrol') },
      { id: 'control', title: 'Open Control Center', text: 'Wi-Fi, Focus, brightness and more from the menu bar.', icon: 'settings', run: ({ sys }) => sys.setOverlay('control') },
      { id: 'notif', title: 'Check Notification Center', text: 'Click the clock in the menu bar to see recent alerts.', icon: 'clock', run: ({ sys }) => sys.setOverlay('notifications') },
      { id: 'lock', title: 'Lock the screen', text: 'Step away without closing anything.', icon: 'shield', keys: [['Ctrl', '⌘', 'Q']], run: () => window.dispatchEvent(new Event('mra-lock')) },
    ],
  },
  {
    id: 'productivity',
    title: 'Productivity',
    blurb: 'Work faster with previews, menus and M.R. Ahamed’s documents.',
    colors: ['#30d158', '#0a84ff'],
    tips: [
      {
        id: 'quicklook',
        title: 'Peek with Quick Look',
        text: 'Select a desktop icon and press Space to preview it.',
        icon: 'preview',
        keys: [['Space']],
        run: ({ sys }) =>
          sys.setQuickLook({ kind: 'info', title: 'Quick Look', icon: 'preview', text: 'Click an icon on the desktop to select it, then press Space to preview it without opening an app.', rows: [['Shortcut', 'Space'], ['Works with', 'Desktop icons']] }),
      },
      {
        id: 'context',
        title: 'Right-click for more',
        text: 'Secondary-click the desktop for shortcuts like wallpaper and appearance.',
        icon: 'finder',
        run: ({ sys, wm, toggleAppearance, dark, e }) => {
          const r = e.currentTarget.getBoundingClientRect();
          sys.setContextMenu({
            x: r.left,
            y: r.bottom + 4,
            items: [
              { label: 'Open Launchpad', action: () => sys.setOverlay('launchpad') },
              { label: 'Spotlight Search', action: () => sys.setOverlay('spotlight') },
              { label: '', sep: true },
              { label: 'Change Wallpaper…', action: () => wm.open('settings', { pane: 'wallpaper' }) },
              { label: dark ? 'Use Light Mode' : 'Use Dark Mode', action: toggleAppearance },
            ],
          });
        },
      },
      { id: 'cv', title: 'Download the CV', text: `Open ${personal.name}’s CV in Preview and save the PDF.`, icon: 'pdf', run: ({ wm }) => wm.open('preview') },
      { id: 'projects', title: 'Browse the projects', text: 'Read code, stacks and features in Xcode.', icon: 'xcode', run: ({ wm }) => wm.open('xcode') },
      { id: 'contact', title: `Contact ${personal.name}`, text: 'Call, message, email or save the contact card.', icon: 'contacts', run: ({ wm }) => wm.open('contacts') },
      { id: 'reminders', title: 'Reminders widget', text: 'Tick off to-dos straight from the desktop widget.', icon: 'reminders', run: ({ wm }) => wm.open('reminders') },
    ],
  },
  {
    id: 'personalise',
    title: 'Personalise',
    blurb: 'Make the desktop look and feel the way you like.',
    colors: ['#ff9f0a', '#ff375f'],
    tips: [
      { id: 'dark', title: 'Switch to Dark Mode', text: 'Easy on the eyes — every app follows along.', icon: 'settings', run: ({ toggleAppearance }) => toggleAppearance() },
      { id: 'wallpaper', title: 'Change the wallpaper', text: 'Pick a new backdrop in System Settings.', icon: 'photos', run: ({ wm }) => wm.open('settings', { pane: 'wallpaper' }) },
      { id: 'dock', title: 'Dock magnification', text: 'Make Dock icons grow as your pointer passes over.', icon: 'launchpad', run: ({ wm }) => wm.open('settings', { pane: 'dock' }) },
      { id: 'home', title: 'Set a Home scene', text: 'Try “Good Morning”, “Focus Mode” or “Good Night” — each one really changes this portfolio.', icon: 'home', run: ({ wm }) => wm.open('home') },
      { id: 'weather', title: `Weather in ${personal.city}`, text: 'Live forecast, hourly and 10-day, plus your own cities.', icon: 'weather', run: ({ wm }) => wm.open('weather') },
    ],
  },
  {
    id: 'media',
    title: 'Media & Fun',
    blurb: 'Photos, sound and music.',
    colors: ['#bf5af2', '#ff375f'],
    tips: [
      { id: 'photo', title: 'Take a photo', text: 'Snap a picture with your webcam in the Camera app.', icon: 'camera', run: ({ wm }) => wm.open('camera') },
      { id: 'memo', title: 'Record a voice memo', text: 'Capture a quick recording with your microphone.', icon: 'voicememos', run: ({ wm }) => wm.open('voicememos') },
      {
        id: 'music',
        title: 'Music widget',
        text: 'Play, pause and skip from the desktop widget.',
        icon: 'music',
        run: ({ music }) => {
          if (!music.playing) music.play();
          notify({ app: 'Music', icon: 'music', title: `Now playing: ${music.track.title}`, body: 'Control playback from the Music widget on the desktop.' });
        },
      },
      { id: 'photos', title: 'Browse Photos', text: 'Portraits and screenshots, with a full-screen viewer.', icon: 'photos', run: ({ wm }) => wm.open('photos') },
      { id: 'photos-videos', title: 'Watch the portfolio videos', text: 'Photos → Videos plays screen recordings of this desktop.', icon: 'photos', run: ({ wm }) => wm.open('photos', { album: 'videos' }) },
      { id: 'tv', title: 'Watch in TV', text: 'Browse and play videos in a big-screen style app.', icon: 'tv', run: ({ wm }) => wm.open('tv') },
      { id: 'books', title: 'Read in Books', text: 'Open the Books app and browse the library.', icon: 'books', run: ({ wm }) => wm.open('books') },
      { id: 'gamecenter', title: 'Play in Game Center', text: 'Try the built-in games and see your scores.', icon: 'gamecenter', run: ({ wm }) => wm.open('gamecenter') },
    ],
  },
  {
    id: 'newapps',
    title: 'New apps',
    blurb: 'Recently added to this desktop — each one opens for real.',
    colors: ['#5e5ce6', '#32ade6'],
    tips: [
      { id: 'facetime', title: 'Start a FaceTime', text: `See your camera preview and ways to reach ${personal.name}. Calls are simulated.`, icon: 'facetime', run: ({ wm }) => wm.open('facetime') },
      { id: 'freeform', title: 'Sketch in Freeform', text: 'An endless board for notes, shapes and drawings.', icon: 'freeform', run: ({ wm }) => wm.open('freeform') },
      { id: 'siri', title: 'Ask Siri', text: 'Type a question about the portfolio and get an answer.', icon: 'siri', run: ({ wm }) => wm.open('siri') },
      { id: 'journal', title: 'Write in Journal', text: 'Capture thoughts — entries stay in your browser.', icon: 'journal', run: ({ wm }) => wm.open('journal') },
      { id: 'stocks', title: 'Check Stocks', text: 'A watchlist with charts. Prices are demo data.', icon: 'stocks', run: ({ wm }) => wm.open('stocks') },
      { id: 'dictionary', title: 'Look up a word', text: 'Search definitions in Dictionary.', icon: 'dictionary', run: ({ wm }) => wm.open('dictionary') },
      { id: 'passwords', title: 'Passwords', text: 'Generate strong passwords and see how the app is organised.', icon: 'passwords', run: ({ wm }) => wm.open('passwords') },
    ],
  },
  {
    id: 'desktop',
    title: 'Desktop tricks',
    blurb: 'Edit Launchpad, widgets and the Trash, and record your screen.',
    colors: ['#64d2ff', '#0a84ff'],
    tips: [
      { id: 'lp-edit', title: 'Rearrange or remove apps in Launchpad', text: 'Click Edit (or press and hold an icon) — drag to reorder, click × to move an app to the Trash.', icon: 'launchpad', keys: [['F4']], run: ({ sys }) => sys.setOverlay('launchpad') },
      { id: 'widgets', title: 'Edit desktop widgets', text: 'Right-click the desktop and choose Edit Widgets… to add, remove or resize them.', icon: 'settings', run: () => window.dispatchEvent(new Event('mra-edit-widgets')) },
      { id: 'putback', title: 'Put Back from the Trash', text: 'Deleted an app by mistake? Open the Trash and choose Put Back.', icon: 'trash', run: ({ wm }) => wm.open('finder', { folder: 'trash' }) },
      { id: 'screenrec', title: 'Record your screen', text: 'Control Center → Screen Recording. Your browser asks what to capture; the video is saved to your device.', icon: 'missioncontrol', run: ({ sys }) => sys.setOverlay('control') },
    ],
  },
];

/** "Mac User Guide"-style topic rows shown under the hero. */
const GUIDE_ROWS: { col: string; title: string; text: string; glyph: string }[] = [
  { col: 'newapps', title: 'New features in this desktop', text: 'FaceTime, Freeform, Siri, Journal, Stocks and more.', glyph: '☰' },
  { col: 'personalise', title: 'Add a personal touch', text: 'Change the wallpaper, Dark Mode and the Dock.', glyph: '◉' },
  { col: 'desktop', title: 'Manage apps and windows', text: 'Launchpad, widgets, the Trash and screen recording.', glyph: '▢' },
];

const ALL = COLLECTIONS.flatMap((c) => c.tips.map((t) => ({ tip: t, col: c })));

/** Tips-style collections: every “Show me” performs the tip for real. */
export default function TipsApp() {
  const wm = useWM();
  const sys = useSystem();
  const { settings, toggleAppearance } = useSettings();
  const music = useMusic();
  const [active, setActive] = useState('all');
  const [q, setQ] = useState('');
  const main = useRef<HTMLElement>(null);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return ALL.filter(({ tip, col }) => `${tip.title} ${tip.text} ${col.title}`.toLowerCase().includes(s));
  }, [q]);

  const today = useMemo(() => {
    const d = new Date();
    const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5);
    return ALL[day % ALL.length];
  }, []);

  const show = (t: Tip, e: RMouseEvent<HTMLButtonElement>) => t.run({ wm, sys, toggleAppearance, dark: settings.appearance === 'dark', music, e });

  const pick = (id: string) => {
    setActive(id);
    if (id === 'all') main.current?.scrollTo({ top: 0, behavior: 'smooth' });
    else main.current?.querySelector(`#tp-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="tp-root">
    <div className="tp">
      <nav className="tp-side" aria-label="Collections">
        <h2>Tips</h2>
        <button type="button" className={active === 'all' ? 'on' : ''} onClick={() => pick('all')}>
          <span className="tp-dot" style={{ background: 'linear-gradient(135deg,#ffd60a,#ff9f0a)' }} aria-hidden="true">
            ★
          </span>
          <span>Tip of the Day</span>
        </button>
        {COLLECTIONS.map((c) => (
          <button key={c.id} type="button" className={active === c.id ? 'on' : ''} onClick={() => pick(c.id)}>
            <span className="tp-dot" style={{ background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})` }} aria-hidden="true">
              {c.tips.length}
            </span>
            <span>{c.title}</span>
          </button>
        ))}
      </nav>

      <main className="tp-main scroll-smooth" ref={main}>
        <section className="tp7-help" aria-label="Help">
          <h1>Need help? Find answers here.</h1>
          <div className="tp7-search">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.4 10.4 3.2 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tips — try “dark”, “trash” or “record”" aria-label="Search tips" onKeyDown={(e) => e.key === 'Escape' && setQ('')} />
            {q && (
              <button type="button" aria-label="Clear search" onClick={() => setQ('')}>
                ×
              </button>
            )}
          </div>
          {q.trim() ? (
            <div className="tp7-results fade-swap" aria-live="polite">
              <p className="tp7-rcount">
                {results.length} result{results.length === 1 ? '' : 's'} for “{q.trim()}”
              </p>
              {results.map(({ tip, col }) => (
                <div key={tip.id} className="tp7-row">
                  <span className="tp7-row-ico">
                    <AppIcon name={tip.icon} />
                  </span>
                  <span className="tp7-row-t">
                    <b>{tip.title}</b>
                    <small>
                      {col.title} · {tip.text}
                    </small>
                  </span>
                  <button type="button" className="tp-show" onClick={(e) => show(tip, e)} aria-label={`Show me: ${tip.title}`}>
                    Show me
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="tp7-guide">
              <button type="button" className="tp7-book" onClick={() => pick('start')}>
                <span className="tp7-book-os">Tips</span>
                <b>Portfolio Desktop Guide</b>
                <small>See the full guide for this desktop</small>
              </button>
              <div className="tp7-topics">
                {GUIDE_ROWS.map((r) => (
                  <button key={r.col} type="button" className="tp7-topic" onClick={() => pick(r.col)}>
                    <span className="tp7-glyph" aria-hidden="true">
                      {r.glyph}
                    </span>
                    <span>
                      <b>{r.title}</b>
                      <small>{r.text}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="tp-hero" style={{ background: `linear-gradient(135deg, ${today.col.colors[0]}, ${today.col.colors[1]})` }} aria-label="Tip of the day">
          <div className="tp-hero-txt">
            <span className="tp-kicker">Tip of the Day · {today.col.title}</span>
            <h1>{today.tip.title}</h1>
            <p>{today.tip.text}</p>
            {today.tip.keys && <Keys keys={today.tip.keys} light />}
            <button type="button" className="tp-show tp-show-hero" onClick={(e) => show(today.tip, e)}>
              Show me
            </button>
          </div>
          <span className="tp-hero-ico">
            <AppIcon name={today.tip.icon} />
          </span>
        </section>

        {COLLECTIONS.map((c) => (
          <section key={c.id} id={`tp-${c.id}`} className="tp-col">
            <header>
              <h2>{c.title}</h2>
              <p>{c.blurb}</p>
            </header>
            <div className="tp-cards">
              {c.tips.map((t) => (
                <article key={t.id} className="tp-card">
                  <div className="tp-illo" style={{ background: `linear-gradient(135deg, ${c.colors[0]}22, ${c.colors[1]}33)` }}>
                    <span className="tp-illo-ico">
                      <AppIcon name={t.icon} />
                    </span>
                  </div>
                  <div className="tp-card-body">
                    <h3>{t.title}</h3>
                    <p>{t.text}</p>
                    {t.keys && <Keys keys={t.keys} />}
                    <button type="button" className="tp-show" onClick={(e) => show(t, e)} aria-label={`Show me: ${t.title}`}>
                      Show me
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        <p className="tp-foot">Every “Show me” button performs the tip inside this portfolio desktop.</p>
      </main>
    </div>
    </div>
  );
}

function Keys({ keys, light }: { keys: string[][]; light?: boolean }) {
  return (
    <div className={`tp-keys ${light ? 'light' : ''}`}>
      {keys.map((combo, i) => (
        <span key={i} className="tp-combo">
          {i > 0 && <em>or</em>}
          {combo.map((k) => (
            <kbd key={k}>{k}</kbd>
          ))}
        </span>
      ))}
    </div>
  );
}
