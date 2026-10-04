import { useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { usePersisted, uid } from '../system/useStore';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import { useSystem } from '../system/SystemContext';
import { useMusic } from '../system/MusicContext';
import { notify } from '../system/notify';
import { wallpapers } from '../data/media';
import { cv, personal } from '../data/portfolio';
import { islandPing, islandTorch, isTorch } from '../system/island';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { AppProps } from '../components/Desktop';

type ActionId =
  | 'cv'
  | 'projects'
  | 'skills'
  | 'hire'
  | 'email'
  | 'dark'
  | 'light'
  | 'wallpaper'
  | 'music'
  | 'focus'
  | 'dnd'
  | 'torch'
  | 'lock'
  | 'share'
  | 'notify'
  | 'casestudies'
  | 'services';

const ACTIONS: { id: ActionId; label: string; icon: string }[] = [
  { id: 'cv', label: 'Open CV', icon: '📄' },
  { id: 'projects', label: 'Show Projects', icon: '🧩' },
  { id: 'casestudies', label: 'Open Case Studies', icon: '📚' },
  { id: 'skills', label: 'Show Skills', icon: '🛠' },
  { id: 'services', label: 'Open My Services', icon: '💼' },
  { id: 'hire', label: 'Open Hire Me', icon: '🤝' },
  { id: 'email', label: 'New Email to Ahamed', icon: '✉️' },
  { id: 'dark', label: 'Set Dark Mode', icon: '🌙' },
  { id: 'light', label: 'Set Light Mode', icon: '☀️' },
  { id: 'wallpaper', label: 'Random Wallpaper', icon: '🖼' },
  { id: 'music', label: 'Play / Pause Music', icon: '🎵' },
  { id: 'focus', label: 'Start 25-min Focus Timer', icon: '⏱' },
  { id: 'dnd', label: 'Toggle Do Not Disturb', icon: '☾' },
  { id: 'torch', label: 'Toggle Torch', icon: '🔦' },
  { id: 'lock', label: 'Lock Screen', icon: '🔒' },
  { id: 'share', label: 'Share Portfolio', icon: '📤' },
  { id: 'notify', label: 'Show Notification', icon: '🔔' },
];

interface Shortcut {
  id: string;
  name: string;
  color: string;
  icon: string;
  steps: ActionId[];
  builtin?: boolean;
}

const COLORS = ['#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#5f27cd', '#ff5fa2', '#576574', '#2e86de', '#10ac84'];

const SEED: Shortcut[] = [
  { id: 'b-recruiter', name: 'Recruiter Tour', color: '#2e86de', icon: '🧭', steps: ['cv', 'projects', 'hire'], builtin: true },
  { id: 'b-focus', name: 'Focus Mode', color: '#5f27cd', icon: '🎯', steps: ['dnd', 'focus', 'music'], builtin: true },
  { id: 'b-night', name: 'Good Night', color: '#576574', icon: '🌙', steps: ['dark', 'dnd'], builtin: true },
  { id: 'b-morning', name: 'Good Morning', color: '#ff9f43', icon: '☀️', steps: ['light', 'wallpaper'], builtin: true },
  { id: 'b-contact', name: 'Contact Ahamed', color: '#10ac84', icon: '✉️', steps: ['email'], builtin: true },
  { id: 'b-cv', name: 'Open My CV', color: '#ff6b6b', icon: '📄', steps: ['cv'], builtin: true },
  { id: 'b-torch', name: 'Torch', color: '#feca57', icon: '🔦', steps: ['torch'], builtin: true },
  { id: 'b-share', name: 'Share Portfolio', color: '#48dbfb', icon: '📤', steps: ['share'], builtin: true },
];

/** v10 — Shortcuts: run ready-made actions or build your own (saved in this browser). */
export default function ShortcutsApp(_: AppProps) {
  const wm = useWM();
  const sys = useSystem();
  const music = useMusic();
  const { settings, update } = useSettings();
  const [list, setList] = usePersisted<Shortcut[]>('mra-shortcuts-v10', SEED);
  const [running, setRunning] = useState<string | null>(null);
  const [edit, setEdit] = useState<Shortcut | null>(null);
  const [del, setDel] = useState<Shortcut | null>(null);

  const runStep = (a: ActionId) => {
    switch (a) {
      case 'cv':
        return wm.open('preview');
      case 'projects':
        return wm.open('xcode');
      case 'casestudies':
        return wm.open('casestudies');
      case 'skills':
        return wm.open('notes');
      case 'services':
        return wm.open('services');
      case 'hire':
        return wm.open('hireme');
      case 'email':
        return wm.open('mail', { compose: '1' });
      case 'dark':
        return update({ appearance: 'dark' });
      case 'light':
        return update({ appearance: 'light' });
      case 'wallpaper': {
        const w = wallpapers[Math.floor(Math.random() * wallpapers.length)];
        return update({ wallpaper: w.id });
      }
      case 'music':
        return music.toggle();
      case 'focus':
        islandPing({ icon: '⏱', title: 'Focus timer', sub: '25 min', tint: '#ff9f0a' });
        return wm.open('clock', { tab: 'timer' });
      case 'dnd':
        return update({ focusMode: settings.focusMode === 'dnd' ? 'off' : 'dnd' });
      case 'torch':
        return islandTorch(!isTorch());
      case 'lock':
        return sys.lock('lock');
      case 'share':
        return window.dispatchEvent(new Event('mra-share-portfolio'));
      case 'notify':
        return notify({ app: 'Shortcuts', icon: 'shortcuts', title: 'Hello from Shortcuts', body: `${personal.name}'s portfolio · CV: ${cv.fileName}` });
    }
  };

  const run = (s: Shortcut) => {
    setRunning(s.id);
    s.steps.forEach((a, i) => window.setTimeout(() => runStep(a), i * 450));
    window.setTimeout(() => {
      setRunning(null);
      islandPing({ icon: '✓', title: s.name, sub: 'Done', tint: '#30d158', ms: 1600 });
    }, s.steps.length * 450 + 200);
  };

  const save = (s: Shortcut) => {
    setList((l) => (l.some((x) => x.id === s.id) ? l.map((x) => (x.id === s.id ? s : x)) : [...l, s]));
    setEdit(null);
  };

  return (
    <div className="sc10">
      <DragBar className="sc10-bar">
        <Lights />
        <b>Shortcuts</b>
        <span className="sc10-sp" />
        <button type="button" className="sc10-add" onClick={() => setEdit({ id: uid('sc'), name: 'New Shortcut', color: COLORS[list.length % COLORS.length], icon: '⚡️', steps: [] })} aria-label="New shortcut">
          ＋
        </button>
      </DragBar>
      <h1 className="sc10-h">All Shortcuts</h1>
      <div className="sc10-grid">
        {list.map((s) => (
          <div key={s.id} className={`sc10-tile ${running === s.id ? 'run' : ''}`} style={{ ['--c' as string]: s.color }}>
            <button type="button" className="sc10-run" onClick={() => run(s)} aria-label={`Run ${s.name}`}>
              <span className="sc10-ico">{s.icon}</span>
              <b>{s.name}</b>
              <small>{s.steps.length} action{s.steps.length === 1 ? '' : 's'}</small>
            </button>
            <button type="button" className="sc10-more" aria-label={`Edit ${s.name}`} onClick={() => setEdit(s)}>
              •••
            </button>
          </div>
        ))}
      </div>

      {edit && (
        <div className="sc10-sheet-back" onClick={() => setEdit(null)}>
          <div className="sc10-sheet" role="dialog" aria-label="Edit shortcut" onClick={(e) => e.stopPropagation()}>
            <header>
              <button type="button" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <b>{list.some((x) => x.id === edit.id) ? 'Edit Shortcut' : 'New Shortcut'}</b>
              <button type="button" className="strong" disabled={!edit.name.trim() || !edit.steps.length} onClick={() => save(edit)}>
                Done
              </button>
            </header>
            <div className="sc10-form">
              <label>
                Name
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={40} />
              </label>
              <label>
                Icon
                <input value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: [...e.target.value].slice(-2).join('') || '⚡️' })} maxLength={4} />
              </label>
              <div className="sc10-colors">
                {COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Colour ${c}`} className={edit.color === c ? 'on' : ''} style={{ background: c }} onClick={() => setEdit({ ...edit, color: c })} />
                ))}
              </div>
              <h4>Actions (run in order)</h4>
              <ol className="sc10-steps">
                {edit.steps.map((a, i) => (
                  <li key={`${a}${i}`}>
                    {ACTIONS.find((x) => x.id === a)?.icon} {ACTIONS.find((x) => x.id === a)?.label}
                    <button type="button" aria-label="Remove action" onClick={() => setEdit({ ...edit, steps: edit.steps.filter((_, k) => k !== i) })}>
                      ⊖
                    </button>
                  </li>
                ))}
                {!edit.steps.length && <li className="sc10-none">Add an action below</li>}
              </ol>
              <div className="sc10-actions">
                {ACTIONS.map((a) => (
                  <button key={a.id} type="button" onClick={() => setEdit({ ...edit, steps: [...edit.steps, a.id].slice(0, 12) })}>
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
              {list.some((x) => x.id === edit.id) && (
                <button type="button" className="sc10-delete" onClick={() => setDel(edit)}>
                  Delete Shortcut
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {del && (
        <ConfirmDialog
          icon="shortcuts"
          message={`Delete “${del.name}”?`}
          detail="It moves to Recently Deleted (Finder → Trash) — you can put it back."
          onCancel={() => setDel(null)}
          onConfirm={() => {
            setList((l) => l.filter((x) => x.id !== del.id));
            setDel(null);
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}
