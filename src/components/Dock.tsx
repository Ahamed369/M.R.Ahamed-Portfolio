import { useEffect, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { AppIcon, type IconName } from './AppIcons';
import { APPS, DOCK_PORTFOLIO, DOCK_SYSTEM } from '../system/apps';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import { useSystem } from '../system/SystemContext';
import { openExternal } from '../system/notify';
import { cv, socials } from '../data/portfolio';
import type { AppId } from '../system/types';
import { useCustomize } from '../system/customize';
import { sharePortfolio } from '../system/share';
import { ApplicationsPopup } from './ApplicationsPopup';
import { usePersisted } from '../system/useStore';
import { useDeskApps } from '../system/desk';
import { badgeText, useBadges } from '../system/badges';

interface LinkItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
}

const SOCIAL: LinkItem[] = [
  { id: 'github', label: 'GitHub — Ahamed369', icon: 'github', href: socials.github },
  { id: 'linkedin', label: 'LinkedIn — M.R. Ahamed', icon: 'linkedin', href: socials.linkedin },
  { id: 'spotify', label: 'Spotify', icon: 'spotify', href: socials.spotify },
];

/* Spring constants — slightly under-damped for a lively but controlled feel. */
const STIFF = 420;
const DAMP = 2 * Math.sqrt(STIFF) * 0.86;

interface SpringState {
  x: number;
  v: number;
}

