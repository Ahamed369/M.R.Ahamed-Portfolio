import { SysIcon } from '../SysIcons';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSettings } from '../../system/SettingsContext';
import { useSystem } from '../../system/SystemContext';
import { useWM } from '../../system/WindowManager';
import { useMusic } from '../../system/MusicContext';
import { useAccount } from '../../system/account';
import { personal } from '../../data/portfolio';
import { IOS_APPS, iosIcon, iosLabel } from '../../system/ios';
import { AppIcon, type IconName } from '../AppIcons';
import { useScreenTime, fmtDuration } from '../../system/screenTime';
import { AssistiveTouchSection, DevicesPane, SoundsV10, TrashPane } from '../../apps/settings/PanesV10';
import { BackTapV101, DisplayZoomV101, DynamicIslandV101, NotificationsV101, ScreenTimeLimitsV101, SiriV101, SystemSoundsV101 } from '../../apps/settings/PanesV101';
import { DOCK_APPS, IPAD_DOCK } from '../../system/ios';
import { WallpaperLibrary } from '../WallpaperLibrary';
import { ModePicker } from '../ModeBar';
import { replayOnboarding } from '../Onboarding';
import { CC_DEFS } from './IOSControlCentre';
import { defaultSettings } from '../../system/SettingsContext';
import { IOS } from './ctx';
import { useContext } from 'react';
import type { AppProps } from '../Desktop';
import type { Settings } from '../../system/types';
import { useHomeLayout, IOS_WIDGETS, type HomeItem } from '../../system/ios';
import { STACK_DEFAULT } from './IOSWidgets';
import { integrations } from '../../data/portfolio';
import { readStore, writeStore } from '../../system/storage';
import { flashSettingRow } from '../../system/settingsSearch';

const MacSettings = lazy(() => import('../../apps/SettingsApp'));

type Page =
  | 'root'
  | 'id'
  | 'wifi'
  | 'bluetooth'
  | 'cellular'
  | 'notifications'
  | 'sounds'
  | 'focus'
  | 'screentime'
  | 'general'
  | 'about'
  | 'accessibility'
  | 'at'
  | 'display'
  | 'home'
  | 'wallpaper'
  | 'standby'
  | 'privacy'
  | 'battery'
  | 'trash'
  | 'apps'
  | 'devices'
  | 'mac'
  | 'faceid'
  | 'portfolio'
  | 'controlcentre'
  | 'keyboard'
  | 'datetime'
  | 'assistant'
  | 'storage'
  | 'multitasking'
  | 'search'
  | 'widgets'
  | 'stacks'
  | 'region';

interface Item {
  id: Page;
  label: string;
  bg: string;
  g: string;
  value?: () => string;
  keys?: string;
}

/** v10.3 — solid glyphs for Settings rows (original artwork, no emoji / text symbols) */
const ROW_ICON: Record<string, string> = {
  portfolio: 'starFill', wifi: 'wifi', bluetooth: 'bt', cellular: 'cell', general: 'gear', accessibility: 'person', controlcentre: 'toggles', display: 'sun', home: 'appGrid', multitasking: 'pages', wallpaper: 'sparkles', standby: 'device', assistant: 'sparkle', notifications: 'bell', sounds: 'speaker', focus: 'moon', screentime: 'timer', faceid: 'lock', privacy: 'hand', battery: 'battery', apps: 'grid', trash: 'undo', devices: 'device', keyboard: 'keypad', datetime: 'calendar', storage: 'list', about: 'doc', at: 'circle', search: 'search', widgets: 'widget', region: 'globe', stacks: 'pages',
};
const G = (id: Page, label: string, bg: string, g: string, keys = ''): Item => ({ id, label, bg, g, keys });

const GROUPS: Item[][] = [
  [G('portfolio', 'Portfolio Mode', '#5e5ce6', '★', 'recruiter client developer presentation mode guide welcome onboarding whats new changelog')],
  [G('wifi', 'Wi-Fi', '#0a84ff', '◠', 'internet network'), G('bluetooth', 'Bluetooth', '#0a84ff', 'ᛒ'), G('cellular', 'Mobile Service', '#30d158', '⟟', 'cellular data network aeroplane airplane')],
  [G('general', 'General', '#8e8e93', '⚙︎', 'about language region reset view as keyboard date time storage'), G('accessibility', 'Accessibility', '#0a84ff', '♿︎', 'assistivetouch assistive touch motion reduce motion text bold contrast transparency back tap zoom'), G('controlcentre', 'Control Centre', '#8e8e93', '◧', 'controls control center centre add remove customise customize'), G('display', 'Display & Brightness', '#0a84ff', '☀︎', 'dark mode light appearance text size night shift display zoom dynamic island'), G('home', 'Home Screen & App Library', '#5856d6', '▦', 'icons widgets smart stacks labels dock app library badges search tint'), G('widgets', 'Widgets', '#5856d6', '▦', 'widgets add widget today view home screen'), G('stacks', 'Smart Stacks', '#5856d6', '▦', 'smart stack rotate flip widgets'), G('multitasking', 'Multitasking & Gestures', '#5856d6', '▤', 'stage manager split view gestures three finger app switcher multitasking'), G('wallpaper', 'Wallpaper', '#32ade6', '❋', 'background lock screen live wallpaper dynamic wallpaper motion blur'), G('standby', 'StandBy', '#1c1c1e', '◑', 'always on landscape clock'), G('assistant', 'Assistant', '#bf5af2', '✦', 'siri assistant suggestions voice speak search'), G('search', 'Search', '#8e8e93', '⌕', 'search spotlight suggestions pull down home search')],
  [G('notifications', 'Notifications', '#ff3b30', '◉', 'banners alerts previews summary'), G('sounds', 'Sounds & Haptics', '#ff2d55', '♪', 'ringtone notification sound tone upload keyboard clicks lock sound'), G('focus', 'Focus', '#5e5ce6', '☾', 'do not disturb dnd work sleep'), G('screentime', 'Screen Time', '#5e5ce6', '⌛', 'usage limits downtime')],
  [G('faceid', 'Lock & Passcode', '#30d158', '☺', 'password passcode lock unlock auto-lock face id'), G('privacy', 'Privacy & Security', '#0a84ff', '✋', 'data storage permissions'), G('battery', 'Battery', '#30d158', '▭', 'low power mode percentage')],
  [G('apps', 'Apps', '#5856d6', '▤', 'applications'), G('trash', 'Recently Deleted & Undo', '#8e8e93', '🗑', 'trash restore recover undo redo'), G('devices', 'Devices & View', '#5856d6', '▯', 'mac iphone ipad view as reset layout')],
];
/** pages reached from General */
const MORE: Item[] = [G('region', 'Language & Region', '#0a84ff', '◍', 'language region format 24-hour time clock temperature celsius fahrenheit sinhala tamil'), G('keyboard', 'Keyboard', '#8e8e93', '⌨︎', 'keyboard clicks dictation emoji'), G('datetime', 'Date & Time', '#8e8e93', '◷', 'clock time zone date'), G('storage', 'Storage', '#8e8e93', '▥', 'storage space files my files backups')];
const ALL = [...GROUPS.flat(), ...MORE];

