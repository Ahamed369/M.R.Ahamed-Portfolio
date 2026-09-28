import { useMemo, useRef, useState } from 'react';
import { personal, projects, type Project } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { notify, openExternal } from '../system/notify';
import { requireSignIn, setAccount, useAccount } from '../system/account';
import { usePersisted } from '../system/useStore';

/* ───────── v8: "Get" needs a Portfolio ID / Google sign-in, then installs ───────── */
function useInstalled() {
  return usePersisted<string[]>('mra-appstore-installed', []);
}
function GetButton({ p, big, onOpen }: { p: Project; big?: boolean; onOpen: () => void }) {
  const [installed, setInstalled] = useInstalled();
  const [prog, setProg] = useState<number | null>(null);
  const has = installed.includes(p.id);
  const get = async () => {
    if (has) return onOpen();
    const ok = await requireSignIn(`Sign in to get “${p.name}” from the App Store.`);
    if (!ok) return;
    setProg(0);
    const t0 = performance.now();
    const step = () => {
      const v = Math.min(1, (performance.now() - t0) / 1400);
      setProg(v);
      if (v < 1) requestAnimationFrame(step);
      else {
        setProg(null);
        setInstalled((l) => [...l, p.id]);
        notify({ app: 'App Store', icon: 'appstore', title: `${p.name} is ready`, body: 'Added to your library — press OPEN to explore it.', actions: [{ label: 'Open', primary: true, run: onOpen }] });
      }
    };
    requestAnimationFrame(step);
  };
  if (prog !== null)
    return (
      <span className={`as-get as-prog ${big ? 'big' : ''}`} aria-label="Downloading" role="progressbar" aria-valuenow={Math.round(prog * 100)}>
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.4" />
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeDasharray={`${prog * 56.5} 56.5`} transform="rotate(-90 12 12)" strokeLinecap="round" />
          <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
        </svg>
      </span>
    );
  return (
    <button type="button" className={`as-get ${big ? 'big' : ''}`} onClick={() => void get()} aria-label={has ? `Open ${p.name}` : `Get ${p.name}`}>
      {has ? 'OPEN' : big ? 'Get' : 'GET'}
    </button>
  );
}
function AccountRow() {
  const a = useAccount();
  return (
    <div className="as-acct">
      {a ? (
        <>
          <span className="as-acct-av">{a.picture ? <img src={a.picture} alt="" referrerPolicy="no-referrer" /> : a.name.slice(0, 1).toUpperCase()}</span>
          <span>
            <b>{a.name}</b>
            <small>{a.kind === 'google' ? a.email ?? 'Google account' : 'Portfolio ID (demo)'}</small>
          </span>
          <button type="button" onClick={() => setAccount(null)}>
            Sign Out
          </button>
        </>
      ) : (
        <button type="button" className="as-signin" onClick={() => void requireSignIn('Sign in to download apps from the App Store.')}>
          Sign In
        </button>
      )}
    </div>
  );
}

/* ───────────────────────────── Categories (derived from the data) ───────────────────────────── */

type Platform = 'Web' | 'Mobile' | 'Desktop';
type View = 'discover' | 'web' | 'mobile' | 'desktop' | 'resume';

/** Mobile when the stack lists mobile tooling, Desktop when it is a Swing / Tkinter GUI, otherwise Web. */
function platform(p: Project): Platform {
  if (p.stack.mobile?.length) return 'Mobile';
  if ((p.stack.frontend ?? []).some((f) => /swing|tkinter/i.test(f))) return 'Desktop';
  return 'Web';
}

const LANG: Record<Project['lang'], string> = { php: 'PHP', js: 'JavaScript', jsx: 'React', java: 'Java', py: 'Python', html: 'HTML' };

