import { useEffect, useMemo, useState } from 'react';
import { readStore, writeStore } from '../system/storage';
import type { AppProps } from '../components/Desktop';
import { useRef } from 'react';
import { DragBar, Lights } from '../components/Window';
import { AppIcon, type IconName } from '../components/AppIcons';
import { personal, projects, socials, cv } from '../data/portfolio';
import { notify } from '../system/notify';

interface Fav {
  label: string;
  href: string;
  icon?: IconName;
  mono?: string;
  color?: string;
  sub?: string;
}

const FAVORITES: Fav[] = [
  { label: 'GitHub', href: socials.github, icon: 'github', sub: socials.githubHandle },
  { label: 'LinkedIn', href: socials.linkedin, icon: 'linkedin', sub: 'M.R. Ahamed' },
  { label: 'Instagram', href: socials.instagram, icon: 'instagram', sub: socials.instagramHandle },
  { label: 'Facebook', href: socials.facebook, icon: 'facebook', sub: 'M.R. Ahamed' },
  { label: 'Threads', href: socials.threads, icon: 'threads', sub: socials.instagramHandle },
  { label: 'Spotify', href: socials.spotify, icon: 'spotify', sub: 'My Spotify profile' },
  { label: 'Email', href: socials.email, icon: 'email', sub: personal.email },
  { label: 'Call', href: personal.phoneHref, icon: 'phone', sub: personal.phone },
  { label: 'CV (PDF)', href: cv.url, icon: 'pdf', sub: cv.fileName },
];

const RESOURCES: Fav[] = [
  { label: 'Figma', href: 'https://www.figma.com/', icon: 'figma', sub: 'Design & prototyping' },
  { label: 'W3Schools', href: 'https://www.w3schools.com/', icon: 'w3schools', sub: 'Web reference' },
  { label: 'YouTube', href: 'https://www.youtube.com/', icon: 'youtube', sub: 'Video' },
  { label: 'MDN Web Docs', href: 'https://developer.mozilla.org/', mono: 'MDN', sub: 'Web documentation' },
];

/* ───── v10.1 — tabs, Private Browsing and Reading List ───── */

interface Tab {
  id: string;
  q: string;
  priv: boolean;
}
interface ReadItem {
  label: string;
  href: string;
  sub?: string;
  added: number;
  read?: boolean;
}
const TABS_KEY = 'mra-safari-tabs-v10';
const READ_KEY = 'mra-safari-reading-v10';
const newTab = (priv = false): Tab => ({ id: Math.random().toString(36).slice(2, 8), q: '', priv });

function useReading() {
  const [list, setList] = useState<ReadItem[]>(() => readStore<{ list: ReadItem[] }>(READ_KEY, { list: [] }).list ?? []);
  useEffect(() => writeStore(READ_KEY, { list }), [list]);
  const has = (href: string) => list.some((x) => x.href === href);
  const toggle = (f: { label: string; href: string; sub?: string }) => setList((l) => (l.some((x) => x.href === f.href) ? l.filter((x) => x.href !== f.href) : [{ label: f.label, href: f.href, sub: f.sub, added: Date.now() }, ...l]));
  return { list, setList, has, toggle };
}