/* ───── tiny building blocks ───── */

function Sec({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="is-sec">
      {title && <h3>{title}</h3>}
      <div className="is-card">{children}</div>
      {footer && <p className="is-foot">{footer}</p>}
    </section>
  );
}
function Sw({ label, on, onChange, sub }: { label: string; on: boolean; onChange: (v: boolean) => void; sub?: string }) {
  return (
    <label className="is-row">
      <span className="is-txt">
        {label}
        {sub && <small>{sub}</small>}
      </span>
      <input type="checkbox" className="is-switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
function Pick<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="is-pick">
      {label && <span className="is-pick-h">{label}</span>}
      {options.map(([v, l]) => (
        <button key={v} type="button" className="is-row" onClick={() => onChange(v)}>
          <span className="is-txt">{l}</span>
          {value === v && <b className="is-check">✓</b>}
        </button>
      ))}
    </div>
  );
}
function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="is-row">
      <span className="is-txt">{label}</span>
      <span className="is-val">{value}</span>
    </div>
  );
}
function Nav({ it, onGo }: { it: Item; onGo: (p: Page) => void }) {
  return (
    <button type="button" className="is-row nav" onClick={() => onGo(it.id)}>
      <i className="is-ico" style={{ background: it.bg }}>
        {ROW_ICON[it.id] ? <SysIcon n={ROW_ICON[it.id]} size={19} /> : it.g}
      </i>
      <span className="is-txt">{it.label}</span>
      <b className="is-chev">›</b>
    </button>
  );
}

/** v10.1 — choose the four Dock apps (iPhone) */
function DockPicker() {
  const { settings, update } = useSettings();
  const ipad = useContext(IOS)?.mode === 'ipad';
  const MAX = ipad ? 10 : 4;
  const key = ipad ? 'ipadDockApps' : 'dockApps';
  const def: string[] = ipad ? [...IPAD_DOCK] : [...DOCK_APPS];
  const saved = ipad ? settings.ipadDockApps : settings.dockApps;
  const cur: string[] = saved?.length ? saved : def;
  const put = (l: string[]) => update({ [key]: l } as Partial<Settings>);
  const toggle = (id: string) => {
    if (cur.includes(id)) put(cur.filter((x) => x !== id));
    else if (cur.length < MAX) put([...cur, id]);
  };
  const list = [...IOS_APPS].sort((a, b) => iosLabel(a).localeCompare(iosLabel(b)));
  return (
    <Sec title={`Dock · ${cur.length} of ${MAX}`} footer={ipad ? 'Your favourites come first; recent apps and App Library follow, and only as many as fit the screen are shown.' : cur.length < MAX ? 'Choose up to four apps for the Dock.' : 'Tap an app in the Dock list to remove it, then choose another.'}>
      <div className="is-dockpick">
        {cur.map((id) => {
          const li = IOS_APPS.find((x) => x.id === id);
          return li ? (
            <button key={id} type="button" className="on" onClick={() => toggle(id)} aria-label={`Remove ${iosLabel(li)} from the Dock`}>
              <span className="is-app-ico">
                <AppIcon name={iosIcon(li) as IconName} />
              </span>
              <small>{iosLabel(li)}</small>
            </button>
          ) : null;
        })}
      </div>
      <div className="is-dockpick all">
        {list
          .filter((li) => !cur.includes(li.id))
          .map((li) => (
            <button key={li.id} type="button" disabled={cur.length >= MAX} onClick={() => toggle(li.id)} aria-label={`Add ${iosLabel(li)} to the Dock`}>
              <span className="is-app-ico">
                <AppIcon name={iosIcon(li) as IconName} />
              </span>
              <small>{iosLabel(li)}</small>
            </button>
          ))}
      </div>
      <button type="button" className="is-row" onClick={() => put(def)}>
        <span className="is-txt blue">Reset Dock</span>
      </button>
    </Sec>
  );
}

/** wraps a Mac Settings section (built with the Mac controls) in the iOS look */
function MacBits({ children }: { children: ReactNode }) {
  return <div className="is-macbits">{children}</div>;
}

/* ───── pages ───── */

