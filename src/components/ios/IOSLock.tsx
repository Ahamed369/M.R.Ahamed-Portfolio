import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { t } from '../../system/i18n';
import { useSystem } from '../../system/SystemContext';
import { useSettings } from '../../system/SettingsContext';
import { useMusic } from '../../system/MusicContext';
import { useWM } from '../../system/WindowManager';
import { SysIcon } from '../SysIcons';
import { islandTorch, isTorch, ISLAND_TORCH } from '../../system/island';
import { personal } from '../../data/portfolio';
import { useKandyWeather } from './IOSWidgets';
import { playLock } from '../../system/sounds';
import { wallFor } from '../../data/media';
import { Wallpaper, WallImage } from '../Wallpaper';
import { deviceWall, lockWallFor, setDeviceWall } from '../../system/wallpaperCycle';
import { useIOS } from './ctx';

const FONTS: Record<string, string> = {
  rounded: "'SF Pro Rounded', ui-rounded, 'Nunito', system-ui, sans-serif",
  serif: "'New York', 'Iowan Old Style', Georgia, serif",
  mono: "'SF Mono', ui-monospace, Menlo, monospace",
  thin: "-apple-system, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
};

function Clock({ now, big }: { now: Date; big?: boolean }) {
  const { settings } = useSettings();
  const t = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: settings.clock24 === undefined ? undefined : !settings.clock24 }).replace(/\s?[AP]M$/i, '');
  return (
    <div className={`lk-clock ${big ? 'big' : ''} f-${settings.iosLockFont ?? 'rounded'}`} style={{ fontFamily: FONTS[settings.iosLockFont ?? 'rounded'], color: settings.iosLockColor ?? '#fff' }}>
      {t}
    </div>
  );
}

/**
 * v10 — iPhone / iPad Lock Screen: clock, date, widgets, notifications,
 * torch & camera, swipe up to unlock (no passcode or biometrics), long-press to customise,
 * Always-On dimming and StandBy (landscape).
 */
