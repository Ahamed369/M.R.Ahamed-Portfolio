import { useEffect, useRef, useState } from 'react';
import { personal, socials } from '../data/portfolio';
import { openExternal } from '../system/notify';
import { useWM } from '../system/WindowManager';
import { AppIcon, type IconName } from '../components/AppIcons';

const SHORTCUTS: { label: string; url: string; icon: IconName }[] = [
  { label: 'GitHub', url: socials.github, icon: 'github' },
  { label: 'LinkedIn', url: socials.linkedin, icon: 'linkedin' },
  { label: 'YouTube', url: 'https://www.youtube.com/', icon: 'youtube' },
  { label: 'W3Schools', url: 'https://www.w3schools.com/', icon: 'w3schools' },
  { label: 'Figma', url: 'https://www.figma.com/', icon: 'figma' },
  { label: 'Instagram', url: socials.instagram, icon: 'instagram' },
];

/**
 * Google-style start page. Google cannot be embedded inside another site, so
 * searches open google.com in a new tab (Maps opens the built-in Maps app).
 */
export default function GoogleApp() {
  const wm = useWM();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = (query: string, lucky = false) => {
    const t = query.trim();
    if (!t) return;
    const url = lucky ? `https://www.google.com/search?q=${encodeURIComponent(t)}&btnI=1` : `https://www.google.com/search?q=${encodeURIComponent(t)}`;
    openExternal(url, { title: 'Searching Google', body: t, app: 'Google', icon: 'google' });
  };

  return (
    <div className="google">
      <div className="gg-top">
        <button type="button" className="gg-link" onClick={() => openExternal('https://mail.google.com/', { title: 'Opening Gmail', app: 'Google', icon: 'google' })}>
          Gmail
        </button>
        <button type="button" className="gg-link" onClick={() => openExternal('https://images.google.com/', { title: 'Opening Google Images', app: 'Google', icon: 'google' })}>
          Images
        </button>
        <button type="button" className="gg-link" onClick={() => wm.open('maps')}>
          Maps
        </button>
        <img className="gg-avatar" src={personal.avatar} alt="" />
      </div>
      <div className="gg-center">
        <div className="gg-logo" aria-label="Google">
          <span style={{ color: '#4285f4' }}>G</span>
          <span style={{ color: '#ea4335' }}>o</span>
          <span style={{ color: '#fbbc05' }}>o</span>
          <span style={{ color: '#4285f4' }}>g</span>
          <span style={{ color: '#34a853' }}>l</span>
          <span style={{ color: '#ea4335' }}>e</span>
        </div>
        <form
          className="gg-box"
          onSubmit={(e) => {
            e.preventDefault();
            search(q);
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Google or type a URL" aria-label="Search Google" />
        </form>
        <div className="gg-buttons">
          <button type="button" className="gg-btn" onClick={() => search(q)}>
            Google Search
          </button>
          <button type="button" className="gg-btn" onClick={() => search(q, true)}>
            I’m Feeling Lucky
          </button>
        </div>
        <div className="gg-suggest">
          Try:{' '}
          {['M.R. Ahamed GitHub Ahamed369', 'SLIIT City Uni', 'Kandy Sri Lanka'].map((s) => (
            <button key={s} type="button" onClick={() => search(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="gg-shortcuts">
          {SHORTCUTS.map((s) => (
            <button key={s.label} type="button" className="gg-sc" onClick={() => openExternal(s.url, { title: `Opening ${s.label}`, app: 'Google', icon: 'google' })}>
              <span className="gg-sc-ico">
                <AppIcon name={s.icon} />
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="gg-foot">Searches open google.com in a new tab — Google can’t be embedded inside another website.</div>
    </div>
  );
}
