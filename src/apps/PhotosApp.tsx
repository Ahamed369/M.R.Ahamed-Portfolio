import { rightClick } from '../system/input';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as RMouseEvent, type ReactNode } from 'react';
import { photos, videos, type Photo, type Video } from '../data/media';
import { addFiles, useFileUrls, useMyFiles } from '../system/myFiles';
import { currentDevice, setDeviceWall } from '../system/wallpaperCycle';
import { personal } from '../data/portfolio';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';
import { readStore, writeStore } from '../system/storage';
import { notify } from '../system/notify';
import { wallFromUrl, wallNotice } from '../system/customWallpaper';
import { DragBar, Lights } from '../components/Window';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { AppProps } from '../components/Desktop';
import { SysIcon } from '../components/SysIcons';

type View = 'library' | 'collections' | 'favorites' | 'recent' | 'map' | 'videos' | 'screenshots' | 'people' | 'deleted' | 'hidden' | 'duplicates' | 'live' | 'Portraits' | 'Screenshots' | 'Wallpapers' | 'Imports';
type Filter = 'all' | 'favorites' | 'Portraits' | 'Screenshots';

const FAV_KEY = 'mra-photos-favorites';
const DEL_KEY = 'mra-photos-deleted';
const ROT_KEY = 'mra-photos-rotation';
/* v10 */
const HID_KEY = 'mra-photos-hidden';
const DAT_KEY = 'mra-photos-deleted-at';
const EDIT_KEY = 'mra-photos-edits';

/** v10 — photo edits (non-destructive: Revert brings back the original) */
export interface PhotoEdit {
  light: number;
  contrast: number;
  sat: number;
  warmth: number;
  vignette: number;
  bw: boolean;
}
const NO_EDIT: PhotoEdit = { light: 0, contrast: 0, sat: 0, warmth: 0, vignette: 0, bw: false };
export const editFilter = (e?: PhotoEdit) =>
  e ? `brightness(${1 + e.light / 100}) contrast(${1 + e.contrast / 100}) saturate(${e.bw ? 0 : 1 + e.sat / 100}) sepia(${Math.max(0, e.warmth) / 160}) hue-rotate(${Math.min(0, e.warmth) / 4}deg)` : undefined;
/** Portraits are shown as Live Photos (press and hold to play the motion effect) */
const isLive = (p: Photo) => p.album === 'Portraits';
/** hidden albums unlock once per visit (a simple lock — no biometrics) */
let unlockedThisVisit = false;

/* ─────────── sidebar glyphs (simple line icons) ─────────── */
const IC: Record<string, ReactNode> = {
  library: (
    <>
      <rect x="3" y="5" width="14" height="12" rx="2" />
      <path d="M7 3h10a4 4 0 0 1 4 4v8" />
      <path d="M5 15l4-4 3 3 2-2 3 3" />
    </>
  ),
  collections: (
    <>
      <rect x="3.5" y="4" width="17" height="7" rx="2" />
      <rect x="3.5" y="13" width="17" height="7" rx="2" />
    </>
  ),
  favorites: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  recent: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  map: <path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2zM9 4.5v13M15 6.5v13" />,
  videos: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="M16 10.5l5-3v9l-5-3z" />
    </>
  ),
  screenshots: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
    </>
  ),
  people: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18.2c1.2-2.2 3.2-3.2 5.5-3.2s4.3 1 5.5 3.2" />
    </>
  ),
  deleted: <path d="M5 7h14M10 7V5h4v2M6.5 7l1 12.5h9L17.5 7M10.2 10.5v6M13.8 10.5v6" />,
  hidden: (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <path d="M4 20L20 4" />
    </>
  ),
  duplicates: (
    <>
      <rect x="3.5" y="7" width="12" height="12" rx="2" />
      <path d="M8 4.5h10.5a2 2 0 0 1 2 2V17" />
    </>
  ),
  live: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="9" strokeDasharray="1.5 2.2" />
    </>
  ),
  album: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-4.5 4 3.5 3-2.5 4.5 3.5" />
    </>
  ),
};
const Ico = ({ n }: { n: string }) => (
  <svg className="px-ico" viewBox="0 0 24 24" aria-hidden="true">
    {IC[n]}
  </svg>
);
const TB: Record<string, ReactNode> = {
  minus: <path d="M6 12h12" />,
  plus: <path d="M6 12h12M12 6v12" />,
  filter: <path d="M4 7h16M7 12h10M10 17h4" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1.3" className="f" />
      <circle cx="12" cy="12" r="1.3" className="f" />
      <circle cx="18" cy="12" r="1.3" className="f" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="1.1" className="f" />
    </>
  ),
  share: <path d="M12 3.5v11M8 7.5l4-4 4 4M7 11H5.5v9.5h13V11H17" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  rotate: <path d="M5 12a7 7 0 1 0 2.2-5.1M5 4v4h4" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  sidebar: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  lock: (
    <>
      <rect x="6" y="11" width="12" height="9" rx="2" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" />
    </>
  ),
  chev: <path d="M9 6l6 6-6 6" />,
};
const Tb = ({ n }: { n: string }) => (
  <svg className="px-tbi" viewBox="0 0 24 24" aria-hidden="true">
    {TB[n]}
  </svg>
);

const TITLES: Record<View, string> = {
  library: 'Library',
  collections: 'Collections',
  favorites: 'Favorites',
  recent: 'Recently Saved',
  map: 'Map',
  videos: 'Videos',
  screenshots: 'Screenshots',
  people: 'People & Pets',
  deleted: 'Recently Deleted',
  hidden: 'Hidden',
  duplicates: 'Duplicates',
  live: 'Live Photos',
  Portraits: 'Portraits',
  Screenshots: 'Portfolio Screenshots',
  Wallpapers: 'Wallpapers',
  Imports: 'Imports',
};

