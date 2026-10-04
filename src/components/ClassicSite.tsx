import { useEffect } from 'react';
import { cv, cvBusinessRole, cvProjects, cvSkills, education, leadership, personal, socials, spokenLanguages } from '../data/portfolio';

/**
 * v10 — Quick View / Classic Site: the whole CV on one fast, printable page
 * (for recruiters in a hurry, slow devices and search engines).
 * Open with ?view=classic, the  menu, or Settings → Devices & View.
 */
export function ClassicSite({ onExit }: { onExit: () => void }) {
  useEffect(() => {
    document.title = `${personal.name} — CV (Quick View)`;
    document.documentElement.classList.add('classic-on');
    return () => {
      document.documentElement.classList.remove('classic-on');
      document.title = `${personal.name} — Portfolio`;
    };
  }, []);
  const stackOf = (p: ReturnType<typeof cvProjects>[number]) => Array.from(new Set(Object.values(p.stack).flat())).join(' · ');
  return (
    <div className="cls">
      <nav className="cls-bar" aria-label="Quick View">
        <b>&lt;/&gt; {personal.name}</b>
        <span className="cls-sp" />
        <a href={cv.url} download={cv.fileName}>
          Download CV
        </a>
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
        <button type="button" className="strong" onClick={onExit}>
          Open Interactive Portfolio
        </button>
      </nav>
      <main className="cls-page">
        <header className="cls-hero">
          <img src={personal.photo} alt={personal.name} />
          <div>
            <h1>{personal.name}</h1>
            <p className="cls-head">{personal.headline}</p>
            <p className="cls-meta">
              {personal.location} · <a href={`mailto:${personal.email}`}>{personal.email}</a> · <a href={personal.phoneHref}>{personal.phone}</a>
            </p>
            <p className="cls-links">
              <a href={socials.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
              <a href={socials.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </p>
            <span className="cls-status">● {personal.status}</span>
          </div>
        </header>

        <section>
          <h2>Profile</h2>
          <p>{personal.summary}</p>
          <p>{personal.objective}</p>
        </section>

        <section>
          <h2>Technical Skills</h2>
          <dl className="cls-skills">
            {cvSkills.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.items.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2>Projects</h2>
          {cvProjects().map((p) => (
            <article key={p.id} className="cls-proj">
              <h3>
                {p.name}
                {p.period && <small>{p.period}</small>}
              </h3>
              <p>{p.description}</p>
              {p.responsibilities && p.responsibilities.length > 0 && (
                <ul>
                  {p.responsibilities.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              <p className="cls-stack">{stackOf(p)}</p>
              <p className="cls-plinks">
                {p.repo && (
                  <a href={p.repo} target="_blank" rel="noopener noreferrer">
                    Repository ↗
                  </a>
                )}
                {p.teamRepo && (
                  <a href={p.teamRepo} target="_blank" rel="noopener noreferrer">
                    Team repository ↗
                  </a>
                )}
              </p>
            </article>
          ))}
        </section>

        <section>
          <h2>Experience</h2>
          <article className="cls-proj">
            <h3>
              {cvBusinessRole.title}
              <small>{cvBusinessRole.period}</small>
            </h3>
            <p className="cls-stack">{cvBusinessRole.org}</p>
            <ul>
              {cvBusinessRole.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        </section>

        <section>
          <h2>Education</h2>
          {education.map((e) => (
            <article key={e.id} className="cls-proj">
              <h3>
                {e.qualification}
                <small>{e.period}</small>
              </h3>
              <p className="cls-stack">
                {e.institution}
                {e.location ? ` · ${e.location}` : ''}
              </p>
              {e.details?.map((d) => (
                <p key={d}>{d}</p>
              ))}
            </article>
          ))}
        </section>

        <section className="cls-two">
          <div>
            <h2>Leadership & Activities</h2>
            <ul>
              {leadership.map((l) => (
                <li key={l.role}>
                  <b>{l.role}</b> — {l.org} <small>({l.period})</small>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Languages</h2>
            <ul>
              {spokenLanguages.map((l) => (
                <li key={l.name}>
                  <b>{l.name}</b> — {l.level}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <footer className="cls-foot">
          © {new Date().getFullYear()} {personal.name} ·{' '}
          <button type="button" onClick={onExit}>
            Open the interactive Mac / iPhone / iPad portfolio
          </button>
        </footer>
      </main>
    </div>
  );
}
