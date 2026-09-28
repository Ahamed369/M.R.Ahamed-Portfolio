import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { AppIcon, type IconName } from './AppIcons';
import { useSystem, type NotificationItem } from '../system/SystemContext';
import { useWM } from '../system/WindowManager';
import { useMusic } from '../system/MusicContext';
import { education, personal, projects, socials, timeline } from '../data/portfolio';
import { openExternal, type NotifyAction } from '../system/notify';

function ago(t: number, now: number) {
  const s = Math.round((now - t) / 1000);
  if (s < 10) return 'now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const iconOf = (n: { icon?: string }): IconName => (n.icon as IconName) || 'finder';

function fmtMonth(v: string) {
  if (v === 'present') return 'Present';
  if (/^\d{4}$/.test(v)) return v;
  const [y, m] = v.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/* ────────────────────────── v8 notification cards ──────────────────────────
 * Glass cards following the macOS references: app icon, optional
 * "TIME SENSITIVE" label, bold title, body, a close (×) button that appears on
 * hover (top-left), an "Options ▾" menu, action buttons, a row of round link
 * icons (Follow me), swipe left / right to dismiss, and an unread dot.
 */
function NotifCard({ n, now, variant, onDismiss }: { n: NotificationItem; now: number; variant: 'banner' | 'center'; onDismiss: () => void }) {
  const sys = useSystem();
  const ref = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  const drag = useRef<{ x: number; y: number; id: number; dx: number; t: number; locked: boolean } | null>(null);
  const swiped = useRef(false);

  const leave = (dir: 1 | -1) => {
    if (leaving) return;
    setLeaving(dir);
    window.setTimeout(onDismiss, 260);
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button:not(.nf-main), a, .nf-menu')) return;
    swiped.current = false;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, t: performance.now(), locked: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.locked) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      d.locked = true;
      swiped.current = true;
      try {
        ref.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    d.dx = dx;
    if (ref.current) {
      ref.current.style.transition = 'none';
      ref.current.style.transform = `translateX(${dx}px)`;
      ref.current.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 320));
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    const el = ref.current;
    if (!d || !el) return;
    const v = Math.abs(d.dx) / Math.max(1, performance.now() - d.t);
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
    if (d.locked && (Math.abs(d.dx) > 90 || v > 0.6)) leave(d.dx > 0 ? 1 : -1);
  };

  const open = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    sys.markRead(n.id);
    if (n.onClick) {
      n.onClick();
      if (variant === 'banner') onDismiss();
      else sys.setOverlay('none');
    } else if (variant === 'banner') {
      onDismiss();
      sys.setOverlay('notifications');
    }
  };

  const onContext = (e: ReactMouseEvent) => {
    if (variant !== 'center') return;
    e.preventDefault();
    e.stopPropagation();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: n.read ? 'Mark as Unread' : 'Mark as Read', action: () => sys.markRead(n.id, !n.read) },
        ...(n.onClick ? [{ label: 'Open', action: open }] : []),
        { label: '', sep: true },
        { label: 'Remove', action: onDismiss },
        { label: 'Clear All Notifications', action: sys.clearNotifications },
      ],
    });
  };

  const run = (a: NotifyAction) => {
    sys.markRead(n.id);
    setMenu(false);
    if (a.href) openExternal(a.href);
    a.run?.();
    onDismiss();
  };

  return (
    <div
      ref={ref}
      className={`nf-card ${variant} ${n.read ? 'read' : 'unread'} ${leaving ? `leave ${leaving > 0 ? 'right' : 'left'}` : ''} ${menu ? 'menu-open' : ''}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={onContext}
      role={variant === 'banner' ? 'status' : 'article'}
      aria-label={`${n.app}: ${n.title}`}
    >
      <button type="button" className="nf-close" aria-label="Dismiss notification" onClick={() => leave(1)}>
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2.6 2.6l4.8 4.8M7.4 2.6L2.6 7.4" />
        </svg>
      </button>
      <div className="nf-main" onClick={open} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}>
        <span className="nf-ico">
          <AppIcon name={iconOf(n)} />
        </span>
        <span className="nf-text">
          <span className="nf-top">
            <span className="nf-label">{n.label ?? n.app}</span>
            <i>{ago(n.time, now)}</i>
          </span>
          <b className="nf-title">{n.title}</b>
          {n.body && <span className="nf-body">{n.body}</span>}
        </span>
        {variant === 'center' && !n.read && <span className="nf-dot" aria-label="Unread" />}
      </div>
      {n.links && n.links.length > 0 && (
        <div className="nf-links">
          {n.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="nf-link" title={l.label} aria-label={l.label} onClick={() => sys.markRead(n.id)}>
              <AppIcon name={l.icon as IconName} />
            </a>
          ))}
        </div>
      )}
      {n.actions && n.actions.length > 0 && (
        <div className="nf-actions">
          {n.actions.map((a) => (
            <button key={a.label} type="button" className={`nf-act ${a.primary ? 'primary' : ''}`} onClick={() => run(a)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
      {n.options && n.options.length > 0 && (
        <div className="nf-options">
          <button type="button" className="nf-opt-btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            Options
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2.5 4l2.5 2.5L7.5 4" />
            </svg>
          </button>
          {menu && (
            <div className="nf-menu" role="menu">
              {n.options.map((o) => (
                <button key={o.label} type="button" role="menuitem" onClick={() => run(o)}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One banner — times itself out (hover or an open Options menu pauses it). */
function Banner({ n, now }: { n: NotificationItem; now: number }) {
  const sys = useSystem();
  const hover = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const total = n.duration ?? (n.links || n.options || n.actions ? 9000 : 5200);
    let left = total;
    let lastT = performance.now();
    const t = window.setInterval(() => {
      const nowT = performance.now();
      const paused = hover.current || !!ref.current?.querySelector('.menu-open') || document.hidden;
      if (!paused) left -= nowT - lastT;
      lastT = nowT;
      if (left <= 0) {
        window.clearInterval(t);
        sys.dismissToast(n.id);
      }
    }, 200);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n.id]);
  return (
    <div ref={ref} className="nf-banner-wrap" onPointerEnter={() => (hover.current = true)} onPointerLeave={() => (hover.current = false)}>
      <NotifCard n={n} now={now} variant="banner" onDismiss={() => sys.dismissToast(n.id)} />
    </div>
  );
}

/** Banner notifications — spring in from the upper-right, then live in history. */
export function Toasts() {
  const sys = useSystem();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 20000);
    return () => window.clearInterval(t);
  }, [sys.toasts]);
  if (sys.phase !== 'ready' || sys.locked || sys.asleep || sys.overlay === 'notifications') return null;
  return (
    <div className="toasts nf-toasts" aria-live="polite" aria-atomic="false">
      {sys.toasts.map((n) => (
        <Banner key={n.id} n={n} now={now} />
      ))}
    </div>
  );
}

export function NotificationCenter() {
  const sys = useSystem();
  const wm = useWM();
  const music = useMusic();
  const ref = useRef<HTMLElement>(null);
  const open = sys.overlay === 'notifications';
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 15000);
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement;
      if (!ref.current?.contains(el) && !el.closest('[data-nc-toggle]')) sys.setOverlay('none');
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && sys.setOverlay('none');
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, sys]);

  const latest = [...projects].filter((p) => p.updated).sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''))[0];
  const featured = projects.find((p) => p.id === 'healthforge') ?? projects[0];
  const current = projects.filter((p) => p.period?.includes('Present'));
  const go = (id: Parameters<typeof wm.open>[0], args?: Record<string, string>) => {
    sys.setOverlay('none');
    wm.open(id, args);
  };

  return (
    <aside ref={ref} className={`notif-center ${open ? 'open' : ''}`} aria-label="Notification Center" aria-hidden={!open}>
      <section className="nc-today">
        <div className="nc-day">{now.toLocaleDateString(undefined, { weekday: 'long' })}</div>
        <div className="nc-date">{now.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div className="nc-time">{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
      </section>

      <h3 className="nc-h">Current</h3>
      <div className="nc-widget">
        <b>🎓 {education[0].qualification}</b>
        <span>
          {education[0].institution} · {education[0].period}
        </span>
      </div>
      <div className="nc-widget">
        <b>💼 {personal.status}</b>
        <span>Full-stack development · {personal.location}</span>
      </div>
      {current.map((p) => (
        <button key={p.id} type="button" className="nc-widget link" onClick={() => go('xcode', { project: p.id })}>
          <b>🛠 In progress — {p.name}</b>
          <span>
            {p.category} · {p.period}
          </span>
        </button>
      ))}

      <h3 className="nc-h">Highlights</h3>
      <button type="button" className="nc-widget link" onClick={() => go('xcode', { project: featured.id })}>
        <b>⭐ Featured project — {featured.name}</b>
        <span>{featured.description}</span>
      </button>
      {latest && (
        <button type="button" className="nc-widget link" onClick={() => go('xcode', { project: latest.id })}>
          <b>🆕 Latest repository update — {latest.name}</b>
          <span>Pushed {new Date(latest.updated!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </button>
      )}
      <button type="button" className="nc-widget link" onClick={() => openExternal(socials.github, { title: 'Opening GitHub — Ahamed369', app: 'GitHub', icon: 'github' })}>
        <b>🐙 GitHub — {projects.filter((p) => p.repo).length} public repositories</b>
        <span>github.com/{socials.githubHandle}</span>
      </button>
      <button type="button" className="nc-widget link" onClick={() => go('music')}>
        <b>🎵 {music.playing ? 'Now playing' : 'Music'} — {music.track.title}</b>
        <span>{music.track.artist}</span>
      </button>

      <div className="nc-h-row">
        <h3 className="nc-h">
          Notifications {sys.unreadCount > 0 && <span className="nf-count">{sys.unreadCount}</span>}
        </h3>
        {sys.notifications.length > 0 && (
          <span className="nf-head-btns">
            {sys.unreadCount > 0 && (
              <button type="button" className="nc-clear" onClick={sys.markAllRead}>
                Mark All Read
              </button>
            )}
            <button type="button" className="nc-clear" onClick={sys.clearNotifications}>
              Clear All
            </button>
          </span>
        )}
      </div>
      {sys.focus && <div className="nc-focus">🌙 Focus is on — banners are silenced, notifications still collect here.</div>}
      {sys.notifications.length === 0 ? (
        <div className="nc-empty">No notifications yet — open an app to see activity here.</div>
      ) : (
        <div className="nf-list">
          {sys.notifications.slice(0, 30).map((n) => (
            <NotifCard key={n.id} n={n} now={now.getTime()} variant="center" onDismiss={() => sys.removeNotification(n.id)} />
          ))}
        </div>
      )}
      <p className="nf-hint">Swipe a notification left or right to dismiss it · right-click for more.</p>

      <h3 className="nc-h">Timeline</h3>
      <ol className="nc-timeline">
        {timeline.slice(0, 8).map((t) => (
          <li key={t.title + t.start}>
            <span className="nc-tl-date">
              {fmtMonth(t.start)}
              {t.end ? ` – ${fmtMonth(t.end)}` : ''}
            </span>
            <b>{t.title}</b>
            <span>{t.detail}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="nc-more" onClick={() => go('finder', { folder: 'timeline' })}>
        Show full timeline
      </button>
    </aside>
  );
}

export { fmtMonth };
