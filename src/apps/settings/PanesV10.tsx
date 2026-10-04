import { chooseView } from '../../system/ios';
import { useEffect, useRef, useState } from 'react';
import { Note, PopUp, Row, Section, Seg, Slider, Toggle } from '../SettingsApp';
import { useSettings, defaultSettings } from '../../system/SettingsContext';
import { CUSTOM_TONE, customSoundName, NOTIF_TONES, previewRingtone, playTone, RINGTONES, ALERT_SOUNDS } from '../../system/sounds';
import { idbSet } from '../../system/idb';
import { daysLeft, eraseDeleted, restoreDeleted, useDeleted } from '../../system/history';
import { MAX_SPACES, setSpaceCount, setSpaceWallpaper, spaceWallpaper, useSpaces } from '../../system/spaces';
import { wallpapers } from '../../data/media';
import { AT_ACTIONS } from '../../components/ios/atActions';
import { CCIcon } from '../../components/ios/CCIcons';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { notify } from '../../system/notify';
import type { Settings } from '../../system/types';

/* ═════════════ Sounds: notification tone, ringtone, your own sound ═════════════ */

export function SoundsV10() {
  const { settings, update } = useSettings();
  const [own, setOwn] = useState(customSoundName());
  const file = useRef<HTMLInputElement>(null);
  const tones: [string, string][] = [...Object.keys(NOTIF_TONES), 'Glass Chime', ...Object.keys(ALERT_SOUNDS)].map((t) => [t, t] as [string, string]);
  if (own) tones.push([CUSTOM_TONE, `${CUSTOM_TONE} — ${own}`]);
  const rings: [string, string][] = Object.keys(RINGTONES).map((t) => [t, t] as [string, string]);
  if (own) rings.push([CUSTOM_TONE, `${CUSTOM_TONE} — ${own}`]);
  useEffect(() => {
    const on = () => window.setTimeout(() => setOwn(customSoundName()), 50);
    window.addEventListener('mra-custom-sound', on);
    return () => window.removeEventListener('mra-custom-sound', on);
  }, []);
  const upload = (f: File | undefined) => {
    if (!f) return;
    if (!/^audio\//.test(f.type) || f.size > 3 * 1024 * 1024) {
      notify({ app: 'Sounds', icon: 'settings', title: 'Choose an audio file under 3 MB', body: 'MP3, M4A, WAV or OGG.' });
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      void idbSet('custom-sound', { data: String(r.result), name: f.name }).then(() => {
        window.dispatchEvent(new Event('mra-custom-sound'));
        notify({ app: 'Sounds', icon: 'settings', title: 'Your sound is ready', body: `${f.name} — kept only in this browser. Pick “${CUSTOM_TONE}” below.`, silent: true });
      });
    };
    r.readAsDataURL(f);
  };
  return (
    <Section title="Sounds & Ringtones" sub="Original tones made for this portfolio. You can also use a sound file of your own — it stays in this browser and is never uploaded.">
      <Row label="Notification sound">
        <PopUp label="Notification sound" value={settings.notifTone ?? 'Portfolio Ding'} options={tones} onChange={(v) => (update({ notifTone: v }), window.setTimeout(() => playTone(v, settings.alertVolume), 30))} />
      </Row>
      <Row label="Ringtone" sub="Incoming demo calls, alarms and timers">
        <PopUp label="Ringtone" value={settings.ringtone ?? 'Daybreak'} options={rings} onChange={(v) => (update({ ringtone: v }), window.setTimeout(() => previewRingtone(v, settings.alertVolume), 30))} />
      </Row>
      <Row label="Preview">
        <button type="button" className="ss-btn" onClick={() => playTone(settings.notifTone ?? 'Portfolio Ding', settings.alertVolume)}>
          ▶ Notification
        </button>
        <button type="button" className="ss-btn" onClick={() => previewRingtone(settings.ringtone ?? 'Daybreak', settings.alertVolume)}>
          ▶ Ringtone
        </button>
      </Row>
      <Row label="Your own sound" sub={own ? `Using: ${own}` : 'Upload an audio file you have the rights to use'}>
        <input ref={file} type="file" accept="audio/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        <button type="button" className="ss-btn" onClick={() => file.current?.click()}>
          {own ? 'Replace…' : 'Upload…'}
        </button>
        {own && (
          <button
            type="button"
            className="ss-btn"
            onClick={() =>
              void idbSet('custom-sound', undefined).then(() => {
                window.dispatchEvent(new Event('mra-custom-sound'));
                if (settings.notifTone === CUSTOM_TONE) update({ notifTone: 'Portfolio Ding' });
                if (settings.ringtone === CUSTOM_TONE) update({ ringtone: 'Daybreak' });
              })
            }
          >
            Remove
          </button>
        )}
      </Row>
    </Section>
  );
}

