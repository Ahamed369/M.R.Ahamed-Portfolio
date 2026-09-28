import { useEffect, useMemo, useRef, useState } from 'react';
import { AppIcon, type IconName } from './AppIcons';
import { LAUNCH_ITEMS } from '../system/launch';
import { useCustomize } from '../system/customize';
import { useSystem } from '../system/SystemContext';
import { useLaunch } from '../system/useLaunch';
import { useWM } from '../system/WindowManager';
import { education, experience, projects, projectsUsing, skillNotes, socials } from '../data/portfolio';
import { photos } from '../data/media';
import { openExternal } from '../system/notify';
import { useSettings } from '../system/SettingsContext';
import { ALL_SERVICES } from '../data/services';
import { SPOTLIGHT_CATS, spotOn, calcExpr, convertUnits, SETTINGS_INDEX, lastClipboard } from '../system/spotlight';

interface Result {
  id: string;
  kind: string;
  title: string;
  sub: string;
  icon: IconName;
  run: () => void;
  score: number;
}

function score(hay: string, q: string): number {
  const h = hay.toLowerCase();
  if (h.startsWith(q)) return 3;
  if (h.split(/[\s·,/()—-]+/).some((w) => w.startsWith(q))) return 2;
  if (h.includes(q)) return 1;
  return 0;
}

