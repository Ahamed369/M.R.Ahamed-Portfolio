import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { ModeBar } from '../ModeBar';
import { Onboarding } from '../Onboarding';
import { MusicPiP } from '../MusicPiP';
import { Dictation } from '../Dictation';
import { t } from '../../system/i18n';
import { AppIcon, type IconName } from '../AppIcons';
import { useSystem } from '../../system/SystemContext';
import { useSettings } from '../../system/SettingsContext';
import { useMusic } from '../../system/MusicContext';
import { APPS } from '../../system/apps';
import { appById, IOS_APPS, iosIcon, iosLabel } from '../../system/ios';
import { calcExpr, convertUnits } from '../../system/spotlight';
import { projects, cvSkills, personal } from '../../data/portfolio';
import { islandPing, islandTorch, isTorch, ISLAND_TORCH } from '../../system/island';
import { playShutter, stopRinging } from '../../system/sounds';
import { doUndo, canUndo, undoLabel } from '../../system/history';
import { useIOS } from './ctx';
import { VolumeHUD } from '../VolumeHUD';
import { AT_ACTIONS } from './atActions';
import { IOSControlCentre } from './IOSControlCentre';
import { CCIcon } from './CCIcons';
import type { AppId } from '../../system/types';
import type { LaunchItem } from '../../system/launch';

const appOf = (it: LaunchItem | undefined): AppId | '' => (it && 'app' in it.action ? it.action.app : '');
const liFor = (id: AppId) => IOS_APPS.find((x) => appOf(x) === id);

/** swipe up anywhere on a panel's background to close it (like iOS) */
function swipeUpToClose(close: () => void) {
  let y0: number | null = null;
  return {
    onPointerDown: (e: RPointerEvent) => {
      if ((e.target as HTMLElement).closest('button, input, .icc-slider, .inc-item')) return;
      y0 = e.clientY;
    },
    onPointerUp: (e: RPointerEvent) => {
      if (y0 !== null && y0 - e.clientY > 70) close();
      y0 = null;
    },
  };
}

/* ───────────────────────── Notification Centre ───────────────────────── */

