import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent, type DragEvent } from 'react';
import { AppIcon } from './AppIcons';
import { LAUNCH_FOLDERS, LAUNCH_ITEMS, LAUNCHPAD_ORDER, type LaunchFolder, type LaunchItem } from '../system/launch';
import { useSystem } from '../system/SystemContext';
import { useLaunch } from '../system/useLaunch';
import { useBadges } from '../system/badges';
import { PROTECTED_APPS, useCustomize } from '../system/customize';
import { ConfirmDialog } from './ConfirmDialog';

type Entry = { kind: 'app'; item: LaunchItem } | { kind: 'folder'; folder: LaunchFolder; items: LaunchItem[] };
const keyOf = (e: Entry) => (e.kind === 'app' ? e.item.id : `folder:${e.folder.id}`);

const byId = new Map(LAUNCH_ITEMS.map((i) => [i.id, i]));

/** Top-level entries in macOS order; folder contents are not repeated on the pages. */
const ENTRIES: Entry[] = (() => {
  const out: Entry[] = [];
  const used = new Set<string>();
  LAUNCHPAD_ORDER.forEach((key) => {
    if (key.startsWith('folder:')) {
      const folder = LAUNCH_FOLDERS.find((f) => f.id === key.slice(7));
      if (!folder) return;
      const items = folder.items.map((id) => byId.get(id)).filter((x): x is LaunchItem => !!x);
      items.forEach((i) => used.add(i.id));
      out.push({ kind: 'folder', folder, items });
      return;
    }
    const item = byId.get(key);
    if (item && !used.has(key)) {
      used.add(key);
      out.push({ kind: 'app', item });
    }
  });
  // anything new in LAUNCH_ITEMS that is not placed yet still shows up (at the end)
  const inFolders = new Set(LAUNCH_FOLDERS.flatMap((f) => f.items));
  LAUNCH_ITEMS.forEach((i) => !used.has(i.id) && !inFolders.has(i.id) && i.id !== 'projects' && out.push({ kind: 'app', item: i }));
  return out;
})();

interface Grid {
  cols: number;
  rows: number;
  icon: number;
  tileW: number;
  tileH: number;
  gridW: number;
}

/** Responsive page geometry: 8/7/6/5 columns on desktops, 4 on phones; rows fit the height. */
function measure(): Grid {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const phone = vw < 700;
  const dock = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-size')) || 48) + 26;
  const gridW = Math.min(vw - (phone ? 16 : Math.max(48, vw * 0.07)) * 2, 1280);
  const gridH = vh - (phone ? 92 : 112) - (phone ? 30 : 38) - dock;
  const cols = phone ? 4 : Math.max(4, Math.min(8, Math.floor(gridW / 148)));
  const rows = Math.max(3, Math.min(phone ? 6 : 5, Math.floor(gridH / (phone ? 100 : 118))));
  const tileW = gridW / cols;
  const tileH = gridH / rows;
  const icon = Math.round(Math.max(48, Math.min(96, tileH - 36, tileW * 0.66)));
  return { cols, rows, icon, tileW, tileH, gridW };
}

function useGrid(open: boolean): Grid {
  const [g, setG] = useState<Grid>(measure);
  useEffect(() => {
    if (!open) return;
    setG(measure());
    let f = 0;
    const on = () => {
      cancelAnimationFrame(f);
      f = requestAnimationFrame(() => setG(measure()));
    };
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(f);
      window.removeEventListener('resize', on);
    };
  }, [open]);
  return g;
}

function matches(i: LaunchItem, q: string) {
  const folder = LAUNCH_FOLDERS.find((f) => f.items.includes(i.id));
  return `${i.label} ${i.keywords ?? ''} ${i.group} ${folder?.label ?? ''}`.toLowerCase().includes(q);
}

