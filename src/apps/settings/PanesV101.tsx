import { useMemo, useState } from 'react';
import { Note, PopUp, Row, Section, Seg, Slider, Toggle } from '../SettingsApp';
import { useSettings } from '../../system/SettingsContext';
import { useSystem } from '../../system/SystemContext';
import { APPS } from '../../system/apps';
import { useScreenTime, fmtDuration } from '../../system/screenTime';
import { AT_ACTIONS } from '../../components/ios/atActions';
import { ACHIEVEMENTS, useAchievements } from '../../system/achievements';
import type { AppId, Settings } from '../../system/types';

/**
 * v10.1 — settings sections shared by the Mac System Settings and the
 * iPhone / iPad Settings app (where they are shown in the iOS style).
 */

/** apps that send notifications in this portfolio (labels used by notify()) */
export const NOTIF_LABELS = [
  'Messages',
  'Mail',
  'Phone',
  'FaceTime',
  'Calendar',
  'Reminders',
  'Clock',
  'Music',
  'Photos',
  'Notes',
  'Safari',
  'Maps',
  'Contacts',
  'Wallet',
  'Voice Memos',
  'Shortcuts',
  'Guestbook',
  'Game Center',
  'GitHub',
  'App Store',
  'Case Studies',
  'Backup',
  'System Settings',
];

const DEF = { banners: true, sounds: true, badges: true };

/* ═════════════ Notifications: style, previews, Scheduled Summary, per app ═════════════ */

export function NotificationsV101({ ios = false }: { ios?: boolean }) {
  const { settings, update } = useSettings();
  const sys = useSystem();
  const [open, setOpen] = useState<string | null>(null);
  const labels = useMemo(() => {
    const seen = sys.notifications.map((n) => n.app).filter((a) => a && a !== 'Scheduled Summary');
    return Array.from(new Set([...NOTIF_LABELS, ...seen])).sort((a, b) => a.localeCompare(b));
  }, [sys.notifications]);
  const apps = settings.notifApps ?? {};
  const setApp = (label: string, p: Partial<typeof DEF>) => update({ notifApps: { ...apps, [label]: { ...DEF, ...apps[label], ...p } } });
  const summaryHeld = settings.scheduledSummary ? sys.notifications.filter((n) => !n.read && !n.banner && !n.summary).length : 0;
  return (
    <>
      {ios && (
        <Section title="Display As" sub="How notifications appear on the Lock Screen.">
          <Row label="Style">
            <Seg
              label="Lock Screen notification style"
              value={settings.notifStyle ?? 'stack'}
              options={[
                ['count', 'Count'],
                ['stack', 'Stack'],
                ['list', 'List'],
              ]}
              onChange={(v) => update({ notifStyle: v })}
            />
          </Row>
        </Section>
      )}
      <Section title="Previews & Summary">
        <Row label="Show Previews" sub="Hide what a message says until you open it">
          <PopUp
            label="Show Previews"
            value={settings.showPreviews ?? 'always'}
            options={[
              ['always', 'Always'],
              ['unlocked', 'When Unlocked'],
              ['never', 'Never'],
            ]}
            onChange={(v) => update({ showPreviews: v })}
          />
        </Row>
        <Row label="Scheduled Summary" sub={settings.scheduledSummary ? `Banners are held back and delivered together at ${settings.summaryTime ?? '18:00'}${summaryHeld ? ` · ${summaryHeld} waiting` : ''}` : 'Get non-urgent notifications together once a day'}>
          <Toggle label="Scheduled Summary" on={!!settings.scheduledSummary} onChange={(v) => update({ scheduledSummary: v })} />
        </Row>
        {settings.scheduledSummary && (
          <Row label="Summary time">
            <input type="time" className="ss-time" value={settings.summaryTime ?? '18:00'} onChange={(e) => e.target.value && update({ summaryTime: e.target.value })} aria-label="Summary time" />
          </Row>
        )}
      </Section>
      <Section title="Notification Style (per app)" sub="Turn banners, sounds or badges off for any app. Critical alerts (alarms, calls) always come through.">
        {labels.map((l) => {
          const a = { ...DEF, ...apps[l] };
          const summary = !a.banners && !a.sounds && !a.badges ? 'Off' : [a.banners && 'Banners', a.sounds && 'Sounds', a.badges && 'Badges'].filter(Boolean).join(', ');
          return (
            <div key={l} className="ss-napp">
              <Row label={l} sub={summary} onClick={() => setOpen((o) => (o === l ? null : l))}>
                <span className="ss-chev" aria-hidden="true">
                  {open === l ? '⌄' : '›'}
                </span>
              </Row>
              {open === l && (
                <div className="ss-napp-detail">
                  <Row label="Allow Notifications">
                    <Toggle label={`Allow ${l} notifications`} on={a.banners || a.sounds || a.badges} onChange={(v) => setApp(l, { banners: v, sounds: v, badges: v })} />
                  </Row>
                  <Row label="Banners">
                    <Toggle label={`${l} banners`} on={a.banners} onChange={(v) => setApp(l, { banners: v })} />
                  </Row>
                  <Row label="Sounds">
                    <Toggle label={`${l} sounds`} on={a.sounds} onChange={(v) => setApp(l, { sounds: v })} />
                  </Row>
                  <Row label="Badges">
                    <Toggle label={`${l} badges`} on={a.badges} onChange={(v) => setApp(l, { badges: v })} />
                  </Row>
                </div>
              )}
            </div>
          );
        })}
      </Section>
      <Note>Notifications that are switched off still appear in Notification Centre, quietly.</Note>
    </>
  );
}

