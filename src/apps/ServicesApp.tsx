import { useEffect, useMemo, useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { ALL_SERVICES, SERVICE_AREAS, SERVICE_GROUPS, type ServiceGroupId } from '../data/services';
import { personal, projects, socials, ventures } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { openExternal } from '../system/notify';
import { deepLink, sharePortfolio } from '../system/share';
import type { AppProps } from '../components/Desktop';

type Filter = 'all' | ServiceGroupId | `area:${string}`;

/**
 * v9 — My Services: "Expertise & Capabilities".
 * Two groups (01 Technology, 02 Entrepreneurship & Business), filterable by
 * group / area and searchable. Each service links to evidence that already
 * exists in the portfolio (projects → Case Studies / GitHub, ventures → Finder).
 */
export default function ServicesApp({ win }: AppProps) {
  const wm = useWM();
  const [filter, setFilter] = useState<Filter>((win.args?.filter as Filter) || 'all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(win.args?.service ?? null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  useEffect(() => {
    if (win.args?.filter) setFilter(win.args.filter as Filter);
    if (win.args?.service) setOpen(win.args.service);
  }, [win.launchKey, win.args?.filter, win.args?.service]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ALL_SERVICES.filter((s) => {
      if (filter === 'technology' || filter === 'business') {
        if (s.area.group !== filter) return false;
      } else if (filter.startsWith('area:') && s.area.id !== filter.slice(5)) return false;
      return !needle || `${s.title} ${s.desc} ${s.tags.join(' ')} ${s.area.title}`.toLowerCase().includes(needle);
    });
  }, [filter, q]);

  const sel = open ? ALL_SERVICES.find((s) => s.id === open) : undefined;
  const heading =
    filter === 'all'
      ? 'Expertise & Capabilities'
      : filter === 'technology' || filter === 'business'
        ? SERVICE_GROUPS.find((g) => g.id === filter)!.title
        : SERVICE_AREAS.find((a) => a.id === filter.slice(5))!.title;

  // group results by area for the section headers
  const sections = SERVICE_AREAS.map((a) => ({ a, items: list.filter((s) => s.area.id === a.id) })).filter((x) => x.items.length);

  const wa = () => openExternal(socials.whatsapp, { title: 'Opening WhatsApp chat with M.R. Ahamed', app: 'WhatsApp', icon: 'whatsapp' });

  return (
    <div className="svc">
      <aside className="svc-side">
        <DragBar className="svc-drag">
          <Lights />
        </DragBar>
        <input className="svc-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services" aria-label="Search services" />
        <nav className="svc-nav" aria-label="Service categories">
          <button type="button" className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            <span className="svc-dot" style={{ background: 'linear-gradient(135deg,#6e8bff,#ff5c9a)' }} />
            All Services <em>{ALL_SERVICES.length}</em>
          </button>
          {SERVICE_GROUPS.map((g) => (
            <div key={g.id} className="svc-nav-group">
              <button type="button" className={`svc-nav-head ${filter === g.id ? 'on' : ''}`} onClick={() => setFilter(g.id)}>
                <b>{g.num}</b> {g.title}
              </button>
              {SERVICE_AREAS.filter((a) => a.group === g.id && (g.id === 'business' || SERVICE_AREAS.filter((x) => x.group === g.id).length > 1)).map((a) => (
                <button key={a.id} type="button" className={filter === `area:${a.id}` ? 'on' : ''} onClick={() => setFilter(`area:${a.id}`)}>
                  <span className="svc-dot" style={{ background: a.color }} />
                  {a.icon} {a.title} <em>{a.services.length}</em>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="svc-side-links">
          <button type="button" onClick={() => openExternal(socials.github, { title: 'Opening GitHub — Ahamed369', app: 'Safari', icon: 'github' })}>
            GitHub ↗
          </button>
          <button type="button" onClick={() => openExternal(socials.linkedin, { title: 'Opening LinkedIn — M.R. Ahamed', app: 'Safari', icon: 'linkedin' })}>
            LinkedIn ↗
          </button>
        </div>
      </aside>

      <main className="svc-main scroll-smooth">
        <DragBar className="svc-top">
          <span className="svc-top-lights">
            <Lights />
          </span>
          <span className="svc-crumb">My Services › {heading}</span>
          <div className="svc-seg" role="group" aria-label="View">
            <button type="button" className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Grid view">
              ▦
            </button>
            <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="List view">
              ☰
            </button>
          </div>
          <button type="button" className="svc-mini" onClick={() => void sharePortfolio({ title: `${personal.name} — Services`, text: 'Expertise & Capabilities', url: deepLink('services', {}) })}>
            Share
          </button>
        </DragBar>

        {filter === 'all' && !q && (
          <header className="svc-hero">
            <span className="svc-kicker">{personal.name}</span>
            <h1>Expertise &amp; Capabilities</h1>
            <p>Technology services backed by real projects, and business experience from ventures in automotive, international trade, electronics and property.</p>
            <div className="svc-hero-groups">
              {SERVICE_GROUPS.map((g) => (
                <button key={g.id} type="button" onClick={() => setFilter(g.id)}>
                  <b>{g.num}</b>
                  <span>
                    <strong>{g.title}</strong>
                    <small>{g.blurb}</small>
                  </span>
                </button>
              ))}
            </div>
          </header>
        )}

        <div className="svc-chips" role="tablist" aria-label="Filter">
          {(['all', 'technology', 'business'] as const).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'technology' ? '01 · Technology' : '02 · Entrepreneurship & Business'}
            </button>
          ))}
          {SERVICE_AREAS.filter((a) => a.group === 'business').map((a) => (
            <button key={a.id} type="button" role="tab" aria-selected={filter === `area:${a.id}`} className={filter === `area:${a.id}` ? 'on' : ''} onClick={() => setFilter(`area:${a.id}`)}>
              {a.icon} {a.title}
            </button>
          ))}
        </div>

        {sections.map(({ a, items }) => {
          const v = a.venture ? ventures.find((x) => x.id === a.venture) : undefined;
          return (
            <section key={a.id} className="svc-sec" style={{ ['--c' as string]: a.color }}>
              <header>
                <h2>
                  <span className="svc-ico">{a.icon}</span>
                  {a.group === 'technology' ? '01 — Technology' : a.title}
                </h2>
                {v && (
                  <button type="button" className="svc-venture" onClick={() => wm.open('finder', { folder: 'all', item: v.id })}>
                    {v.company} · {v.role} ›
                  </button>
                )}
              </header>
              <div className={`svc-${view}`} key={`${filter}-${q}-${view}`}>
                {items.map((s, i) => {
                  const ev = (s.projects ?? []).map((id) => projects.find((p) => p.id === id)).filter(Boolean);
                  return (
                    <button key={s.id} type="button" className="svc-card" style={{ animationDelay: `${i * 45}ms` }} onClick={() => setOpen(s.id)}>
                      <span className="svc-card-ico">{a.icon}</span>
                      <b>{s.title}</b>
                      <p>{s.desc}</p>
                      <span className="svc-tags">
                        {s.tags.map((t) => (
                          <i key={t}>{t}</i>
                        ))}
                      </span>
                      {ev.length > 0 && <small className="svc-ev">{ev.length} related project{ev.length === 1 ? '' : 's'}</small>}
                      {v && <small className="svc-ev">via {v.company}</small>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {list.length === 0 && <p className="svc-empty">No services match “{q}”.</p>}

        <footer className="svc-cta">
          <div>
            <b>Let’s work together</b>
            <span>Tell me what you need — I reply on WhatsApp or email.</span>
          </div>
          <button type="button" className="svc-btn wa" onClick={wa}>
            WhatsApp
          </button>
          <button type="button" className="svc-btn" onClick={() => wm.open('hireme')}>
            Hire Me
          </button>
          <button type="button" className="svc-btn" onClick={() => wm.open('mail', { compose: '1' })}>
            Email
          </button>
        </footer>
      </main>

      {sel && (
        <div className="svc-sheet-back" onClick={() => setOpen(null)}>
          <div className="svc-sheet" role="dialog" aria-label={sel.title} style={{ ['--c' as string]: sel.area.color }} onClick={(e) => e.stopPropagation()}>
            <span className="svc-sheet-ico">{sel.area.icon}</span>
            <span className="svc-kicker">{sel.area.group === 'technology' ? '01 — Technology' : `02 — ${sel.area.title}`}</span>
            <h2>{sel.title}</h2>
            <p>{sel.desc}</p>
            <div className="svc-tags">
              {sel.tags.map((t) => (
                <i key={t}>{t}</i>
              ))}
            </div>
            {(sel.projects ?? []).length > 0 && (
              <div className="svc-evidence">
                <h3>Related projects</h3>
                {(sel.projects ?? []).map((id) => {
                  const p = projects.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} className="svc-proj">
                      <span className="svc-dot" style={{ background: p.preview.accent }} />
                      <span>
                        <b>{p.name}</b>
                        <small>{p.category}</small>
                      </span>
                      <button type="button" onClick={() => wm.open('casestudies', { project: p.id })}>
                        Case study
                      </button>
                      {p.repo && (
                        <a href={p.repo} target="_blank" rel="noopener noreferrer">
                          GitHub ↗
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {sel.area.venture &&
              (() => {
                const v = ventures.find((x) => x.id === sel.area.venture);
                return v ? (
                  <div className="svc-evidence">
                    <h3>Experience</h3>
                    <div className="svc-proj">
                      <span className="svc-dot" style={{ background: v.color }} />
                      <span>
                        <b>{v.company}</b>
                        <small>
                          {v.role} · {v.duration}
                        </small>
                      </span>
                      <button type="button" onClick={() => wm.open('finder', { folder: 'all', item: v.id })}>
                        Open
                      </button>
                    </div>
                  </div>
                ) : null;
              })()}
            <div className="svc-sheet-actions">
              <button type="button" className="svc-btn wa" onClick={wa}>
                Ask on WhatsApp
              </button>
              <button type="button" className="svc-btn" onClick={() => openExternal(socials.linkedin, { title: 'Opening LinkedIn — M.R. Ahamed', app: 'Safari', icon: 'linkedin' })}>
                LinkedIn
              </button>
              <button type="button" className="svc-btn ghost" onClick={() => setOpen(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
