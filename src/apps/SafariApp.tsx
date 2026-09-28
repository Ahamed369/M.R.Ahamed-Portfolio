import { useMemo, useState } from 'react';
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

export default function SafariApp() {
  const [query, setQuery] = useState('');
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
    window.open(`${socials.github}?tab=repositories&q=${encodeURIComponent(query.trim())}`, '_blank', 'noopener,noreferrer');
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
            aria-label="Search projects or enter address"
            placeholder="Start Page — search projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="safari-tools" aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <path d="M8 1.5v8M5 4.5l3-3 3 3M3 8v5.5h10V8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </DragBar>
      <div className="safari-page scroll-smooth">
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
              </a>
            ))}
          </div>
          {!filteredRepos.length && !filteredFavs.length && <p className="muted">No matches — press Return to search GitHub.</p>}
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
        <section className="privacy">
          <h2>About</h2>
          <p>
            Websites such as GitHub and LinkedIn block being embedded, so links open safely in a new browser tab. {personal.name} · {personal.location}
          </p>
        </section>
      </div>
    </div>
  );
}
