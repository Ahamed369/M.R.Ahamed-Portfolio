import { useEffect, useMemo, useRef, useState } from 'react';
import { AppIcon } from './AppIcons';
import { LAUNCH_ITEMS, type LaunchItem } from '../system/launch';
import { useLaunch } from '../system/useLaunch';
import { useCustomize } from '../system/customize';

/**
 * v9 — the "Applications" pop-up shown when the Launchpad Dock icon is
 * double-clicked (single click still opens Launchpad). A glass panel with
 * category tabs and an app grid, like the Applications view in macOS.
 */
const CATS = ['All', 'Utilities', 'Productivity & Finance', 'Creativity', 'Entertainment', 'Social', 'Other'] as const;
type Cat = (typeof CATS)[number];

const MAP: Record<Exclude<Cat, 'All' | 'Other'>, string[]> = {
  Utilities: [
    'finder', 'settings', 'sysprefs', 'terminal', 'calculator', 'clock', 'measure', 'passwords', 'dictionary', 'preview', 'pdfreader', 'findmy',
    'home', 'tips', 'siri', 'weather', 'maps', 'missioncontrol', 'activity', 'fontbook', 'colormeter', 'translate', 'stickies', 'google',
  ],
  'Productivity & Finance': [
    'mail', 'calendar', 'reminders', 'notes', 'contacts', 'pages', 'numbers', 'keynote', 'stocks', 'wallet', 'word', 'excel', 'powerpoint',
    'drive', 'gmail', 'yahoomail', 'classroom', 'xcode', 'github', 'w3schools', 'hireme', 'services', 'cv', 'grapher', 'chatgpt', 'claude', 'gemini', 'deepseek', 'askai',
  ],
  Creativity: ['photos', 'camera', 'photobooth', 'freeform', 'figma', 'voicememos', 'journal', 'gphotos', 'slides', 'achievements', 'canva', 'pinterest'],
  Entertainment: ['music', 'tv', 'podcasts', 'books', 'gamecenter', 'youtube', 'spotify', 'shazam', 'appstore', 'playstore'],
  Social: [
    'messages', 'facetime', 'whatsapp', 'telegram', 'xapp', 'linkedin', 'instagram', 'facebook', 'threads', 'snapchat', 'guestbook', 'discord', 'reddit',
    'stackoverflow',
  ],
};

export function catOf(id: string): Cat {
  for (const c of Object.keys(MAP) as (keyof typeof MAP)[]) if (MAP[c].includes(id)) return c;
  return 'Other';
}

export function ApplicationsPopup({ onClose }: { onClose: () => void }) {
  const launch = useLaunch();
  const cz = useCustomize();
  const [cat, setCat] = useState<Cat>('All');
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const removed = useMemo(() => new Set(cz.removedApps), [cz.removedApps]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    return LAUNCH_ITEMS.filter((i) => {
      if (seen.has(i.id) || removed.has(i.id)) return false;
      seen.add(i.id);
      return true;
    })
      .filter((i) => cat === 'All' || catOf(i.id) === cat)
      .filter((i) => !q.trim() || `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cat, q, removed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t) && !t.closest('[data-dock-id="launchpad"]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => window.addEventListener('pointerdown', onDown), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
      window.clearTimeout(id);
    };
  }, [onClose]);

  const run = (i: LaunchItem) => {
    launch(i.action, i.label);
    onClose();
  };

  return (
    <div className="apps-pop" ref={ref} role="dialog" aria-label="Applications">
      <header className="apps-pop-head">
        <strong>Applications</strong>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search applications" autoFocus />
      </header>
      <nav className="apps-pop-tabs" role="tablist">
        {CATS.map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </nav>
      <div className="apps-pop-grid" key={cat}>
        {items.map((i, n) => (
          <button key={i.id} className="apps-pop-item" style={{ animationDelay: `${Math.min(n, 30) * 12}ms` }} onClick={() => run(i)} title={i.label}>
            <AppIcon name={i.icon} className="apps-pop-ic" />
            <span>{i.label}</span>
          </button>
        ))}
        {!items.length && <p className="apps-pop-empty">No applications</p>}
      </div>
      <footer className="apps-pop-foot">{items.length} apps · single-click the Launchpad icon for the full-screen view</footer>
    </div>
  );
}