/** Full-screen app launcher like macOS: blurred wallpaper, search, paged icon grid, folders. */
export function Launchpad() {
  const sys = useSystem();
  const launch = useLaunch();
  const open = sys.overlay === 'launchpad';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [folder, setFolder] = useState<LaunchFolder['id'] | null>(null);
  const [drag, setDrag] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const grid = useGrid(open);
  const perPage = grid.cols * grid.rows;

  const badges = useBadges();
  const cz = useCustomize();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<LaunchItem | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const removed = useMemo(() => new Set(cz.removedApps), [cz.removedApps]);

  /** Entries after deletions (→ Trash) and the visitor's own ordering. */
  const arranged: Entry[] = useMemo(() => {
    const live = ENTRIES.map((e) => (e.kind === 'folder' ? { ...e, items: e.items.filter((i) => !removed.has(i.id)) } : e)).filter((e) =>
      e.kind === 'app' ? !removed.has(e.item.id) : e.items.length > 0,
    );
    if (!cz.order.length) return live;
    const rank = new Map(cz.order.map((k, i) => [k, i]));
    return [...live].sort((a, b) => (rank.get(keyOf(a)) ?? 1e6 + ENTRIES.indexOf(a)) - (rank.get(keyOf(b)) ?? 1e6 + ENTRIES.indexOf(b)));
  }, [removed, cz.order]);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => (query ? LAUNCH_ITEMS.filter((i) => !removed.has(i.id) && matches(i, query)) : []), [query, removed]);
  const entries: Entry[] = useMemo(() => (query ? results.map((item) => ({ kind: 'app' as const, item })) : arranged), [query, results, arranged]);

  const moveBefore = (from: string, to: string) => {
    if (from === to) return;
    const keys = arranged.map(keyOf).filter((k) => k !== from);
    const at = keys.indexOf(to);
    keys.splice(at < 0 ? keys.length : at, 0, from);
    cz.setOrder(keys);
  };
  const pages = useMemo(() => {
    const out: Entry[][] = [];
    for (let i = 0; i < entries.length; i += perPage) out.push(entries.slice(i, i + perPage));
    return out.length ? out : [[]];
  }, [entries, perPage]);
  const pageCount = pages.length;
  const cur = Math.min(page, pageCount - 1);

  const close = useCallback(() => sys.setOverlay('none'), [sys]);
  const go = useCallback((p: number) => setPage(Math.max(0, Math.min(pageCount - 1, p))), [pageCount]);
  const run = useCallback(
    (i: LaunchItem) => {
      close();
      launch(i.action, i.label);
    },
    [close, launch],
  );

  // reset every time it opens
  useEffect(() => {
    if (!open) return;
    setQ('');
    setPage(0);
    setFolder(null);
    setDrag(0);
    setEditing(false);
    setConfirm(null);
    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 140);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => setPage(0), [query]);

  // keyboard: Escape (folder → search → close), ←/→ pages. Capture phase so a
  // folder can close without the desktop's global Escape closing Launchpad.
  const folderRef = useRef(folder);
  folderRef.current = folder;
  const editRef = useRef(editing);
  editRef.current = editing;
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        if (confirmRef.current) return; // the dialog handles its own Escape
        if (folderRef.current) setFolder(null);
        else if (editRef.current) setEditing(false);
        else if (inputRef.current?.value) setQ('');
        else close();
        return;
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLInputElement;
      if (t.tagName === 'INPUT' && t.value) return; // let the caret move while typing
      if (folderRef.current) return;
      e.preventDefault();
      setPage((p) => (e.key === 'ArrowRight' ? p + 1 : Math.max(0, p - 1)));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  // clamp after ArrowRight on the last page
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  /* ───── swipe / drag between pages ───── */
  const dragRef = useRef<{ x: number; y: number; t: number; id: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const longPress = useRef(0);
  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || folder) return;
    // press and hold an app to start editing (like iPhone / macOS Launchpad)
    window.clearTimeout(longPress.current);
    if (!editing && !query && (e.target as HTMLElement).closest('.lp5-tile')) {
      longPress.current = window.setTimeout(() => {
        setEditing(true);
        suppressClick.current = true;
        dragRef.current = null;
      }, 600);
    }
    if (editing) return;
    dragRef.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, moved: false };
    suppressClick.current = false;
  };
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 8 || Math.abs(e.clientY - d.y) > 8) window.clearTimeout(longPress.current);
    if (!d.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
      d.moved = true;
      try {
        viewRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (d.moved) {
      const edge = (cur === 0 && dx > 0) || (cur === pageCount - 1 && dx < 0);
      setDrag(edge ? dx * 0.3 : dx);
    }
  };
  const endDrag = (e: RPointerEvent<HTMLDivElement>) => {
    window.clearTimeout(longPress.current);
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.id !== e.pointerId || !d.moved) return;
    suppressClick.current = true;
    const dx = e.clientX - d.x;
    const v = dx / Math.max(1, performance.now() - d.t);
    const w = viewRef.current?.clientWidth ?? window.innerWidth;
    if (dx < -w * 0.18 || v < -0.45) go(cur + 1);
    else if (dx > w * 0.18 || v > 0.45) go(cur - 1);
    setDrag(0);
  };

  /* ───── wheel / trackpad ───── */
  const wheel = useRef({ acc: 0, lock: 0 });
  const onWheel = (e: RWheelEvent) => {
    if (folder) return;
    const now = performance.now();
    const w = wheel.current;
    if (now < w.lock) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    w.acc += d;
    if (Math.abs(w.acc) > 60) {
      go(cur + (w.acc > 0 ? 1 : -1));
      w.acc = 0;
      w.lock = now + 520;
    }
  };

  const openFolder = folder ? arranged.find((x): x is Extract<Entry, { kind: 'folder' }> => x.kind === 'folder' && x.folder.id === folder) : undefined;

  const dnd = (key: string) =>
    editing && !query
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            setDragKey(key);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', key);
          },
          onDragOver: (e: DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            const from = e.dataTransfer.getData('text/plain') || dragKey;
            if (from) moveBefore(from, key);
            setDragKey(null);
          },
          onDragEnd: () => setDragKey(null),
        }
      : {};

  const tile = (en: Entry, idx: number, tabbable: boolean, inFolder = false) => {
    const style = { ['--d' as string]: `${Math.min(idx, 40) * 14}ms` } as CSSProperties;
    if (en.kind === 'folder')
      return (
        <button
          key={`f-${en.folder.id}`}
          type="button"
          className={`lp5-tile lp5-folder-tile ${editing ? 'jiggle' : ''} ${dragKey === `folder:${en.folder.id}` ? 'dragging' : ''}`}
          style={style}
          {...dnd(`folder:${en.folder.id}`)}
          tabIndex={tabbable ? 0 : -1}
          aria-label={`${en.folder.label} folder, ${en.items.length} items`}
          onClick={() => setFolder(en.folder.id)}
        >
          <span className="lp5-icon lp5-mini" aria-hidden="true">
            {en.items.slice(0, 9).map((i) => (
              <span key={i.id}>
                <AppIcon name={i.icon} />
              </span>
            ))}
          </span>
          <span className="lp5-label">{en.folder.label}</span>
        </button>
      );
    const i = en.item;
    const badge = badges[i.id] ?? 0;
    return (
      <button
        key={i.id}
        type="button"
        className={`lp5-tile ${editing ? 'jiggle' : ''} ${dragKey === i.id ? 'dragging' : ''}`}
        style={style}
        tabIndex={tabbable ? 0 : -1}
        aria-label={`${i.label}${'url' in i.action ? ' (opens in a new tab)' : ''}${badge ? `, ${badge} pending` : ''}${editing ? ' — editing' : ''}`}
        onClick={() => !editing && run(i)}
        {...(inFolder ? {} : dnd(i.id))}
      >
        {editing && !PROTECTED_APPS.has(i.id) && (
          <span
            role="button"
            tabIndex={tabbable ? 0 : -1}
            className="lp5-del"
            aria-label={`Delete ${i.label}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setConfirm(i);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setConfirm(i);
              }
            }}
          >
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="m3 3 4 4m0-4-4 4" />
            </svg>
          </span>
        )}
        <span className="lp5-icon" aria-hidden="true">
          <AppIcon name={i.icon} />
          {badge > 0 && <span className="lp5-badge">{badge > 99 ? '99+' : badge}</span>}
          {'url' in i.action && <span className="lp5-ext">↗</span>}
        </span>
        <span className="lp5-label">{i.label}</span>
      </button>
    );
  };

  const vars = {
    ['--lp-cols' as string]: grid.cols,
    ['--lp-rows' as string]: grid.rows,
    ['--lp-icon' as string]: `${grid.icon}px`,
    ['--lp-grid-w' as string]: `${grid.gridW}px`,
  } as CSSProperties;

  return (
    <div
      className={`launchpad lp5 ${open ? 'open' : ''} ${folder ? 'has-folder' : ''}`}
      aria-hidden={!open}
      role="dialog"
      aria-modal={open || undefined}
      aria-label="Launchpad"
      style={vars}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest('.lp5-tile, .lp5-search, .lp5-dots, .lp5-folder, .lp5-edit, .cf-scrim')) return;
        if (editing) setEditing(false);
        else close();
      }}
    >
      <div className="lp5-search">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="m10.5 10.5 3.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Applications"
          aria-label="Search applications"
          spellCheck={false}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const first = query ? results[0] : undefined;
              if (first) run(first);
            }
          }}
          tabIndex={open ? 0 : -1}
        />
        {q && (
          <button type="button" className="lp5-clear" aria-label="Clear search" tabIndex={open ? 0 : -1} onClick={() => (setQ(''), inputRef.current?.focus())}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <button type="button" className={`lp5-edit ${editing ? 'on' : ''}`} tabIndex={open ? 0 : -1} onClick={() => setEditing((x) => !x)} aria-pressed={editing}>
        {editing ? 'Done' : 'Edit'}
      </button>
      {editing && (
        <p className="lp5-edit-hint" role="status">
          Drag icons to rearrange · click <b>×</b> to move an app to the Trash
          {(cz.removedApps.length > 0 || cz.order.length > 0) && (
            <>
              {' · '}
              <button type="button" className="lp5-reset" onClick={cz.restoreDefaults}>
                Restore defaults
              </button>
            </>
          )}
        </p>
      )}
      <div
        ref={viewRef}
        className={`lp5-view ${drag ? 'dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
      >
        <div className="lp5-track" style={{ transform: `translate3d(calc(${-cur * 100}% + ${drag}px), 0, 0)` }}>
          {pages.map((pg, pi) => (
            <div key={pi} className={`lp5-page ${pi === cur ? 'current' : ''}`} aria-hidden={pi !== cur} role="group" aria-label={`Page ${pi + 1} of ${pageCount}`}>
              <div className="lp5-grid">{pg.map((en, i) => tile(en, i, open && pi === cur && !folder))}</div>
            </div>
          ))}
        </div>
        {query && !results.length && <p className="lp5-empty">No applications match “{q.trim()}”.</p>}
      </div>

      <div className="lp5-dots" role="tablist" aria-label="Launchpad pages" style={{ visibility: pageCount > 1 ? 'visible' : 'hidden' }}>
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === cur}
            aria-label={`Page ${i + 1}`}
            className={i === cur ? 'on' : ''}
            tabIndex={open && pageCount > 1 ? 0 : -1}
            onClick={() => go(i)}
          >
            <span />
          </button>
        ))}
      </div>

      {openFolder && (
        <div
          className="lp5-folder-scrim"
          onClick={(e) => {
            e.stopPropagation();
            if (!(e.target as HTMLElement).closest('.lp5-folder')) setFolder(null);
          }}
        >
          <div className="lp5-folder" role="dialog" aria-label={`${openFolder.folder.label} folder`}>
            <h2>{openFolder.folder.label}</h2>
            <div className="lp5-folder-grid">{openFolder.items.map((i, idx) => tile({ kind: 'app', item: i }, idx, true, true))}</div>
          </div>
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          icon={confirm.icon}
          message={`Are you sure you want to delete the application “${confirm.label}”?`}
          detail="It will be moved to the Trash — you can put it back from there."
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            cz.removeApp(confirm.id, confirm.label, confirm.icon);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}