/* ═════════════ Dynamic Island ═════════════ */

export function DynamicIslandV101() {
  const { settings, update } = useSettings();
  const ds = settings.diShow ?? { music: true, timer: true, call: true, rec: true, torch: true, notif: true };
  const set = (k: keyof typeof ds, v: boolean) => update({ diShow: { ...ds, [k]: v } });
  const rows: [keyof typeof ds, string, string][] = [
    ['music', 'Now Playing', 'Album art and a live waveform'],
    ['timer', 'Timers', 'Countdown from the Clock app'],
    ['call', 'Calls', 'Demo calls from Phone and FaceTime'],
    ['rec', 'Recording', 'Voice Memos and screen recording'],
    ['torch', 'Torch', 'While the torch is on'],
    ['notif', 'Notifications (Mac notch)', 'A short ping when a banner arrives'],
  ];
  return (
    <Section title="Dynamic Island" sub="Choose which live activities appear at the top of the screen.">
      {rows.map(([k, l, s]) => (
        <Row key={k} label={l} sub={s}>
          <Toggle label={l} on={ds[k]} onChange={(v) => set(k, v)} />
        </Row>
      ))}
    </Section>
  );
}

/* ═════════════ Screen Time: Downtime and App Limits ═════════════ */

const LIMIT_OPTS: [string, string][] = [
  ['0', 'No limit'],
  ['1', '1 min (try it)'],
  ['5', '5 min'],
  ['15', '15 min'],
  ['30', '30 min'],
  ['60', '1 hour'],
  ['120', '2 hours'],
];