function PageBody({ page, go }: { page: Page; go: (p: Page) => void }) {
  const { settings, update } = useSettings();
  const sys = useSystem();
  const wm = useWM();
  const music = useMusic();
  const acct = useAccount();
  const st = useScreenTime();
  const ios = useContext(IOS);
  const [ask, setAsk] = useState<null | 'home' | 'settings'>(null);
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    if (page !== 'storage') return;
    void navigator.storage?.estimate?.().then((e) => setEst({ usage: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => setEst(null));
  }, [page]);
  const set = (p: Partial<Settings>) => update(p);
  const [layout, setLayout] = useHomeLayout(ios?.mode ?? 'iphone');
  const [wxUnit, setWxUnit] = useState<'C' | 'F'>(() => readStore<{ unit?: 'C' | 'F' }>('mra-weather-v1', {}).unit ?? 'C');
  const homeWidgets = layout.pages.flatMap((pg, pi) => pg.map((it, idx) => ({ it, pi, idx }))).filter((x): x is { it: Extract<HomeItem, { t: 'widget' }>; pi: number; idx: number } => x.it.t === 'widget');
  const stacks = homeWidgets.filter((x) => x.it.w === 'smart');
  const editHome = (panel?: 'widgets') => {
    ios?.goHome();
    window.setTimeout(() => {
      ios?.setEdit(true);
      if (panel) ios?.setPanel(panel);
    }, 450);
  };

  switch (page) {
    case 'search':
      return (
        <>
          <Sec title="Search" footer="Pull down on any Home Screen page to search apps, projects, skills and settings.">
            <Sw label="Show on Home Screen" on={settings.homeSearch !== false} onChange={(v) => set({ homeSearch: v })} sub="A Search button above the Dock when page dots are hidden" />
            <Sw label="Show Suggestions" on={settings.siriSuggestions !== false} onChange={(v) => set({ siriSuggestions: v })} sub="Suggested apps and actions in Search" />
          </Sec>
          <Sec>
            <button type="button" className="is-row" onClick={() => (ios?.goHome(), window.setTimeout(() => ios?.setPanel('search'), 450))}>
              <span className="is-txt blue">Open Search</span>
            </button>
          </Sec>
        </>
      );
    case 'widgets':
      return (
        <>
          <Sec title={`On your Home Screen (${homeWidgets.length})`} footer="Widgets only move while the Home Screen is in edit mode — they snap into place and never overlap.">
            {homeWidgets.map(({ it, pi, idx }) => (
              <div key={it.id} className="is-row">
                <span className="is-txt">
                  {IOS_WIDGETS.find((x) => x.w === it.w)?.label ?? it.w}
                  <small>
                    Page {pi + 1} · {it.size === 's' ? 'Small' : it.size === 'm' ? 'Medium' : 'Large'}
                  </small>
                </span>
                <button type="button" className="is-txt red is-mini" onClick={() => setLayout((l) => ({ ...l, pages: l.pages.map((pg, k) => (k === pi ? pg.filter((_, j) => j !== idx) : pg)) }))}>
                  Remove
                </button>
              </div>
            ))}
            {!homeWidgets.length && <Info label="No widgets on the Home Screen" value="" />}
          </Sec>
          <Sec title="Today View">
            <Info label="Widgets in Today View" value={String(layout.today.length)} />
          </Sec>
          <Sec>
            <button type="button" className="is-row" onClick={() => editHome('widgets')}>
              <span className="is-txt blue">Add Widget…</span>
            </button>
            <button type="button" className="is-row" onClick={() => editHome()}>
              <span className="is-txt blue">Edit Home Screen</span>
            </button>
          </Sec>
        </>
      );
    case 'stacks':
      return (
        <>
          <Sec title="Smart Rotate" footer="Smart Rotate flips a stack to its next widget every few seconds. Swipe up or down on a stack to flip it yourself.">
            <Sw
              label="Smart Rotate for all stacks"
              on={stacks.length ? stacks.every((x) => x.it.rotate !== false) : true}
              onChange={(v) => setLayout((l) => ({ ...l, pages: l.pages.map((pg) => pg.map((x) => (x.t === 'widget' && x.w === 'smart' ? { ...x, rotate: v } : x))) }))}
            />
          </Sec>
          <Sec title={`Your Smart Stacks (${stacks.length})`} footer="To change what a stack holds: Edit Home Screen, then tap the stack.">
            {stacks.map(({ it, pi }) => (
              <Info key={it.id} label={`Page ${pi + 1}`} value={(it.stack?.length ? it.stack : STACK_DEFAULT).map((w) => IOS_WIDGETS.find((x) => x.w === w)?.label ?? w).join(', ')} />
            ))}
            {!stacks.length && <Info label="No Smart Stacks yet" value="" />}
          </Sec>
          <Sec>
            <button
              type="button"
              className="is-row"
              onClick={() =>
                setLayout((l) => {
                  const pages = l.pages.map((pg) => [...pg]);
                  pages[0] = [{ t: 'widget', id: `smart-${Math.random().toString(36).slice(2, 7)}`, w: 'smart', size: 'm' }, ...pages[0]];
                  return { ...l, pages };
                })
              }
            >
              <span className="is-txt blue">Add a Smart Stack to Page 1</span>
            </button>
            <button type="button" className="is-row" onClick={() => editHome()}>
              <span className="is-txt blue">Edit Home Screen</span>
            </button>
          </Sec>
        </>
      );
    case 'region':
      return (
        <>
          <Sec title="Language">
            <Pick
              label=""
              value={settings.language}
              options={[
                ['en', 'English'],
                ['si', 'සිංහල (Sinhala)'],
                ['ta', 'தமிழ் (Tamil)'],
              ]}
              onChange={(v) => set({ language: v })}
            />
          </Sec>
          <Sec title="Region Formats" footer={`Example: ${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: settings.clock24 === undefined ? undefined : !settings.clock24 })}`}>
            <Info label="Region" value={(() => {
              try {
                return new Intl.DisplayNames([navigator.language], { type: 'region' }).of(navigator.language.split('-')[1] ?? '') ?? navigator.language;
              } catch {
                return navigator.language;
              }
            })()} />
            <Info label="Time Zone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
            <Sw label="24-Hour Time" on={settings.clock24 ?? !/[AP]M/i.test(new Date().toLocaleTimeString())} onChange={(v) => set({ clock24: v })} sub="Status bar, Lock Screen and menu-bar clocks" />
            <Pick
              label="Temperature"
              value={wxUnit}
              options={[
                ['C', 'Celsius (°C)'],
                ['F', 'Fahrenheit (°F)'],
              ]}
              onChange={(v) => {
                setWxUnit(v);
                const cur = readStore<Record<string, unknown>>('mra-weather-v1', {});
                writeStore('mra-weather-v1', { ...cur, unit: v });
              }}
            />
          </Sec>
        </>
      );
    case 'root':
      return null;
    case 'id':
      return (
        <>
          <div className="is-hero">
            <img src={personal.avatar} alt="" />
            <b>{acct?.name ?? 'Guest'}</b>
            <small>{acct ? (acct.kind === 'google' ? acct.email : 'Portfolio ID (demo account in this browser)') : 'Not signed in'}</small>
          </div>
          <Sec footer="A Portfolio ID is only a display name kept in this browser — never enter a real password anywhere in this portfolio.">
            <button type="button" className="is-row" onClick={() => window.dispatchEvent(new CustomEvent('mra-signin-request', { detail: { reason: 'Sign in to your Portfolio ID', resolve: () => undefined } }))}>
              <span className="is-txt blue">{acct ? 'Switch account…' : 'Sign in with Portfolio ID…'}</span>
            </button>
          </Sec>
          <Sec title="Owner of this portfolio">
            <Info label="Name" value={personal.name} />
            <Info label="Location" value={personal.location} />
            <Info label="Status" value={personal.status} />
          </Sec>
        </>
      );
    case 'wifi':
      return (
        <Sec footer="This toggle changes the portfolio's own status icons; your real connection is not touched.">
          <Sw label="Wi-Fi" on={sys.wifi} onChange={(v) => sys.set({ wifi: v })} />
          {sys.wifi && <Info label="✓ Portfolio-Net" value={navigator.onLine ? 'Connected' : 'Offline'} />}
        </Sec>
      );
    case 'bluetooth':
      return (
        <Sec footer="Demo toggle — no device is paired.">
          <Sw label="Bluetooth" on={sys.bluetooth} onChange={(v) => sys.set({ bluetooth: v })} />
        </Sec>
      );
    case 'cellular':
      return (
        <>
          <Sec>
            <Sw label="Aeroplane Mode" on={sys.airplane} onChange={(v) => sys.set({ airplane: v })} sub="Changes the portfolio’s status icons only" />
            <Sw label="Mobile Data" on={sys.cellular && !sys.airplane} onChange={(v) => sys.set({ cellular: v })} />
          </Sec>
          <Sec title="Network">
            <Info label="Online" value={navigator.onLine ? 'Yes' : 'No'} />
            <Info label="Connection" value={(navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType?.toUpperCase() ?? '—'} />
          </Sec>
        </>
      );
    case 'notifications':
      return (
        <>
          <Sec>
            <Sw label="Banners" on={settings.notificationSounds !== false} onChange={(v) => set({ notificationSounds: v })} sub="Play the notification sound with banners" />
            <Sw label="Browser notifications" on={!!settings.systemNotifications} onChange={(v) => set({ systemNotifications: v })} sub="Mirror banners as real notifications while the tab is in the background" />
          </Sec>
          <MacBits>
            <NotificationsV101 ios />
          </MacBits>
        </>
      );
    case 'sounds':
      return (
        <>
          <Sec title="Volume">
            <div className="is-row">
              <span className="is-sl-ico"><SysIcon n="speaker0" size={16} /></span>
              <input type="range" min={0} max={1} step={0.01} value={music.volume} onChange={(e) => music.setVolume(Number(e.target.value))} aria-label="Volume" />
              <span className="is-sl-ico"><SysIcon n="speaker" size={18} /></span>
            </div>
            <div className="is-row">
              <span className="is-txt">Alerts</span>
              <input type="range" min={0} max={1} step={0.01} value={settings.alertVolume} onChange={(e) => set({ alertVolume: Number(e.target.value) })} aria-label="Alert volume" />
            </div>
          </Sec>
          <MacBits>
            <SoundsV10 />
          </MacBits>
          <Sec>
            <Sw label="Keyboard & system sounds" on={settings.uiSounds} onChange={(v) => set({ uiSounds: v })} />
            <Sw label="Start-up sound" on={settings.startupSound} onChange={(v) => set({ startupSound: v })} />
          </Sec>
          <MacBits>
            <SystemSoundsV101 />
          </MacBits>
        </>
      );
    case 'focus':
      return (
        <Sec footer="While a Focus is on, banners are held back (critical ones still show).">
          <Pick
            label=""
            value={settings.focusMode ?? 'off'}
            options={[
              ['off', 'Off'],
              ['dnd', 'Do Not Disturb'],
              ['work', 'Work'],
              ['sleep', 'Sleep'],
              ['personal', 'Personal'],
            ]}
            onChange={(v) => {
              set({ focusMode: v });
              sys.set({ focus: v !== 'off' });
            }}
          />
        </Sec>
      );
    case 'screentime': {
      const top = Object.entries(st.perApp)
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .slice(0, 6);
      return (
        <>
          <Sec title="Today">
            <Info label="Screen Time" value={fmtDuration(st.total)} />
            <Info label="App opens" value={String(st.opens)} />
          </Sec>
          <Sec title="Most used">
            {top.map(([id, ms]) => (
              <Info key={id} label={id} value={fmtDuration(ms ?? 0)} />
            ))}
            {!top.length && <Info label="No usage yet" value="" />}
          </Sec>
          <MacBits>
            <ScreenTimeLimitsV101 />
          </MacBits>
        </>
      );
    }
    case 'general':
      return (
        <>
          <Sec>
            <Nav it={G('about', 'About', '#8e8e93', 'ⓘ')} onGo={go} />
          </Sec>
          <Sec title="Language">
            <Pick
              label=""
              value={settings.language}
              options={[
                ['en', 'English'],
                ['si', 'සිංහල (Sinhala)'],
                ['ta', 'தமிழ் (Tamil)'],
              ]}
              onChange={(v) => set({ language: v })}
            />
          </Sec>
          <Sec>
            {MORE.map((m) => (
              <Nav key={m.id} it={m} onGo={go} />
            ))}
          </Sec>
          <Sec>
            <Nav it={G('devices', 'View As, Reset & Devices', '#5856d6', '▯')} onGo={go} />
            <button type="button" className="is-row" onClick={() => wm.open('guidebook')}>
              <span className="is-txt blue">Guidebook (A–Z)</span>
            </button>
            <button type="button" className="is-row" onClick={replayOnboarding}>
              <span className="is-txt blue">Welcome Guide</span>
            </button>
          </Sec>
          <Sec title="Reset" footer="Both ask before changing anything. Your notes, messages and files are kept.">
            <button type="button" className="is-row" onClick={() => setAsk('home')}>
              <span className="is-txt blue">Reset Home Screen Layout…</span>
            </button>
            <button type="button" className="is-row" onClick={() => setAsk('settings')}>
              <span className="is-txt red">Reset All Settings…</span>
            </button>
          </Sec>
          {ask && (
            <div className="ios-alert-back" onClick={() => setAsk(null)}>
              <div className="ios-alert" role="alertdialog" aria-label="Confirm reset" onClick={(e) => e.stopPropagation()}>
                <b>{ask === 'home' ? 'Reset Home Screen?' : 'Reset All Settings?'}</b>
                <p>{ask === 'home' ? 'Apps, folders, pages and widgets go back to the original arrangement.' : 'Appearance, Dock, Control Centre, wallpapers, motion, AssistiveTouch and other preferences go back to their defaults.'}</p>
                <button
                  type="button"
                  className="ios-alert-btn strong danger"
                  onClick={() => {
                    if (ask === 'home') {
                      ['iphone', 'ipad'].forEach((m) => {
                        try {
                          localStorage.removeItem(`mra-ios-layout-v10-${m}`);
                        } catch {
                          /* ignore */
                        }
                      });
                      window.dispatchEvent(new Event('mra-ios-layout'));
                    }
                    else update({ ...defaultSettings, language: settings.language, customWallpaper: settings.customWallpaper, customTone: settings.customTone });
                    setAsk(null);
                  }}
                >
                  Reset
                </button>
                <button type="button" className="ios-alert-btn" onClick={() => setAsk(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          <Sec>
            <button type="button" className="is-row" onClick={() => ios?.setPanel('poweroff')}>
              <span className="is-txt blue">Shut Down</span>
            </button>
          </Sec>
        </>
      );
    case 'about':
      return (
        <Sec>
          <Info label="Name" value={`${personal.name}’s Portfolio`} />
          <Info label="Version" value="10.0" />
          <Info label="Model" value={ios?.mode === 'ipad' ? 'iPad (web)' : 'iPhone (web)'} />
          <Info label="Screen" value={`${window.innerWidth} × ${window.innerHeight} @${window.devicePixelRatio}x`} />
          <Info label="Language" value={navigator.language} />
          <Info label="Apps" value={String(IOS_APPS.length)} />
        </Sec>
      );
    case 'accessibility':
      return (
        <>
          <Sec title="Vision">
            <Sw label="Bold Text" on={settings.boldText} onChange={(v) => set({ boldText: v })} />
            <Sw label="Increase Contrast" on={settings.increaseContrast} onChange={(v) => set({ increaseContrast: v })} />
            <Sw label="Reduce Transparency" on={settings.reduceTransparency} onChange={(v) => set({ reduceTransparency: v })} />
            <div className="is-row">
              <span className="is-txt">Text Size</span>
              <input type="range" min={0.85} max={1.3} step={0.05} value={settings.textScale} onChange={(e) => set({ textScale: Number(e.target.value) })} aria-label="Text size" />
            </div>
          </Sec>
          <Sec title="Motion">
            <Sw label="Reduce Motion" on={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
          </Sec>
          <Sec title="Physical and Motor">
            <Nav it={G('at', 'AssistiveTouch', '#0a84ff', '◉')} onGo={go} />
            <Sw label="Three-Finger Gestures" on={settings.threeFinger !== false} onChange={(v) => set({ threeFinger: v })} sub="Up: App Switcher · Down: Notifications · Pinch: Home · Double-tap: Undo" />
          </Sec>
          <MacBits>
            <BackTapV101 />
          </MacBits>
        </>
      );
    case 'at':
      return (
        <MacBits>
          <AssistiveTouchSection />
        </MacBits>
      );
    case 'display':
      return (
        <>
          <Sec title="Appearance">
            <div className="is-appear">
              {(['light', 'dark'] as const).map((m) => (
                <button key={m} type="button" className={settings.appearance === m ? 'on' : ''} onClick={() => set({ appearance: m, autoAppearance: 'off' })}>
                  <span className={`is-phone ${m}`} />
                  {m === 'light' ? 'Light' : 'Dark'}
                  <i>{settings.appearance === m ? '✓' : ''}</i>
                </button>
              ))}
            </div>
            <Sw label="Automatic" on={settings.autoAppearance !== 'off'} onChange={(v) => set({ autoAppearance: v ? 'system' : 'off' })} />
          </Sec>
          <Sec title="Brightness">
            <div className="is-row">
              <span className="is-sl-ico"><SysIcon n="sun" size={14} /></span>
              <input type="range" min={0.15} max={1} step={0.01} value={sys.brightness} onChange={(e) => sys.set({ brightness: Number(e.target.value) })} aria-label="Brightness" />
              <span className="is-sl-ico"><SysIcon n="sun" size={20} /></span>
            </div>
            <Sw label="Night Shift" on={sys.nightShift} onChange={(v) => sys.set({ nightShift: v })} />
          </Sec>
          <Sec>
            <Sw label="Always On Display" on={!!settings.alwaysOn} onChange={(v) => set({ alwaysOn: v })} />
            <Sw label="Show Battery Percentage" on={settings.showBatteryPct} onChange={(v) => set({ showBatteryPct: v })} />
          </Sec>
          <MacBits>
            <DisplayZoomV101 />
            <DynamicIslandV101 />
          </MacBits>
        </>
      );
    case 'home':
      return (
        <>
          <Sec title="Icons">
            <Pick
              label=""
              value={settings.iosIconLook ?? 'default'}
              options={[
                ['default', 'Default'],
                ['dark', 'Dark'],
                ['clear', 'Clear'],
                ['tinted', 'Tinted'],
              ]}
              onChange={(v) => set({ iosIconLook: v })}
            />
            <Sw label="Show App Names" on={settings.iosLabels !== false} onChange={(v) => set({ iosLabels: v })} />
            <Sw label="Large Icons" on={!!settings.iosLargeIcons} onChange={(v) => set({ iosLargeIcons: v })} />
          </Sec>
          <Sec title="Home Screen">
            <Sw label="Show Page Dots" on={settings.showPageDots !== false} onChange={(v) => set({ showPageDots: v })} sub="Off shows the Search button instead" />
            <Sw label="Search on Home Screen" on={settings.homeSearch !== false} onChange={(v) => set({ homeSearch: v })} />
            <Sw label="App Library" on={settings.appLibrary !== false} onChange={(v) => set({ appLibrary: v })} sub="The last page, with apps sorted into groups" />
            {ios?.mode === 'ipad' && settings.appLibrary !== false && (
              <Pick
                label="Dock App Button"
                value={settings.ipadAppBrowser ?? 'library'}
                options={[
                  ['library', 'App Library'],
                  ['launchpad', 'Launchpad Grid (custom)'],
                ]}
                onChange={(v) => set({ ipadAppBrowser: v })}
              />
            )}
            <Sw label="Notification Badges" on={settings.showBadges !== false} onChange={(v) => set({ showBadges: v })} />
          </Sec>
          <DockPicker />
          <MacBits>
            <SiriV101 />
          </MacBits>
          <Sec title="Long-press on an empty area">
            <Pick
              label=""
              value={settings.iosLongPress ?? 'switcher'}
              options={[
                ['switcher', 'Open App Switcher'],
                ['edit', 'Edit Home Screen'],
              ]}
              onChange={(v) => set({ iosLongPress: v })}
            />
          </Sec>
          <Sec>
            <button type="button" className="is-row" onClick={() => (ios?.goHome(), window.setTimeout(() => ios?.setEdit(true), 450))}>
              <span className="is-txt blue">Edit Home Screen</span>
            </button>
            <button type="button" className="is-row" onClick={() => go('devices')}>
              <span className="is-txt blue">Reset Home Screen Layout…</span>
            </button>
          </Sec>
        </>
      );
    case 'wallpaper':
      return (
        <>
          <Sec title="Lock Screen">
            <Sw label="Torch button" on={settings.lockTorchBtn !== false} onChange={(v) => set({ lockTorchBtn: v })} />
            <Sw label="Camera button" on={settings.lockCameraBtn !== false} onChange={(v) => set({ lockCameraBtn: v })} />
            <button type="button" className="is-row" onClick={() => sys.lock('lock')}>
              <span className="is-txt blue">Edit Lock Screens…</span>
            </button>
          </Sec>
          <p className="is-foot">Touch and hold the Lock Screen to switch between your saved Lock Screens, add a new one or customise it.</p>
          <WallpaperLibrary device={ios?.mode === 'ipad' ? 'ipad' : 'iphone'} />
          <Sec>
            <button type="button" className="is-row" onClick={() => wm.open('photos')}>
              <span className="is-txt blue">Choose from Photos…</span>
            </button>
          </Sec>
        </>
      );
    case 'standby':
      return (
        <Sec footer="Turn an iPhone on its side while it is locked to see a large clock, the weather and what is playing.">
          <Sw label="StandBy" on={settings.standBy !== false} onChange={(v) => set({ standBy: v })} />
          <Sw label="Always On" on={!!settings.alwaysOn} onChange={(v) => set({ alwaysOn: v })} />
        </Sec>
      );
    case 'faceid':
      return (
        <Sec footer="There is no passcode, Face ID or Touch ID here — swipe up (or tap) to unlock. The padlock animation is only a visual cue.">
          <Info label="Unlock" value="Swipe up" />
          <div className="is-row">
            <span className="is-txt">Auto-Lock</span>
            <select value={settings.lockAfter} onChange={(e) => set({ lockAfter: Number(e.target.value) })} aria-label="Auto-Lock">
              {[0, 1, 2, 5, 10].map((m) => (
                <option key={m} value={m}>
                  {m ? `${m} min` : 'Never'}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="is-row" onClick={() => sys.lock('lock')}>
            <span className="is-txt blue">Lock Now</span>
          </button>
        </Sec>
      );
    case 'privacy':
      return (
        <Sec footer="Notes, messages, layouts and settings are stored only in this browser. Camera, microphone and location are only used after you allow them, for the feature you opened.">
          <Info label="Tracking" value="None" />
          <Info label="Analytics" value={integrations.analyticsScript ? 'Privacy-friendly, no cookies' : 'Off'} />
          <Info label="Connection" value={location.protocol === 'https:' ? 'Secure (HTTPS)' : 'Local'} />
        </Sec>
      );
    case 'battery':
      return (
        <Sec>
          <Sw label="Battery Percentage" on={settings.showBatteryPct} onChange={(v) => set({ showBatteryPct: v })} />
          <Sw label="Low Power Mode" on={settings.lowPowerMode === 'always'} onChange={(v) => set({ lowPowerMode: v ? 'always' : 'never' })} sub="Reduces animations and background effects" />
          <Pick
            label="Graphics"
            value={settings.perfMode ?? 'auto'}
            options={[
              ['auto', 'Automatic'],
              ['quality', 'Best quality'],
              ['speed', 'Fastest'],
            ]}
            onChange={(v) => set({ perfMode: v })}
          />
        </Sec>
      );
    case 'trash':
      return (
        <MacBits>
          <TrashPane />
        </MacBits>
      );
    case 'devices':
      return (
        <MacBits>
          <DevicesPane />
        </MacBits>
      );
    case 'apps':
      return (
        <Sec>
          {[...IOS_APPS]
            .sort((a, b) => iosLabel(a).localeCompare(iosLabel(b)))
            .map((li) => (
              <button key={li.id} type="button" className="is-row nav" onClick={() => ios?.launch(li)}>
                <span className="is-app-ico">
                  <AppIcon name={iosIcon(li) as IconName} />
                </span>
                <span className="is-txt">{iosLabel(li)}</span>
                <b className="is-chev">›</b>
              </button>
            ))}
        </Sec>
      );
    case 'mac':
      return (
        <div className="is-mac">
          <Suspense fallback={<div className="app-loading"><span className="spinner" /></div>}>
            <MacSettings win={{ id: 'settings', rect: { x: 0, y: 0, w: 400, h: 700 }, z: 1, phase: 'open', maximized: false, launchKey: 0 }} />
          </Suspense>
        </div>
      );
    case 'portfolio':
      return (
        <>
          <Sec footer="Modes put the most useful things first in a small bar. Presentation walks through the portfolio step by step.">
            <div className="is-pad">
              <ModePicker />
            </div>
          </Sec>
          <Sec>
            <button type="button" className="is-row" onClick={replayOnboarding}>
              <span className="is-txt blue">Replay Welcome Guide</span>
            </button>
            <button type="button" className="is-row" onClick={() => wm.open('guidebook')}>
              <span className="is-txt blue">Open the Guidebook</span>
            </button>
            <button type="button" className="is-row" onClick={() => wm.open('whatsnew')}>
              <span className="is-txt blue">What’s New in the Portfolio</span>
            </button>
            <button type="button" className="is-row" onClick={() => wm.open('learning')}>
              <span className="is-txt blue">Learning Hub</span>
            </button>
          </Sec>
        </>
      );
    case 'controlcentre': {
      const lay = settings.ccLayout ?? defaultSettings.ccLayout;
      return (
        <>
          <Sec footer="Open Control Centre and tap ＋ to remove, resize or rearrange controls, or to add new ones from the gallery.">
            <button type="button" className="is-row" onClick={() => ios?.setPanel('cc')}>
              <span className="is-txt blue">Edit Controls…</span>
            </button>
          </Sec>
          <Sec title={`Favourites · ${lay.fav.length} controls`}>
            {lay.fav.map((c) => (
              <Info key={c.id} label={CC_DEFS.find((d) => d.id === c.id)?.label ?? c.id} value={{ s: 'Small', m: 'Medium', t: 'Tall', l: 'Large' }[c.s]} />
            ))}
          </Sec>
          <Sec title={`Portfolio · ${lay.work.length} controls`}>
            {lay.work.map((c) => (
              <Info key={c.id} label={CC_DEFS.find((d) => d.id === c.id)?.label ?? c.id} value={{ s: 'Small', m: 'Medium', t: 'Tall', l: 'Large' }[c.s]} />
            ))}
          </Sec>
          <Sec>
            <button type="button" className="is-row" onClick={() => update({ ccLayout: defaultSettings.ccLayout })}>
              <span className="is-txt red">Restore Default Controls</span>
            </button>
          </Sec>
        </>
      );
    }
    case 'keyboard':
      return (
        <>
          <Sec>
            <Sw label="Keyboard Clicks" on={settings.keyClicks !== false} onChange={(v) => set({ keyClicks: v })} />
            <Sw label="Enable Dictation" on={settings.dictation !== false} onChange={(v) => set({ dictation: v })} sub="A microphone button in text fields uses your browser’s speech recognition" />
          </Sec>
          <Sec footer="The on-screen keyboard itself is your phone’s own keyboard — a website can’t replace it.">
            <Info label="Keyboard language" value={navigator.language} />
          </Sec>
        </>
      );
    case 'datetime': {
      const n = new Date();
      return (
        <Sec footer="Times follow this device’s own clock and time zone.">
          <Info label="Set Automatically" value="On" />
          <Info label="Time Zone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
          <Info label="Now" value={n.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} />
          <Info label={`${personal.city} (his time)`} value={n.toLocaleTimeString(undefined, { timeZone: personal.timezone, hour: 'numeric', minute: '2-digit' })} />
          <button type="button" className="is-row" onClick={() => wm.open('clock')}>
            <span className="is-txt blue">Open Clock</span>
          </button>
        </Sec>
      );
    }
    case 'assistant':
      return (
        <>
          <Sec footer="The Assistant answers from this portfolio and can open apps, start timers, change the wallpaper and find settings. It is not Apple’s Siri.">
            <Sw label="Suggestions in Search" on={settings.siriSuggestions !== false} onChange={(v) => set({ siriSuggestions: v })} />
            <button type="button" className="is-row" onClick={() => ios?.openApp('siri')}>
              <span className="is-txt blue">Open Assistant</span>
            </button>
          </Sec>
        </>
      );
    case 'storage': {
      const mb = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
      return (
        <>
          <Sec footer="Everything you create here is stored only in this browser.">
            <Info label="Used by this portfolio" value={est ? mb(est.usage) : '—'} />
            <Info label="Available to this site" value={est && est.quota ? mb(est.quota) : 'Not reported'} />
          </Sec>
          <Sec>
            <button type="button" className="is-row" onClick={() => ios?.openApp('finder', { folder: 'myfiles' })}>
              <span className="is-txt blue">Manage My Files…</span>
            </button>
            <Nav it={G('trash', 'Recently Deleted & Undo', '#8e8e93', '🗑')} onGo={go} />
          </Sec>
        </>
      );
    }
    case 'multitasking':
      return (
        <>
          {ios?.mode === 'ipad' && (
            <Sec footer="Open apps in windows you can resize and arrange, with recent apps on the left.">
              <Sw label="Stage Manager" on={!!settings.ipadStage} onChange={(v) => set({ ipadStage: v })} />
            </Sec>
          )}
          <Sec title="Gestures">
            <Sw label="Three-Finger Gestures" on={settings.threeFinger !== false} onChange={(v) => set({ threeFinger: v })} sub="Up: App Switcher · Down: Notifications · Pinch: Home · Double-tap: Undo" />
            <Pick
              label="Long-press on an empty area"
              value={settings.iosLongPress ?? 'switcher'}
              options={[
                ['switcher', 'Open App Switcher'],
                ['edit', 'Edit Home Screen'],
              ]}
              onChange={(v) => set({ iosLongPress: v })}
            />
          </Sec>
        </>
      );
    default:
      return null;
  }
}

/** v10 — iOS Settings: large titles, grouped lists, push navigation and a search field at the bottom. */
export default function IOSSettings({ win }: AppProps) {
  const acct = useAccount();
  const initial = ((): Page[] => {
    const p = win.args?.pane;
    const map: Record<string, Page> = { portfolio: 'portfolio', controlcentre: 'controlcentre', keyboard: 'keyboard', storage: 'storage', screentime: 'screentime', home: 'home', accessibility: 'accessibility', wallpaper: 'wallpaper', sound: 'sounds', display: 'display', trash: 'trash', devices: 'devices', battery: 'battery', focus: 'focus', notifications: 'notifications' };
    return p && map[p] ? ['root', map[p]] : ['root'];
  })();
  const [stack, setStack] = useState<Page[]>(initial);
  const [dir, setDir] = useState<1 | -1>(1);
  const [q, setQ] = useState(win.args?.q ?? '');
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (win.args?.q) setQ(win.args.q);
  }, [win.launchKey, win.args?.q]);
  const body = useRef<HTMLDivElement>(null);
  const page = stack[stack.length - 1];
  useEffect(() => {
    if (win.args?.pane) setStack(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.launchKey]);
  const go = (p: Page) => {
    setDir(1);
    setStack((s) => [...s, p]);
    // v10.3 — coming from Search: jump to the exact setting on the new page
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length) window.setTimeout(() => flashSettingRow(body.current, words), 420);
    setQ('');
    body.current?.scrollTo({ top: 0 });
  };
  const back = () => {
    setDir(-1);
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };
  const title = page === 'root' ? 'Settings' : page === 'id' ? 'Portfolio ID' : page === 'at' ? 'AssistiveTouch' : page === 'about' ? 'About' : (ALL.find((x) => x.id === page)?.label ?? '');
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? ALL.filter((x) => `${x.label} ${x.keys}`.toLowerCase().includes(s)) : null;
  }, [q]);

  return (
    <div className="is-app" data-page={page}>
      <header className={`is-nav ${scrolled || page !== 'root' ? 'solid' : ''}`}>
        {stack.length > 1 && (
          <button type="button" className="is-back" onClick={back} aria-label="Back">
            ‹ <span>{stack.length > 2 ? (ALL.find((x) => x.id === stack[stack.length - 2])?.label ?? 'Back') : 'Settings'}</span>
          </button>
        )}
        <b className={`is-nav-title ${scrolled || page !== 'root' ? 'show' : ''}`}>{title}</b>
      </header>
      <div className="is-body" ref={body} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 30)} key={stack.join('/')} data-dir={dir}>
        {page !== 'mac' && <h1 className="is-large">{title}</h1>}
        {page === 'root' ? (
          results ? (
            <Sec>
              {results.map((it) => (
                <Nav key={it.id} it={it} onGo={go} />
              ))}
              {!results.length && <Info label={`No results for “${q}”`} value="" />}
            </Sec>
          ) : (
            <>
              <Sec>
                <button type="button" className="is-row is-id" onClick={() => go('id')}>
                  <img src={personal.avatar} alt="" />
                  <span className="is-txt">
                    <b>{acct?.name ?? 'Guest'}</b>
                    <small>Portfolio ID, Demo & More</small>
                  </span>
                  <b className="is-chev">›</b>
                </button>
              </Sec>
              {GROUPS.map((g, i) => (
                <Sec key={i}>
                  {g.map((it) => (
                    <Nav key={it.id} it={it} onGo={go} />
                  ))}
                </Sec>
              ))}
            </>
          )
        ) : (
          <PageBody page={page} go={go} />
        )}
        <div className="is-spacer" />
      </div>
      {page === 'root' && (
        <div className="is-search ios-glass">
          <span>⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search Settings" />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Clear">
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
