import type { CSSProperties } from 'react';
import type { Project } from '../../data/portfolio';

/**
 * Illustrative, generated UI mock-up of a project inside a device frame
 * (not a screenshot) — built from the project's real feature list.
 */
export function ProjectPreview({ p }: { p: Project }) {
  const { accent, accent2, tabs, tagline } = p.preview;
  const style = { '--pa': accent, '--pb': accent2 } as CSSProperties;
  const host = p.repo ? `${p.id}.local` : 'localhost:3000';

  if (p.preview.kind === 'phone') {
    return (
      <div className="device phone" style={style}>
        <div className="phone-notch" />
        <div className="phone-status">
          <span>9:41</span>
          <span>▮▮▮ ◔</span>
        </div>
        <div className="pv-app">
          <div className="pv-appbar">
            <b>{p.name}</b>
          </div>
          <div className="pv-hero">
            <small>{tagline}</small>
            <div className="pv-ring">
              <svg viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="5" />
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--pa)" strokeWidth="5" strokeDasharray="68 32" strokeDashoffset="25" />
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="5" strokeDasharray="18 82" strokeDashoffset="57" />
              </svg>
            </div>
          </div>
          <div className="pv-list">
            {p.features.slice(0, 4).map((f, i) => (
              <div key={f} className="pv-row">
                <span className="pv-dot" style={{ opacity: 1 - i * 0.18 }} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <div className="pv-tabbar">
            {tabs.map((t, i) => (
              <span key={t} className={i === 0 ? 'on' : ''}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (p.preview.kind === 'desktop') {
    return (
      <div className="device desk" style={style}>
        <div className="desk-titlebar">
          <i />
          <i />
          <i />
          <span>{p.name}</span>
        </div>
        <div className="desk-body">
          <div className="desk-side">
            {tabs.map((t, i) => (
              <span key={t} className={i === 0 ? 'on' : ''}>
                {t}
              </span>
            ))}
          </div>
          <div className="desk-main">
            <b>{tabs[0]}</b>
            {p.features.map((f) => (
              <div key={f} className="desk-row">
                <span />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="device browser" style={style}>
      <div className="br-bar">
        <i />
        <i />
        <i />
        <span className="br-url">{host}</span>
      </div>
      <div className="br-page">
        <div className="br-nav">
          <b>{p.name}</b>
          <span className="br-tabs">
            {tabs.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </span>
        </div>
        <div className="br-hero">
          <h4>{p.name}</h4>
          <p>{tagline}</p>
          <span className="br-cta">Get started</span>
        </div>
        <div className="br-cards">
          {p.features.slice(0, 6).map((f) => (
            <div key={f} className="br-card">
              <span />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