function NotificationCentre() {
  const ios = useIOS();
  const sys = useSystem();
  const now = new Date();
  const [swipe, setSwipe] = useState<Record<number, number>>({});
  const start = useRef<{ id: number; x: number } | null>(null);
  const { settings } = useSettings();
  const previews = (settings.showPreviews ?? 'always') !== 'never';
  const [expanded, setExpanded] = useState<string[]>([]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof sys.notifications>();
    sys.notifications.forEach((n) => m.set(n.app, [...(m.get(n.app) ?? []), n]));
    return [...m.entries()];
  }, [sys.notifications]);
  return (
    <div className="ios-nc" role="dialog" aria-label="Notification Centre" onClick={(e) => e.target === e.currentTarget && ios.setPanel('none')} {...swipeUpToClose(() => ios.setPanel('none'))}>
      <div className="inc-clock">
        <span>{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <b>{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')}</b>
      </div>
      <div className="inc-list">
        <div className="inc-head">
          <b>{t('iNC')}</b>
          {sys.notifications.length > 0 && (
            <button type="button" className="inc-clear" onClick={() => sys.clearNotifications()}>
              {t('iClear')} ✕
            </button>
          )}
        </div>
        {!sys.notifications.length && <p className="inc-empty">{t('iNoOlder')}</p>}
        {groups.map(([app, list]) => {
          const open = expanded.includes(app) || list.length === 1;
          const shown = open ? list : list.slice(0, 1);
          return (
            <div key={app} className={`inc-group ${open ? 'open' : 'stacked'}`} style={{ ['--n' as string]: Math.min(2, list.length - 1) }}>
              {open && list.length > 1 && (
                <div className="inc-group-h">
                  <b>{app}</b>
                  <button type="button" onClick={() => setExpanded((x) => x.filter((a) => a !== app))}>
                    {t('iShowLess')}
                  </button>
                  <button type="button" aria-label={`Clear ${app}`} onClick={() => list.forEach((n) => sys.removeNotification(n.id))}>
                    ✕
                  </button>
                </div>
              )}
              {shown.map((n) => (
                <div
                  key={n.id}
                  className="inc-item ios-glass"
                  style={{ transform: `translateX(${Math.min(0, swipe[n.id] ?? 0)}px)`, opacity: 1 + Math.min(0, swipe[n.id] ?? 0) / 300 }}
                  onPointerDown={(e) => {
                    start.current = { id: n.id, x: e.clientX };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => start.current?.id === n.id && setSwipe((sw) => ({ ...sw, [n.id]: e.clientX - start.current!.x }))}
                  onPointerUp={(e) => {
                    const dx = start.current ? e.clientX - start.current.x : 0;
                    start.current = null;
                    if (dx < -110) sys.removeNotification(n.id);
                    else if (Math.abs(dx) < 6) {
                      if (!open) setExpanded((x) => [...x, app]);
                      else {
                        const li = IOS_APPS.find((x) => x.label.toLowerCase() === n.app.toLowerCase() || iosLabel(x).toLowerCase() === n.app.toLowerCase());
                        if (li) ios.launch(li);
                        sys.markRead(n.id);
                        ios.setPanel('none');
                      }
                    }
                    setSwipe((sw) => ({ ...sw, [n.id]: 0 }));
                  }}
                >
                  <span className="inc-app">
                    {n.app} · {new Date(n.time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <b>{n.title}</b>
                  {n.body && previews && <p>{n.body}</p>}
                  {!open && <small className="inc-more">{list.length - 1} more notification{list.length === 2 ? '' : 's'}</small>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <button type="button" className="inc-close" onClick={() => ios.setPanel('none')} aria-label="Close Notification Centre">
        <i />
      </button>
    </div>
  );
}

/* ───────────────────────── App Switcher ───────────────────────── */

function SnapCanvas({ src }: { src: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d')?.drawImage(src, 0, 0);
  }, [src]);
  return <canvas ref={ref} className="ios-sw-canvas" aria-hidden="true" />;
}

function AppSwitcher() {
  const ios = useIOS();
  const [drag, setDrag] = useState<{ id: AppId; dy: number } | null>(null);
  const start = useRef<{ id: AppId; y: number; x: number } | null>(null);
  const list = ios.recents;
  return (
    <div className="ios-sw" onClick={(e) => e.target === e.currentTarget && ios.goHome()} role="dialog" aria-label="App Switcher">
      {!list.length && <p className="ios-sw-empty">No Recent Apps</p>}
      <div className="ios-sw-row" onClick={(e) => e.target === e.currentTarget && ios.goHome()}>
        {list.map((id, i) => {
          const meta = APPS[id];
          const li = liFor(id);
          const dy = drag?.id === id ? Math.min(0, drag.dy) : 0;
          return (
            <div key={id} className="ios-sw-card" style={{ ['--i' as string]: i, transform: `translateY(${dy}px)`, opacity: 1 + dy / 500 }}>
              <span className="ios-sw-label">
                <AppIcon name={(li ? iosIcon(li) : meta.icon) as IconName} />
                {li ? iosLabel(li) : meta.title}
              </span>
              <button
                type="button"
                className="ios-sw-shot"
                aria-label={`Open ${meta.title} — swipe up to close`}
                onPointerDown={(e) => {
                  start.current = { id, y: e.clientY, x: e.clientX };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => start.current?.id === id && Math.abs(e.clientY - start.current.y) > Math.abs(e.clientX - start.current.x) && setDrag({ id, dy: e.clientY - start.current.y })}
                onPointerUp={(e) => {
                  const s = start.current;
                  start.current = null;
                  setDrag(null);
                  if (!s) return;
                  const dy = e.clientY - s.y;
                  if (dy < -110) ios.closeApp(id);
                  else if (Math.abs(dy) < 8 && Math.abs(e.clientX - s.x) < 8) ios.switchTo(id);
                }}
              >
                {ios.snapshots[id] ? (
                  <SnapCanvas src={ios.snapshots[id]} />
                ) : (
                  <span className="ios-sw-ph">
                    <AppIcon name={(li ? iosIcon(li) : meta.icon) as IconName} />
                  </span>
                )}
              </button>
              <button type="button" className="ios-sw-x" aria-label={`Close ${meta.title}`} onClick={() => ios.closeApp(id)}>
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Search (Spotlight) ───────────────────────── */

function Search() {
  const ios = useIOS();
  const { settings } = useSettings();
  const [q, setQ] = useState('');
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => inp.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, []);
  const s = q.trim().toLowerCase();
  const apps = useMemo(() => (s ? IOS_APPS.filter((x) => `${iosLabel(x)} ${x.keywords ?? ''}`.toLowerCase().includes(s)).slice(0, 8) : []), [s]);
  const proj = s ? projects.filter((p) => `${p.name} ${p.category} ${Object.values(p.stack ?? {}).flat().join(' ')}`.toLowerCase().includes(s)).slice(0, 5) : [];
  const skills = s ? cvSkills.filter((k) => `${k.label} ${k.items.join(' ')}`.toLowerCase().includes(s)).slice(0, 3) : [];
  const calc = s ? calcExpr(q) : null;
  const conv = s ? convertUnits(q) : null;
  const sugg = ios.recents.map(liFor).filter(Boolean).slice(0, 4) as LaunchItem[];
  const base = sugg.length ? sugg : (['about', 'cv', 'projects', 'hireme'].map((x) => appById(x)).filter(Boolean) as LaunchItem[]);
  return (
    <div className="ios-search" role="dialog" aria-label="Search" onClick={(e) => e.target === e.currentTarget && ios.setPanel('none')}>
      <div className="ios-search-in">
        {!s && (
          <>
            {settings.siriSuggestions !== false && (
              <>
                <h4>{t('iSiriSugg')}</h4>
                <div className="ios-search-apps">
                  {base.map((li) => (
                    <button key={li.id} type="button" onClick={() => ios.launch(li)}>
                      <span className="ios-icon-img">
                        <AppIcon name={iosIcon(li) as IconName} />
                      </span>
                      <small>{iosLabel(li)}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
            <h4>{t('iSuggested')}</h4>
            <button type="button" className="ios-search-row ios-glass" onClick={() => ios.openApp('hireme')}>
              <b>Hire {personal.name}</b>
              <small>{personal.status}</small>
            </button>
            <button type="button" className="ios-search-row ios-glass" onClick={() => ios.openApp('preview')}>
              <b>Open CV</b>
              <small>M_R_AHAMED_CV.pdf</small>
            </button>
          </>
        )}
        {(calc || conv) && (
          <div className="ios-search-row ios-glass calc">
            <small>{conv ? conv.from : q}</small>
            <b>= {conv ? conv.result : calc}</b>
          </div>
        )}
        {apps.length > 0 && (
          <>
            <h4>Apps</h4>
            <div className="ios-search-apps">
              {apps.map((li) => (
                <button key={li.id} type="button" onClick={() => ios.launch(li)}>
                  <span className="ios-icon-img">
                    <AppIcon name={iosIcon(li) as IconName} />
                  </span>
                  <small>{iosLabel(li)}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {proj.length > 0 && (
          <>
            <h4>Projects</h4>
            {proj.map((p) => (
              <button key={p.id} type="button" className="ios-search-row ios-glass" onClick={() => ios.openApp('casestudies', { project: p.id })}>
                <b>{p.name}</b>
                <small>{p.category}</small>
              </button>
            ))}
          </>
        )}
        {skills.length > 0 && (
          <>
            <h4>Skills</h4>
            {skills.map((k) => (
              <button key={k.label} type="button" className="ios-search-row ios-glass" onClick={() => ios.openApp('notes')}>
                <b>{k.label}</b>
                <small>{k.items.slice(0, 6).join(' · ')}</small>
              </button>
            ))}
          </>
        )}
        {s && !apps.length && !proj.length && !skills.length && !calc && !conv && (
          <button type="button" className="ios-search-row ios-glass" onClick={() => ios.openApp('google', { q })}>
            <b>Search the web for “{q}”</b>
            <small>Google</small>
          </button>
        )}
      </div>
      <div className="ios-search-bar ios-glass">
        <span>⌕</span>
        <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search" onKeyDown={(e) => e.key === 'Enter' && apps[0] && ios.launch(apps[0])} />
        <button type="button" onClick={() => ios.setPanel('none')}>
          {t('iCancel')}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── slide to power off ───────────────────────── */

function PowerOffSlider() {
  const ios = useIOS();
  const sys = useSystem();
  const [x, setX] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const max = () => (ref.current ? ref.current.clientWidth - 64 : 200);
  return (
    <div className="ios-power" role="dialog" aria-label="Power off">
      <div
        ref={ref}
        className="ios-power-track"
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={(e) => {
          if (!e.buttons) return;
          const r = ref.current!.getBoundingClientRect();
          setX(Math.max(0, Math.min(max(), e.clientX - r.left - 32)));
        }}
        onPointerUp={() => {
          if (x >= max() - 6) {
            ios.setPanel('none');
            sys.shutdown();
          } else setX(0);
        }}
      >
        <span className="ios-power-knob" style={{ transform: `translateX(${x}px)` }}>
          ⏻
        </span>
        <span className="ios-power-txt" style={{ opacity: 1 - x / 160 }}>
          {t('iPowerOff')}
        </span>
      </div>
      <button type="button" className="ios-power-btn" onClick={() => (ios.setPanel('none'), sys.restart())}>
        ↻ Restart
      </button>
      <button type="button" className="ios-power-cancel" onClick={() => ios.setPanel('none')}>
        ✕<small>{t('iCancel')}</small>
      </button>
    </div>
  );
}

/* ───────────────────────── AssistiveTouch ───────────────────────── */


function useATRun() {
  const ios = useIOS();
  const sys = useSystem();
  const music = useMusic();
  return (a: string) => {
    switch (a) {
      case 'home':
        return ios.goHome();
      case 'notifications':
        return ios.setPanel('nc');
      case 'control':
        return ios.setPanel('cc');
      case 'switcher':
        return ios.setPanel('switcher');
      case 'siri':
        return window.dispatchEvent(new Event('mra-siri'));
      case 'screenshot':
        return window.dispatchEvent(new Event('mra-screenshot'));
      case 'lock':
        return sys.lock('lock');
      case 'search':
        return ios.setPanel('search');
      case 'undo':
        return window.dispatchEvent(new Event('mra-shake'));
      case 'torch':
        return islandTorch(!isTorch());
      case 'camera':
        return ios.openApp('camera');
      case 'poweroff':
        return ios.setPanel('poweroff');
      case 'settings':
        return ios.openApp('settings', { pane: 'accessibility' });
      case 'volup':
        return music.setVolume(Math.min(1, music.volume + 0.1));
      case 'voldown':
        return music.setVolume(Math.max(0, music.volume - 0.1));
      case 'mute':
        return music.toggleMute();
      default:
        return undefined;
    }
  };
}

const AT_ICON: Record<string, string> = { ...Object.fromEntries(Object.entries(AT_ACTIONS).map(([k, v]) => [k, v.icon])), volup: 'speaker', voldown: 'speaker1', mute: 'mute', notifications: 'bell', home: 'home', search: 'search', undo: 'undo', torch: 'torch', switcher: 'grid' };

function AssistiveTouch() {
  const { settings } = useSettings();
  const run = useATRun();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const { update } = useSettings();
  const [menu, setMenu] = useState<'none' | 'main' | 'device' | 'custom'>('none');
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    const on = () => setRecording(true);
    window.addEventListener('mra-at-record', on);
    return () => window.removeEventListener('mra-at-record', on);
  }, []);
  const [idle, setIdle] = useState(true);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean; t: number; long: number } | null>(null);
  const lastTap = useRef(0);
  const tapT = useRef(0);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sh = document.querySelector('.ios-shell')?.getBoundingClientRect();
    if (sh && !pos) setPos({ x: sh.width - 66, y: sh.height * 0.55 });
  }, [pos]);
  useEffect(() => {
    if (menu !== 'none') return;
    const t = window.setTimeout(() => setIdle(true), 2500);
    return () => window.clearTimeout(t);
  }, [menu, pos, idle]);
  if (!settings.atOn || !pos) return null;

  const single = settings.atSingle ?? 'menu';
  const doSingle = () => (single === 'menu' ? setMenu((m) => (m === 'none' ? 'main' : 'none')) : run(single));
  const icons = (settings.atIcons ?? []).slice(0, 8);

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`ios-at ${idle && menu === 'none' ? 'idle' : ''}`}
        style={{ left: pos.x, top: pos.y, ['--at-op' as string]: String(settings.atOpacity ?? 0.4) }}
        aria-label="AssistiveTouch"
        onPointerDown={(e) => {
          setIdle(false);
          e.currentTarget.setPointerCapture(e.pointerId);
          const d = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y, moved: false, t: Date.now(), long: 0 };
          d.long = window.setTimeout(() => {
            if (!d.moved) {
              drag.current = null;
              run(settings.atLong ?? 'siri');
            }
          }, 600);
          drag.current = d;
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.hypot(dx, dy) > 6) {
            d.moved = true;
            window.clearTimeout(d.long);
          }
          if (d.moved) setPos({ x: d.ox + dx, y: d.oy + dy });
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          window.clearTimeout(d.long);
          const sh = document.querySelector('.ios-shell')?.getBoundingClientRect();
          if (d.moved && sh) {
            // snap to the nearest side
            setPos((p) => (p ? { x: p.x + 28 < sh.width / 2 ? 8 : sh.width - 64, y: Math.max(50, Math.min(sh.height - 110, p.y)) } : p));
            return;
          }
          const dbl = settings.atDouble ?? 'switcher';
          if (dbl !== 'none' && Date.now() - lastTap.current < 320) {
            window.clearTimeout(tapT.current);
            lastTap.current = 0;
            run(dbl);
            return;
          }
          lastTap.current = Date.now();
          window.clearTimeout(tapT.current);
          tapT.current = window.setTimeout(doSingle, dbl !== 'none' ? 300 : 0);
        }}
      >
        <i />
      </button>
      {menu !== 'none' && (
        <div className="ios-at-back" onClick={() => setMenu('none')}>
          <div className="ios-at-menu" onClick={(e) => e.stopPropagation()} role="menu" data-n={menu === 'main' ? icons.length : menu === 'custom' ? Math.min(9, 6 + (settings.atGestures ?? []).length + ((settings.atGestures ?? []).length < 3 ? 1 : 0)) : 6}>
            {menu === 'main' &&
              icons.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (a === 'device') return setMenu('device');
                    if (a === 'custom') return setMenu('custom');
                    setMenu('none');
                    run(a);
                  }}
                >
                  <i><CCIcon n={AT_ACTIONS[a]?.icon ?? 'grid'} size={24} /></i>
                  <span>{AT_ACTIONS[a]?.label ?? a}</span>
                </button>
              ))}
            {menu === 'device' &&
              (
                [
                  ['lock', '🔒', 'Lock Screen'],
                  ['volup', '🔊', 'Volume Up'],
                  ['voldown', '🔉', 'Volume Down'],
                  ['mute', '🔇', 'Mute'],
                  ['screenshot', '⧈', 'Screenshot'],
                  ['poweroff', '⏻', 'Power Off'],
                ] as const
              ).map(([a, g, l]) => (
                <button key={a} type="button" role="menuitem" onClick={() => (setMenu('none'), run(a))}>
                  <i>{AT_ICON[a] ? <CCIcon n={AT_ICON[a]} size={24} /> : g}</i>
                  <span>{l}</span>
                </button>
              ))}
            {menu === 'custom' &&
              (
                [
                  ['switcher', '▤', 'Swipe Up & Hold'],
                  ['home', '⌂', 'Swipe Up'],
                  ['notifications', '⇣', 'Swipe Down'],
                  ['search', '⌕', 'Pull Down'],
                  ['undo', '↶', '3-Finger Double-Tap'],
                  ['torch', '🔦', 'Torch'],
                ] as const
              ).map(([a, g, l]) => (
                <button key={l} type="button" role="menuitem" onClick={() => (setMenu('none'), run(a))}>
                  <i>{AT_ICON[a] ? <CCIcon n={AT_ICON[a]} size={24} /> : g}</i>
                  <span>{l}</span>
                </button>
              ))}
            {menu === 'custom' &&
              (settings.atGestures ?? []).map((g, k) => (
                <button key={`g${k}`} type="button" role="menuitem" onClick={() => (setMenu('none'), window.setTimeout(() => replayGesture(g.pts), 260))}>
                  <i>
                    <CCIcon n="hand" size={24} />
                  </i>
                  <span>{g.name}</span>
                </button>
              ))}
            {menu === 'custom' && (settings.atGestures ?? []).length < 3 && (
              <button type="button" role="menuitem" onClick={() => (setMenu('none'), setRecording(true))}>
                <i>＋</i>
                <span>Create New Gesture</span>
              </button>
            )}
          </div>
        </div>
      )}
      {recording && (
        <GestureRecorder
          onCancel={() => setRecording(false)}
          onSave={(name, pts) => {
            setRecording(false);
            update({ atGestures: [...(settings.atGestures ?? []), { name, pts }].slice(-3) });
          }}
        />
      )}
    </>
  );
}

type GPt = [number, number, number];
/** v10 — replays a recorded AssistiveTouch gesture: a touch dot follows the path and real pointer events are sent to what is underneath. */
function replayGesture(pts: GPt[]) {
  const shell = document.querySelector('.ios-shell') as HTMLElement | null;
  if (!shell || !pts.length) return;
  const r = shell.getBoundingClientRect();
  const at = (p: GPt) => ({ x: r.left + p[0] * r.width, y: r.top + p[1] * r.height });
  const dot = document.createElement('div');
  dot.className = 'ios-at-dot';
  document.body.appendChild(dot);
  const under = (x: number, y: number) => {
    dot.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    dot.style.display = '';
    return el;
  };
  const fire = (type: string, x: number, y: number, el: Element | null) =>
    el?.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 77, pointerType: 'touch', isPrimary: true, buttons: type === 'pointerup' ? 0 : 1 }));
  const p0 = at(pts[0]);
  const target = under(p0.x, p0.y);
  const t0 = performance.now();
  const total = pts[pts.length - 1][2];
  let i = 0;
  fire('pointerdown', p0.x, p0.y, target);
  const step = () => {
    const el = performance.now() - t0;
    while (i < pts.length - 1 && pts[i + 1][2] <= el) i++;
    const c = at(pts[i]);
    dot.style.transform = `translate(${c.x - 18}px, ${c.y - 18}px)`;
    if (el < total && i < pts.length - 1) {
      fire('pointermove', c.x, c.y, target);
      requestAnimationFrame(step);
      return;
    }
    const end = at(pts[pts.length - 1]);
    fire('pointerup', end.x, end.y, target);
    const moved = Math.hypot(end.x - p0.x, end.y - p0.y);
    if (moved < 10 && total < 500) (target as HTMLElement | null)?.click?.();
    window.setTimeout(() => dot.remove(), 220);
  };
  dot.style.transform = `translate(${p0.x - 18}px, ${p0.y - 18}px)`;
  requestAnimationFrame(step);
}

function GestureRecorder({ onCancel, onSave }: { onCancel: () => void; onSave: (name: string, pts: GPt[]) => void }) {
  const [pts, setPts] = useState<GPt[]>([]);
  const [name, setName] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const t0 = useRef(0);
  const down = useRef(false);
  const rel = (e: RPointerEvent<HTMLDivElement>): GPt => {
    const r = box.current!.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)), Math.round(performance.now() - t0.current)];
  };
  const path = pts.map((p, k) => `${k ? 'L' : 'M'}${(p[0] * 100).toFixed(2)} ${(p[1] * 100).toFixed(2)}`).join(' ');
  return (
    <div className="ios-at-rec" role="dialog" aria-label="New Gesture">
      <div className="ios-at-rec-top">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <b>New Gesture</b>
        <button type="button" disabled={!pts.length} onClick={() => setPts([])}>
          Clear
        </button>
      </div>
      <div
        ref={box}
        className="ios-at-rec-pad"
        onPointerDown={(e) => {
          if (pts.length) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          down.current = true;
          t0.current = performance.now();
          setPts([rel(e)]);
        }}
        onPointerMove={(e) => down.current && setPts((l) => [...l, rel(e)].slice(0, 400))}
        onPointerUp={(e) => {
          if (!down.current) return;
          down.current = false;
          setPts((l) => [...l, rel(e)]);
        }}
      >
        {!pts.length && <p>Tap or swipe to create a custom gesture.</p>}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={path} />
        </svg>
      </div>
      {pts.length > 0 && !down.current && (
        <form
          className="ios-at-rec-save"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(name.trim() || 'My Gesture', pts);
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder="Gesture name" aria-label="Gesture name" />
          <button type="submit">Save</button>
        </form>
      )}
    </div>
  );
}

/* ───────────────────────── Back Tap (tap the back of the phone) ───────────────────────── */

function BackTap() {
  const { settings } = useSettings();
  const run = useATRun();
  const runRef = useRef(run);
  runRef.current = run;
  const dbl = settings.backTapDouble ?? 'none';
  const tpl = settings.backTapTriple ?? 'none';
  useEffect(() => {
    if (dbl === 'none' && tpl === 'none') return;
    let taps: number[] = [];
    let last = 0;
    let t = 0;
    const on = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      const z = Math.abs(a?.z ?? 0);
      const xy = Math.hypot(a?.x ?? 0, a?.y ?? 0);
      const now = Date.now();
      // a back tap is a short, sharp knock along the screen axis
      if (z < 2.4 || xy > z || now - last < 90) return;
      last = now;
      taps = [...taps.filter((x) => now - x < 800), now];
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const n = taps.length;
        taps = [];
        const act = n >= 3 ? tpl : n === 2 ? dbl : 'none';
        if (act !== 'none') runRef.current(act);
      }, 420);
    };
    window.addEventListener('devicemotion', on);
    return () => {
      window.removeEventListener('devicemotion', on);
      window.clearTimeout(t);
    };
  }, [dbl, tpl]);
  return null;
}

/* ───────────────────────── torch, alarm, Siri, screenshot, shake ───────────────────────── */

function Torch() {
  const [on, setOn] = useState(isTorch());
  const [fallback, setFallback] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  useEffect(() => {
    const ev = (e: Event) => setOn(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener(ISLAND_TORCH, ev);
    return () => window.removeEventListener(ISLAND_TORCH, ev);
  }, []);
  useEffect(() => {
    if (!on) {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setFallback(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera API');
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        const track = s.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        if (!caps.torch) {
          s.getTracks().forEach((t) => t.stop());
          throw new Error('no torch');
        }
        await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
        stream.current = s;
      } catch {
        if (!cancelled) setFallback(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [on]);
  if (!on || !fallback) return null;
  return (
    <div className="ios-torch" onClick={() => islandTorch(false)} role="button" aria-label="Turn torch off">
      <b>Screen torch</b>
      <small>This browser can’t switch the camera flash on, so the screen lights up instead. Tap to turn it off.</small>
    </div>
  );
}

function AlarmOverlay() {
  const [a, setA] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setA((e as CustomEvent<{ label: string }>).detail.label);
    window.addEventListener('mra-alarm-ring', on);
    return () => window.removeEventListener('mra-alarm-ring', on);
  }, []);
  if (!a) return null;
  const now = new Date();
  return (
    <div className="ios-alarm" role="alertdialog" aria-label={`Alarm: ${a}`}>
      <small>{a}</small>
      <b>{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')}</b>
      <button
        type="button"
        className="ios-alarm-snooze"
        onClick={() => {
          stopRinging();
          setA(null);
          window.setTimeout(() => window.dispatchEvent(new CustomEvent('mra-alarm-ring', { detail: { label: a } })), 9 * 60000);
          islandPing({ icon: 'alarm', title: 'Snoozed', sub: '9 min', tint: '#ff9f0a' });
        }}
      >
        Snooze
      </button>
      <button
        type="button"
        className="ios-alarm-stop"
        onClick={() => {
          stopRinging();
          setA(null);
        }}
      >
        Stop
      </button>
    </div>
  );
}

function Extras() {
  const ios = useIOS();
  const [siri, setSiri] = useState(false);
  const [flash, setFlash] = useState(0);
  const [shake, setShake] = useState(false);
  const [markup, setMarkup] = useState(false);
  const flashT = useRef(0);
  useEffect(() => {
    const s = () => {
      setSiri(true);
      window.setTimeout(() => {
        setSiri(false);
        ios.openApp('siri');
      }, 1100);
    };
    const shot = () => {
      playShutter();
      setFlash(Date.now());
      window.clearTimeout(flashT.current);
      flashT.current = window.setTimeout(() => setFlash(0), 4000);
    };
    const sh = () => setShake(true);
    window.addEventListener('mra-siri', s);
    window.addEventListener('mra-screenshot', shot);
    window.addEventListener('mra-shake', sh);
    return () => {
      window.removeEventListener('mra-siri', s);
      window.removeEventListener('mra-screenshot', shot);
      window.removeEventListener('mra-shake', sh);
    };
  }, [ios]);
  return (
    <>
      {siri && <div className="ios-siri-glow" aria-hidden="true" />}
      {flash > 0 && (
        <div className="ios-shot" aria-live="polite">
          <span className="ios-shot-flash" />
          <button
            type="button"
            className="ios-shot-thumb"
            onClick={() => {
              window.clearTimeout(flashT.current);
              setFlash(0);
              setMarkup(true);
            }}
          >
            Screenshot (demo) · tap to mark up
          </button>
        </div>
      )}
      {markup && <Markup onClose={() => setMarkup(false)} />}
      {shake && (
        <div className="ios-alert-back" onClick={() => setShake(false)}>
          <div className="ios-alert" role="alertdialog" aria-label="Undo" onClick={(e) => e.stopPropagation()}>
            <b>{canUndo() ? `Undo ${undoLabel()}` : 'Nothing to Undo'}</b>
            <p>Shake, or tap with three fingers twice, to undo your last change.</p>
            {canUndo() && (
              <button
                type="button"
                className="ios-alert-btn strong"
                onClick={() => {
                  doUndo();
                  setShake(false);
                }}
              >
                Undo
              </button>
            )}
            <button type="button" className="ios-alert-btn" onClick={() => setShake(false)}>
              {canUndo() ? 'Cancel' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────────────────── Markup (draw on the screenshot) ───────────────────────── */

type Stroke = { tool: 'pen' | 'marker' | 'pencil'; color: string; pts: [number, number][] };
const MK_COLORS = ['#000000', '#ffffff', '#0a84ff', '#30d158', '#ffd60a', '#ff453a'];

function Markup({ onClose }: { onClose: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Stroke['tool'] | 'eraser'>('pen');
  const [color, setColor] = useState('#ff453a');
  const cur = useRef<Stroke | null>(null);
  const draw = useCallback((list: Stroke[]) => {
    const c = cv.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    g.clearRect(0, 0, c.width, c.height);
    for (const s of list) {
      g.globalAlpha = s.tool === 'marker' ? 0.4 : s.tool === 'pencil' ? 0.8 : 1;
      g.strokeStyle = s.color;
      g.lineWidth = (s.tool === 'marker' ? 18 : s.tool === 'pencil' ? 2 : 4) * devicePixelRatio;
      g.lineCap = s.tool === 'marker' ? 'square' : 'round';
      g.lineJoin = 'round';
      g.beginPath();
      s.pts.forEach(([x, y], k) => (k ? g.lineTo(x * c.width, y * c.height) : g.moveTo(x * c.width, y * c.height)));
      if (s.pts.length === 1) g.lineTo(s.pts[0][0] * c.width + 0.5, s.pts[0][1] * c.height);
      g.stroke();
    }
    g.globalAlpha = 1;
  }, []);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * devicePixelRatio);
    c.height = Math.round(r.height * devicePixelRatio);
    draw(strokes);
  }, [draw, strokes]);
  const rel = (e: RPointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  const erase = (p: [number, number]) => setStrokes((l) => l.filter((s) => !s.pts.some(([x, y]) => Math.hypot(x - p[0], (y - p[1]) * 2) < 0.03)));
  const save = () => {
    const c = cv.current;
    if (!c) return;
    c.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Markup.png';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
    onClose();
  };
  return (
    <div className="ios-mk" role="dialog" aria-label="Markup">
      <div className="ios-mk-top">
        <button type="button" onClick={onClose}>
          Done
        </button>
        <span>Markup</span>
        <button type="button" disabled={!strokes.length} onClick={save}>
          Save drawing
        </button>
      </div>
      <canvas
        ref={cv}
        className="ios-mk-cv"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = rel(e);
          if (tool === 'eraser') return erase(p);
          cur.current = { tool, color, pts: [p] };
          setStrokes((l) => [...l, cur.current!]);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0 && e.pointerType === 'mouse') return;
          const p = rel(e);
          if (tool === 'eraser') {
            if (e.buttons || e.pointerType !== 'mouse') erase(p);
            return;
          }
          const s = cur.current;
          if (!s) return;
          s.pts.push(p);
          draw(strokes);
        }}
        onPointerUp={() => {
          cur.current = null;
          setStrokes((l) => [...l]);
        }}
      />
      <div className="ios-mk-bar">
        <button type="button" aria-label="Undo" disabled={!strokes.length} onClick={() => setStrokes((l) => l.slice(0, -1))}>
          <CCIcon n="undo" size={22} />
        </button>
        {(['pen', 'marker', 'pencil', 'eraser'] as const).map((t) => (
          <button key={t} type="button" className={`ios-mk-tool ${tool === t ? 'on' : ''}`} aria-pressed={tool === t} onClick={() => setTool(t)}>
            <CCIcon n={t} size={22} />
            <small>{t === 'marker' ? 'Highlighter' : t[0].toUpperCase() + t.slice(1)}</small>
          </button>
        ))}
        <span className="ios-mk-colors">
          {MK_COLORS.map((c) => (
            <button key={c} type="button" aria-label={`Colour ${c}`} className={color === c ? 'on' : ''} style={{ background: c }} onClick={() => (setColor(c), tool === 'eraser' && setTool('pen'))} />
          ))}
        </span>
      </div>
      <p className="ios-mk-note">Demo screenshot — draw over the screen. “Save drawing” downloads your marks as a PNG.</p>
    </div>
  );
}

export function IOSPanels() {
  const ios = useIOS();
  const p = ios.panel;
  return (
    <>
      {p === 'cc' && <IOSControlCentre />}
      {p === 'nc' && <NotificationCentre />}
      {p === 'switcher' && <AppSwitcher />}
      {p === 'search' && <Search />}
      {p === 'poweroff' && <PowerOffSlider />}
      <AssistiveTouch />
      <BackTap />
      <VolumeHUD variant="ios" />
      <Dictation />
      <MusicPiP />
      <ModeBar variant="ios" />
      <Onboarding device={ios.mode === 'ipad' ? 'ipad' : 'iphone'} />
      <Torch />
      <AlarmOverlay />
      <Extras />
    </>
  );
}