export default function SafariApp({ win }: Partial<AppProps>) {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const t = (readStore<{ tabs: Tab[] }>(TABS_KEY, { tabs: [] }).tabs ?? []).filter((x) => !x.priv);
    return t.length ? t : [newTab()];
  });
  const [active, setActive] = useState(() => tabs[0].id);
  const [grid, setGrid] = useState(false);
  const [gridPriv, setGridPriv] = useState(false);
  const [sheet, setSheet] = useState(false);
  const reading = useReading();
  const urlRef = useRef<HTMLInputElement>(null);
  // v10.2 — Control Centre → "Search the Web" opens Safari with the field ready
  useEffect(() => {
    if (win?.args?.focus) window.setTimeout(() => urlRef.current?.focus(), 250);
  }, [win?.launchKey, win?.args?.focus]);
  useEffect(() => writeStore(TABS_KEY, { tabs: tabs.filter((t) => !t.priv) }), [tabs]);
  const cur = tabs.find((t) => t.id === active) ?? tabs[0];
  const query = cur.q;
  const setQuery = (q: string) => setTabs((l) => l.map((t) => (t.id === cur.id ? { ...t, q } : t)));
  const addTab = (priv = cur.priv) => {
    const t = newTab(priv);
    setTabs((l) => [...l, t]);
    setActive(t.id);
    setGrid(false);
  };
  const closeTab = (id: string) =>
    setTabs((l) => {
      const rest = l.filter((t) => t.id !== id);
      const next = rest.length ? rest : [newTab()];
      if (id === active) setActive((next[l.findIndex((t) => t.id === id) - 1] ?? next[0]).id);
      return next;
    });
  const shown = tabs.filter((t) => t.priv === gridPriv);
  const tabTitle = (t: Tab) => (t.q ? `“${t.q}”` : t.priv ? 'Private' : 'Start Page');
  const star = (f: Fav | { label: string; href: string; sub?: string }) => (
    <button
      type="button"
      className={`sf-star ${reading.has(f.href) ? 'on' : ''}`}
      aria-label={reading.has(f.href) ? `Remove ${f.label} from Reading List` : `Add ${f.label} to Reading List`}
      title={reading.has(f.href) ? 'In Reading List' : 'Add to Reading List'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        reading.toggle(f);
      }}
    >
      {reading.has(f.href) ? '★' : '☆'}
    </button>
  );

  const repos = useMemo(() => projects.filter((p) => p.repo), []);
  const q = query.trim().toLowerCase();
  const filteredRepos = q ? repos.filter((p) => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q)) : repos;
  const filteredFavs = q ? FAVORITES.filter((f) => `${f.label} ${f.sub}`.toLowerCase().includes(q)) : FAVORITES;

  const submit = () => {
    if (!q) return;
    if (/^https?:\/\//.test(query.trim())) {
      window.open(query.trim(), '_blank', 'noopener,noreferrer');
      return;
    }
    // v10.2 — a plain search goes to the web (results open in a new tab; private tabs aren't remembered here)
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query.trim())}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="safari">
      <DragBar className="safari-bar">
        <Lights />
        <div className="safari-nav" aria-hidden="true">
          <span className="chev">‹</span>
          <span className="chev dim">›</span>
        </div>
        <form
          className="safari-url"
          data-nodrag
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="lock">
            <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm1.5 0h4V5a2 2 0 0 0-4 0Z" />
          </svg>
          <input
            ref={urlRef}
            aria-label="Search projects or enter address"
            placeholder="Search projects or the web"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="safari-tools sf-tools" data-nodrag>
          <button type="button" aria-label="Reading List" title="Reading List" onClick={() => setSheet(true)}>
            ☰
          </button>
          <button type="button" aria-label="New Tab" title="New Tab" onClick={() => addTab()}>
            ＋
          </button>
          <button type="button" aria-label={`Show all tabs (${tabs.length})`} title="Show All Tabs" onClick={() => (setGridPriv(cur.priv), setGrid(true))}>
            <span className="sf-count">{tabs.length}</span>
          </button>
        </div>
      </DragBar>
      {tabs.length > 1 && (
        <div className="sf-strip" role="tablist" aria-label="Tabs">
          {tabs.map((t) => (
            <div key={t.id} role="tab" aria-selected={t.id === cur.id} className={`sf-tab ${t.id === cur.id ? 'on' : ''} ${t.priv ? 'priv' : ''}`} onClick={() => setActive(t.id)}>
              <button type="button" aria-label="Close tab" onClick={(e) => (e.stopPropagation(), closeTab(t.id))}>
                ✕
              </button>
              <span>{tabTitle(t)}</span>
            </div>
          ))}
        </div>
      )}
      <div className={`safari-page scroll-smooth ${cur.priv ? 'sf-private' : ''}`}>
        {cur.priv && (
          <p className="sf-priv-note">
            <b>Private Browsing</b> — searches in this tab aren’t remembered.
          </p>
        )}
        <section>
          <h2>Favorites</h2>
          <div className="fav-grid">
            {filteredFavs.map((f) => (
              <a
                key={f.label}
                className="fav"
                href={f.href}
                target={f.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                download={f.href === cv.url ? cv.fileName : undefined}
                title={f.sub}
                onClick={() => notify({ app: 'Safari', icon: 'safari', title: `Opening ${f.label}`, body: f.sub })}
              >
                <span className="fav-icon">{f.icon ? <AppIcon name={f.icon} /> : f.mono}</span>
                <span className="fav-label">{f.label}</span>
                {f.href.startsWith('http') && star(f)}
              </a>
            ))}
          </div>
        </section>
        <section>
          <h2>Repositories on GitHub</h2>
          <div className="fav-grid">
            {filteredRepos.map((p) => (
              <a
                key={p.id}
                className="fav"
                href={p.repo}
                target="_blank"
                rel="noopener noreferrer"
                title={p.description}
                onClick={() => notify({ app: 'GitHub', icon: 'github', title: `Opening ${p.name} repository` })}
              >
                <span className="fav-icon mono" style={{ background: `linear-gradient(160deg, ${p.preview.accent}, ${p.preview.accent2})` }}>
                  {p.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')}
                </span>
                <span className="fav-label">{p.name}</span>
                {p.repo && star({ label: p.name, href: p.repo, sub: p.category })}
              </a>
            ))}
          </div>
          {!filteredRepos.length && !filteredFavs.length && <p className="muted">No matches here — press Return to search the web.</p>}
        </section>
        {!q && (
          <section>
            <h2>Developer Resources</h2>
            <div className="fav-grid">
              {RESOURCES.map((f) => (
                <a key={f.label} className="fav" href={f.href} target="_blank" rel="noopener noreferrer" title={f.sub} onClick={() => notify({ app: 'Safari', icon: 'safari', title: `Opening ${f.label}` })}>
                  <span className={`fav-icon ${f.icon ? '' : 'mono dark'}`}>{f.icon ? <AppIcon name={f.icon} /> : f.mono}</span>
                  <span className="fav-label">{f.label}</span>
                </a>
              ))}
            </div>
          </section>
        )}
        {reading.list.length > 0 && !q && (
          <section>
            <h2>Reading List</h2>
            <div className="sf-rl-row">
              {reading.list.slice(0, 6).map((r) => (
                <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer" className="sf-rl-card" onClick={() => reading.setList((l) => l.map((x) => (x.href === r.href ? { ...x, read: true } : x)))}>
                  <b>{r.label}</b>
                  <small>{r.sub ?? new URL(r.href).hostname}</small>
                </a>
              ))}
            </div>
          </section>
        )}
        <section className="privacy">
          <h2>About</h2>
          <p>
            Websites such as GitHub and LinkedIn block being embedded, so links open safely in a new browser tab. {personal.name} · {personal.location}
          </p>
        </section>
      </div>
      <nav className="sf-bottom" aria-label="Safari toolbar">
        <button type="button" aria-label="Back" disabled>
          ‹
        </button>
        <button type="button" aria-label="Forward" disabled>
          ›
        </button>
        <button type="button" aria-label="Reading List" onClick={() => setSheet(true)}>
          ☰
        </button>
        <button type="button" aria-label="New Tab" onClick={() => addTab()}>
          ＋
        </button>
        <button type="button" aria-label={`Show all tabs (${tabs.length})`} onClick={() => (setGridPriv(cur.priv), setGrid(true))}>
          <span className="sf-count">{tabs.length}</span>
        </button>
      </nav>
      {grid && (
        <div className={`sf-grid ${gridPriv ? 'priv' : ''}`} role="dialog" aria-label="All tabs">
          <div className="sf-grid-cards">
            {shown.map((t) => (
              <div key={t.id} className={`sf-card ${t.id === cur.id ? 'on' : ''}`} onClick={() => (setActive(t.id), setGrid(false))} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && (setActive(t.id), setGrid(false))}>
                <div className="sf-card-top">
                  <span>{tabTitle(t)}</span>
                  <button type="button" aria-label="Close tab" onClick={(e) => (e.stopPropagation(), closeTab(t.id))}>
                    ✕
                  </button>
                </div>
                <div className="sf-card-thumb">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ))}
            {!shown.length && <p className="sf-grid-empty">{gridPriv ? 'Private Browsing — tabs you open here aren’t remembered.' : 'No tabs'}</p>}
          </div>
          <div className="sf-grid-bar">
            <button type="button" onClick={() => addTab(gridPriv)} aria-label="New tab">
              ＋
            </button>
            <span className="sf-seg" role="radiogroup" aria-label="Tab group">
              <button type="button" role="radio" aria-checked={gridPriv} className={gridPriv ? 'on' : ''} onClick={() => setGridPriv(true)}>
                Private
              </button>
              <button type="button" role="radio" aria-checked={!gridPriv} className={!gridPriv ? 'on' : ''} onClick={() => setGridPriv(false)}>
                {tabs.filter((t) => !t.priv).length} Tabs
              </button>
            </span>
            <button type="button" onClick={() => (shown.length ? setGrid(false) : addTab(gridPriv))}>
              Done
            </button>
          </div>
        </div>
      )}
      {sheet && (
        <div className="sf-sheet-back" onClick={() => setSheet(false)}>
          <div className="sf-sheet" role="dialog" aria-label="Reading List" onClick={(e) => e.stopPropagation()}>
            <header>
              <b>Reading List</b>
              <button type="button" onClick={() => setSheet(false)}>
                Done
              </button>
            </header>
            {!reading.list.length && <p className="sf-sheet-empty">Tap ☆ on any favourite or repository to save it here for later.</p>}
            {reading.list.map((r) => (
              <div key={r.href} className={`sf-sheet-row ${r.read ? 'read' : ''}`}>
                <a href={r.href} target="_blank" rel="noopener noreferrer" onClick={() => reading.setList((l) => l.map((x) => (x.href === r.href ? { ...x, read: true } : x)))}>
                  <b>{r.label}</b>
                  <small>{r.sub ?? r.href}</small>
                </a>
                <button type="button" aria-label={`Remove ${r.label}`} onClick={() => reading.toggle(r)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