/* ═════════════ Desktops, gestures, effects, performance ═════════════ */

export function DesktopV10() {
  const { settings, update } = useSettings();
  const sp = useSpaces();
  return (
    <>
      <Section title="Desktops (Spaces)" sub="Swipe left or right with two fingers on the desktop, press Ctrl+← / Ctrl+→ or Ctrl+1…6. Each desktop has its own windows and wallpaper.">
        <Row label="Number of desktops">
          <Slider label="Number of desktops" min={1} max={MAX_SPACES} step={1} value={sp.count} onChange={(v) => setSpaceCount(v)} left={<small>1</small>} right={<small>{MAX_SPACES}</small>} />
        </Row>
        <Row label="Swipe between desktops">
          <Toggle label="Swipe between desktops" on={settings.swipeSpaces !== false} onChange={(v) => update({ swipeSpaces: v })} />
        </Row>
        {Array.from({ length: sp.count }, (_, i) =>
          i === 0 ? null : (
            <Row key={i} label={`Desktop ${i + 1} wallpaper`}>
              <PopUp label={`Desktop ${i + 1} wallpaper`} value={spaceWallpaper(i, settings.wallpaper)} options={wallpapers.map((w) => [w.id, w.name] as [string, string])} onChange={(v) => setSpaceWallpaper(i, v)} />
            </Row>
          ),
        )}
      </Section>
      <Section title="Effects">
        <Row label="Wallpaper parallax" sub="The wallpaper follows the pointer slightly">
          <Toggle label="Wallpaper parallax" on={settings.parallax !== false} onChange={(v) => update({ parallax: v })} />
        </Row>
        <Row label="Liquid Glass edges" sub="A light edge on the Dock, widgets and panels">
          <Toggle label="Liquid Glass edges" on={settings.glassEdge !== false} onChange={(v) => update({ glassEdge: v })} />
        </Row>
        <Row label="Notch with Dynamic Island" sub="Shows calls, timers, music and recordings at the top centre">
          <Toggle label="Notch with Dynamic Island" on={!!settings.macNotch} onChange={(v) => update({ macNotch: v })} />
        </Row>
        <Row label="Login window: choose a user" sub="Shows M.R. Ahamed, Recruiter (opens the CV and Hire Me) and Guest at start-up. No password is ever asked.">
          <Toggle label="Login user picker" on={!!settings.userPicker} onChange={(v) => update({ userPicker: v })} />
        </Row>
        <Row label="After unlocking">
          <PopUp
            label="After unlocking"
            value={settings.arrivalAnim ?? 'soft'}
            options={[
              ['soft', 'Soft fade (default)'],
              ['full', 'Full build-up'],
              ['off', 'No animation'],
            ]}
            onChange={(v) => update({ arrivalAnim: v })}
          />
        </Row>
      </Section>
      <Section title="Performance" sub="Automatic watches the frame rate and turns off heavy blur when the device struggles. Hidden tabs pause every animation.">
        <Row label="Graphics">
          <Seg
            label="Graphics"
            value={settings.perfMode ?? 'auto'}
            options={[
              ['auto', 'Automatic'],
              ['quality', 'Best quality'],
              ['speed', 'Fastest'],
            ]}
            onChange={(v) => update({ perfMode: v })}
          />
        </Row>
      </Section>
    </>
  );
}