export default function PhotosApp({ win }: AppProps) {
  const sys = useSystem();
  const { motionReduced, update } = useSettings();
  applyWall = (src, tone) => {
    update({ customWallpaper: src, customTone: tone });
    setDeviceWall('custom', currentDevice(), 'home');
  };
  const rootRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>((win.args?.album as View) || 'library');
  const [sel, setSel] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ id: string; origin: DOMRect | null; slideshow: boolean; edit?: boolean } | null>(null);
  const [cols, setCols] = useState(5);
  const [filter, setFilter] = useState<Filter>('all');
  const [newestFirst, setNewestFirst] = useState(false);
  const [favs, setFavs] = useState<string[]>(() => readStore(FAV_KEY, { ids: ['p05', 'p08'] }).ids);
  const [deleted, setDeleted] = useState<string[]>(() => readStore(DEL_KEY, { ids: [] as string[] }).ids);
  const [rot, setRot] = useState<Record<string, number>>(() => readStore(ROT_KEY, { r: {} as Record<string, number> }).r);
  const [dims, setDims] = useState<Record<string, string>>({});
  const [info, setInfo] = useState(false);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [closed, setClosed] = useState<Record<string, boolean>>({ Sharing: true, 'Media Types': true, Utilities: true, Projects: true });

  /* v10 — Hidden album, deletion dates, edits, multi-select, album lock */
  const [hidden, setHidden] = useState<string[]>(() => readStore(HID_KEY, { ids: [] as string[] }).ids);
  const [delAt, setDelAt] = useState<Record<string, number>>(() => readStore(DAT_KEY, { m: {} as Record<string, number> }).m);
  const [edits, setEdits] = useState<Record<string, PhotoEdit>>(() => readStore(EDIT_KEY, { m: {} as Record<string, PhotoEdit> }).m);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState(unlockedThisVisit);
  const [scanning, setScanning] = useState(false);
  const [askDel, setAskDel] = useState<string[] | null>(null);
  const { settings: pset } = useSettings();
  useEffect(() => writeStore(HID_KEY, { ids: hidden }), [hidden]);
  useEffect(() => writeStore(DAT_KEY, { m: delAt }), [delAt]);
  useEffect(() => writeStore(EDIT_KEY, { m: edits }), [edits]);
  const faceId = () => {
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      unlockedThisVisit = true;
      setUnlocked(true);
    }, 1100);
  };

  useEffect(() => writeStore(FAV_KEY, { ids: favs }), [favs]);
  useEffect(() => writeStore(DEL_KEY, { ids: deleted }), [deleted]);
  useEffect(() => writeStore(ROT_KEY, { r: rot }), [rot]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const n = el.clientWidth < 560;
      setNarrow((was) => {
        if (n !== was) setSideOpen(!n);
        return n;
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (win.args?.album) setView(win.args.album as View);
    if (win.args?.photo) {
      setView('library');
      setViewer({ id: win.args.photo, origin: null, slideshow: false });
    }
  }, [win.launchKey, win.args?.album, win.args?.photo]);

  /* v10.1 — your own photos, dragged in or imported (kept in this browser) */
  const myFiles = useMyFiles();
  const myImgs = useMemo(() => myFiles.filter((f) => f.type.startsWith('image/')), [myFiles]);
  const myUrls = useFileUrls(myImgs.map((f) => f.id));
  const allPhotos = useMemo<Photo[]>(() => [...photos, ...myImgs.filter((f) => myUrls[f.id]).map((f) => ({ id: f.id, src: myUrls[f.id], title: f.name.replace(/\.[a-z0-9]+$/i, ''), album: 'Imports' as const, ratio: 1 }))], [myImgs, myUrls]);
  const importRef = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const live = useMemo(() => allPhotos.filter((p) => !deleted.includes(p.id) && !hidden.includes(p.id)), [allPhotos, deleted, hidden]);
  const portraits = live.filter((p) => p.album === 'Portraits');
  const shots = live.filter((p) => p.album === 'Screenshots');

  const list = useMemo<Photo[]>(() => {
    let l: Photo[];
    switch (view) {
      case 'favorites':
        l = live.filter((p) => favs.includes(p.id));
        break;
      case 'recent':
        l = [...live].reverse();
        break;
      case 'Portraits':
      case 'people':
        l = live.filter((p) => p.album === 'Portraits');
        break;
      case 'Screenshots':
      case 'screenshots':
        l = live.filter((p) => p.album === 'Screenshots');
        break;
      case 'Wallpapers':
        l = live.filter((p) => p.album === 'Wallpapers');
        break;
      case 'Imports':
        l = live.filter((p) => p.album === 'Imports');
        break;
      case 'deleted':
        l = allPhotos.filter((p) => deleted.includes(p.id));
        break;
      case 'hidden':
        l = allPhotos.filter((p) => hidden.includes(p.id) && !deleted.includes(p.id));
        break;
      case 'live':
        l = live.filter(isLive);
        break;
      case 'duplicates': {
        const seen = new Map<string, number>();
        live.forEach((p) => seen.set(p.src, (seen.get(p.src) ?? 0) + 1));
        l = live.filter((p) => (seen.get(p.src) ?? 0) > 1);
        break;
      }
      case 'library':
        l = live.filter((p) => (filter === 'all' ? true : filter === 'favorites' ? favs.includes(p.id) : p.album === filter));
        break;
      default:
        l = [];
    }
    if (newestFirst && view !== 'recent') l = [...l].reverse();
    const s = q.trim().toLowerCase();
    return s ? l.filter((p) => `${p.title} ${p.album}`.toLowerCase().includes(s)) : l;
  }, [view, favs, live, allPhotos, deleted, hidden, filter, newestFirst, q]);
  const locked = (view === 'deleted' || view === 'hidden') && !unlocked;

  const isGrid = !['collections', 'map', 'videos', 'people'].includes(view);
  const selPhoto = allPhotos.find((p) => p.id === sel) ?? null;

  const go = (v: View) => {
    setView(v);
    setSel(null);
    if (narrow) setSideOpen(false);
  };
  const toggleFav = (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const delNow = (ids: string[]) => {
    setDeleted((d) => [...d, ...ids.filter((id) => !d.includes(id))]);
    setDelAt((m) => ({ ...m, ...Object.fromEntries(ids.map((id) => [id, Date.now()])) }));
    setSel(null);
    notify({ app: 'Photos', icon: 'photos', title: ids.length === 1 ? 'Moved to Recently Deleted' : `${ids.length} photos moved to Recently Deleted`, body: ids.length === 1 ? allPhotos.find((p) => p.id === ids[0])?.title : 'Recover them any time.' });
  };
  // v10 — every delete asks first (Settings → Trash & Undo → Ask before deleting)
  const del = (id: string | string[]) => {
    const ids = Array.isArray(id) ? id : [id];
    if (pset.askBeforeDelete !== false) setAskDel(ids);
    else delNow(ids);
  };
  const restore = (id: string) => setDeleted((d) => d.filter((x) => x !== id));
  const toggleHide = (ids: string[]) => {
    const allHidden = ids.every((id) => hidden.includes(id));
    setHidden((h) => (allHidden ? h.filter((x) => !ids.includes(x)) : [...h, ...ids.filter((x) => !h.includes(x))]));
    setSel(null);
    notify({ app: 'Photos', icon: 'photos', title: allHidden ? 'Unhidden' : `Hidden ${ids.length === 1 ? 'photo' : `${ids.length} photos`}`, body: allHidden ? 'Back in your library.' : 'Find it in Utilities → Hidden.' });
  };
  const daysLeftOf = (id: string) => Math.max(0, 30 - Math.floor((Date.now() - (delAt[id] ?? Date.now())) / 86400000));
  const pick = (id: string) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const endPick = () => {
    setPicking(false);
    setPicked([]);
  };
  const rotate = (id: string) => setRot((r) => ({ ...r, [id]: ((r[id] ?? 0) + 270) % 360 }));
  const open = (id: string, el?: HTMLElement | null, slideshow = false) => {
    if (view === 'deleted') return;
    setViewer({ id, origin: el?.getBoundingClientRect() ?? null, slideshow });
  };
  const share = async (p: Photo) => {
    const url = new URL(p.src, location.href).href;
    try {
      await navigator.clipboard.writeText(url);
      notify({ app: 'Photos', icon: 'photos', title: 'Image link copied', body: p.title });
    } catch {
      notify({ app: 'Photos', icon: 'photos', title: 'Couldn’t copy the link', body: url });
    }
  };

  const quickLook = (p: Photo, el?: HTMLElement | null) => {
    const i = list.findIndex((x) => x.id === p.id);
    sys.setQuickLook({ kind: 'images', index: Math.max(0, i), items: list.map((x) => ({ src: x.src, title: x.title, caption: x.album })), origin: el?.getBoundingClientRect() ?? null });
    notify({ app: 'Photos', icon: 'photos', title: 'Photo opened in Quick Look', body: p.title });
  };
  const el = (id: string) => document.querySelector<HTMLElement>(`[data-photo="${id}"]`);

  const onGridKey = (e: KeyboardEvent) => {
    if (!list.length) return;
    const i = sel ? list.findIndex((p) => p.id === sel) : -1;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    if (e.key in moves) {
      e.preventDefault();
      const n = list[Math.max(0, Math.min(list.length - 1, i < 0 ? 0 : i + moves[e.key]))];
      setSel(n.id);
      el(n.id)?.focus();
      return;
    }
    if (!sel || i < 0) return;
    if (e.key === ' ') {
      e.preventDefault();
      quickLook(list[i], el(sel));
    } else if (e.key === 'Enter') open(sel, el(sel));
    else if (e.key === 'Backspace' || e.key === 'Delete') {
      if (view === 'deleted') restore(sel);
      else del(sel);
    }
  };

  const menuAt = (e: RMouseEvent<HTMLElement>, items: { label: string; action?: () => void; sep?: boolean; disabled?: boolean }[]) => {
    const r = e.currentTarget.getBoundingClientRect();
    sys.setContextMenu({ x: r.left, y: r.bottom + 6, items });
  };

  const photoMenu = (e: RMouseEvent<HTMLElement>, p: Photo) => {
    e.preventDefault();
    setSel(p.id);
    const node = e.currentTarget;
    if (view === 'deleted') {
      sys.setContextMenu({ x: e.clientX, y: e.clientY, items: [{ label: 'Recover', action: () => restore(p.id) }] });
      return;
    }
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Open', action: () => open(p.id, node) },
        { label: 'Quick Look', action: () => quickLook(p, node) },
        { label: favs.includes(p.id) ? 'Unfavorite' : 'Favorite', action: () => toggleFav(p.id) },
        { label: 'Rotate Counterclockwise', action: () => rotate(p.id) },
        { label: 'Copy Link', action: () => void share(p) },
        { label: 'Use as Wallpaper', action: () => void useAsWallpaper(p) },
        { label: hidden.includes(p.id) ? 'Unhide' : 'Hide', action: () => toggleHide([p.id]) },
        { label: edits[p.id] ? 'Revert to Original' : 'Edit…', action: () => (edits[p.id] ? setEdits((m) => { const n = { ...m }; delete n[p.id]; return n; }) : setViewer({ id: p.id, origin: node.getBoundingClientRect(), slideshow: false, edit: true })) },
        { label: '', sep: true },
        {
          label: 'Get Info',
          action: () =>
            sys.setQuickLook({
              kind: 'info',
              title: p.title,
              icon: 'photos',
              rows: [
                ['Album', p.album],
                ['Dimensions', dims[p.id] ?? '—'],
                ['Subject', p.album === 'Portraits' ? personal.name : 'Portfolio'],
              ],
              origin: node.getBoundingClientRect(),
            }),
        },
        { label: '', sep: true },
        { label: 'Delete', action: () => del(p.id) },
      ],
    });
  };

  const navBtn = (v: View, icon: string, extra?: ReactNode) => (
    <button key={v} type="button" className={`px-nav ${view === v ? 'on' : ''}`} aria-current={view === v ? 'page' : undefined} onClick={() => go(v)}>
      <Ico n={icon} />
      <span>{TITLES[v]}</span>
      {extra}
    </button>
  );
  const group = (name: string, children?: ReactNode) => (
    <div className="px-grp" key={name}>
      <button type="button" className="px-grp-h" aria-expanded={!closed[name]} onClick={() => setClosed((c) => ({ ...c, [name]: !c[name] }))}>
        {name}
        <span className={`px-grp-chev ${closed[name] ? '' : 'open'}`} aria-hidden="true">
          <Tb n="chev" />
        </span>
      </button>
      {!closed[name] && <div className="px-grp-body">{children ?? <p className="px-grp-empty">No items</p>}</div>}
    </div>
  );

  const title = TITLES[view];
  const sub = view === 'library' || isGrid ? `${personal.name} · ${list.length} item${list.length === 1 ? '' : 's'}` : view === 'collections' ? 'Memories, people and albums' : '';

  return (
    <div
      ref={rootRef}
      className={`px ${narrow ? 'narrow' : ''} ${sideOpen ? 'side-open' : 'side-closed'} ${info && isGrid ? 'info-open' : ''} ${dropping ? 'px-dropping' : ''}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDropping(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDropping(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDropping(false);
        void addFiles(e.dataTransfer.files, 'image').then((a) => a.length && setView('Imports'));
      }}
    >
      <input ref={importRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void addFiles(e.target.files, 'image').then((a) => ((e.target.value = ''), a.length && setView('Imports')))} />
      {dropping && <div className="px-drop-hint">Drop photos to import</div>}
      <aside className="px-side" aria-label="Photos sidebar">
        <DragBar className="px-side-top">
          <Lights />
          <span className="px-flex" />
          <button type="button" className="px-iconbtn" aria-label="Hide sidebar" onClick={() => setSideOpen(false)}>
            <Tb n="sidebar" />
          </button>
        </DragBar>
        <nav className="px-side-list scroll-smooth">
          {navBtn('library', 'library')}
          {navBtn('collections', 'collections')}
          <div className="px-sec">Pinned</div>
          {navBtn('favorites', 'favorites', <span className="px-count">{favs.filter((f) => !deleted.includes(f)).length}</span>)}
          {navBtn('recent', 'recent')}
          {navBtn('map', 'map')}
          {navBtn('videos', 'videos', <span className="px-count">{videos.length}</span>)}
          {navBtn('screenshots', 'screenshots')}
          {navBtn('people', 'people')}
          {navBtn(
            'deleted',
            'deleted',
            <span className="px-lock" aria-label="Locked">
              <Tb n="lock" />
            </span>,
          )}
          {group('Albums', [navBtn('Portraits', 'album', <span className="px-count">{portraits.length}</span>), navBtn('Screenshots', 'album', <span className="px-count">{shots.length}</span>), navBtn('Wallpapers', 'album', <span className="px-count">{live.filter((p) => p.album === 'Wallpapers').length}</span>), navBtn('Imports', 'album', <span className="px-count">{live.filter((p) => p.album === 'Imports').length}</span>)])}
          {group('Sharing')}
          {group('Media Types', [navBtn('videos', 'videos'), navBtn('live', 'live', <span className="px-count">{live.filter(isLive).length}</span>), navBtn('screenshots', 'screenshots')])}
          {group('Utilities', [
            navBtn(
              'hidden',
              'hidden',
              <span className="px-lock" aria-label="Locked">
                <Tb n="lock" />
              </span>,
            ),
            navBtn('deleted', 'deleted'),
            navBtn('duplicates', 'duplicates'),
          ])}
          {group('Projects')}
        </nav>
      </aside>
      {narrow && sideOpen && <button type="button" className="px-scrim" aria-label="Close sidebar" onClick={() => setSideOpen(false)} />}

      <section className="px-main">
        <DragBar className="px-bar">
          {(!sideOpen || narrow) && (
            <span className="px-bar-lead">
              {narrow && !sideOpen && <Lights />}
              <button type="button" className="px-pill px-iconbtn" aria-label="Show sidebar" onClick={() => setSideOpen(true)}>
                <Tb n="sidebar" />
              </button>
            </span>
          )}
          <div className="px-titlebox">
            <b>{title}</b>
            {sub && <span>{sub}</span>}
          </div>
          <span className="px-flex" />
          {isGrid && (
            <div className="px-pill px-group">
              <button type="button" aria-label="Zoom out (more columns)" disabled={cols >= 8} onClick={() => setCols((c) => Math.min(8, c + 1))}>
                <Tb n="minus" />
              </button>
              <button type="button" aria-label="Zoom in (fewer columns)" disabled={cols <= 3} onClick={() => setCols((c) => Math.max(3, c - 1))}>
                <Tb n="plus" />
              </button>
            </div>
          )}
          {view === 'library' && (
            <span className="px-pill px-popwrap">
              <select value={filter} aria-label="Show" onChange={(e) => setFilter(e.target.value as Filter)}>
                <option value="all">All Photos</option>
                <option value="favorites">Favorites</option>
                <option value="Portraits">Portraits</option>
                <option value="Screenshots">Screenshots</option>
              </select>
              <svg viewBox="0 0 10 14" aria-hidden="true">
                <path d="M2 5l3-3 3 3M2 9l3 3 3-3" />
              </svg>
            </span>
          )}
          <div className="px-pill px-group px-hide-xs">
            {isGrid && (
              <button
                type="button"
                aria-label="Sort"
                className={newestFirst ? 'on' : ''}
                onClick={(e) =>
                  menuAt(e, [
                    { label: `${newestFirst ? '' : '✓ '}Oldest First`, action: () => setNewestFirst(false) },
                    { label: `${newestFirst ? '✓ ' : ''}Newest First`, action: () => setNewestFirst(true) },
                  ])
                }
              >
                <Tb n="filter" />
              </button>
            )}
            <button
              type="button"
              aria-label="More"
              onClick={(e) =>
                menuAt(e, [
                  { label: 'Slideshow', disabled: !isGrid || !list.length || view === 'deleted', action: () => list[0] && setViewer({ id: list[0].id, origin: null, slideshow: true }) },
                  { label: sideOpen ? 'Hide Sidebar' : 'Show Sidebar', action: () => setSideOpen((s) => !s) },
                  { label: info ? 'Hide Info' : 'Show Info', action: () => setInfo((i) => !i) },
                ])
              }
            >
              <Tb n="more" />
            </button>
          </div>
          {isGrid && (
            <div className="px-pill px-group">
              <button type="button" aria-label="Info" aria-pressed={info} className={info ? 'on' : ''} onClick={() => setInfo((i) => !i)}>
                <Tb n="info" />
              </button>
              <button type="button" className="px-hide-xs" aria-label="Copy image link" disabled={!selPhoto} onClick={() => selPhoto && void share(selPhoto)}>
                <Tb n="share" />
              </button>
              <button type="button" aria-label={selPhoto && favs.includes(selPhoto.id) ? 'Unfavorite' : 'Favorite'} aria-pressed={!!selPhoto && favs.includes(selPhoto.id)} className={selPhoto && favs.includes(selPhoto.id) ? 'fav' : ''} disabled={!selPhoto} onClick={() => selPhoto && toggleFav(selPhoto.id)}>
                <Tb n="heart" />
              </button>
              <button type="button" className="px-hide-xs" aria-label="Rotate" disabled={!selPhoto} onClick={() => selPhoto && rotate(selPhoto.id)}>
                <Tb n="rotate" />
              </button>
            </div>
          )}
          {isGrid && (view === 'Imports' || view === 'library') && (
            <button type="button" className="px-pill px-import" onClick={() => importRef.current?.click()} aria-label="Import photos" title="Import photos from your device">
              ＋
            </button>
          )}
          {isGrid && !locked && list.length > 0 && (
            <button type="button" className={`px-pill px-select ${picking ? 'on' : ''}`} onClick={() => (picking ? endPick() : setPicking(true))}>
              {picking ? 'Cancel' : 'Select'}
            </button>
          )}
          <div className={`px-pill px-search ${searching || q ? 'open' : ''}`}>
            <button type="button" aria-label="Search" onClick={() => setSearching((s) => !s)}>
              <Tb n="search" />
            </button>
            {(searching || q) && <input autoFocus value={q} placeholder="Search" aria-label="Search photos by title" onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setSearching(false)} onKeyDown={(e) => e.key === 'Escape' && (setQ(''), setSearching(false))} />}
          </div>
        </DragBar>

        <div className="px-scroll scroll-smooth">
          {view === 'collections' ? (
            <div className="px-collections">
              <h3>Memories</h3>
              <div className="px-mem-row">
                <MemoryCard title="Portraits" subtitle={`${personal.name} · ${portraits.length} photos`} items={portraits} onPlay={() => portraits[0] && setViewer({ id: portraits[0].id, origin: null, slideshow: true })} />
                <MemoryCard title="Building the portfolio" subtitle="Screenshots of this desktop" items={shots} onPlay={() => shots[0] && setViewer({ id: shots[0].id, origin: null, slideshow: true })} />
              </div>
              <h3>People & Pets</h3>
              <div className="px-people-row">
                <PersonTile count={portraits.length} onClick={() => go('Portraits')} />
              </div>
              <h3>Albums</h3>
              <div className="px-albums">
                {(['Portraits', 'Screenshots'] as const).map((a) => {
                  const items = a === 'Portraits' ? portraits : shots;
                  return (
                    <button key={a} type="button" className="px-album" onClick={() => go(a)}>
                      <span className="px-album-cover">{items[0] ? <img src={items[0].src} alt="" loading="lazy" /> : null}</span>
                      <b>{TITLES[a]}</b>
                      <span>{items.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : view === 'people' ? (
            <div className="px-collections">
              <div className="px-people-row">
                <PersonTile count={portraits.length} onClick={() => go('Portraits')} />
              </div>
            </div>
          ) : view === 'map' ? (
            <div className="px-map">
              <iframe title="Map of Kandy, Sri Lanka" src="https://maps.google.com/maps?q=Kandy%2C%20Sri%20Lanka&z=12&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              <div className="px-map-card">
                <b>Kandy, Sri Lanka</b>
                <span>{personal.name} is based here. These photos carry no location data, so no pins are shown.</span>
              </div>
            </div>
          ) : view === 'videos' ? (
            <VideoGrid />
          ) : (
            <>
              {locked ? (
                <div className={`px-locked ${scanning ? 'scan' : ''}`}>
                  <span className="px-faceid" aria-hidden="true">
                    <SysIcon n="lock" size={44} />
                  </span>
                  <b>{TITLES[view]} is Locked</b>
                  <span>{scanning ? 'Unlocking…' : 'This album stays hidden until you choose to view it (for this visit). No passcode or biometrics are used.'}</span>
                  <button type="button" className="px-btn" disabled={scanning} onClick={faceId}>
                    View Album
                  </button>
                </div>
              ) : (
                <>
              {view === 'deleted' && (
                <div className="px-deleted-bar">
                  <span>Photos stay here for 30 days and can be recovered. Nothing is removed from the portfolio itself.</span>
                  <button type="button" className="px-btn" disabled={!deleted.length} onClick={() => setDeleted([])}>
                    Recover All
                  </button>
                </div>
              )}
              {view === 'hidden' && list.length > 0 && (
                <div className="px-deleted-bar">
                  <span>Hidden photos don’t appear in your library, albums or widgets.</span>
                  <button type="button" className="px-btn" onClick={() => setHidden([])}>
                    Unhide All
                  </button>
                </div>
              )}
              {list.length === 0 ? (
                <Empty
                  icon={view === 'favorites' ? 'favorites' : view === 'deleted' ? 'deleted' : view === 'hidden' ? 'hidden' : view === 'duplicates' ? 'duplicates' : 'library'}
                  title={q ? 'No Results' : view === 'favorites' ? 'No Favorites' : view === 'deleted' ? 'No Recently Deleted Items' : view === 'hidden' ? 'No Hidden Photos' : view === 'duplicates' ? 'No Duplicates Found' : view === 'Imports' ? 'No Imported Photos' : 'No Photos'}
                  text={q ? `Nothing matches “${q}”.` : view === 'favorites' ? 'Select a photo and tap ♥︎ to add it here.' : view === 'duplicates' ? 'Every photo in the library is unique.' : view === 'hidden' ? `${rightClick()} a photo and choose Hide.` : view === 'Imports' ? 'Drag photos here from your computer or tap ＋. They stay in this browser only.' : ''}
                />
              ) : (
                <div className="px-grid" style={{ ['--cols' as string]: cols }} role="grid" aria-label={title} onKeyDown={onGridKey}>
                  {list.map((p, i) => (
                    <div key={p.id} className="px-cell" role="gridcell" style={{ ['--i' as string]: i }}>
                      <button
                        type="button"
                        data-photo={p.id}
                        className={`px-thumb ${sel === p.id ? 'sel' : ''} ${picked.includes(p.id) ? 'picked' : ''}`}
                        aria-label={`${p.title}${favs.includes(p.id) ? ', favourite' : ''}`}
                        aria-pressed={picking ? picked.includes(p.id) : undefined}
                        onClick={() => (picking ? pick(p.id) : setSel(p.id))}
                        onFocus={() => !picking && setSel(p.id)}
                        onPointerUp={(e) => {
                          if (e.pointerType === 'touch' && !picking) open(p.id, e.currentTarget);
                        }}
                        onDoubleClick={(e) => !picking && open(p.id, e.currentTarget)}
                        onContextMenu={(e) => photoMenu(e, p)}
                      >
                        <img
                          src={p.src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          style={{ transform: rot[p.id] ? `rotate(${rot[p.id]}deg)` : undefined, filter: editFilter(edits[p.id]) }}
                          onLoad={(e) => {
                            const im = e.currentTarget;
                            setDims((d) => (d[p.id] ? d : { ...d, [p.id]: `${im.naturalWidth} × ${im.naturalHeight}` }));
                          }}
                        />
                        {favs.includes(p.id) && (
                          <span className="px-heart" aria-hidden="true">
                            <Tb n="heart" />
                          </span>
                        )}
                        {isLive(p) && <span className="px-live">◎ LIVE</span>}
                        {edits[p.id] && <span className="px-edited">Edited</span>}
                        {view === 'deleted' && <span className="px-days">{daysLeftOf(p.id)} days</span>}
                        {picking && <span className={`px-check ${picked.includes(p.id) ? 'on' : ''}`}>{picked.includes(p.id) ? '✓' : ''}</span>}
                      </button>
                      {view === 'deleted' && (
                        <button type="button" className="px-recover" onClick={() => restore(p.id)}>
                          Recover
                        </button>
                      )}
                      {view === 'hidden' && (
                        <button type="button" className="px-recover" onClick={() => toggleHide([p.id])}>
                          Unhide
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
                </>
              )}
            </>
          )}
        </div>

        {info && isGrid && (
          <aside className="px-info" aria-label="Photo info">
            <div className="px-info-h">
              <b>Info</b>
              <button type="button" className="px-iconbtn" aria-label="Close info" onClick={() => setInfo(false)}>
                ×
              </button>
            </div>
            {selPhoto ? (
              <>
                <div className="px-info-img">
                  <img src={selPhoto.src} alt="" style={rot[selPhoto.id] ? { transform: `rotate(${rot[selPhoto.id]}deg)` } : undefined} />
                </div>
                <b className="px-info-title">{selPhoto.title}</b>
                <dl>
                  <dt>Album</dt>
                  <dd>{selPhoto.album === 'Screenshots' ? 'Portfolio Screenshots' : selPhoto.album}</dd>
                  <dt>Dimensions</dt>
                  <dd>{dims[selPhoto.id] ?? '—'}</dd>
                  <dt>Subject</dt>
                  <dd>{selPhoto.album === 'Portraits' ? personal.name : 'Portfolio'}</dd>
                  <dt>Favorite</dt>
                  <dd>{favs.includes(selPhoto.id) ? 'Yes' : 'No'}</dd>
                  <dt>Rotation</dt>
                  <dd>{rot[selPhoto.id] ? `${360 - rot[selPhoto.id]}° counterclockwise` : 'None'}</dd>
                </dl>
              </>
            ) : (
              <p className="px-info-empty">Select a photo to see its details.</p>
            )}
          </aside>
        )}
      </section>

      {picking && (
        <div className="px-pickbar" role="toolbar" aria-label="Selected photos">
          <b>{picked.length ? `${picked.length} Selected` : 'Select Items'}</b>
          <button type="button" disabled={!picked.length} onClick={() => (picked.forEach((id) => !favs.includes(id) && toggleFav(id)), endPick())}>
            <SysIcon n="heart" size={14} /> Favorite
          </button>
          {view !== 'deleted' && (
            <button type="button" disabled={!picked.length} onClick={() => (toggleHide(picked), endPick())}>
              {view === 'hidden' ? 'Unhide' : 'Hide'}
            </button>
          )}
          {view === 'deleted' ? (
            <button type="button" disabled={!picked.length} onClick={() => (picked.forEach(restore), endPick())}>
              Recover
            </button>
          ) : (
            <button type="button" className="danger" disabled={!picked.length} onClick={() => del(picked)}>
              Delete
            </button>
          )}
          <button type="button" onClick={() => setPicked(picked.length === list.length ? [] : list.map((p) => p.id))}>
            {picked.length === list.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {askDel && (
        <ConfirmDialog
          icon="photos"
          message={askDel.length === 1 ? `Delete “${allPhotos.find((p) => p.id === askDel[0])?.title ?? 'photo'}”?` : `Delete ${askDel.length} photos?`}
          detail="They move to Recently Deleted for 30 days — you can recover them."
          onCancel={() => setAskDel(null)}
          onConfirm={() => {
            delNow(askDel);
            setAskDel(null);
            endPick();
          }}
        />
      )}

      {viewer && (
        <Viewer
          list={list.some((p) => p.id === viewer.id) ? list : live.some((p) => p.id === viewer.id) ? live : allPhotos}
          id={viewer.id}
          origin={viewer.origin}
          slideshow={viewer.slideshow}
          reduced={motionReduced}
          favs={favs}
          onFav={toggleFav}
          onClose={() => setViewer(null)}
          onChange={(id) => setViewer((v) => (v ? { ...v, id, origin: null } : v))}
          edits={edits}
          startEdit={!!viewer.edit}
          onEdit={(id, e) =>
            setEdits((m) => {
              const n = { ...m };
              if (e) n[id] = e;
              else delete n[id];
              return n;
            })
          }
          onDelete={(id) => del(id)}
        />
      )}
    </div>
  );
}

/** v9 — set any photo as the desktop wallpaper */
let applyWall: ((src: string, tone: 'light' | 'dark') => void) | null = null;
async function useAsWallpaper(p: Photo) {
  try {
    const w = await wallFromUrl(p.src);
    applyWall?.(w.src, w.tone);
    wallNotice(`“${p.title}”`);
  } catch {
    notify({ app: 'Photos', icon: 'photos', title: 'Couldn’t set wallpaper', body: 'This image could not be loaded.' });
  }
}

function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="px-empty">
      <Ico n={icon} />
      <b>{title}</b>
      {text && <span>{text}</span>}
    </div>
  );
}

function PersonTile({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" className="px-person" onClick={onClick}>
      <img src={personal.avatar} alt="" />
      <b>{personal.name}</b>
      <span>{count} photos</span>
    </button>
  );
}

function MemoryCard({ title, subtitle, items, onPlay }: { title: string; subtitle: string; items: Photo[]; onPlay: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % Math.max(1, items.length)), 3200);
    return () => window.clearInterval(t);
  }, [items.length]);
  return (
    <button type="button" className="ph-memory" onClick={onPlay}>
      {items.map((p, k) => (
        <img key={p.id} src={p.src} alt="" className={k === i ? 'on' : ''} loading="lazy" />
      ))}
      <span className="ph-memory-text">
        <b>{title}</b>
        <span>{subtitle}</span>
      </span>
      <span className="ph-memory-play" aria-hidden="true">
        ▶
      </span>
    </button>
  );
}

function Viewer({
  list,
  id,
  origin,
  slideshow,
  reduced,
  favs,
  onFav,
  onClose,
  onChange,
  edits,
  startEdit,
  onEdit,
  onDelete,
}: {
  list: Photo[];
  id: string;
  origin: DOMRect | null;
  slideshow: boolean;
  reduced: boolean;
  favs: string[];
  onFav: (id: string) => void;
  onClose: () => void;
  onChange: (id: string) => void;
  edits: Record<string, PhotoEdit>;
  startEdit: boolean;
  onEdit: (id: string, e: PhotoEdit | null) => void;
  onDelete: (id: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(slideshow);
  const i = Math.max(0, list.findIndex((p) => p.id === id));
  const p = list[i];
  const go = (d: number) => onChange(list[(i + d + list.length) % list.length].id);
  /* v10 — Live Photo (press & hold) and non-destructive editing */
  const [livePlay, setLivePlay] = useState(false);
  const [editing, setEditing] = useState(startEdit);
  const [draft, setDraft] = useState<PhotoEdit>(edits[id] ?? NO_EDIT);
  useEffect(() => setDraft(edits[id] ?? NO_EDIT), [id, edits]);
  const shown = editing ? draft : edits[id];
  const slider = (k: keyof Omit<PhotoEdit, 'bw'>, label: string, min = -100, max = 100) => (
    <label key={k} className="ph-edit-row">
      <span>
        {label} <i>{draft[k]}</i>
      </span>
      <input type="range" min={min} max={max} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
    </label>
  );

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => go(1), 3000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, id]);

  // thumbnail → full view expansion
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (!el || !origin || reduced) return;
    const run = () => {
      const to = el.getBoundingClientRect();
      if (!to.width) return;
      el.animate(
        [
          { transform: `translate(${origin.left + origin.width / 2 - (to.left + to.width / 2)}px, ${origin.top + origin.height / 2 - (to.top + to.height / 2)}px) scale(${origin.width / to.width})`, opacity: 0.5 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' },
      );
    };
    if (el.complete) run();
    else el.addEventListener('load', run, { once: true });
  }, [origin, reduced]);

  return (
    <div
      ref={rootRef}
      className="ph-viewer"
      tabIndex={-1}
      role="dialog"
      aria-label={p.title}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        else if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === ' ') {
          e.preventDefault();
          setPlaying((x) => !x);
        }
      }}
    >
      <div className="ph-v-bar">
        <button type="button" className="ph-btn" onClick={onClose}>
          ‹ Back
        </button>
        <span className="ph-v-title">{p.title}</span>
        <span className="ph-spacer" />
        <button type="button" className={`ph-btn ${favs.includes(p.id) ? 'fav-on' : ''}`} onClick={() => onFav(p.id)} aria-pressed={favs.includes(p.id)}>
          <SysIcon n="heart" size={16} />
        </button>
        <button type="button" className="ph-btn" onClick={() => void useAsWallpaper(p)} title="Use as Wallpaper">
          <SysIcon n="photo" size={15} /> Use as Wallpaper
        </button>
        <button type="button" className="ph-btn" onClick={() => setPlaying((x) => !x)}>
          <SysIcon n={playing ? 'pause' : 'play'} size={14} /> {playing ? 'Pause' : 'Slideshow'}
        </button>
        <button type="button" className={`ph-btn ${editing ? 'fav-on' : ''}`} onClick={() => setEditing((x) => !x)}>
          <SysIcon n="pencil" size={14} /> Edit
        </button>
        <button type="button" className="ph-btn" onClick={() => onDelete(p.id)} aria-label="Delete photo">
          <SysIcon n="trash" size={16} />
        </button>
      </div>
      <div className={`ph-v-stage ${editing ? 'with-edit' : ''}`}>
        {isLive(p) && (
          <span className={`ph-live-badge ${livePlay ? 'on' : ''}`} aria-hidden="true">
            ◎ LIVE
          </span>
        )}
        <img
          ref={imgRef}
          key={p.id}
          src={p.src}
          alt={p.title}
          className={`ph-v-img ${livePlay ? 'live-play' : ''}`}
          style={{ filter: editFilter(shown) }}
          onPointerDown={() => isLive(p) && !editing && setLivePlay(true)}
          onPointerUp={() => setLivePlay(false)}
          onPointerLeave={() => setLivePlay(false)}
          draggable={false}
        />
        {shown && shown.vignette > 0 && <span className="ph-vignette" style={{ opacity: shown.vignette / 100 }} />}
        {editing && (
          <aside className="ph-edit" aria-label="Edit photo">
            <b>Adjust</b>
            {slider('light', 'Light')}
            {slider('contrast', 'Contrast')}
            {slider('sat', 'Saturation')}
            {slider('warmth', 'Warmth')}
            {slider('vignette', 'Vignette', 0, 100)}
            <label className="ph-edit-row inline">
              <span>Black & White</span>
              <input type="checkbox" checked={draft.bw} onChange={(e) => setDraft({ ...draft, bw: e.target.checked })} />
            </label>
            <div className="ph-edit-actions">
              <button type="button" className="ph-btn" onClick={() => (onEdit(p.id, null), setDraft(NO_EDIT))} disabled={!edits[p.id] && JSON.stringify(draft) === JSON.stringify(NO_EDIT)}>
                Revert to Original
              </button>
              <button type="button" className="ph-btn primary" onClick={() => (onEdit(p.id, JSON.stringify(draft) === JSON.stringify(NO_EDIT) ? null : draft), setEditing(false))}>
                Done
              </button>
            </div>
          </aside>
        )}
        <button type="button" className="ql-nav prev" onClick={() => go(-1)} aria-label="Previous photo">
          ‹
        </button>
        <button type="button" className="ql-nav next" onClick={() => go(1)} aria-label="Next photo">
          ›
        </button>
      </div>
      <div className="ph-filmstrip">
        {list.map((x) => (
          <button key={x.id} type="button" className={x.id === p.id ? 'on' : ''} onClick={() => onChange(x.id)} aria-label={x.title}>
            <img src={x.src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Portfolio screen recordings, played in a Photos-style viewer. */
function VideoGrid() {
  const [open, setOpen] = useState<Video | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  return (
    <div className="px-videos scroll-smooth">
      <div className="px-vgrid">
        {videos.map((v, i) => (
          <button key={v.id} type="button" className="px-vtile" style={{ ['--i' as string]: i }} onClick={() => setOpen(v)}>
            <img src={v.poster} alt="" loading="lazy" onError={() => setFailed((f) => ({ ...f, [v.id]: true }))} />
            {failed[v.id] && <span className="px-vmissing">▶</span>}
            <span className="px-vplay" aria-hidden="true">▶</span>
            <span className="px-vdur">{fmt(v.length)}</span>
            <span className="px-vtitle">
              <b>{v.title}</b>
              <small>{v.description}</small>
            </span>
          </button>
        ))}
      </div>
      {open && (
        <div className="px-vviewer" role="dialog" aria-label={open.title} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="px-vbox">
            <div className="px-vbar">
              <b>{open.title}</b>
              <button type="button" className="px-vclose" onClick={() => setOpen(null)} aria-label="Close video">
                ✕
              </button>
            </div>
            <video key={open.id} src={open.src} poster={open.poster} controls autoPlay playsInline onError={() => setFailed((f) => ({ ...f, [open.id]: true }))} />
            {failed[open.id] && <p className="px-vnote">This video couldn’t be loaded.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