const NAV: { id: View; label: string; glyph: string; title: string }[] = [
  { id: 'discover', label: 'Discover', glyph: 'M10 2.5l2.2 4.6 5 .6-3.7 3.5.9 5-4.4-2.4-4.4 2.4.9-5L2.8 7.7l5-.6z', title: 'Discover' },
  { id: 'web', label: 'Web', glyph: 'M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zm0 0c-2 2-3 4.6-3 7.5s1 5.5 3 7.5m0-15c2 2 3 4.6 3 7.5s-1 5.5-3 7.5M2.8 8h14.4M2.8 12h14.4', title: 'Web Apps' },
  { id: 'mobile', label: 'Mobile', glyph: 'M7 2.5h6a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 16V4A1.5 1.5 0 0 1 7 2.5zM9 15h2', title: 'Mobile Apps' },
  { id: 'desktop', label: 'Desktop', glyph: 'M3 4h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm4 13.5h6M10 14v3.5', title: 'Desktop Apps' },
  { id: 'resume', label: 'Resume-only', glyph: 'M5.5 2.5h6l3 3v12h-9zm6 0v3h3M8 10h4.5M8 13h4.5', title: 'Resume-only Projects' },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

function inView(p: Project, v: View): boolean {
  if (v === 'resume') return p.group === 'Resume';
  if (v === 'web') return platform(p) === 'Web';
  if (v === 'mobile') return platform(p) === 'Mobile';
  if (v === 'desktop') return platform(p) === 'Desktop';
  return true;
}

const allStack = (p: Project) => Array.from(new Set(Object.values(p.stack).flat() as string[]));
const fmtDate = (d?: string) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');

/* ───────────────────────────── App ───────────────────────────── */

export default function AppStoreApp() {
  const wm = useWM();
  const [view, setView] = useState<View>('discover');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const main = useRef<HTMLElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return projects.filter((p) => [p.name, p.category, p.description, LANG[p.lang], ...allStack(p)].some((x) => x.toLowerCase().includes(t)));
  }, [q]);

  const go = (id: string | null) => {
    setOpen(id);
    main.current?.scrollTo({ top: 0 });
  };
  const detail = open ? projects.find((p) => p.id === open) : undefined;
  const nav = NAV.find((n) => n.id === view) ?? NAV[0];
  const featured = projects.find((p) => p.status === 'In development' && p.repo) ?? projects[0];

  const openXcode = (p: Project) => wm.open('xcode', { project: p.id });

  return (
    <div className="as-root">
    <div className="as">
      <aside className="as-side">
        <label className="as-search">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m10.5 10.5 3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(null);
            }}
            placeholder="Search"
            aria-label="Search projects"
          />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ('')}>
              ✕
            </button>
          )}
        </label>
        <nav className="as-nav" aria-label="Categories">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={view === n.id && !q ? 'on' : ''}
              aria-current={view === n.id && !q}
              onClick={() => {
                setView(n.id);
                setQ('');
                go(null);
              }}
            >
              <svg className="as-nav-ico" viewBox="0 0 20 20" aria-hidden="true">
                <path d={n.glyph} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="as-me">
          <img src={personal.avatar} alt="" />
          <span>
            <b>{personal.name}</b>
            <small>Developer</small>
          </span>
        </div>
        <AccountRow />
      </aside>

      <main className="as-main scroll-smooth" ref={main}>
        {detail ? (
          <Detail key={detail.id} p={detail} onBack={() => go(null)} onXcode={() => openXcode(detail)} />
        ) : q.trim() ? (
          <div className="as-page fade-swap">
            <h1 className="as-h1">Results for “{q.trim()}”</h1>
            {results.length ? <Grid list={results} onOpen={go} onGet={openXcode} /> : <p className="as-empty">No projects match your search.</p>}
          </div>
        ) : view === 'discover' ? (
          <div className="as-page fade-swap">
            <h1 className="as-h1">Discover</h1>
            <button type="button" className="as-hero" style={{ background: `linear-gradient(135deg, ${featured.preview.accent}, ${featured.preview.accent2})` }} onClick={() => go(featured.id)}>
              <span className="as-hero-kicker">Featured · {featured.status}</span>
              <span className="as-hero-title">{featured.name}</span>
              <span className="as-hero-tag">{featured.preview.tagline}</span>
              <span className="as-hero-row">
                <Tile p={featured} size={52} />
                <span className="as-hero-desc">{featured.description}</span>
              </span>
            </button>
            {(['web', 'mobile', 'desktop', 'resume'] as View[]).map((v) => {
              const list = projects.filter((p) => inView(p, v));
              if (!list.length) return null;
              const n = NAV.find((x) => x.id === v)!;
              return (
                <section key={v} className="as-section">
                  <div className="as-sec-head">
                    <h2>{n.title}</h2>
                    <button type="button" onClick={() => setView(v)}>
                      See All
                    </button>
                  </div>
                  <Grid list={list.slice(0, 6)} onOpen={go} onGet={openXcode} />
                </section>
              );
            })}
          </div>
        ) : (
          <div className="as-page fade-swap">
            <h1 className="as-h1">{nav.title}</h1>
            {view === 'resume' && <p className="as-note">These projects appear on M.R. Ahamed’s CV but don’t have a public GitHub repository.</p>}
            <Grid list={projects.filter((p) => inView(p, view))} onOpen={go} onGet={openXcode} />
          </div>
        )}
      </main>
    </div>
    </div>
  );
}

/* ───────────────────────────── Pieces ───────────────────────────── */

function Tile({ p, size = 56 }: { p: Project; size?: number }) {
  return (
    <span className="as-tile" style={{ width: size, height: size, background: `linear-gradient(145deg, ${p.preview.accent}, ${p.preview.accent2})`, fontSize: size * 0.34 }} aria-hidden="true">
      {initials(p.name)}
      <span className="as-tile-lang">{LANG[p.lang]}</span>
    </span>
  );
}