/** Trackpad → pinch (replaces "Zoom in or out": the page itself never zooms) */
export function PinchRow() {
  const { settings, update } = useSettings();
  return (
    <Row label="Pinch gesture" sub="Pinch in with two fingers (or Ctrl + scroll). Over a window it shows App Exposé; pinch again for Launchpad; pinch out to go back. The page itself never zooms — use Ctrl + / Ctrl − for that.">
      <PopUp
        label="Pinch gesture"
        value={settings.pinchAction ?? 'missioncontrol'}
        options={[
          ['missioncontrol', 'Mission Control → Launchpad'],
          ['launchpad', 'Launchpad'],
          ['off', 'Off'],
        ]}
        onChange={(v) => update({ pinchAction: v })}
      />
    </Row>
  );
}

/* ═════════════ Trash, Recently Deleted & Undo ═════════════ */

export function TrashPane() {
  const { settings, update } = useSettings();
  const items = useDeleted();
  const [ask, setAsk] = useState(false);
  return (
    <>
      <Section title="Delete safety">
        <Row label="Ask before deleting" sub="Show a confirmation before anything is deleted">
          <Toggle label="Ask before deleting" on={settings.askBeforeDelete !== false} onChange={(v) => update({ askBeforeDelete: v })} />
        </Row>
        <Row label="Empty Recently Deleted automatically">
          <PopUp
            label="Auto-empty"
            value={String(settings.trashAutoEmpty ?? 30) as '0' | '7' | '30'}
            options={[
              ['7', 'After 7 days'],
              ['30', 'After 30 days'],
              ['0', 'Never'],
            ]}
            onChange={(v) => update({ trashAutoEmpty: Number(v) as 0 | 7 | 30 })}
          />
        </Row>
        <Row label="Undo history" sub="⌘Z / Ctrl+Z undoes, ⇧⌘Z / Ctrl+Y redoes. On touch screens: shake, or double-tap with three fingers.">
          <PopUp
            label="Undo history"
            value={String(settings.undoLimit ?? 50) as '20' | '50' | '100'}
            options={[
              ['20', '20 steps'],
              ['50', '50 steps'],
              ['100', '100 steps'],
            ]}
            onChange={(v) => update({ undoLimit: Number(v) })}
          />
        </Row>
      </Section>
      <Section title={`Recently Deleted (${items.length})`} sub="Notes, reminders, events, messages, documents and other things you delete land here first.">
        {!items.length && <Row label="Nothing here" sub="Deleted items appear here and in Finder → Trash." />}
        {items.slice(0, 50).map((d) => (
          <Row key={d.id} label={d.title} sub={`${d.app} · ${settings.trashAutoEmpty ? `${daysLeft(d, settings.trashAutoEmpty)} days left` : 'kept until you empty it'}`}>
            <button type="button" className="ss-btn" onClick={() => restoreDeleted(d)}>
              Recover
            </button>
            <button type="button" className="ss-btn" onClick={() => eraseDeleted(d.id)}>
              Delete
            </button>
          </Row>
        ))}
        {items.length > 0 && (
          <Row label="">
            <button type="button" className="ss-btn danger" onClick={() => setAsk(true)}>
              Delete All…
            </button>
          </Row>
        )}
      </Section>
      {ask && (
        <ConfirmDialog
          icon="trash"
          message={`Permanently delete ${items.length} item${items.length === 1 ? '' : 's'}?`}
          detail="You can’t undo this action."
          onCancel={() => setAsk(false)}
          onConfirm={() => {
            eraseDeleted();
            setAsk(false);
          }}
        />
      )}
    </>
  );
}

