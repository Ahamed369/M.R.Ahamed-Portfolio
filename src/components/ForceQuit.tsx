import { useEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react';
import { useSystem } from '../system/SystemContext';
import { useWM } from '../system/WindowManager';
import { APPS } from '../system/apps';
import { AppIcon } from './AppIcons';
import type { AppId } from '../system/types';

type Row = { id: AppId | 'finder-shell'; title: string; icon: AppId; quittable: boolean };

/** "Force Quit Applications" — ⌥⌘⎋ (Ctrl+Alt+Esc). Lists open windows plus Finder. */
export function ForceQuit() {
  const sys = useSystem();
  const wm = useWM();
  const open = sys.overlay === 'forcequit';
  const [sel, setSel] = useState<string>('');
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(() => {
    const apps: Row[] = wm.windows
      .filter((w) => w.phase !== 'closing' && w.id !== 'finder')
      .map((w) => ({ id: w.id, title: APPS[w.id].title, icon: w.id, quittable: true }));
    // Finder is always running and can only be relaunched.
    const finder: Row = { id: 'finder-shell', title: 'Finder', icon: 'finder', quittable: false };
    return [...apps, finder].sort((a, b) => a.title.localeCompare(b.title));
  }, [wm.windows]);

  useEffect(() => {
    if (!open) return;
    setSel((cur) => (rows.some((r) => r.id === cur) ? cur : (rows.find((r) => r.quittable) ?? rows[0]).id));
  }, [open, rows]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;
  const current = rows.find((r) => r.id === sel) ?? rows[0];
  const close = () => sys.setOverlay('none');

  const act = () => {
    if (!current) return;
    if (current.quittable) {
      wm.close(current.id as AppId);
      return;
    }
    // "Relaunch" Finder: close its window (if any) and open it again
    if (wm.windows.some((w) => w.id === 'finder')) {
      wm.close('finder');
      window.setTimeout(() => wm.open('finder'), 450);
    }
  };

  const onListKey = (e: RKeyboardEvent) => {
    const i = rows.findIndex((r) => r.id === sel);
    let n = i;
    if (e.key === 'ArrowDown') n = Math.min(rows.length - 1, i + 1);
    else if (e.key === 'ArrowUp') n = Math.max(0, i - 1);
    else if (e.key === 'Enter') {
      e.preventDefault();
      act();
      return;
    } else return;
    e.preventDefault();
    setSel(rows[n].id);
    (listRef.current?.children[n] as HTMLElement | undefined)?.focus();
  };

  return (
    <div className="v5-fq-scrim" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="v5-fq" role="dialog" aria-modal="true" aria-labelledby="v5-fq-title">
        <div className="v5-fq-head">
          <button type="button" className="v5-tl-close" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="m2.5 2.5 5 5m0-5-5 5" />
            </svg>
          </button>
          <h2 id="v5-fq-title">Force Quit Applications</h2>
        </div>
        <p className="v5-fq-help">If an app doesn’t respond for a while, select its name and click Force Quit.</p>
        <div className="v5-fq-list" role="listbox" aria-label="Open applications" ref={listRef} onKeyDown={onListKey}>
          {rows.map((r) => (
            <div
              key={r.id}
              role="option"
              tabIndex={r.id === sel ? 0 : -1}
              aria-selected={r.id === sel}
              className={`v5-fq-row ${r.id === sel ? 'sel' : ''}`}
              onClick={() => setSel(r.id)}
              onDoubleClick={act}
            >
              <AppIcon name={APPS[r.icon].icon} className="v5-fq-icon" />
              <span>{r.title}</span>
            </div>
          ))}
        </div>
        <p className="v5-fq-tip">You can open this window by pressing ⌥⌘⎋ (Ctrl+Alt+Esc).</p>
        <div className="v5-fq-actions">
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={act} disabled={!current || (!current.quittable && !wm.windows.some((w) => w.id === 'finder'))}>
            {current && !current.quittable ? 'Relaunch' : 'Force Quit'}
          </button>
        </div>
      </div>
    </div>
  );
}