function Grid({ list, onOpen, onGet }: { list: Project[]; onOpen: (id: string) => void; onGet: (p: Project) => void }) {
  return (
    <div className="as-grid">
      {list.map((p) => (
        <div key={p.id} className="as-item">
          <button type="button" className="as-item-main" onClick={() => onOpen(p.id)} aria-label={`${p.name} — details`}>
            <Tile p={p} />
            <span className="as-item-txt">
              <b>{p.name}</b>
              <small>
                {platform(p)} · {LANG[p.lang]}
              </small>
              <span>{p.description}</span>
            </span>
          </button>
          <GetButton p={p} onOpen={() => onGet(p)} />
        </div>
      ))}
    </div>
  );
}

function Detail({ p, onBack, onXcode }: { p: Project; onBack: () => void; onXcode: () => void }) {
  const groups: [string, string[] | undefined][] = [
    ['Frontend', p.stack.frontend],
    ['Backend', p.stack.backend],
    ['Mobile', p.stack.mobile],
    ['Database', p.stack.database],
    ['APIs', p.stack.apis],
    ['Security', p.stack.security],
    ['Tools', p.stack.tools],
  ];
  const info: [string, string][] = [
    ['Developer', personal.name],
    ['Category', p.category],
    ['Platform', platform(p)],
    ['Language', LANG[p.lang]],
    ['Status', p.status],
    ...(p.period ? ([['Period', p.period]] as [string, string][]) : []),
    ['Last updated', p.updated ? fmtDate(p.updated) : 'Not published'],
    ['Source', p.repo ? 'Public GitHub repository' : 'Resume-only — no public repository'],
  ];
  return (
    <div className="as-page as-detail fade-swap">
      <button type="button" className="as-back" onClick={onBack}>
        ‹ Back
      </button>
      <header className="as-d-head">
        <Tile p={p} size={112} />
        <div className="as-d-title">
          <h1>{p.name}</h1>
          <p>{p.category}</p>
          <div className="as-d-actions">
            <GetButton p={p} big onOpen={onXcode} />
            {p.repo && (
              <button
                type="button"
                className="as-ghost"
                onClick={() => void requireSignIn(`Sign in to download the source code of ${p.name}.`).then((ok) => ok && openExternal(`${p.repo}/archive/HEAD.zip`, { title: `Downloading ${p.name} source`, app: 'App Store', icon: 'appstore' }))}
              >
                ⬇︎ Source code
              </button>
            )}
            {p.repo && (
              <button type="button" className="as-ghost" onClick={() => openExternal(p.repo!, { title: `Opening ${p.name} on GitHub`, app: 'App Store', icon: 'github' })}>
                View on GitHub ↗
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="as-facts">
        <div>
          <small>STATUS</small>
          <b>{p.status}</b>
        </div>
        <div>
          <small>UPDATED</small>
          <b>{p.updated ? fmtDate(p.updated) : '—'}</b>
        </div>
        <div>
          <small>LANGUAGE</small>
          <b>{LANG[p.lang]}</b>
        </div>
        <div>
          <small>PLATFORM</small>
          <b>{platform(p)}</b>
        </div>
      </div>

      <div className="as-shot" style={{ background: `linear-gradient(135deg, ${p.preview.accent}, ${p.preview.accent2})` }}>
        <span className="as-shot-tabs">
          {p.preview.tabs.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </span>
        <span className="as-shot-tag">{p.preview.tagline}</span>
        <small>Illustrative banner — not a real screenshot</small>
      </div>

      {!p.repo && (
        <div className="as-callout" role="note">
          <b>No public repository</b>
          <span>{p.name} is listed on M.R. Ahamed’s CV. Its source code isn’t published on GitHub, so there’s nothing to download — you can explore a generated code overview in Xcode instead.</span>
        </div>
      )}

      <section className="as-sec">
        <h2>Overview</h2>
        <p>{p.overview}</p>
      </section>
      <section className="as-sec">
        <h2>Features</h2>
        <ul className="as-feats">
          {p.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>
      {p.responsibilities?.length ? (
        <section className="as-sec">
          <h2>What M.R. Ahamed built</h2>
          <ul className="as-feats">
            {p.responsibilities.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="as-sec">
        <h2>Tech Stack</h2>
        {groups
          .filter(([, v]) => v?.length)
          .map(([k, v]) => (
            <div key={k} className="as-chips-row">
              <small>{k}</small>
              <div className="as-chips">
                {v!.map((s) => (
                  <span key={s} className="as-chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        {p.architecture && <p className="as-arch">{p.architecture}</p>}
      </section>
      <section className="as-sec">
        <h2>Information</h2>
        <dl className="as-info">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