/* ═════════════ Devices: View as, iPhone & iPad, AssistiveTouch ═════════════ */

export function DevicesPane() {
  const { settings, update } = useSettings();
  const [reset, setReset] = useState<'settings' | 'layout' | null>(null);
  return (
    <>
      <Section title="View as" sub="Automatic picks the Mac on computers, the iPhone on phones and the iPad on tablets. Choose one to see the other devices on any screen.">
        <Row label="Device">
          <Seg
            label="View as"
            value={settings.viewAs ?? 'auto'}
            options={[
              ['auto', 'Automatic'],
              ['mac', 'Mac'],
              ['iphone', 'iPhone'],
              ['ipad', 'iPad'],
            ]}
            onChange={(v) => chooseView(update, v)}
          />
        </Row>
        <Row label="Quick View (Classic Site)" sub="The whole CV on one fast, printable page — share it as …/?view=classic">
          <button type="button" className="ss-btn" onClick={() => window.dispatchEvent(new Event('mra-classic'))}>
            Open Quick View
          </button>
        </Row>
      </Section>
      <Section title="iPhone & iPad Home Screen">
        <Row label="Icon look">
          <Seg
            label="Icon look"
            value={settings.iosIconLook ?? 'default'}
            options={[
              ['default', 'Default'],
              ['dark', 'Dark'],
              ['clear', 'Clear'],
              ['tinted', 'Tinted'],
            ]}
            onChange={(v) => update({ iosIconLook: v })}
          />
        </Row>
        <Row label="Show app names">
          <Toggle label="Show app names" on={settings.iosLabels !== false} onChange={(v) => update({ iosLabels: v })} />
        </Row>
        <Row label="Large icons">
          <Toggle label="Large icons" on={!!settings.iosLargeIcons} onChange={(v) => update({ iosLargeIcons: v })} />
        </Row>
        <Row label="Long-press on an empty area">
          <PopUp
            label="Long-press on Home Screen"
            value={settings.iosLongPress ?? 'switcher'}
            options={[
              ['switcher', 'Open the App Switcher'],
              ['edit', 'Edit the Home Screen'],
            ]}
            onChange={(v) => update({ iosLongPress: v })}
          />
        </Row>
        <Row label="Three-finger gestures" sub="Up: App Switcher · Down: Notification Centre · Left/Right: switch apps · Pinch: Home · Double-tap: Undo">
          <Toggle label="Three-finger gestures" on={settings.threeFinger !== false} onChange={(v) => update({ threeFinger: v })} />
        </Row>
        <Row label="StandBy" sub="Turn an iPhone sideways on the Lock Screen">
          <Toggle label="StandBy" on={settings.standBy !== false} onChange={(v) => update({ standBy: v })} />
        </Row>
        <Row label="Always On Display">
          <Toggle label="Always On Display" on={!!settings.alwaysOn} onChange={(v) => update({ alwaysOn: v })} />
        </Row>
        <Row label="iPad Stage Manager">
          <Toggle label="iPad Stage Manager" on={!!settings.ipadStage} onChange={(v) => update({ ipadStage: v })} />
        </Row>
      </Section>
      <AssistiveTouchSection />
      <BackupSection />
      <Section title="Reset">
        <Row label="Reset Home Screen layout" sub="Pages, folders and widgets go back to the original arrangement">
          <button type="button" className="ss-btn" onClick={() => setReset('layout')}>
            Reset Layout…
          </button>
        </Row>
        <Row label="Reset all settings" sub="Your notes, messages and other content are kept">
          <button type="button" className="ss-btn danger" onClick={() => setReset('settings')}>
            Reset All Settings…
          </button>
        </Row>
      </Section>
      {reset && (
        <ConfirmDialog
          icon="settings"
          message={reset === 'layout' ? 'Reset the Home Screen layout?' : 'Reset all settings?'}
          detail={reset === 'layout' ? 'Every page, folder and widget goes back to the original layout.' : 'Appearance, sounds, gestures and every other preference go back to their defaults.'}
          confirmLabel="Reset"
          onCancel={() => setReset(null)}
          onConfirm={() => {
            if (reset === 'layout') {
              ['iphone', 'ipad'].forEach((m) => {
                try {
                  localStorage.removeItem(`mra-ios-layout-v10-${m}`);
                } catch {
                  /* ignore */
                }
              });
              window.dispatchEvent(new Event('mra-ios-layout'));
            } else update({ ...(defaultSettings as Settings) });
            setReset(null);
          }}
        />
      )}
      <Note>Everything here is saved in this browser only.</Note>
    </>
  );
}