/** ⌘/Ctrl + Space search across apps, projects, skills, experience, education, links and photos. */
export function Spotlight() {
  const sys = useSystem();
  const wm = useWM();
  const launch = useLaunch();
  const open = sys.overlay === 'spotlight';
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setSel(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  const { removedApps } = useCustomize();
  const { settings } = useSettings();
  const cfg = settings.spotlight ?? {};
  const excluded = new Set(settings.spotlightExclude ?? []);
  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const out: Result[] = [];
    const close = () => sys.setOverlay('none');
    const on = (k: string) => spotOn(cfg, k);
    /* v9 — Calculator & Conversion right in Spotlight */
    if (on('calculator')) {
      const v = calcExpr(q.trim());
      if (v !== null)
        out.push({ id: 'calc', kind: 'Calculator', title: `= ${v}`, sub: `${q.trim()} · Enter copies the result`, icon: 'calculator', score: 9, run: () => (void navigator.clipboard?.writeText(String(v)).catch(() => undefined), close()) });
    }
    if (on('conversion')) {
      const c = convertUnits(q.trim());
      if (c) out.push({ id: 'conv', kind: 'Conversion', title: c.result, sub: c.from, icon: 'calculator', score: 9, run: () => (void navigator.clipboard?.writeText(c.result).catch(() => undefined), close()) });
    }
    if (on('apps')) LAUNCH_ITEMS.forEach((i) => {
      if (removedApps.includes(i.id) || excluded.has(i.id)) return;
      if (!on('system') && (i.group === 'System' || 'overlay' in i.action)) return;
      const s = score(`${i.label} ${i.keywords ?? ''}`, query);
      if (s) out.push({ id: `app-${i.id}`, kind: 'Applications', title: i.label, sub: i.group, icon: i.icon, score: s + 1 + (i.label.toLowerCase().split(/\s+/).includes(query) ? 1 : 0), run: () => (close(), launch(i.action, i.label)) });
    });
    if (on('developer')) projects.forEach((p) => {
      const s = score(`${p.name} ${p.category} ${Object.values(p.stack).flat().join(' ')}`, query);
      if (s)
        out.push({
          id: `p-${p.id}`,
          kind: 'Projects',
          title: p.name,
          sub: p.category,
          icon: 'xcode',
          score: s + (score(p.name, query) ? 2 : 0),
          run: () => (close(), wm.open('xcode', { project: p.id })),
        });
      if (p.repo && score(`${p.name} repository github`, query) >= 2)
        out.push({
          id: `r-${p.id}`,
          kind: 'GitHub Repositories',
          title: p.repo.replace('https://github.com/', ''),
          sub: 'Open on GitHub',
          icon: 'github',
          score: s,
          run: () => (close(), openExternal(p.repo!, { title: `Opening ${p.name} repository`, app: 'GitHub', icon: 'github' })),
        });
    });
    const skills = new Map<string, string>();
    skillNotes.forEach((n) => [...n.tags, ...(n.profile ?? [])].forEach((t) => !skills.has(t) && skills.set(t, n.id)));
    if (on('skills')) skills.forEach((note, skill) => {
      const s = score(skill, query);
      if (!s) return;
      const used = projectsUsing(skill);
      out.push({
        id: `s-${skill}`,
        kind: 'Skills',
        title: skill,
        sub: used.length ? `Used in ${used.map((u) => u.name).join(', ')}` : 'Skill',
        icon: 'notes',
        score: s + (used.length ? 0.5 : 0),
        run: () => (close(), wm.open('notes', { note })),
      });
    });
    if (on('experience')) experience.forEach((e) => {
      const s = score(`${e.title} ${e.role} ${e.org} ${e.skills.join(' ')}`, query);
      if (s) out.push({ id: `e-${e.id}`, kind: 'Experience', title: e.title, sub: `${e.role} · ${e.period}`, icon: 'briefcase', score: s, run: () => (close(), wm.open('finder', { folder: 'all', item: e.id })) });
    });
    if (on('education')) education.forEach((e) => {
      const s = score(`${e.qualification} ${e.institution}`, query);
      if (s) out.push({ id: `ed-${e.id}`, kind: 'Education', title: e.qualification, sub: `${e.institution} · ${e.period}`, icon: 'graduation', score: s, run: () => (close(), wm.open('finder', { folder: 'education', item: e.id })) });
    });
    if (on('documents') && score('cv resume curriculum vitae pdf', query))
      out.push({ id: 'cv', kind: 'Documents', title: 'CV — M.R. Ahamed', sub: 'PDF · Preview', icon: 'pdf', score: 4, run: () => (close(), wm.open('preview')) });
    (
      [
        ['GitHub', socials.github, 'github'],
        ['LinkedIn', socials.linkedin, 'linkedin'],
        ['Instagram', socials.instagram, 'instagram'],
        ['Facebook', socials.facebook, 'facebook'],
        ['Threads', socials.threads, 'threads'],
        ['Spotify', socials.spotify, 'spotify'],
      ] as [string, string, IconName][]
    ).forEach(([label, url, icon]) => {
      if (!on('websites')) return;
      const s = score(`${label} social profile`, query);
      if (s) out.push({ id: `l-${label}`, kind: 'Links', title: label, sub: url.replace(/^https:\/\/(www\.)?/, ''), icon, score: s, run: () => (close(), openExternal(url, { title: `Opening ${label}`, app: 'Safari', icon: 'safari' })) });
    });
    if (on('images')) photos.forEach((p) => {
      const s = score(`${p.title} photo ${p.album}`, query);
      if (s >= 2) out.push({ id: `ph-${p.id}`, kind: 'Photos', title: p.title, sub: p.album, icon: 'photos', score: s - 0.5, run: () => (close(), wm.open('photos', { photo: p.id })) });
    });
    if (on('services'))
      ALL_SERVICES.forEach((sv) => {
        const s = score(`${sv.title} ${sv.area.title} ${sv.tags.join(' ')}`, query);
        if (s) out.push({ id: `sv-${sv.id}`, kind: 'Services', title: sv.title, sub: sv.area.title, icon: 'services', score: s, run: () => (close(), wm.open('services', { service: sv.id })) });
      });
    if (on('settings') && on('system'))
      SETTINGS_INDEX.forEach((st) => {
        const s = score(`${st.label} ${st.keys}`, query);
        if (s) out.push({ id: `set-${st.pane}`, kind: 'System Settings', title: st.label, sub: 'System Settings', icon: 'settings', score: s - 0.2, run: () => (close(), wm.open('settings', { pane: st.pane })) });
      });
    if (on('definition') && /^[a-z][a-z-]{2,}$/i.test(q.trim()))
      out.push({ id: 'def', kind: 'Definition', title: `Look up “${q.trim()}”`, sub: 'Dictionary', icon: 'dictionary', score: 0.6, run: () => (close(), wm.open('dictionary', { word: q.trim().toLowerCase() })) });
    if (on('clipboard')) {
      const clip = lastClipboard();
      if (clip && score(clip, query))
        out.push({ id: 'clip', kind: 'Clipboard', title: clip.length > 60 ? `${clip.slice(0, 60)}…` : clip, sub: 'Copied in this portfolio · Enter copies again', icon: 'notes', score: 2, run: () => (void navigator.clipboard?.writeText(clip).catch(() => undefined), close()) });
    }
    const order = ['Calculator', 'Conversion', 'Applications', 'Projects', 'Services', 'System Settings', 'Skills', 'Documents', 'Experience', 'Education', 'GitHub Repositories', 'Links', 'Photos', 'Clipboard', 'Definition'];
    const seen = new Set<string>();
    return out
      .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .sort((a, b) => b.score - a.score || order.indexOf(a.kind) - order.indexOf(b.kind))
      .slice(0, 14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sys, wm, launch, removedApps, JSON.stringify(cfg), settings.spotlightExclude]);

  useEffect(() => setSel(0), [q]);

  const groups = useMemo(() => {
    const g: [string, Result[]][] = [];
    results.forEach((r) => {
      const last = g.find(([k]) => k === r.kind);
      if (last) last[1].push(r);
      else g.push([r.kind, [r]]);
    });
    return g;
  }, [results]);
  const flat = groups.flatMap(([, r]) => r);

  if (!open) return null;
  return (
    <div className="spotlight-backdrop" onPointerDown={(e) => e.target === e.currentTarget && sys.setOverlay('none')}>
      <div className="spotlight" role="dialog" aria-label="Spotlight Search">
        <div className="sp-bar">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="m10.6 10.6 3.8 3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Spotlight Search — try “Java”, “HealthForge” or “CV”"
            aria-label="Spotlight search"
            aria-activedescendant={flat[sel] ? `sp-${flat[sel].id}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(flat.length - 1, s + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === 'Enter') flat[sel]?.run();
              else if (e.key === 'Escape') sys.setOverlay('none');
            }}
          />
        </div>
        {flat.length > 0 && (
          <div className="sp-results scroll-smooth" role="listbox">
            {groups.map(([kind, rs]) => (
              <div key={kind}>
                <div className="sp-kind">{kind}</div>
                {rs.map((r) => {
                  const i = flat.indexOf(r);
                  return (
                    <button
                      key={r.id}
                      id={`sp-${r.id}`}
                      type="button"
                      role="option"
                      aria-selected={i === sel}
                      className={`sp-row ${i === sel ? 'sel' : ''}`}
                      onPointerEnter={() => setSel(i)}
                      onClick={r.run}
                    >
                      <span className="sp-ico">
                        <AppIcon name={r.icon} />
                      </span>
                      <span className="sp-title">{r.title}</span>
                      <span className="sp-sub">{r.sub}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {q.trim() && !flat.length && <div className="sp-empty">No results for “{q}”</div>}
        {q.trim() && SPOTLIGHT_CATS.some((c) => !spotOn(cfg, c.id)) && (
          <button type="button" className="sp-filtered" onClick={() => (sys.setOverlay('none'), wm.open('settings', { pane: 'spotlight' }))}>
            Some categories are turned off in Spotlight settings ›
          </button>
        )}
      </div>
    </div>
  );
}