export function ScreenTimeLimitsV101() {
  const { settings, update } = useSettings();
  const st = useScreenTime();
  const [add, setAdd] = useState<AppId | ''>('');
  const limits = settings.appLimits ?? {};
  const dt = settings.downtime ?? { on: false, from: '22:00', to: '07:00' };
  const setLimit = (id: string, m: number) => {
    const next: Settings['appLimits'] = { ...limits };
    if (m > 0) next[id] = m;
    else delete next[id];
    update({ appLimits: next });
  };
  const candidates = (Object.keys(APPS) as AppId[]).filter((id) => !limits[id] && !['settings', 'finder', 'hireme'].includes(id)).sort((a, b) => APPS[a].title.localeCompare(APPS[b].title));
  return (
    <>
      <Section title="Downtime" sub="During Downtime only Phone, Messages, Settings, Hire Me and Contacts open without a reminder.">
        <Row label="Scheduled">
          <Toggle label="Downtime" on={dt.on} onChange={(v) => update({ downtime: { ...dt, on: v } })} />
        </Row>
        {dt.on && (
          <>
            <Row label="From">
              <input type="time" className="ss-time" value={dt.from} onChange={(e) => e.target.value && update({ downtime: { ...dt, from: e.target.value } })} aria-label="Downtime from" />
            </Row>
            <Row label="To">
              <input type="time" className="ss-time" value={dt.to} onChange={(e) => e.target.value && update({ downtime: { ...dt, to: e.target.value } })} aria-label="Downtime to" />
            </Row>
          </>
        )}
      </Section>
      <Section title="App Limits" sub="Set a daily time limit. When it is reached the app is covered by a reminder — you can still ask for one more minute or ignore the limit for today.">
        {(Object.keys(limits) as AppId[])
          .filter((id) => APPS[id])
          .map((id) => (
            <Row key={id} label={APPS[id].title} sub={`Used today: ${fmtDuration(st.perApp[id] ?? 0)}`}>
              <PopUp label={`${APPS[id].title} limit`} value={String(limits[id])} options={LIMIT_OPTS} onChange={(v) => setLimit(id, Number(v))} />
            </Row>
          ))}
        <Row label="Add Limit">
          <PopUp label="Add a limit for" value={add} options={[['' as AppId | '', 'Choose an app…'], ...candidates.map((id) => [id, APPS[id].title] as [AppId, string])]} onChange={(v) => setAdd(v)} />
          <button type="button" className="ss-btn" disabled={!add} onClick={() => add && (setLimit(add, 15), setAdd(''))}>
            Add
          </button>
        </Row>
      </Section>
    </>
  );
}

/* ═════════════ iPhone: Back Tap, Siri, Display Zoom, keyboard, lock ═════════════ */

const BT_OPTS: [string, string][] = ['none', 'home', 'switcher', 'notifications', 'control', 'screenshot', 'lock', 'siri', 'search', 'torch', 'camera', 'undo'].map((k) => [k, AT_ACTIONS[k]?.label ?? k]);

export function BackTapV101() {
  const { settings, update } = useSettings();
  const ask = async () => {
    const DM = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    try {
      await DM?.requestPermission?.();
    } catch {
      /* the browser decides */
    }
  };
  return (
    <Section title="Back Tap" sub="Tap the back of your phone two or three times to run an action. Needs a phone with a motion sensor; the browser may ask for permission.">
      <Row label="Double Tap">
        <PopUp label="Double Tap" value={settings.backTapDouble ?? 'none'} options={BT_OPTS} onChange={(v) => (update({ backTapDouble: v }), void ask())} />
      </Row>
      <Row label="Triple Tap">
        <PopUp label="Triple Tap" value={settings.backTapTriple ?? 'none'} options={BT_OPTS} onChange={(v) => (update({ backTapTriple: v }), void ask())} />
      </Row>
    </Section>
  );
}

export function SiriV101() {
  const { settings, update } = useSettings();
  return (
    <Section title="Siri & Search">
      <Row label="Siri Suggestions" sub="Suggested apps in Search">
        <Toggle label="Siri Suggestions" on={settings.siriSuggestions !== false} onChange={(v) => update({ siriSuggestions: v })} />
      </Row>
    </Section>
  );
}

export function DisplayZoomV101() {
  const { settings, update } = useSettings();
  return (
    <Section title="Display Zoom" sub="Larger shows bigger icons and slightly larger app content.">
      <Row label="Display Zoom">
        <Seg
          label="Display Zoom"
          value={settings.displayZoom ?? 'standard'}
          options={[
            ['standard', 'Default'],
            ['larger', 'Larger Text'],
          ]}
          onChange={(v) => update({ displayZoom: v })}
        />
      </Row>
    </Section>
  );
}