export function AssistiveTouchSection() {
  const { settings, update } = useSettings();
  const [pick, setPick] = useState<number | null>(null);
  const icons = settings.atIcons ?? [];
  const opts = Object.entries(AT_ACTIONS).map(([k, v]) => [k, v.label] as [string, string]);
  const top = opts.filter(([k]) => k !== 'menu' && k !== 'none');
  return (
    <Section title="AssistiveTouch" sub="A floating button for Home, Control Centre, gestures and more.">
      <Row label="AssistiveTouch">
        <Toggle label="AssistiveTouch" on={!!settings.atOn} onChange={(v) => update({ atOn: v })} />
      </Row>
      <div className="at-cust" aria-label="Customise Top Level Menu">
        <span className="at-cust-h">Customise Top Level Menu — tap an icon to change it</span>
        <div className="at-ring" data-n={icons.length}>
          {icons.map((a, i) => {
            const ang = (i / icons.length) * Math.PI * 2 - Math.PI / 2;
            const r = icons.length === 1 ? 0 : 38;
            return (
              <button
                key={i}
                type="button"
                className={`at-slot ${pick === i ? 'on' : ''}`}
                style={{ left: `${50 + Math.cos(ang) * r}%`, top: `${50 + Math.sin(ang) * r}%` }}
                onClick={() => setPick(pick === i ? null : i)}
                aria-label={`Icon ${i + 1}: ${AT_ACTIONS[a]?.label ?? a}. Tap to change.`}
              >
                <CCIcon n={AT_ACTIONS[a]?.icon ?? 'grid'} size={22} />
                <small>{AT_ACTIONS[a]?.label ?? a}</small>
              </button>
            );
          })}
        </div>
        {pick !== null && icons[pick] !== undefined && (
          <div className="at-choose" role="listbox" aria-label={`Choose icon ${pick + 1}`}>
            {top.map(([k, l]) => (
              <button key={k} type="button" role="option" aria-selected={icons[pick] === k} className={icons[pick] === k ? 'on' : ''} onClick={() => (update({ atIcons: icons.map((x, j) => (j === pick ? k : x)) }), setPick(null))}>
                <CCIcon n={AT_ACTIONS[k]?.icon ?? 'grid'} size={16} /> {l}
              </button>
            ))}
          </div>
        )}
        <div className="at-count">
          <span>
            {icons.length} Icon{icons.length === 1 ? '' : 's'}
          </span>
          <button type="button" className="ss-btn" aria-label="Fewer icons" disabled={icons.length <= 1} onClick={() => (setPick(null), update({ atIcons: icons.slice(0, -1) }))}>
            −
          </button>
          <button type="button" className="ss-btn" aria-label="More icons" disabled={icons.length >= 8} onClick={() => update({ atIcons: [...icons, top.find(([k]) => !icons.includes(k))?.[0] ?? 'home'] })}>
            +
          </button>
        </div>
      </div>
      <Row label="Custom Gestures" sub={(settings.atGestures ?? []).length ? (settings.atGestures ?? []).map((g) => g.name).join(', ') : 'Record a tap or swipe and replay it from Custom in the menu'}>
        <button type="button" className="ss-btn" disabled={(settings.atGestures ?? []).length >= 3} onClick={() => (update({ atOn: true }), window.setTimeout(() => window.dispatchEvent(new Event('mra-at-record')), 150))}>
          Create New Gesture…
        </button>
        {(settings.atGestures ?? []).length > 0 && (
          <button type="button" className="ss-btn" onClick={() => update({ atGestures: [] })}>
            Delete All
          </button>
        )}
      </Row>
      <Row label="Single-Tap">
        <PopUp label="Single-Tap" value={settings.atSingle ?? 'menu'} options={opts} onChange={(v) => update({ atSingle: v })} />
      </Row>
      <Row label="Double-Tap">
        <PopUp label="Double-Tap" value={settings.atDouble ?? 'switcher'} options={opts} onChange={(v) => update({ atDouble: v })} />
      </Row>
      <Row label="Long Press">
        <PopUp label="Long Press" value={settings.atLong ?? 'siri'} options={opts} onChange={(v) => update({ atLong: v })} />
      </Row>
      <Row label="Idle opacity">
        <Slider label="Idle opacity" min={0.15} max={1} step={0.05} value={settings.atOpacity ?? 0.4} onChange={(v) => update({ atOpacity: v })} left={<small>15%</small>} right={<small>100%</small>} />
      </Row>
      <Row label="Reset menu">
        <button type="button" className="ss-btn" onClick={() => update({ atIcons: defaultSettings.atIcons, atSingle: 'menu', atDouble: 'switcher', atLong: 'siri', atOpacity: 0.4 })}>
          Reset
        </button>
      </Row>
    </Section>
  );
}

