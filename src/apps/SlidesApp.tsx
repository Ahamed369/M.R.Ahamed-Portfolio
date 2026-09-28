import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { education, leadership, personal, projects, socials, spokenLanguages, ventures } from '../data/portfolio';

/* ───────────────────────────── slide content ───────────────────────────── */

interface SlideDef {
  id: string;
  title: string;
  render: () => ReactNode;
}

const githubCount = projects.filter((p) => p.repo).length;

const SLIDES: SlideDef[] = [
  {
    id: 'cover',
    title: 'Cover',
    render: () => (
      <div className="sl sl-cover">
        <div className="sl-cover-text">
          <div className="sl-kicker">ACHIEVEMENT DECK</div>
          <h1 className="sl-hero">
            M.R.
            <br />
            AHAMED
          </h1>
          <div className="sl-sub">Computer Science Undergraduate · Full-Stack Developer · Entrepreneur</div>
        </div>
        <img className="sl-cover-photo" src={personal.avatar} alt="" />
      </div>
    ),
  },
  {
    id: 'summary',
    title: 'Executive Summary',
    render: () => (
      <div className="sl">
        <h2 className="sl-h">EXECUTIVE SUMMARY</h2>
        <div className="sl-cols">
          <ul className="sl-checks">
            <li>BSc (Hons) Computer Science — SLIIT City Uni (University of Bedfordshire award)</li>
            <li>{projects.length} software projects across web, mobile, desktop and APIs</li>
            <li>{githubCount} public repositories on GitHub</li>
            <li>Java · JavaScript · Python · React · Node.js · PHP</li>
          </ul>
          <ul className="sl-checks">
            <li>Founder of Mobile Kingdom — 5+ years in mobile technology retail</li>
            <li>Co-Founder of Tasco Car Sale (Pvt) Ltd — 150+ vehicles sold</li>
            <li>Import & export specialist and residential-development associate</li>
            <li>Batch Representative, SLIIT Kandy UNI (2024–2025)</li>
          </ul>
        </div>
      </div>
    ),
  },
  ...ventures.map<SlideDef>((v) => ({
    id: v.id,
    title: v.company,
    render: () => (
      <div className="sl">
        <div className="sl-kicker" style={{ color: v.color }}>
          {v.role.toUpperCase()} · {v.duration.toUpperCase()}
        </div>
        <h2 className="sl-h">{v.company.toUpperCase()}</h2>
        <div className="sl-stats">
          {v.stats.map((s) => (
            <div key={s.label} className="sl-stat" style={{ borderColor: v.color }}>
              <b style={{ color: v.color }}>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        <ul className="sl-checks small">
          {v.highlights.slice(0, 5).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
    ),
  })),
  {
    id: 'projects',
    title: 'Projects',
    render: () => (
      <div className="sl">
        <h2 className="sl-h">PROJECTS PORTFOLIO</h2>
        <div className="sl-proj">
          {projects.map((p) => (
            <div key={p.id} className="sl-proj-item" style={{ borderColor: p.preview.accent }}>
              <b>{p.name}</b>
              <span>{p.category}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'leadership',
    title: 'Leadership',
    render: () => (
      <div className="sl">
        <h2 className="sl-h">LEADERSHIP & ACTIVITIES</h2>
        <ul className="sl-timeline">
          {leadership.map((l) => (
            <li key={l.role}>
              <b>{l.role}</b>
              <span>
                {l.org} · {l.period}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'education',
    title: 'Education',
    render: () => (
      <div className="sl">
        <h2 className="sl-h">EDUCATION</h2>
        <ul className="sl-timeline">
          {education.map((e) => (
            <li key={e.id}>
              <b>{e.qualification}</b>
              <span>
                {e.institution} · {e.period}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'thanks',
    title: 'Thank You',
    render: () => (
      <div className="sl sl-cover">
        <div className="sl-cover-text">
          <div className="sl-kicker">LET’S CONNECT</div>
          <h1 className="sl-hero small">THANK YOU</h1>
          <div className="sl-contact">
            <span>{personal.email}</span>
            <span>{personal.phone}</span>
            <span>github.com/{socials.githubHandle}</span>
            <span>{spokenLanguages.map((l) => l.name).join(' · ')}</span>
          </div>
        </div>
        <img className="sl-cover-photo" src={personal.avatar} alt="" />
      </div>
    ),
  },
];

/* ───────────────────────────── viewer ───────────────────────────── */

export default function SlidesApp() {
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [hover, setHover] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // focus the deck so ← / → work immediately
    rootRef.current?.focus({ preventScroll: true });
    const t1 = window.setTimeout(() => setLoading(false), 900);
    const t2 = window.setTimeout(() => setRevealed(true), 1250);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(SLIDES.length - 1, i));
      setDir(next >= index ? 1 : -1);
      setIndex(next);
    },
    [index],
  );

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(SLIDES.length - 1);
  };

  const fullscreen = () => {
    const el = rootRef.current;
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void el?.requestFullscreen();
    } catch {
      /* unsupported */
    }
  };

  const slide = SLIDES[index];

  return (
    <div className="slides" ref={rootRef} tabIndex={0} onKeyDown={onKey} aria-roledescription="presentation" aria-label="Achievements deck">
      <div className="slides-stage-wrap">
        <div className={`slide-stage ${revealed ? 'revealed' : ''}`} aria-live="polite">
          {!loading && (
            <div key={slide.id} className={`slide-anim ${dir > 0 ? 'from-right' : 'from-left'}`} aria-label={`Slide ${index + 1} of ${SLIDES.length}: ${slide.title}`}>
              {slide.render()}
            </div>
          )}
          {!loading && (
            <>
              <button type="button" className="slide-nav prev" aria-label="Previous slide" onClick={() => go(index - 1)} disabled={index === 0}>
                ‹
              </button>
              <button type="button" className="slide-nav next" aria-label="Next slide" onClick={() => go(index + 1)} disabled={index === SLIDES.length - 1}>
                ›
              </button>
            </>
          )}
        </div>
        {!revealed && (
          <div className={`slides-loading ${loading ? '' : 'fading'}`}>
            <span className="spinner light" />
            <span>Opening Achievements.pptx…</span>
          </div>
        )}
      </div>

      <div className="slides-bar">
        <div className="slides-progress" onPointerLeave={() => setHover(null)}>
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`seg ${i <= index ? 'done' : ''}`}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => go(i)}
            />
          ))}
          {hover !== null && (
            <div className="slide-thumb" style={{ left: `${((hover + 0.5) / SLIDES.length) * 100}%` }}>
              <div className="slide-stage mini revealed">{SLIDES[hover].render()}</div>
              <span>
                {hover + 1}. {SLIDES[hover].title}
              </span>
            </div>
          )}
        </div>
        <div className="slides-controls">
          <button type="button" className="sc-btn" onClick={() => go(index - 1)} aria-label="Previous slide">
            ‹
          </button>
          <span className="sc-count">
            {index + 1} / {SLIDES.length}
          </span>
          <button type="button" className="sc-btn" onClick={() => go(index + 1)} aria-label="Next slide">
            ›
          </button>
          <span className="sc-spacer" />
          <button type="button" className="sc-btn" onClick={fullscreen} aria-label="Toggle full screen" title="Full screen">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