export function SystemSoundsV101() {
  const { settings, update } = useSettings();
  return (
    <Section title="System Sounds">
      <Row label="Keyboard Clicks">
        <Toggle label="Keyboard Clicks" on={settings.keyClicks !== false} onChange={(v) => update({ keyClicks: v })} />
      </Row>
      <Row label="Lock Sound">
        <Toggle label="Lock Sound" on={settings.lockSound !== false} onChange={(v) => update({ lockSound: v })} />
      </Row>
    </Section>
  );
}

function AchievementsList() {
  const got = useAchievements();
  const n = Object.keys(got).length;
  return (
    <Section title={`Achievements · ${n} of ${ACHIEVEMENTS.length}`}>
      {ACHIEVEMENTS.map((a) => (
        <Row key={a.id} label={got[a.id] ? `${a.glyph}  ${a.title}` : '🔒  ???'} sub={got[a.id] ? `${a.hint} · ${new Date(got[a.id]).toLocaleDateString()}` : 'Keep exploring…'} />
      ))}
    </Section>
  );
}

/* ═════════════ Mac: desktop icons, hot corner, dictation, extras ═════════════ */

export function MacExtrasV101() {
  const { settings, update } = useSettings();
  return (
    <>
      <Section title="Desktop Icons">
        <Row label="Icon size">
          <Slider label="Icon size" min={44} max={96} step={4} value={settings.iconSize ?? 64} onChange={(v) => update({ iconSize: v })} left={<small>▫</small>} right={<small>◻</small>} />
        </Row>
        <Row label="Grid spacing">
          <Slider label="Grid spacing" min={76} max={130} step={2} value={settings.iconSpacing ?? 92} onChange={(v) => update({ iconSpacing: v })} />
        </Row>
        <Row label="Sort by">
          <PopUp
            label="Sort by"
            value={settings.iconSort ?? 'none'}
            options={[
              ['none', 'None (where you put them)'],
              ['name', 'Name'],
              ['kind', 'Kind'],
            ]}
            onChange={(v) => update({ iconSort: v })}
          />
        </Row>
        <Row label="Use Stacks" sub="Group desktop items by kind; click a stack to fan it out">
          <Toggle label="Use Stacks" on={!!settings.desktopStacks} onChange={(v) => update({ desktopStacks: v })} />
        </Row>
      </Section>
      <Section title="More">
        <Row label="Hot corner: App Switcher" sub="Move the pointer to the bottom-left corner to see open apps">
          <Toggle
            label="App Switcher hot corner"
            on={(settings.hotCorners ?? [])[2] === 'switcher'}
            onChange={(v) => {
              const hc = [...(settings.hotCorners ?? ['none', 'none', 'none', 'none'])] as Settings['hotCorners'];
              hc[2] = v ? 'switcher' : 'none';
              update({ hotCorners: hc, appSwitcherCorner: v });
            }}
          />
        </Row>
        <Row label="Dictation" sub="A 🎤 button appears in text fields — tap it and speak. Uses your browser’s speech recognition (Chrome, Edge, Safari)">
          <Toggle label="Dictation" on={settings.dictation !== false} onChange={(v) => update({ dictation: v })} />
        </Row>
        <Row label="Live weather on the wallpaper" sub="Gentle rain on the desktop when it is raining in Kandy right now (live forecast)">
          <Toggle label="Weather effects" on={settings.weatherFx !== false} onChange={(v) => update({ weatherFx: v })} />
        </Row>
        <Row label="“hello” at start-up" sub="The handwritten greeting before the login window">
          <Toggle label="hello screen" on={!!settings.helloScreen} onChange={(v) => update({ helloScreen: v })} />
        </Row>
        <Row label="Hidden achievements" sub="Small badges for exploring — Konami code, every app opened, and more">
          <Toggle label="Achievements" on={settings.achievements !== false} onChange={(v) => update({ achievements: v })} />
        </Row>
      </Section>
      {settings.achievements !== false && <AchievementsList />}
    </>
  );
}
