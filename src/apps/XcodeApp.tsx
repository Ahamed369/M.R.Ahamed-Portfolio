import { useEffect, useMemo, useRef, useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { projects, socials, type Project } from '../data/portfolio';
import { deviceName, generateCode, highlight } from './xcode/codegen';
import { ProjectPreview } from './xcode/ProjectPreview';
import type { AppProps } from '../components/Desktop';
import { useSettings } from '../system/SettingsContext';
import { notify, openExternal } from '../system/notify';

const LANG_COLOR: Record<Project['lang'], string> = {
  php: '#8892bf',
  js: '#f1d33d',
  jsx: '#61dafb',
  java: '#f0932b',
  py: '#3776ab',
  html: '#e34f26',
};

const GROUPS: { id: Project['group']; label: string }[] = [
  { id: 'GitHub', label: 'GitHub Repositories' },
  { id: 'Resume', label: 'Resume Projects' },
];

function Code({ p }: { p: Project }) {
  const lines = useMemo(() => {
    let inC = false;
    return generateCode(p).map((l) => {
      const r = highlight(l, inC);
      inC = r.inComment;
      return r.toks;
    });
  }, [p]);
  return (
    <div className="code" role="region" aria-label={`${p.file} source`}>
      {lines.map((toks, i) => (
        <div key={i} className="code-line">
          <span className="ln">{i + 1}</span>
          <span className="lc">
            {toks.map((t, j) =>
              t.t === 'plain' ? (
                t.v
              ) : (
                <span key={j} className={`tk-${t.t}`}>
                  {t.v}
                </span>
              ),
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function Inspector({ p }: { p: Project }) {
  const rows: [string, string[] | undefined][] = [
    ['Frontend', p.stack.frontend],
    ['Backend', p.stack.backend],
    ['Mobile', p.stack.mobile],
    ['Database', p.stack.database],
    ['APIs', p.stack.apis],
    ['Security', p.stack.security],
    ['Tools', p.stack.tools],
  ];
  return (
    <div className="inspector scroll-smooth">
      <h3>{p.name}</h3>
      <div className="insp-cat">{p.category}</div>
      <div className="insp-meta">
        <span className={`badge ${p.status === 'Completed' ? 'ok' : 'wip'}`}>{p.status}</span>
        {p.period && <span className="badge">{p.period}</span>}
      </div>
      <p>{p.overview}</p>
      <h4>Key Features</h4>
      <ul>
        {p.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {p.responsibilities && (
        <>
          <h4>My Role</h4>
          <ul>
            {p.responsibilities.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </>
      )}
      <h4>Technology Stack</h4>
      <dl className="insp-stack">
        {rows
          .filter(([, v]) => v?.length)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>
                {v!.map((x) => (
                  <span key={x} className="chip">
                    {x}
                  </span>
                ))}
              </dd>
            </div>
          ))}
      </dl>
      {p.updated && (
        <>
          <h4>Last repository update</h4>
          <p>{new Date(p.updated + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </>
      )}
      {p.architecture && (
        <>
          <h4>Architecture</h4>
          <p>{p.architecture}</p>
        </>
      )}
      <h4>Repository</h4>
      {p.repo ? (
        <button type="button" className="insp-link" onClick={() => openExternal(p.repo!, { title: `Opening ${p.name} repository`, app: 'GitHub', icon: 'github' })}>
          {p.repo.replace('https://', '')} ↗
        </button>
      ) : (
        <p className="muted">Not publicly listed on GitHub (project from my CV).</p>
      )}
    </div>
  );
}

export default function XcodeApp({ win }: AppProps) {
  const { motionReduced } = useSettings();
  const initial = win.args?.project && projects.some((p) => p.id === win.args?.project) ? win.args.project : projects[0].id;
  const [activeId, setActiveId] = useState(initial);
  const [tabs, setTabs] = useState<string[]>([initial]);
  const [navTab, setNavTab] = useState<'files' | 'search'>('files');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({ root: true, GitHub: true, Resume: true });
  const [showNav, setShowNav] = useState(true);
  const [pane, setPane] = useState<'preview' | 'info'>('preview');
  const [showPane, setShowPane] = useState(() => window.innerWidth >= 700);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const p = projects.find((x) => x.id === activeId) ?? projects[0];

  // Re-launch from elsewhere (e.g. Terminal `open <project>`)
  useEffect(() => {
    if (win.args?.project) select(win.args.project);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.launchKey]);

  // Simulator "boot" when switching projects (blur + spinner, as in the reference)
  useEffect(() => {
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), motionReduced ? 0 : 750);
    editorRef.current?.scrollTo({ top: 0, behavior: motionReduced ? 'auto' : 'smooth' });
    return () => window.clearTimeout(t);
  }, [activeId, motionReduced]);

  function select(id: string, announce = false) {
    if (announce && id !== activeId) {
      const x = projects.find((y) => y.id === id);
      if (x) notify({ app: 'Xcode', icon: 'xcode', title: `Project selected — ${x.name}`, body: x.category });
    }
    setActiveId(id);
    // v10 — on a phone the navigator slides away once a file is picked
    if (window.innerWidth < 700) setShowNav(false);
    setTabs((t) => (t.includes(id) ? t : [...t, id]));
  }

  const closeTab = (id: string) => {
    if (tabs.length === 1) return; // keep at least one file open
    const idx = tabs.indexOf(id);
    const next = tabs.filter((x) => x !== id);
    setTabs(next);
    if (id === activeId) setActiveId(next[Math.max(0, idx - 1)]);
  };

  const run = () => {
    setBuilding(true);
    setLoading(true);
    window.setTimeout(() => {
      setBuilding(false);
      setLoading(false);
    }, motionReduced ? 0 : 1100);
  };

  const q = query.trim().toLowerCase();
  const matches = q
    ? projects.filter((x) =>
        [x.name, x.file, x.category, x.description, ...Object.values(x.stack).flat()].join(' ').toLowerCase().includes(q),
      )
    : [];

  const fileRow = (x: Project, depth: number) => (
    <button
      key={x.id}
      type="button"
      className={`nav-row ${x.id === activeId ? 'sel' : ''}`}
      style={{ paddingLeft: 10 + depth * 14 }}
      onClick={() => select(x.id, true)}
      title={x.name}
    >
      <span className="file-ico" style={{ background: LANG_COLOR[x.lang] }} />
      {x.file}
    </button>
  );

  return (
    <div className={`xcode ${showNav ? '' : 'no-nav'} ${showPane ? '' : 'no-pane'}`}>
      <DragBar className="xc-toolbar">
        <Lights />
        <button type="button" className="xc-tool" aria-label="Toggle navigator" aria-pressed={showNav} onClick={() => setShowNav((s) => !s)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="11" rx="2" fill="none" stroke="currentColor" />
            <path d="M6 2.5v11" stroke="currentColor" />
          </svg>
        </button>
        <button type="button" className={`xc-run ${building ? 'busy' : ''}`} aria-label="Build and run" onClick={run}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5Z" />
          </svg>
        </button>
        <div className="xc-scheme">
          <span className="xc-scheme-ico" />
          <b>Portfolio</b>
          <span className="sep">›</span>
          <span className="hide-sm">{deviceName(p)}</span>
        </div>
        <div className="xc-status" aria-live="polite">
          <span className="xc-status-main">{building ? `Building ${p.name}…` : 'Build Succeeded'}</span>
          <span className="xc-status-sub">{p.name} | Today</span>
        </div>
        <button type="button" className="xc-gh" onClick={() => openExternal(p.repo ?? socials.github, { title: p.repo ? `Opening ${p.name} repository` : 'Opening GitHub — Ahamed369', app: 'GitHub', icon: 'github' })} title={p.repo ? 'Open repository on GitHub' : 'Open GitHub profile'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
          </svg>
          <span className="hide-sm">{p.repo ? 'Repository' : 'GitHub'}</span>
        </button>
        <button type="button" className="xc-tool" aria-label="Toggle preview pane" aria-pressed={showPane} onClick={() => setShowPane((s) => !s)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="11" rx="2" fill="none" stroke="currentColor" />
            <path d="M10 2.5v11" stroke="currentColor" />
          </svg>
        </button>
      </DragBar>

      <div className="xc-body">
        {/* ───────────── Navigator ───────────── */}
        <nav className="xc-nav" aria-label="Project navigator">
          <div className="xc-nav-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={navTab === 'files'} className={navTab === 'files' ? 'on' : ''} onClick={() => setNavTab('files')} aria-label="Files">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M1.5 4a1 1 0 0 1 1-1h4l1.5 1.5h5.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" />
              </svg>
            </button>
            <button type="button" role="tab" aria-selected={navTab === 'search'} className={navTab === 'search' ? 'on' : ''} onClick={() => setNavTab('search')} aria-label="Find in project">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="xc-tree scroll-smooth">
            {navTab === 'files' ? (
              <>
                <button type="button" className="nav-row folder root" onClick={() => setOpen((o) => ({ ...o, root: !o.root }))} aria-expanded={open.root}>
                  <span className={`disc ${open.root ? 'open' : ''}`}>▸</span>
                  <span className="proj-ico" /> Portfolio
                </button>
                {open.root &&
                  GROUPS.map((g) => {
                    const items = projects.filter((x) => x.group === g.id);
                    if (!items.length) return null;
                    return (
                      <div key={g.id}>
                        <button
                          type="button"
                          className="nav-row folder"
                          style={{ paddingLeft: 24 }}
                          onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
                          aria-expanded={open[g.id]}
                        >
                          <span className={`disc ${open[g.id] ? 'open' : ''}`}>▸</span>
                          <span className="folder-ico" /> {g.label}
                          <span className="nav-count">{items.length}</span>
                        </button>
                        {open[g.id] && items.map((x) => fileRow(x, 3))}
                      </div>
                    );
                  })}
              </>
            ) : (
              <div className="xc-search">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find (e.g. React, MySQL)" aria-label="Find in project" autoFocus />
                {q && <div className="xc-search-count">{matches.length} result{matches.length === 1 ? '' : 's'}</div>}
                {matches.map((x) => fileRow(x, 0))}
              </div>
            )}
          </div>
        </nav>

        {/* ───────────── Editor ───────────── */}
        <section className="xc-editor" aria-label="Editor">
          <div className="xc-tabs" role="tablist">
            {tabs.map((id) => {
              const x = projects.find((y) => y.id === id);
              if (!x) return null;
              return (
                <div key={id} className={`xc-tab ${id === activeId ? 'on' : ''}`} role="tab" aria-selected={id === activeId}>
                  <button type="button" className="xc-tab-close" aria-label={`Close ${x.file}`} onClick={() => closeTab(id)}>
                    ×
                  </button>
                  <button type="button" className="xc-tab-name" onClick={() => setActiveId(id)}>
                    <span className="file-ico" style={{ background: LANG_COLOR[x.lang] }} />
                    {x.file}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="xc-jump">
            Portfolio <span>›</span> {p.group === 'GitHub' ? 'GitHub Repositories' : 'Resume Projects'} <span>›</span> <b>{p.file}</b>
          </div>
          <div className="xc-code scroll-smooth" ref={editorRef}>
            <div key={p.id} className="fade-swap">
              <Code p={p} />
            </div>
          </div>
        </section>

        {/* ───────────── Preview / Inspector ───────────── */}
        <aside className="xc-pane" aria-label="Preview and project details">
          <div className="xc-pane-head">
            <span className="live-dot" />
            <span className="xc-pane-title">
              {p.name} — {p.preview.kind === 'phone' ? 'Emulator' : 'Preview'}
            </span>
            <div className="seg-ctl" role="tablist">
              <button type="button" role="tab" aria-selected={pane === 'preview'} className={pane === 'preview' ? 'on' : ''} onClick={() => setPane('preview')}>
                Preview
              </button>
              <button type="button" role="tab" aria-selected={pane === 'info'} className={pane === 'info' ? 'on' : ''} onClick={() => setPane('info')}>
                Info
              </button>
            </div>
          </div>
          {pane === 'preview' ? (
            <div className="xc-sim">
              <div className={`sim-stage ${loading ? 'loading' : ''}`}>
                <ProjectPreview key={p.id} p={p} />
              </div>
              {loading && <span className="spinner light sim-spin" aria-label="Loading preview" />}
              <div className="sim-caption">Illustrative UI mock-up · {deviceName(p)}</div>
            </div>
          ) : (
            <Inspector p={p} />
          )}
        </aside>
      </div>
    </div>
  );
}