export function IOSLock() {
  const sys = useSystem();
  const wm = useWM();
  const ios = useIOS();
  const music = useMusic();
  const { settings, update, motionReduced } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [faceId, setFaceId] = useState(false);
  const [dim, setDim] = useState(false);
  const [custom, setCustom] = useState(false);
  const [torch, setTorch] = useState(isTorch());
  const [landscape, setLandscape] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [askDel, setAskDel] = useState<string | null>(null);
  const start = useRef<{ y: number; t: number; id: number } | null>(null);
  const longT = useRef(0);
  const shownAt = useRef(Date.now());
  const wx = useKandyWeather();
  const locked = sys.locked;

  useEffect(() => {
    if (!locked) return;
    setLeaving(false);
    setDrag(0);
    setFaceId(false);
    shownAt.current = Date.now();
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [locked]);
  useEffect(() => {
    const on = (e: Event) => setTorch(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener(ISLAND_TORCH, on);
    return () => window.removeEventListener(ISLAND_TORCH, on);
  }, []);
  useEffect(() => {
    const on = () => {
      const sh = document.querySelector('.ios-shell')?.getBoundingClientRect();
      setLandscape(!!sh && sh.width > sh.height * 1.15 && ios.mode === 'iphone');
    };
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [ios.mode]);

  // Always-On: dim after 10 s untouched
  useEffect(() => {
    if (!locked || !settings.alwaysOn) return;
    let t = window.setTimeout(() => setDim(true), 10000);
    const wake = () => {
      setDim(false);
      window.clearTimeout(t);
      t = window.setTimeout(() => setDim(true), 10000);
    };
    window.addEventListener('pointerdown', wake, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', wake, true);
      setDim(false);
    };
  }, [locked, settings.alwaysOn]);

  // keyboard: Enter / Space / ↑ unlock
  useEffect(() => {
    if (!locked) return;
    const on = (e: KeyboardEvent) => {
      if (custom || gallery) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        doUnlock();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  if (sys.asleep)
    return (
      <div className="lk-sleep" onClick={() => sys.wake()} role="button" aria-label="Wake">
        {settings.alwaysOn && <Clock now={now} />}
      </div>
    );
  if (!locked || sys.phase !== 'ready') return null;

  const doUnlock = () => {
    if (leaving || Date.now() - shownAt.current < 350) return;
    setFaceId(true);
    if (settings.lockSound !== false) playLock(0.25);
    window.setTimeout(
      () => {
        setLeaving(true);
        window.setTimeout(() => sys.unlock(), motionReduced ? 40 : 420);
      },
      motionReduced ? 30 : 520,
    );
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, .lk-notifs')) return;
    start.current = { y: e.clientY, t: Date.now(), id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    longT.current = window.setTimeout(() => {
      if (start.current && Math.abs(drag) < 8) {
        start.current = null;
        setDrag(0);
        if (navigator.vibrate) navigator.vibrate(10);
        setGallery(true);
      }
    }, 650);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const d = Math.max(0, start.current.y - e.clientY);
    if (d > 8) window.clearTimeout(longT.current);
    setDrag(d);
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    window.clearTimeout(longT.current);
    const s = start.current;
    start.current = null;
    if (!s) return;
    const d = s.y - e.clientY;
    const v = d / Math.max(1, Date.now() - s.t);
    if (d > 110 || v > 0.5) doUnlock();
    else if (Math.abs(d) < 6 && e.pointerType === 'mouse') doUnlock();
    else setDrag(0);
  };

  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const ok = wx && wx !== 'error';
  const notifs = sys.notifications.slice(0, 6);
  const style = settings.notifStyle ?? 'stack';
  const previews = (settings.showPreviews ?? 'always') === 'always';

  /* StandBy: landscape iPhone on the Lock Screen */
  if (landscape && settings.standBy !== false && !sys.rotationLock)
    return (
      <div className="ios-standby" onClick={doUnlock} role="button" aria-label="StandBy — tap to unlock">
        <div className="sb-clock">
          <Clock now={now} big />
          <small>{date}</small>
        </div>
        <div className="sb-side">
          <b>{personal.city}</b>
          <span className="sb-temp">{ok ? `${Math.round(wx.t)}°` : '—'}</span>
          <small>{music.playing ? `Now playing · ${music.track.title}` : personal.status}</small>
        </div>
      </div>
    );

  const shift = Math.min(drag, 400);
  const dev = ios.mode === 'ipad' ? 'ipad' : 'iphone';
  const homeWall = deviceWall(settings, dev);
  const lockWall = lockWallFor(settings, dev);
  const font = settings.iosLockFont ?? 'rounded';
  const color = settings.iosLockColor ?? '#ffffff';
  /* saved Lock Screens (the current look is always the first card until you save more) */
  const saved = settings.lockScreens ?? [];
  const curId = settings.lockScreenId || saved[0]?.id || 'current';
  const cards = saved.length ? saved : [{ id: 'current', wall: lockWall, font, color }];
  const applyScreen = (c: { id: string; wall: string; font: string; color: string }) =>
    update({ lockScreenId: c.id, iosLockFont: c.font as 'rounded', iosLockColor: c.color, lockWall: { ...(settings.lockWall ?? { mac: '', ipad: '', iphone: '' }), [dev]: c.wall === homeWall ? '' : c.wall } });
  const syncCurrent = (patch: Partial<{ wall: string; font: string; color: string }>) => {
    if (!saved.length) return;
    update({ lockScreens: saved.map((c) => (c.id === curId ? { ...c, ...patch } : c)) });
  };
  const addScreen = () => {
    const base = saved.length ? saved : [{ id: `ls${Date.now() - 1}`, wall: lockWall, font, color }];
    const n = { id: `ls${Date.now()}`, wall: lockWall, font, color };
    update({ lockScreens: [...base, n], lockScreenId: n.id });
    setGallery(false);
    setCustom(true);
  };
  const setLockWall = (id: string) => {
    update({ lockWall: { ...(settings.lockWall ?? { mac: '', ipad: '', iphone: '' }), [dev]: id === homeWall ? '' : id } });
    syncCurrent({ wall: id });
  };
  return (
    <div
      className={`ios-lock ${leaving ? 'leaving' : ''} ${dim ? 'aod' : ''} ${faceId ? 'faceid' : ''}`}
      style={{ ['--lk-drag' as string]: `${shift}px`, ['--lk-p' as string]: String(Math.min(1, shift / 300)) }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="dialog"
      aria-label="Lock Screen — swipe up or press Enter to unlock. Touch and hold to switch or customise Lock Screens."
    >
      {lockWall !== homeWall && (
        <div className="lk-wall" aria-hidden="true">
          <Wallpaper id={lockWall} tint={false} custom={settings.customWallpaper} />
        </div>
      )}
      <div className="lk-top">
        <span className={`lk-lock ${faceId ? 'open' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d={faceId ? 'M7 10V7a5 5 0 0 1 9.6-1.9l-1.8.8A3 3 0 0 0 9 7v3h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z' : 'M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zm2 0h6V7a3 3 0 0 0-6 0z'} />
          </svg>
        </span>
        <div className="lk-date">{date}</div>
        <div className={settings.iosDepth ? 'lk-depth' : ''}>
          <Clock now={now} />
        </div>
        <div className="lk-widgets">
          <span className="lk-w">
            <b>{ok ? `${Math.round(wx.t)}°` : '—'}</b>
            <small>{personal.city}</small>
          </span>
          <span className="lk-w">
            <b>{now.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</b>
            <small>{now.getDate()}</small>
          </span>
          <span className="lk-w wide">
            <b>{personal.name}</b>
            <small>{personal.status}</small>
          </span>
        </div>
      </div>

      {music.playing || music.currentTime > 0 ? (
        <div className="lk-music ios-glass" onPointerDown={(e) => e.stopPropagation()}>
          <span className="lk-art" style={{ background: `linear-gradient(135deg, ${music.track.art[0]}, ${music.track.art[1]})` }}>
            <SysIcon n="music" size={20} />
          </span>
          <span className="lk-mt">
            <b>{music.track.title}</b>
            <small>{music.track.artist}</small>
          </span>
          <button type="button" onClick={music.prev} aria-label="Previous">
            <SysIcon n="prev" size={22} />
          </button>
          <button type="button" onClick={music.toggle} aria-label={music.playing ? 'Pause' : 'Play'}>
            <SysIcon n={music.playing ? 'pause' : 'play'} size={24} />
          </button>
          <button type="button" onClick={music.next} aria-label="Next">
            <SysIcon n="next" size={22} />
          </button>
        </div>
      ) : null}

      <div className="lk-notifs" onPointerDown={(e) => e.stopPropagation()}>
        {notifs.length > 0 && style === 'count' && !showAll ? (
          <button type="button" className="lk-count ios-glass" onClick={() => setShowAll(true)}>
            {sys.notifications.length} Notification{sys.notifications.length === 1 ? '' : 's'}
          </button>
        ) : (
          <>
            {notifs.length > 0 && <span className="lk-nc-h">{t('iNC')}</span>}
            {(style === 'stack' && !showAll ? notifs.slice(0, 1) : notifs).map((n, i) => (
              <button key={n.id} type="button" className={`lk-n ios-glass ${style === 'stack' && !showAll && notifs.length > 1 ? 'stacked' : ''}`} style={{ ['--i' as string]: i }} onClick={() => (style === 'stack' && !showAll && notifs.length > 1 ? setShowAll(true) : doUnlock())}>
                <span className="lk-n-app">{n.app}</span>
                <b>{n.title}</b>
                {n.body && previews && <small>{n.body}</small>}
                {style === 'stack' && !showAll && notifs.length > 1 && <small className="lk-n-more">+{notifs.length - 1} more</small>}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="lk-bottom">
        {settings.lockTorchBtn !== false ? (
        <button
          type="button"
          className={`lk-round ${torch ? 'on' : ''}`}
          aria-label={torch ? 'Turn torch off' : 'Turn torch on'}
          onClick={() => {
            playLock(0.2);
            islandTorch(!torch);
          }}
        >
          <SysIcon n={torch ? 'torchOn' : 'torch'} size={24} />
        </button>
        ) : (
          <span className="lk-round-ph" />
        )}
        <span className="lk-hint">{faceId ? t('iUnlocked') : t('iSwipeOpen')}</span>
        {settings.lockCameraBtn !== false ? (
        <button
          type="button"
          className="lk-round"
          aria-label="Camera"
          onClick={() => {
            setFaceId(true);
            setLeaving(true);
            window.setTimeout(() => {
              sys.unlock();
              wm.open('camera');
            }, 300);
          }}
        >
          <SysIcon n="camera" size={24} />
        </button>
        ) : (
          <span className="lk-round-ph" />
        )}
      </div>
      <div className="lk-bar" aria-hidden="true" />

      {gallery && !custom && (
        <div className="lk-gallery" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label="Lock Screens">
          <div className="lk-gal-top">
            <span>Lock Screens</span>
            <button type="button" className="ios-pill strong" onClick={() => setGallery(false)}>
              Done
            </button>
          </div>
          <div className="lk-gal-row">
            {cards.map((c) => (
              <div key={c.id} className={`lk-gal-card ${c.id === curId ? 'on' : ''}`}>
                <button type="button" className="lk-gal-face" aria-label={`Use this Lock Screen${c.id === curId ? ' (current)' : ''}`} onClick={() => (applyScreen(c), setGallery(false))}>
                  <WallImage id={c.wall} thumb />
                  <span className="lk-gal-clock" style={{ fontFamily: FONTS[c.font] ?? FONTS.rounded, color: c.color }}>
                    {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: settings.clock24 === undefined ? undefined : !settings.clock24 }).replace(/\s?[AP]M$/i, '')}
                  </span>
                </button>
                {c.id === curId ? (
                  <button type="button" className="ios-pill" onClick={() => (setGallery(false), setCustom(true))}>
                    Customise
                  </button>
                ) : saved.length > 1 ? (
                  <button type="button" className="ios-pill danger" onClick={() => setAskDel(c.id)} aria-label="Delete this Lock Screen">
                    Delete
                  </button>
                ) : (
                  <span className="lk-gal-gap" />
                )}
              </div>
            ))}
            <div className="lk-gal-card add">
              <button type="button" className="lk-gal-face add" aria-label="Add a new Lock Screen" onClick={addScreen}>
                ＋
              </button>
              <span className="lk-gal-gap">Add New</span>
            </div>
          </div>
          <p className="lk-gal-hint">Tap a Lock Screen to switch to it. Your old wallpapers stay saved here.</p>
          {askDel && (
            <div className="ios-alert-back" onClick={() => setAskDel(null)}>
              <div className="ios-alert" role="alertdialog" aria-label="Delete Lock Screen" onClick={(e) => e.stopPropagation()}>
                <b>Delete this Lock Screen?</b>
                <p>Its wallpaper and clock style are removed from this list.</p>
                <button
                  type="button"
                  className="ios-alert-btn strong danger"
                  onClick={() => {
                    update({ lockScreens: saved.filter((x) => x.id !== askDel) });
                    setAskDel(null);
                  }}
                >
                  Delete
                </button>
                <button type="button" className="ios-alert-btn" onClick={() => setAskDel(null)}>
                  {t('iCancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {custom && (
        <div className="lk-custom" onPointerDown={(e) => e.stopPropagation()}>
          <div className="lk-custom-top">
            <button type="button" className="ios-pill" onClick={() => setCustom(false)}>
              {t('iCancel')}
            </button>
            <b>Customise Lock Screen</b>
            <button type="button" className="ios-pill strong" onClick={() => setCustom(false)}>
              Done
            </button>
          </div>
          <div className="lk-custom-sheet ios-glass">
            <h4>Font</h4>
            <div className="lk-fonts">
              {Object.keys(FONTS).map((f) => (
                <button key={f} type="button" className={(settings.iosLockFont ?? 'rounded') === f ? 'on' : ''} style={{ fontFamily: FONTS[f] }} onClick={() => (update({ iosLockFont: f as 'rounded' }), syncCurrent({ font: f }))}>
                  12
                </button>
              ))}
            </div>
            <h4>Colour</h4>
            <div className="ios-tints">
              {['#ffffff', '#ffd6e0', '#ffe9a8', '#c8f7c5', '#bde0fe', '#e0c3fc', '#ff9f0a', '#1d1d1f'].map((c) => (
                <button key={c} type="button" aria-label={`Colour ${c}`} className={settings.iosLockColor === c ? 'on' : ''} style={{ background: c }} onClick={() => (update({ iosLockColor: c }), syncCurrent({ color: c }))} />
              ))}
            </div>
            <h4>Lock Screen Wallpaper</h4>
            <div className="lk-walls">
              {wallFor(dev).map((w) => (
                <button key={w.id} type="button" className={lockWall === w.id ? 'on' : ''} onClick={() => setLockWall(w.id)} aria-label={w.name} title={w.name}>
                  <WallImage id={w.id} thumb />
                </button>
              ))}
            </div>
            <div className="lk-pair">
              <button type="button" className="ios-pill" onClick={() => setLockWall(homeWall)} disabled={lockWall === homeWall}>
                Same as Home Screen
              </button>
              <button type="button" className="ios-pill" onClick={() => setDeviceWall(lockWall, dev, 'home')} disabled={lockWall === homeWall}>
                Use on Home Screen too
              </button>
            </div>
            <label className="ios-row-toggle">
              <span>Depth Effect</span>
              <input type="checkbox" checked={!!settings.iosDepth} onChange={(e) => update({ iosDepth: e.target.checked })} />
            </label>
            <label className="ios-row-toggle">
              <span>Always On Display</span>
              <input type="checkbox" checked={!!settings.alwaysOn} onChange={(e) => update({ alwaysOn: e.target.checked })} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