/* ═════════════ Backup & Restore (Time Machine-style) ═════════════ */

export function BackupSection() {
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Record<string, string> | null>(null);
  const keys = () => {
    const out: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('mra-')) out[k] = localStorage.getItem(k) ?? '';
      }
    } catch {
      /* storage blocked */
    }
    return out;
  };
  const exportAll = () => {
    const data = { app: 'mr-ahamed-portfolio', version: 10, at: new Date().toISOString(), data: keys() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    notify({ app: 'Backup', icon: 'settings', title: 'Backup saved', body: `${Object.keys(data.data).length} items exported to a file.`, silent: true });
  };
  const read = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result)) as { app?: string; data?: Record<string, string> };
        if (d.app !== 'mr-ahamed-portfolio' || !d.data || typeof d.data !== 'object') throw new Error('bad');
        const clean = Object.fromEntries(Object.entries(d.data).filter(([k, v]) => k.startsWith('mra-') && typeof v === 'string'));
        setPending(clean);
      } catch {
        notify({ app: 'Backup', icon: 'settings', title: 'That file isn’t a portfolio backup', body: 'Choose a file saved with “Back Up Now”.' });
      }
    };
    r.readAsText(f);
  };
  return (
    <Section title="Backup & Restore" sub="Save your notes, messages, layouts, settings and everything else you created here to a file — and bring it back on any device.">
      <Row label="Back up now" sub={`${Object.keys(keys()).length} saved items in this browser`}>
        <button type="button" className="ss-btn" onClick={exportAll}>
          Back Up Now…
        </button>
      </Row>
      <Row label="Restore from a backup">
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => read(e.target.files?.[0])} />
        <button type="button" className="ss-btn" onClick={() => file.current?.click()}>
          Restore…
        </button>
      </Row>
      {pending && (
        <ConfirmDialog
          icon="settings"
          message={`Restore ${Object.keys(pending).length} items from this backup?`}
          detail="Current data with the same names is replaced, then the portfolio reloads."
          confirmLabel="Restore"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            try {
              Object.entries(pending).forEach(([k, v]) => localStorage.setItem(k, v));
            } catch {
              /* ignore */
            }
            setPending(null);
            window.setTimeout(() => location.reload(), 150);
          }}
        />
      )}
    </Section>
  );
}
