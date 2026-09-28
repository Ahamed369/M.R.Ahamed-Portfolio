import { useEffect, useMemo, useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { AppIcon } from '../components/AppIcons';
import { ProjectPreview } from './xcode/ProjectPreview';
import { projects, socials, type Project } from '../data/portfolio';
import { caseStudyById, type CaseStudy } from '../data/caseStudies';
import { useWM } from '../system/WindowManager';
import { deepLink, sharePortfolio } from '../system/share';
import { notify } from '../system/notify';
import type { AppProps } from '../components/Desktop';

/* ───────────── GitHub REST API (public, unauthenticated, cached) ───────────── */
interface RepoInfo {
  stars: number;
  forks: number;
  watchers: number;
  issues: number;
  size: number;
  pushed: string;
  branch: string;
  homepage?: string;
  languages: Record<string, number>;
  commits: { sha: string; msg: string; date: string; url: string }[];
  fetched: number;
}
const repoName = (url?: string) => url?.split('/').pop() ?? '';
const CKEY = (r: string) => `mra-gh-${r}`;

async function fetchRepo(repo: string): Promise<RepoInfo> {
  try {
    const c = sessionStorage.getItem(CKEY(repo));
    if (c) {
      const v = JSON.parse(c) as RepoInfo;
      if (Date.now() - v.fetched < 10 * 60000) return v;
    }
  } catch {
    /* ignore */
  }
  const base = `https://api.github.com/repos/${socials.githubHandle}/${repo}`;
  const h = { Accept: 'application/vnd.github+json' };
  const [r, l, c] = await Promise.all([fetch(base, { headers: h }), fetch(`${base}/languages`, { headers: h }), fetch(`${base}/commits?per_page=5`, { headers: h })]);
  if (!r.ok) throw new Error(r.status === 403 ? 'GitHub rate limit reached — try again later.' : `GitHub returned ${r.status}.`);
  const j = (await r.json()) as Record<string, unknown>;
  const langs = l.ok ? ((await l.json()) as Record<string, number>) : {};
  const commits = c.ok ? ((await c.json()) as { sha: string; html_url: string; commit: { message: string; author: { date: string } } }[]) : [];
  const info: RepoInfo = {
    stars: Number(j.stargazers_count ?? 0),
    forks: Number(j.forks_count ?? 0),
    watchers: Number(j.subscribers_count ?? j.watchers_count ?? 0),
    issues: Number(j.open_issues_count ?? 0),
    size: Number(j.size ?? 0),
    pushed: String(j.pushed_at ?? ''),
    branch: String(j.default_branch ?? 'main'),
    homepage: j.homepage ? String(j.homepage) : undefined,
    languages: langs,
    commits: commits.slice(0, 5).map((x) => ({ sha: x.sha.slice(0, 7), msg: x.commit.message.split('\n')[0], date: x.commit.author.date, url: x.html_url })),
    fetched: Date.now(),
  };
  try {
    sessionStorage.setItem(CKEY(repo), JSON.stringify(info));
  } catch {
    /* ignore */
  }
  return info;
}

const LANG_COLORS: Record<string, string> = { JavaScript: '#f1e05a', TypeScript: '#3178c6', PHP: '#4F5D95', Java: '#b07219', Python: '#3572A5', HTML: '#e34c26', CSS: '#563d7c', Hack: '#878787', Shell: '#89e051', Batchfile: '#C1F12E', Kotlin: '#A97BFF' };

function GitHubPanel({ p }: { p: Project }) {
  const repo = repoName(p.repo);
  const [state, setState] = useState<{ loading: boolean; info?: RepoInfo; err?: string }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!repo) return;
    let alive = true;
    setState({ loading: true });
    fetchRepo(repo)
      .then((info) => alive && setState({ loading: false, info }))
      .catch((e: Error) => alive && setState({ loading: false, err: e.message || 'Could not reach GitHub.' }));
    return () => {
      alive = false;
    };
  }, [repo, tick]);
  if (!p.repo) return <div className="cs-gh muted">This project is listed on my CV; its code isn’t in a public repository.</div>;
  const total = state.info ? Object.values(state.info.languages).reduce((a, b) => a + b, 0) : 0;
  return (
    <div className="cs-gh">
      <div className="cs-gh-head">
        <AppIcon name="github" />
        <b>{repo}</b>
        <button type="button" className="cs-mini" onClick={() => (sessionStorage.removeItem(CKEY(repo)), setTick((x) => x + 1))} disabled={state.loading}>
          ↻ Refresh
        </button>
      </div>
      {state.loading && <div className="cs-gh-skel">Loading repository status from the GitHub API…</div>}
      {state.err && (
        <div className="cs-gh-err">
          {state.err} Last known push: {p.updated ? new Date(p.updated).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}.
        </div>
      )}
      {state.info && (
        <>
          <div className="cs-gh-stats">
            <span>
              ★ <b>{state.info.stars}</b> stars
            </span>
            <span>
              ⑂ <b>{state.info.forks}</b> forks
            </span>
            <span>
              👁 <b>{state.info.watchers}</b> watching
            </span>
            <span>
              ⎇ <b>{state.info.branch}</b>
            </span>
            <span>
              ⬆︎ pushed <b>{new Date(state.info.pushed).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</b>
            </span>
          </div>
          {total > 0 && (
            <>
              <div className="cs-langbar" aria-label="Languages">
                {Object.entries(state.info.languages).map(([k, v]) => (
                  <i key={k} style={{ width: `${(v / total) * 100}%`, background: LANG_COLORS[k] ?? '#8e8e93' }} title={`${k} ${((v / total) * 100).toFixed(1)}%`} />
                ))}
              </div>
              <div className="cs-langs">
                {Object.entries(state.info.languages).map(([k, v]) => (
                  <span key={k}>
                    <i style={{ background: LANG_COLORS[k] ?? '#8e8e93' }} />
                    {k} {((v / total) * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            </>
          )}
          {state.info.commits.length > 0 && (
            <ol className="cs-commits">
              {state.info.commits.map((c) => (
                <li key={c.sha}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer">
                    <code>{c.sha}</code> {c.msg}
                  </a>
                  <small>{new Date(c.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                </li>
              ))}
            </ol>
          )}
          <small className="cs-gh-note">Fetched from the GitHub REST API {new Date(state.info.fetched).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · cached for 10 minutes.</small>
        </>
      )}
    </div>
  );
}

function markdown(p: Project, cs?: CaseStudy): string {
  const lines = [`# ${p.name} — Case Study`, '', `**${p.category}**${p.period ? ` · ${p.period}` : ''} · ${p.status}`, '', p.description, ''];
  if (cs) {
    lines.push('## Problem', cs.problem, '', '## Goals', ...cs.goals.map((g) => `- ${g}`), '', '## My role', cs.role, '', '## Process', ...cs.process.map((s) => `- **${s.step}** — ${s.detail}`), '', '## Challenges & solutions', ...cs.challenges.map((c) => `- **${c.challenge}** → ${c.solution}`), '', '## Outcomes', ...cs.outcomes.map((o) => `- ${o}`), '', '## What I learned', ...cs.learnings.map((o) => `- ${o}`), '');
    if (cs.next?.length) lines.push('## Next steps', ...cs.next.map((o) => `- ${o}`), '');
  }
  lines.push('## Technologies', ...Object.entries(p.stack).map(([k, v]) => `- **${k}**: ${(v ?? []).join(', ')}`), '');
  if (p.repo) lines.push(`Repository: ${p.repo}`);
  return lines.join('\n');
}

export default function CaseStudiesApp({ win }: AppProps) {
  const wm = useWM();
  const [sel, setSel] = useState<string>(win.args?.project && projects.some((p) => p.id === win.args?.project) ? win.args.project : projects[0].id);
  const [q, setQ] = useState('');
  const [side, setSide] = useState(true);
  useEffect(() => {
    if (win.args?.project) setSel(win.args.project);
  }, [win.launchKey, win.args?.project]);
  const list = useMemo(() => projects.filter((p) => !q || `${p.name} ${p.category} ${Object.values(p.stack).flat().join(' ')}`.toLowerCase().includes(q.toLowerCase())), [q]);
  const p = projects.find((x) => x.id === sel) ?? projects[0];
  const cs = caseStudyById(p.id);
  const stack = Object.entries(p.stack).filter(([, v]) => v && v.length) as [string, string[]][];

  const downloadMd = () => {
    const url = URL.createObjectURL(new Blob([markdown(p, cs)], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.id}-case-study.md`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify({ app: 'Case Studies', icon: 'casestudies', title: 'Case study downloaded', body: `${p.id}-case-study.md` });
  };

  return (
    <div className={`cs ${side ? '' : 'no-side'}`}>
      <aside className="cs-side">
        <DragBar className="cs-drag">
          <Lights />
        </DragBar>
        <input className="cs-search" placeholder="Search projects or tech" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search case studies" />
        <nav className="cs-list scroll-smooth">
          {list.map((x) => (
            <button key={x.id} type="button" className={`cs-item ${x.id === p.id ? 'on' : ''}`} style={{ ['--c' as string]: x.preview.accent }} onClick={() => setSel(x.id)}>
              <i />
              <span>
                <b>{x.name}</b>
                <small>{x.category}</small>
              </span>
            </button>
          ))}
          {list.length === 0 && <p className="cs-empty">No projects match “{q}”.</p>}
        </nav>
      </aside>
      <section className="cs-main scroll-smooth" key={p.id}>
        <DragBar className="cs-topbar">
          <button type="button" className="cs-mini" onClick={() => setSide((s) => !s)} aria-label="Toggle sidebar">
            ☰
          </button>
          <span className="cs-crumb">Case Studies › {p.name}</span>
          <button type="button" className="cs-mini" onClick={() => void sharePortfolio({ title: `${p.name} — case study`, text: `${p.name}: ${p.description}`, url: deepLink('casestudies', { project: p.id }) })}>
            Share
          </button>
        </DragBar>
        <header className="cs-hero" style={{ ['--c' as string]: p.preview.accent, ['--c2' as string]: p.preview.accent2 }}>
          <div className="cs-hero-text">
            <span className="cs-kicker">{p.category}</span>
            <h1>{p.name}</h1>
            <p>{p.description}</p>
            <div className="cs-meta">
              {p.period && <span>🗓 {p.period}</span>}
              <span>● {p.status}</span>
              <span>{p.group === 'GitHub' ? '🐙 Public repository' : '📄 From my CV'}</span>
            </div>
            <div className="cs-actions">
              {p.repo && (
                <a className="cs-btn primary" href={p.repo} target="_blank" rel="noopener noreferrer">
                  View on GitHub ↗
                </a>
              )}
              {p.demo && (
                <a className="cs-btn" href={p.demo} target="_blank" rel="noopener noreferrer">
                  Live demo ↗
                </a>
              )}
              {p.repo && (
                <a className="cs-btn" href={`${p.repo}/archive/HEAD.zip`} target="_blank" rel="noopener noreferrer">
                  ⬇︎ Source (.zip)
                </a>
              )}
              <button type="button" className="cs-btn" onClick={downloadMd}>
                ⬇︎ Case study (.md)
              </button>
              <button type="button" className="cs-btn" onClick={() => wm.open('xcode', { project: p.id })}>
                Open in Xcode
              </button>
            </div>
          </div>
          <div className="cs-shot" aria-hidden="true">
            <ProjectPreview p={p} />
          </div>
        </header>

        <div className="cs-body">
          <div className="cs-col">
            <section className="cs-sec">
              <h2>Overview</h2>
              <p>{p.overview}</p>
            </section>
            {cs && (
              <>
                <section className="cs-sec">
                  <h2>The problem</h2>
                  <p>{cs.problem}</p>
                  <h3>Goals</h3>
                  <ul className="cs-ul">
                    {cs.goals.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </section>
                <section className="cs-sec">
                  <h2>My role</h2>
                  <p>{cs.role}</p>
                </section>
                <section className="cs-sec">
                  <h2>Process</h2>
                  <ol className="cs-steps">
                    {cs.process.map((s, i) => (
                      <li key={s.step}>
                        <span className="cs-num">{i + 1}</span>
                        <div>
                          <b>{s.step}</b>
                          <p>{s.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="cs-sec">
                  <h2>Challenges & solutions</h2>
                  <div className="cs-cards">
                    {cs.challenges.map((c) => (
                      <div key={c.challenge} className="cs-card">
                        <span className="cs-tag warn">Challenge</span>
                        <b>{c.challenge}</b>
                        <span className="cs-tag ok">Solution</span>
                        <p>{c.solution}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
            <section className="cs-sec">
              <h2>Key features</h2>
              <ul className="cs-feat">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
            {cs && (
              <section className="cs-sec">
                <h2>Outcomes</h2>
                <ul className="cs-ul check">
                  {cs.outcomes.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                <h3>What I learned</h3>
                <ul className="cs-ul">
                  {cs.learnings.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                {cs.next && cs.next.length > 0 && (
                  <>
                    <h3>Next steps (from the README)</h3>
                    <ul className="cs-ul">
                      {cs.next.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}
          </div>
          <aside className="cs-col side">
            <section className="cs-sec">
              <h2>Technologies</h2>
              {stack.map(([k, v]) => (
                <div key={k} className="cs-stack">
                  <small>{k}</small>
                  <div>
                    {v.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </section>
            {p.architecture && (
              <section className="cs-sec">
                <h2>Architecture</h2>
                <p className="cs-arch">{p.architecture}</p>
              </section>
            )}
            <section className="cs-sec">
              <h2>GitHub status</h2>
              <GitHubPanel p={p} />
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