export function Dock() {
  const wm = useWM();
  const sys = useSystem();
  const { settings, motionReduced } = useSettings();
  const dockRef = useRef<HTMLDivElement>(null);
  const mouseX = useRef<number | null>(null);
  const mouseY = useRef(0);
  const springs = useRef<Map<HTMLElement, SpringState>>(new Map());
  const raf = useRef(0);
  const last = useRef(0);
  const cfg = useRef({ base: settings.dockSize, max: settings.dockSize, on: settings.magnification, reduced: motionReduced });
  const [stackOpen, setStackOpen] = useState(false);
  const [appsPop, setAppsPop] = useState(false);
  const lpClick = useRef(0);
  const { removedApps, trash, removeApp, emptyTrash } = useCustomize();
  const badges = useBadges();
  const gone = new Set<string>(removedApps);
  const trashCount = useRef(trash.length);
  useEffect(() => {
    if (trash.length > trashCount.current && !motionReduced) {
      dockRef.current?.querySelector<HTMLElement>('[data-dock-id="trash"] .dock-press')?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.18) translateY(-6px)', offset: 0.35 }, { transform: 'scale(0.94)', offset: 0.7 }, { transform: 'scale(1)' }],
        { duration: 520, easing: 'cubic-bezier(.3,.7,.4,1)' },
      );
    }
    trashCount.current = trash.length;
  }, [trash.length, motionReduced]);

  const running = new Set(wm.windows.map((w) => w.id));
  const minimized = wm.windows.filter((w) => w.phase === 'minimized' || w.phase === 'minimizing' || (w.phase === 'restoring' && w.fromMin));
  const inDock = new Set<AppId>([...DOCK_SYSTEM, ...DOCK_PORTFOLIO]);
  const extraApps = wm.windows.map((w) => w.id).filter((id) => !inDock.has(id));
  /* v9 — "Show suggested and recent apps in Dock": the last 3 non-Dock apps that were opened */
  const [, setDeskApps] = useDeskApps();
  const [recentApps, setRecentApps] = usePersisted<AppId[]>('mra-dock-recents-v9', []);
  useEffect(() => {
    if (!extraApps.length) return;
    setRecentApps((r) => {
      const next = [...extraApps.filter((id) => !r.includes(id)), ...r].slice(0, 3);
      return next.join() === r.join() ? r : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraApps.join()]);
  const recentShown = settings.dockRecents === false ? [] : recentApps.filter((id) => !running.has(id) && !inDock.has(id) && !gone.has(id) && APPS[id]);

  /* ───────── cursor-proximity magnification driven by spring physics ───────── */
  const tick = (now: number) => {
    raf.current = 0;
    const dock = dockRef.current;
    if (!dock) return;
    const dt = Math.min(0.034, Math.max(0.001, (now - (last.current || now - 16)) / 1000));
    last.current = now;

    const children = Array.from(dock.children) as HTMLElement[];
    const compactDock = !!dock.closest('.compact');
    const side = compactDock ? 'bottom' : document.documentElement.dataset.dock === 'left' ? 'left' : document.documentElement.dataset.dock === 'right' ? 'right' : 'bottom';
    const vertical = side !== 'bottom';
    const gap = parseFloat(vertical ? getComputedStyle(dock).rowGap : getComputedStyle(dock).columnGap) || 0;
    const { on, reduced } = cfg.current;
    const items = children.filter((el) => el.classList.contains('dock-item'));
    const sepCount = children.length - items.length;
    // Leave room for the icons that grow under the cursor (~2 icon widths at
    // the default 1.6× zoom) so a magnified Dock never runs off-screen.
    const ratio = on ? cfg.current.max / cfg.current.base : 1;
    const avail = vertical ? window.innerHeight - 60 : window.innerWidth - 40;
    const fit = Math.floor((avail - sepCount * 9 - gap * (children.length - 1)) / Math.max(1, items.length + (ratio - 1) * 3.3));
    const compact = !!dock.closest('.compact');
    const base = compact ? cfg.current.base : Math.max(vertical ? 20 : 32, Math.min(cfg.current.base, fit));
    const max = base * (cfg.current.max / cfg.current.base);
    if (compact) dock.style.removeProperty('--dock-size');
    else dock.style.setProperty('--dock-size', `${base}px`);
    const range = base * 3.2;

    // Distances use the *resting* layout measured from the dock's fixed centre,
    // so growing icons never feed back into the calculation (no jitter).
    const widths = children.map((el) => {
      if (!el.classList.contains('dock-item')) {
        const cs = getComputedStyle(el);
        return vertical ? el.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom) : el.offsetWidth + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight);
      }
      return base;
    });
    const total = widths.reduce((a, w) => a + w, 0) + gap * Math.max(0, children.length - 1);
    const rect = dock.getBoundingClientRect();
    const mouse = mouseX.current === null ? null : vertical ? mouseY.current - (rect.top + rect.height / 2) : mouseX.current - (rect.left + rect.width / 2);

    let cursor = -total / 2;
    let moving = false;
    children.forEach((el, i) => {
      const w = widths[i];
      const center = cursor + w / 2;
      cursor += w + gap;
      if (!el.classList.contains('dock-item')) return;
      let target = base;
      if (on && mouse !== null && !compact) {
        const d = Math.abs(mouse - center);
        if (d < range) target = base + (max - base) * Math.cos(((d / range) * Math.PI) / 2) ** 1.5;
      }
      let st = springs.current.get(el);
      if (!st) {
        st = { x: base, v: 0 };
        springs.current.set(el, st);
      }
      // Reduced motion: critically damped (smooth, no overshoot) instead of springy.
      const a = STIFF * (target - st.x) - (reduced ? 2 * Math.sqrt(STIFF) : DAMP) * st.v;
      st.v += a * dt;
      st.x += st.v * dt;
      if (Math.abs(target - st.x) < 0.08 && Math.abs(st.v) < 0.5) {
        st.x = target;
        st.v = 0;
      } else moving = true;
      el.style.width = `${st.x}px`;
      el.style.height = `${st.x}px`;
      const lift = el.firstElementChild as HTMLElement | null;
      if (lift) lift.style.transform = vertical ? `translate3d(${(side === 'left' ? 1 : -1) * (st.x - base) * 0.14}px, 0, 0)` : `translate3d(0, ${-(st.x - base) * 0.14}px, 0)`;
    });
    if (moving || mouseX.current !== null) raf.current = requestAnimationFrame(tick);
  };

  const kick = () => {
    // Also restart if a frame was requested but never ran (stale handle).
    if (!raf.current || performance.now() - last.current > 250) {
      cancelAnimationFrame(raf.current);
      last.current = 0;
      raf.current = requestAnimationFrame(tick);
    }
  };

  useEffect(() => {
    cfg.current = {
      base: settings.dockSize,
      max: settings.dockSize * (1 + settings.magnificationAmount),
      on: settings.magnification,
      reduced: motionReduced,
    };
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.dockSize, settings.magnification, settings.magnificationAmount, motionReduced, settings.dockPosition]);

  useEffect(() => {
    const onResize = () => kick();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      // Reset the handle too: React StrictMode (npm run dev) unmounts and
      // remounts effects once, and a stale non-zero handle would stop kick()
      // from ever scheduling the magnification loop again.
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraApps.join(), minimized.length, recentShown.join()]);

  const onMove = (e: RPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    mouseX.current = e.clientX;
    mouseY.current = e.clientY;
    kick();
  };
  const onLeave = () => {
    mouseX.current = null;
    kick();
  };

  /* ───────── v9: automatically hide and show the Dock ───────── */
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    if (!settings.dockAutohide) return;
    let hideT = 0;
    const onMove = (e: PointerEvent) => {
      const side = window.innerWidth < 700 ? 'bottom' : settings.dockPosition ?? 'bottom';
      const near = side === 'bottom' ? e.clientY >= window.innerHeight - 6 : side === 'left' ? e.clientX <= 6 : e.clientX >= window.innerWidth - 6;
      const overDock = !!(e.target as HTMLElement)?.closest?.('.dock-wrap');
      if (near || overDock) {
        window.clearTimeout(hideT);
        setReveal(true);
      } else {
        window.clearTimeout(hideT);
        hideT = window.setTimeout(() => setReveal(false), 420);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.clearTimeout(hideT);
    };
  }, [settings.dockAutohide, settings.dockPosition]);

  /* ───────── launch bounce ───────── */
  const prevIds = useRef<Set<AppId>>(new Set());
  useEffect(() => {
    const now = new Set(wm.windows.map((w) => w.id));
    now.forEach((id) => {
      if (!prevIds.current.has(id) && !motionReduced && settings.dockAnimateOpen !== false) {
        const el = dockRef.current?.querySelector<HTMLElement>(`[data-dock-id="${id}"] .dock-bounce`);
        const side = window.innerWidth < 700 ? 'bottom' : settings.dockPosition ?? 'bottom';
        const T = (n: number) => (side === 'left' ? `translateX(${-n}px)` : side === 'right' ? `translateX(${n}px)` : `translateY(${n}px)`);
        el?.animate(
          [
            { transform: T(0) },
            { transform: T(-24), offset: 0.22, easing: 'cubic-bezier(.3,0,.5,1)' },
            { transform: T(0), offset: 0.46, easing: 'cubic-bezier(.5,0,.7,1)' },
            { transform: T(-11), offset: 0.68, easing: 'cubic-bezier(.3,0,.5,1)' },
            { transform: T(0) },
          ],
          { duration: 820 },
        );
      }
    });
    prevIds.current = now;
  }, [wm.windows, motionReduced, settings.dockAnimateOpen, settings.dockPosition]);

  const launch = (id: AppId) => {
    const w = wm.windows.find((x) => x.id === id);
    if (w && w.phase !== 'minimized' && w.phase !== 'minimizing' && wm.focusedId === id) {
      wm.focus(id);
      return;
    }
    wm.open(id);
  };

  const appMenu = (e: RMouseEvent, id: AppId) => {
    e.preventDefault();
    const isRunning = running.has(id);
    const w = wm.windows.find((x) => x.id === id);
    const isMin = !!w && (w.phase === 'minimized' || w.phase === 'minimizing');
    const meta = APPS[id];
    const kept = !gone.has(id) && ([...DOCK_SYSTEM, ...DOCK_PORTFOLIO] as AppId[]).includes(id);
    const newWindow: Record<string, () => void> = {
      mail: () => wm.open('mail', { compose: '1' }),
      notes: () => wm.open('notes', { note: 'about' }),
      safari: () => wm.open('safari'),
      finder: () => wm.open('finder', { folder: 'all' }),
      terminal: () => wm.open('terminal'),
      hireme: () => wm.open('hireme', { tab: 'book' }),
    };
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'New Window', action: newWindow[id] ?? (() => wm.open(id)) },
        ...(id === 'hireme'
          ? [
              { label: 'Book a Call', action: () => wm.open('hireme', { tab: 'book' }) },
              {
                label: 'Download CV',
                action: () => {
                  const a = document.createElement('a');
                  a.href = cv.url;
                  a.download = cv.fileName;
                  a.click();
                },
              },
              { label: 'Share Portfolio…', action: () => void sharePortfolio() },
            ]
          : []),
        ...(id === 'mail' ? [{ label: 'New Message', action: () => wm.open('mail', { compose: '1' }) }] : []),
        { label: '', sep: true },
        {
          label: 'Options',
          submenu: [
            { label: 'Keep in Dock', checked: kept, disabled: kept, action: () => wm.open(id) },
            { label: 'Open at Login', checked: false, disabled: true },
            { label: 'Show in Finder', action: () => wm.open('finder', { folder: 'all' }) },
            { label: 'Add to Desktop', action: () => setDeskApps((l) => (l.includes(id) ? l : [...l, id])) },
            { label: '', sep: true },
            { label: 'Remove from Dock', action: () => removeApp(id, meta.dockLabel, meta.icon), disabled: id === 'about' || id === 'settings' || id === 'finder' },
          ],
        },
        { label: '', sep: true },
        { label: 'Show All Windows', action: () => (wm.open(id), window.setTimeout(() => sys.setOverlay('missioncontrol'), 250)), disabled: !isRunning },
        ...(isRunning
          ? [
              { label: isMin ? 'Restore Window' : 'Show', action: () => wm.open(id) },
              { label: 'Minimize', action: () => wm.minimize(id), disabled: isMin },
              { label: 'Zoom', action: () => wm.toggleMaximize(id), disabled: isMin },
              { label: 'Hide', action: () => wm.minimize(id), disabled: isMin },
              { label: 'Hide Others', action: () => wm.windows.filter((x) => x.id !== id).forEach((x) => wm.minimize(x.id)) },
              { label: '', sep: true },
              { label: 'Quit', action: () => wm.close(id) },
            ]
          : [{ label: 'Open', action: () => wm.open(id) }]),
      ],
    });
  };

  const trashMenu = (e: RMouseEvent) => {
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Open', action: () => wm.open('finder', { folder: 'trash' }) },
        { label: 'Empty Trash', action: emptyTrash, disabled: !trash.length },
      ],
    });
  };

  // A plain render function (not a component) so Dock items keep their DOM
  // identity across renders — the spring state is keyed by element.
  const item = ({ id, label, icon, onClick, running: isOn, badge, onContext }: { id: string; label: string; icon: IconName; onClick: () => void; running?: boolean; badge?: ReactNode; onContext?: (e: RMouseEvent) => void }) => (
    <button key={id} type="button" className="dock-item" data-dock-id={id} aria-label={label} onClick={onClick} onContextMenu={onContext}>
      <span className="dock-lift">
        <span className="dock-bounce">
          <span className="dock-press">
            <AppIcon name={icon} />
            {badge}
          </span>
        </span>
      </span>
      <span className="dock-label" role="tooltip">
        {label}
      </span>
      {isOn !== undefined && <span className={`dock-dot ${isOn ? 'on' : ''}`} />}
    </button>
  );

  const renderApp = (id: AppId) => (
    item({
      id,
      label: badges[id] ? `${APPS[id].dockLabel} — ${badges[id]} new` : APPS[id].dockLabel,
      icon: APPS[id].icon,
      onClick: () => launch(id),
      running: running.has(id),
      onContext: (e) => appMenu(e, id),
      badge: badges[id] ? (
        <span key={badges[id]} className="app-badge" aria-hidden="true">
          {badgeText(badges[id])}
        </span>
      ) : undefined,
    })
  );

  return (
    <div className={`dock-wrap ${settings.dockAutohide ? `autohide ${reveal || stackOpen || appsPop ? 'reveal' : ''}` : ''}`}>
      {appsPop && <ApplicationsPopup onClose={() => setAppsPop(false)} />}
      {stackOpen && (
        <>
          <div className="stack-backdrop" onPointerDown={() => setStackOpen(false)} />
          <div className="dock-stack" role="menu" aria-label="Downloads">
            <a
              role="menuitem"
              className="stack-item"
              href={cv.url}
              download={cv.fileName}
              style={{ ['--i' as string]: 0 }}
              onClick={() => {
                setStackOpen(false);
              }}
            >
              <span className="stack-ico">
                <AppIcon name="pdf" />
              </span>
              <span>{cv.fileName}</span>
            </a>
            <button
              type="button"
              role="menuitem"
              className="stack-item"
              style={{ ['--i' as string]: 1 }}
              onClick={() => {
                setStackOpen(false);
                wm.open('photos', { album: 'Screenshots' });
              }}
            >
              <span className="stack-ico">
                <AppIcon name="photos" />
              </span>
              <span>Portfolio screenshots</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="stack-item"
              style={{ ['--i' as string]: 2 }}
              onClick={() => {
                setStackOpen(false);
                wm.open('preview');
              }}
            >
              <span className="stack-ico">
                <AppIcon name="preview" />
              </span>
              <span>Open CV in Preview</span>
            </button>
          </div>
        </>
      )}
      <div className="dock" ref={dockRef} onPointerMove={onMove} onPointerLeave={onLeave} role="toolbar" aria-label="Dock">
        {renderApp('about')}
        {item({
          id: 'launchpad',
          label: 'Launchpad',
          icon: 'launchpad',
          onClick: () => {
            // single click → Launchpad (immediately); a second click within 320 ms → Applications pop-up
            const now = performance.now();
            if (now - lpClick.current < 320) {
              lpClick.current = 0;
              sys.setOverlay('none');
              setAppsPop((v) => !v);
              return;
            }
            lpClick.current = now;
            setAppsPop(false);
            sys.toggleOverlay('launchpad');
          },
          onContext: (e) => {
            e.preventDefault();
            sys.setContextMenu({
              x: e.clientX,
              y: e.clientY,
              items: [
                { label: 'Open Launchpad', action: () => sys.setOverlay('launchpad') },
                { label: 'Show Applications', action: () => setAppsPop(true) },
              ],
            });
          },
        })}
        {DOCK_SYSTEM.filter((x) => x !== 'about' && !gone.has(x)).map(renderApp)}
        <span className="dock-sep" aria-hidden="true" />
        {DOCK_PORTFOLIO.filter((x) => !gone.has(x)).map(renderApp)}
        {extraApps.map(renderApp)}
        {recentShown.length > 0 && <span className="dock-sep" aria-hidden="true" />}
        {recentShown.map(renderApp)}
        <span className="dock-sep" aria-hidden="true" />
        {SOCIAL.map((l) =>
          item({ id: l.id, label: l.label, icon: l.icon, onClick: () => openExternal(l.href, { title: `Opening ${l.label}`, app: 'Safari', icon: 'safari' }) }),
        )}
        <span className="dock-sep" aria-hidden="true" />
        {(settings.minimizeToAppIcon ? [] : minimized).map((w) =>
          item({
            id: `min-${w.id}`,
            label: `${APPS[w.id].title} (minimized)`,
            icon: APPS[w.id].icon,
            onClick: () => wm.open(w.id),
            badge: <span className="dock-min-badge" aria-hidden="true" />,
          }),
        )}
        {item({ id: 'downloads', label: 'Downloads', icon: 'downloads', onClick: () => setStackOpen((o) => !o) })}
        {item({ id: 'trash', label: trash.length ? `Trash — ${trash.length} item${trash.length === 1 ? '' : 's'}` : 'Trash', icon: trash.length ? 'trashfull' : 'trash', onClick: () => wm.open('finder', { folder: 'trash' }), onContext: trashMenu })}
      </div>
    </div>
  );
}
