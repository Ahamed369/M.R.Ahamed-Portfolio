import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { t } from '../../system/i18n';
import { AppIcon, type IconName } from '../AppIcons';
import { useSettings } from '../../system/SettingsContext';
import { useBadges, badgeText } from '../../system/badges';
import { wallpaperById } from '../../data/media';
import { deviceWall } from '../../system/wallpaperCycle';
import { IPAD_DOCK, appById, cellsOf, DOCK_APPS, IOS_APPS, IOS_WIDGETS, iosIcon, iosLabel, useHomeLayout, type HomeItem, type HomeLayout, type WidgetSize } from '../../system/ios';
import { launchIcon, useIOS } from './ctx';
import { IOSWidget, STACK_CHOICES, STACK_DEFAULT, WIDGET_APP, WIDGET_ARGS } from './IOSWidgets';
import { playTick } from '../../system/sounds';
import { notify } from '../../system/notify';
import type { LaunchItem } from '../../system/launch';
import type { AppId } from '../../system/types';
import { SysIcon } from '../SysIcons';

const appOf = (it: LaunchItem | undefined): AppId | '' => (it && 'app' in it.action ? it.action.app : '');
type Lay = HomeLayout & { removed?: string[] };

/** keep every page within its cell budget: overflow moves to the next page */
function normalize(pages: HomeItem[][], cap: number): HomeItem[][] {
  const out = pages.map((p) => [...p]);
  for (let i = 0; i < out.length; i++) {
    let used = out[i].reduce((a, it) => a + cellsOf(it), 0);
    while (used > cap && out[i].length > 1) {
      const it = out[i].pop()!;
      used -= cellsOf(it);
      if (!out[i + 1]) out[i + 1] = [];
      out[i + 1].unshift(it);
    }
  }
  return out.filter((p, i) => p.length || i === 0);
}

/* ───────────── icon ───────────── */

function Icon({
  item,
  badge,
  editing,
  onRemove,
  small,
}: {
  item: LaunchItem;
  badge?: number;
  editing?: boolean;
  onRemove?: () => void;
  small?: boolean;
}) {
  return (
    <span className={`ios-icon ${small ? 'small' : ''}`} data-ios-app={item.id} data-ios-app-for={appOf(item)}>
      <span className="ios-icon-img">
        <AppIcon name={iosIcon(item) as IconName} />
        {!!badge && !editing && <i className="ios-badge">{badgeText(badge)}</i>}
        {editing && onRemove && (
          <button
            type="button"
            className="ios-minus"
            aria-label={`Remove ${iosLabel(item)}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            −
          </button>
        )}
      </span>
      {!small && <span className="ios-icon-label">{iosLabel(item)}</span>}
    </span>
  );
}

function FolderIcon({ name, apps, editing, onRemove }: { name: string; apps: string[]; editing?: boolean; onRemove?: () => void }) {
  return (
    <span className="ios-icon ios-folder-icon">
      <span className="ios-icon-img folder">
        {apps.slice(0, 9).map((id) => {
          const it = appById(id);
          return it ? <AppIcon key={id} name={iosIcon(it) as IconName} /> : null;
        })}
        {editing && onRemove && (
          <button type="button" className="ios-minus" aria-label={`Remove folder ${name}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => (e.stopPropagation(), onRemove())}>
            −
          </button>
        )}
      </span>
      <span className="ios-icon-label">{name}</span>
    </span>
  );
}

/* ───────────── Home ───────────── */

export function IOSHome() {
  const ios = useIOS();
  const { settings } = useSettings();
  const rawBadges = useBadges();
  const badges: typeof rawBadges = settings.showBadges === false ? {} : rawBadges;
  const [layout, setLayout, resetLayout] = useHomeLayout(ios.mode);
  const ipad = ios.mode === 'ipad';
  const cols = ipad ? 6 : 4;
  const rows = ipad ? 5 : 6;
  const cap = cols * rows;
  const shown = layout.pages.map((p, i) => ({ p, i })).filter(({ i }) => !layout.hidden.includes(i));
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState<{ id: string; name: string; apps: string[] } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; item: HomeItem; pi: number; idx: number } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; text: string; ok: string; run: () => void } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [todayEdit, setTodayEdit] = useState(false);
  const [stackEdit, setStackEdit] = useState<{ pi: number; idx: number } | null>(null);
  const [mergeKey, setMergeKey] = useState<string | null>(null);
  const [libCat, setLibCat] = useState<string | null>(null);
  const [libQ, setLibQ] = useState('');
  const [lpOpen, setLpOpen] = useState(false);
  const [lpQ, setLpQ] = useState('');
  const editing = ios.edit;
  const total = shown.length + 2; // today + pages + library

  const itemKey = (it: HomeItem) => (it.t === 'app' ? `a:${it.id}` : `${it.t}:${it.id}`);

  // start on page 1 (Today View is to the left)
  useLayoutEffect(() => {
    const s = scroller.current;
    if (s) s.scrollLeft = s.clientWidth;
  }, []);
  const onScroll = () => {
    const s = scroller.current;
    if (!s) return;
    setPage(Math.round(s.scrollLeft / Math.max(1, s.clientWidth)));
  };
  const goPage = (n: number, smooth = true) => {
    const s = scroller.current;
    if (!s) return;
    s.scrollTo({ left: Math.max(0, Math.min(total - 1, n)) * s.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };
  // keyboard ← → between pages while on the Home Screen; Escape closes a folder / menu
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFolder(null);
        setMenu(null);
        setLibCat(null);
        setConfirm(null);
      }
      if (ios.current || ios.panel !== 'none' || (e.target as HTMLElement)?.closest?.('input, textarea')) return;
      if (e.key === 'ArrowRight') goPage(page + 1);
      else if (e.key === 'ArrowLeft') goPage(page - 1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  // going Home returns to page 1 if the visitor was in the App Library or Today View… (like iOS: it keeps the page)

  const set = (fn: (l: Lay) => Lay) => setLayout(fn);
  const removeItem = (pi: number, idx: number) => set((l) => {
    const pages = l.pages.map((p) => [...p]);
    const [it] = pages[pi].splice(idx, 1);
    const removed = it && it.t === 'app' ? [...(l.removed ?? []), it.id] : l.removed;
    return { ...l, pages, removed };
  });

  /* ───── pointer: tap / long-press / drag (edit) / pull-down (search) / mouse paging ───── */
  const press = useRef<{ x: number; y: number; t: number; timer: number; item?: { it: HomeItem; pi: number; idx: number; el: HTMLElement }; long: boolean; dragging: boolean; scroll0: number; mouse: boolean; ghost?: HTMLElement; hoverT?: number; lastTarget?: string; edgeT?: number; mergeKey?: string; mergeT?: number } | null>(null);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-home-key]');
    const s = scroller.current;
    const item = el
      ? (() => {
          const pi = Number(el.dataset.pi);
          const idx = Number(el.dataset.idx);
          const it = layout.pages[pi]?.[idx];
          return it ? { it, pi, idx, el } : undefined;
        })()
      : undefined;
    const p = { x: e.clientX, y: e.clientY, t: Date.now(), timer: 0, item, long: false, dragging: false, scroll0: s?.scrollLeft ?? 0, mouse: e.pointerType === 'mouse' };
    press.current = p;
    p.timer = window.setTimeout(() => {
      if (press.current !== p) return;
      p.long = true;
      if (editing) return;
      if (item) {
        playTick(0.4);
        if (navigator.vibrate) navigator.vibrate(10);
        const r = item.el.getBoundingClientRect();
        setMenu({ x: r.left + r.width / 2, y: r.bottom, item: item.it, pi: item.pi, idx: item.idx });
      } else if (!(e.target as HTMLElement).closest('.ios-dock, .ios-dots, .ios-today, .ios-lib')) {
        if (navigator.vibrate) navigator.vibrate(10);
        if ((settings.iosLongPress ?? 'switcher') === 'switcher') ios.setPanel('switcher');
        else ios.setEdit(true);
      }
    }, 500);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.hypot(dx, dy) > 9) window.clearTimeout(p.timer);
    // edit mode: drag an item
    if (editing && p.item && (p.dragging || Math.hypot(dx, dy) > 8)) {
      if (!p.dragging) {
        p.dragging = true;
        setDragId(itemKey(p.item.it));
        const g = p.item.el.cloneNode(true) as HTMLElement;
        const r = p.item.el.getBoundingClientRect();
        g.className += ' ios-ghost';
        Object.assign(g.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, zIndex: '99999', pointerEvents: 'none' });
        document.body.appendChild(g);
        p.ghost = g;
      }
      const r0 = p.item.el.getBoundingClientRect();
      if (p.ghost) p.ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;
      void r0;
      // hovering another item → move there
      const under = document.elementsFromPoint(e.clientX, e.clientY).find((n) => (n as HTMLElement).dataset?.homeKey && !(n as HTMLElement).classList.contains('ios-ghost')) as HTMLElement | undefined;
      const k = under?.dataset.homeKey;
      // v10.3 — hold an app over the middle of another app (or a folder) → make / fill a folder
      const ur = under?.querySelector('.ios-icon-img')?.getBoundingClientRect();
      const centre = !!ur && Math.hypot(e.clientX - (ur.left + ur.width / 2), e.clientY - (ur.top + ur.height / 2)) < ur.width * 0.34;
      const canMerge = p.item.it.t === 'app' && !!k && k !== itemKey(p.item.it) && (k.startsWith('a:') || k.startsWith('folder:')) && centre;
      if (canMerge) {
        window.clearTimeout(p.hoverT);
        if (p.mergeKey !== k) {
          p.mergeKey = undefined;
          setMergeKey(null);
          window.clearTimeout(p.mergeT);
          p.mergeT = window.setTimeout(() => {
            if (press.current !== p) return;
            p.mergeKey = k;
            setMergeKey(k);
            playTick(0.3);
          }, 380);
          p.lastTarget = k;
        }
      } else if (p.mergeKey || p.mergeT) {
        window.clearTimeout(p.mergeT);
        p.mergeT = 0;
        if (p.mergeKey) {
          p.mergeKey = undefined;
          setMergeKey(null);
          p.lastTarget = undefined;
        }
      }
      if (!canMerge && k && k !== itemKey(p.item.it) && k !== p.lastTarget) {
        p.lastTarget = k;
        window.clearTimeout(p.hoverT);
        p.hoverT = window.setTimeout(() => {
          const cur = press.current;
          if (!cur?.item) return;
          const tpi = Number(under!.dataset.pi);
          const tidx = Number(under!.dataset.idx);
          set((l) => {
            const pages = l.pages.map((pg) => [...pg]);
            const from = pages[cur.item!.pi].findIndex((x) => itemKey(x) === itemKey(cur.item!.it));
            if (from < 0) return l;
            const [moved] = pages[cur.item!.pi].splice(from, 1);
            pages[tpi].splice(Math.min(tidx, pages[tpi].length), 0, moved);
            cur.item = { ...cur.item!, pi: tpi, idx: tidx };
            return { ...l, pages: normalize(pages, cap) };
          });
        }, 160);
      }
      // near the screen edge → next / previous page
      const sh = scroller.current?.getBoundingClientRect();
      if (sh) {
        const edge = e.clientX < sh.left + 26 ? -1 : e.clientX > sh.right - 26 ? 1 : 0;
        if (edge && !p.edgeT) {
          p.edgeT = window.setTimeout(() => {
            const cur = press.current;
            if (!cur?.item) return;
            const target = page + edge;
            if (target < 1) return void (cur.edgeT = 0);
            const tpi = target - 1;
            set((l) => {
              const pages = l.pages.map((pg) => [...pg]);
              while (pages.length <= tpi) pages.push([]);
              const from = pages[cur.item!.pi].findIndex((x) => itemKey(x) === itemKey(cur.item!.it));
              if (from < 0) return l;
              const [moved] = pages[cur.item!.pi].splice(from, 1);
              pages[tpi].push(moved);
              cur.item = { ...cur.item!, pi: tpi, idx: pages[tpi].length - 1 };
              return { ...l, pages: normalize(pages, cap) };
            });
            goPage(target);
            cur.edgeT = 0;
          }, 650);
        } else if (!edge && p.edgeT) {
          window.clearTimeout(p.edgeT);
          p.edgeT = 0;
        }
      }
      return;
    }
    // mouse drag → page scroll
    if (p.mouse && Math.abs(dx) > Math.abs(dy) && scroller.current && !editing) scroller.current.scrollLeft = p.scroll0 - dx;
  };

  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    window.clearTimeout(p.hoverT);
    window.clearTimeout(p.edgeT);
    window.clearTimeout(p.mergeT);
    if (p.ghost) {
      p.ghost.remove();
      setDragId(null);
      setMergeKey(null);
      if (p.mergeKey && p.item?.it.t === 'app') mergeInto(p.item.it.id, p.mergeKey);
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (p.mouse && Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) && !editing) {
      // one page per swipe, counted from where the drag started (the live drag already moved `page`)
      const start = Math.round(p.scroll0 / Math.max(1, scroller.current?.clientWidth ?? 1));
      goPage(start + (dx < 0 ? 1 : -1));
      return;
    } else if (p.mouse && scroller.current && scroller.current.scrollLeft !== p.scroll0) goPage(page);
    // pull down on a Home Screen page → Search
    if (!editing && dy > 60 && Math.abs(dx) < 50 && page > 0 && page <= shown.length && !(e.target as HTMLElement).closest('.iw-stack')) {
      ios.setPanel('search');
      return;
    }
    if (p.long || Math.hypot(dx, dy) > 10) return;
    // tap
    if (editing) {
      if (p.item?.it.t === 'widget' && p.item.it.w === 'smart' && !(e.target as HTMLElement).closest('.ios-minus')) setStackEdit({ pi: p.item.pi, idx: p.item.idx });
      else if (p.item?.it.t === 'folder') setFolder({ id: p.item.it.id, name: p.item.it.name, apps: p.item.it.apps });
      else if (!p.item && !(e.target as HTMLElement).closest('.ios-edit-bar, .ios-dots')) ios.setEdit(false);
      return;
    }
    if (!p.item) return;
    const { it, el } = p.item;
    const r = el.querySelector('.ios-icon-img, .iw, .iw-stack')?.getBoundingClientRect() ?? el.getBoundingClientRect();
    if (it.t === 'app') {
      const li = appById(it.id);
      if (li) {
        const aid = appOf(li);
        if (aid) launchIcon.set(aid, li.id);
        ios.launch(li, r);
      }
    } else if (it.t === 'folder') setFolder({ id: it.id, name: it.name, apps: it.apps });
    else {
      const shownW = it.w === 'smart' ? (el.querySelector('[data-stack-cur]') as HTMLElement | null)?.dataset.stackCur ?? '' : it.w;
      const target = WIDGET_APP[shownW];
      const li = target ? appById(target) : undefined;
      const args = WIDGET_ARGS[shownW];
      if (li) ios.launch(withArgs(li, args), r);
    }
  };

  /* ───── v10.3 — folders: create by dropping an app on an app, add to a folder, take apps out ───── */
  const folderNameFor = (a: string, b: string) => {
    const g1 = appById(a)?.group;
    const g2 = appById(b)?.group;
    const map: Record<string, string> = { Portfolio: 'Portfolio', Developer: 'Developer', 'Internet & Social': 'Social', System: 'Utilities', Media: 'Entertainment' };
    return g1 && g1 === g2 ? map[g1] ?? 'Folder' : 'Folder';
  };
  const mergeInto = (dragAppId: string, targetKey: string) => {
    let opened: { id: string; name: string; apps: string[] } | null = null;
    set((l) => {
      const pages = l.pages.map((pg) => [...pg]);
      let fromPi = -1;
      pages.forEach((pg, pi) => pg.forEach((x) => x.t === 'app' && x.id === dragAppId && fromPi < 0 && (fromPi = pi)));
      if (fromPi < 0) return l;
      let tPi = -1;
      let tIdx = -1;
      pages.forEach((pg, pi) => pg.forEach((x, idx) => itemKey(x) === targetKey && tPi < 0 && ((tPi = pi), (tIdx = idx))));
      if (tPi < 0) return l;
      const target = pages[tPi][tIdx];
      if (target.t === 'app') {
        const f = { t: 'folder' as const, id: `f-${Math.random().toString(36).slice(2, 8)}`, name: folderNameFor(target.id, dragAppId), apps: [target.id, dragAppId] };
        pages[tPi][tIdx] = f;
        opened = { id: f.id, name: f.name, apps: f.apps };
      } else if (target.t === 'folder') {
        if (target.apps.includes(dragAppId)) return l;
        const f = { ...target, apps: [...target.apps, dragAppId] };
        pages[tPi][tIdx] = f;
        opened = { id: f.id, name: f.name, apps: f.apps };
      } else return l;
      const fi = pages[fromPi].findIndex((x) => x.t === 'app' && x.id === dragAppId);
      if (fi >= 0) pages[fromPi].splice(fi, 1);
      return { ...l, pages: normalize(pages, cap) };
    });
    window.setTimeout(() => opened && setFolder(opened), 60);
  };
  const removeFromFolder = (folderId: string, appId: string) => {
    let next: { id: string; name: string; apps: string[] } | null = null;
    set((l) => {
      const pages = l.pages.map((pg) => [...pg]);
      for (let pi = 0; pi < pages.length; pi++) {
        const idx = pages[pi].findIndex((x) => x.t === 'folder' && x.id === folderId);
        if (idx < 0) continue;
        const f = pages[pi][idx] as Extract<HomeItem, { t: 'folder' }>;
        const apps = f.apps.filter((a) => a !== appId);
        // a folder with one app left becomes that app again (like iOS)
        if (apps.length <= 1) pages[pi].splice(idx, 1, ...apps.map((a) => ({ t: 'app' as const, id: a })), { t: 'app', id: appId });
        else {
          pages[pi][idx] = { ...f, apps };
          pages[pi].splice(idx + 1, 0, { t: 'app', id: appId });
          next = { id: f.id, name: f.name, apps };
        }
        break;
      }
      return { ...l, pages: normalize(pages, cap) };
    });
    setFolder(next);
  };

  /* ───── add widget (gallery) ───── */
  const addWidget = (w: string, size: WidgetSize) => {
    const pi = Math.max(0, Math.min(layout.pages.length - 1, page - 1));
    set((l) => {
      const pages = l.pages.map((p) => [...p]);
      pages[pi].unshift({ t: 'widget', id: `${w}-${Math.random().toString(36).slice(2, 7)}`, w, size });
      return { ...l, pages: normalize(pages, cap) };
    });
    ios.setPanel('none');
    notify({ app: 'Home Screen', icon: 'settings', title: 'Widget added', silent: true });
  };

  // v10.2 — the iPad Dock holds more favourites (as many as fit nicely), plus recent apps and App Library
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const ipadCap = Math.max(6, Math.min(14, Math.floor((vw - 90) / 92)));
  const dockIds: readonly string[] = ipad
    ? (settings.ipadDockApps?.length ? settings.ipadDockApps : IPAD_DOCK).slice(0, Math.max(4, ipadCap - 1 - (ios.recents.length ? 3 : 0)))
    : settings.dockApps?.length
      ? settings.dockApps
      : DOCK_APPS;
  const dockItems = dockIds.map((id) => appById(id)).filter(Boolean) as LaunchItem[];
  const recentLaunch = ipad
    ? ios.recents
        .map((aid) => IOS_APPS.find((x) => appOf(x) === aid))
        .filter((x): x is LaunchItem => !!x && !dockIds.includes(x.id))
        .slice(0, 3)
    : [];

  const renderItem = (it: HomeItem, pi: number, idx: number) => {
    const key = itemKey(it);
    const common = {
      'data-home-key': key,
      'data-pi': pi,
      'data-idx': idx,
      className: `ios-cell ${it.t === 'widget' ? `w-${it.size}` : ''} ${dragId === key ? 'drag-src' : ''} ${mergeKey === key ? 'merge-target' : ''}`,
      style: { ['--jig' as string]: `${(idx % 3) * 0.07}s` },
    };
    if (it.t === 'app') {
      const li = appById(it.id);
      if (!li) return null;
      return (
        <div key={key} {...common}>
          <Icon item={li} badge={badges[li.id] ?? badges[appOf(li)]} editing={editing} onRemove={() => setConfirm({ title: `Remove “${iosLabel(li)}”?`, text: 'It stays in the App Library — you can add it back any time.', ok: 'Remove from Home Screen', run: () => removeItem(pi, idx) })} />
        </div>
      );
    }
    if (it.t === 'folder')
      return (
        <div key={key} {...common}>
          <FolderIcon name={it.name} apps={it.apps} editing={editing} onRemove={() => setConfirm({ title: `Remove folder “${it.name}”?`, text: 'The apps inside stay in the App Library.', ok: 'Remove Folder', run: () => removeItem(pi, idx) })} />
        </div>
      );
    return (
      <div key={key} {...common}>
        <div className="ios-widget ios-glass">
          <IOSWidget w={it.w} size={it.size} stack={it.stack} rotate={it.rotate} />
          {editing && (
            <button type="button" className="ios-minus" aria-label="Remove widget" onPointerDown={(e) => e.stopPropagation()} onClick={() => setConfirm({ title: 'Remove Widget?', text: 'Removing this widget will not delete any data.', ok: 'Remove', run: () => removeItem(pi, idx) })}>
              −
            </button>
          )}
        </div>
        {settings.iosLabels !== false && <span className="ios-widget-label">{IOS_WIDGETS.find((x) => x.w === it.w)?.label}</span>}
      </div>
    );
  };

  /* ───── App Library ───── */
  const groups = useMemo(() => {
    const g: Record<string, LaunchItem[]> = {};
    const name = (x: LaunchItem) => ({ Portfolio: 'Portfolio', Developer: 'Developer', 'Internet & Social': 'Social', System: 'Utilities', Media: 'Entertainment' })[x.group];
    IOS_APPS.forEach((x) => (g[name(x)] ??= []).push(x));
    const sugg = ios.recents.map((aid) => IOS_APPS.find((x) => appOf(x) === aid)).filter(Boolean) as LaunchItem[];
    const recentlyAdded = IOS_APPS.filter((x) => ['phone', 'shortcuts', 'chess', 'textedit', 'services', 'stickies'].includes(x.id));
    const uniq = (l: LaunchItem[]) => l.filter((x, i) => l.findIndex((y) => y.id === x.id) === i);
    return [
      ['Suggestions', uniq([...sugg, ...IOS_APPS.filter((x) => ['about', 'cv', 'projects', 'hireme', 'casestudies', 'photos'].includes(x.id))]).slice(0, 7)],
      ['Recently Added', recentlyAdded],
      ...Object.entries(g),
    ] as [string, LaunchItem[]][];
  }, [ios.recents]);
  const libResults = libQ.trim() ? [...IOS_APPS].filter((x) => `${iosLabel(x)} ${x.keywords ?? ''}`.toLowerCase().includes(libQ.trim().toLowerCase())).sort((a, b) => iosLabel(a).localeCompare(iosLabel(b))) : null;

  const launchLi = (li: LaunchItem, el?: Element | null) => {
    const aid = appOf(li);
    if (aid) launchIcon.set(aid, li.id);
    ios.launch(li, el?.getBoundingClientRect() ?? null);
    setFolder(null);
    setLibCat(null);
  };

  return (
    <div className={`ios-home ${ios.current ? 'behind' : ''} ${editing ? 'editing' : ''}`} aria-hidden={!!ios.current || undefined}>
      {editing && (
        <div className="ios-edit-bar">
          <EditMenu onAdd={() => ios.setPanel('widgets')} onCustomize={() => ios.setPanel('customize')} onPages={() => ios.setPanel('pages')} />
          <button type="button" className="ios-pill" onClick={() => ios.setEdit(false)}>
            Done
          </button>
        </div>
      )}
      <div className="ios-pages" ref={scroller} onScroll={onScroll} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {/* Today View */}
        <section className="ios-page ios-today" aria-label="Today View">
          <button type="button" className="ios-search-pill wide" onClick={() => ios.setPanel('search')}>
            <SysIcon n="search" size={13} /> {t('iSearch')}
          </button>
          <div className="ios-today-list">
            {layout.today.map((w, i) => (
              <div key={`${w}${i}`} className="ios-today-w">
                <div className="ios-widget ios-glass" onClick={() => {
                  if (todayEdit || !WIDGET_APP[w]) return;
                  const li = appById(WIDGET_APP[w]);
                  const args = WIDGET_ARGS[w];
                  if (li) launchLi(withArgs(li, args));
                }}>
                  <IOSWidget w={w} size="m" />
                </div>
                {todayEdit && (
                  <button type="button" className="ios-minus" aria-label="Remove" onClick={() => set((l) => ({ ...l, today: l.today.filter((_, k) => k !== i) }))}>
                    −
                  </button>
                )}
              </div>
            ))}
            {todayEdit && (
              <div className="ios-today-add">
                {IOS_WIDGETS.filter((x) => !layout.today.includes(x.w) && x.w !== 'smart').map((x) => (
                  <button key={x.w} type="button" onClick={() => set((l) => ({ ...l, today: [...l.today, x.w] }))}>
                    <SysIcon n="plus" size={12} /> {x.label}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="ios-pill center" onClick={() => setTodayEdit((v) => !v)}>
              {todayEdit ? t('iDone') : t('iEdit')}
            </button>
          </div>
        </section>

        {shown.map(({ p, i }) => (
          <section key={i} className="ios-page" aria-label={`Home Screen page ${i + 1}`}>
            <div className="ios-grid" style={{ ['--cols' as string]: cols, ['--rows' as string]: rows }}>
              {p.map((it, idx) => renderItem(it, i, idx))}
            </div>
          </section>
        ))}

        {/* App Library */}
        {settings.appLibrary !== false && (
        <section className="ios-page ios-lib" aria-label="App Library">
          <input className="ios-lib-q" placeholder={t('iAppLibrary')} value={libQ} onChange={(e) => setLibQ(e.target.value)} aria-label="Search App Library" />
          {libResults ? (
            <div className="ios-lib-list">
              {libResults.map((li) => (
                <button key={li.id} type="button" onClick={(e) => launchLi(li, e.currentTarget.querySelector('.ios-icon-img'))}>
                  <Icon item={li} small />
                  <span>{iosLabel(li)}</span>
                </button>
              ))}
              {!libResults.length && <p className="ios-empty">No Results</p>}
            </div>
          ) : (
            <div className="ios-lib-grid">
              {groups.map(([name, list]) => (
                <div key={name} className="ios-lib-box">
                  <div className="ios-lib-tiles ios-glass">
                    {list.slice(0, 3).map((li) => (
                      <button key={li.id} type="button" onClick={(e) => launchLi(li, e.currentTarget)} aria-label={iosLabel(li)}>
                        <Icon item={li} small />
                      </button>
                    ))}
                    <button type="button" className="ios-lib-more" onClick={() => setLibCat(name)} aria-label={`More in ${name}`}>
                      {list.slice(3, 7).map((li) => (
                        <AppIcon key={li.id} name={iosIcon(li) as IconName} />
                      ))}
                    </button>
                  </div>
                  <span className="ios-lib-name">{name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        )}
      </div>

      <div className="ios-dots" onClick={() => editing && ios.setPanel('pages')}>
        {editing ? (
          <span className="ios-dots-edit">
            {shown.map((_, k) => (
              <i key={k} className={page === k + 1 ? 'on' : ''} />
            ))}
          </span>
        ) : page > 0 && page <= shown.length && settings.showPageDots !== false ? (
          shown.map((_, k) => <i key={k} className={page === k + 1 ? 'on' : ''} onClick={() => goPage(k + 1)} />)
        ) : settings.homeSearch !== false ? (
          <button type="button" className="ios-search-pill" onClick={() => ios.setPanel('search')}>
            <SysIcon n="search" size={13} /> {t('iSearch')}
          </button>
        ) : null}
      </div>

      <nav className="ios-dock ios-glass" aria-label="Dock">
        {dockItems.map((li) => (
          <button key={li.id} type="button" onClick={(e) => launchLi(li, e.currentTarget.querySelector('.ios-icon-img'))} aria-label={iosLabel(li)}>
            <Icon item={li} badge={badges[li.id]} small />
          </button>
        ))}
        {recentLaunch.length > 0 && <span className="ios-dock-div" />}
        {recentLaunch.map((li) => (
          <button key={`r-${li.id}`} type="button" className="ios-dock-recent" onClick={(e) => launchLi(li, e.currentTarget.querySelector('.ios-icon-img'))} aria-label={iosLabel(li)}>
            <Icon item={li} small />
          </button>
        ))}
        {ipad && settings.appLibrary !== false && (
          <button type="button" className="ios-dock-lib" onClick={() => (settings.ipadAppBrowser === 'launchpad' ? (setLpQ(''), setLpOpen(true)) : goPage(shown.length + 1))} aria-label={settings.ipadAppBrowser === 'launchpad' ? 'All Apps' : 'App Library'}>
            <span className="ios-icon-img ios-lib-ico" aria-hidden="true">
              {groups.slice(0, 4).map(([n, l]) => (l[0] ? <AppIcon key={n} name={iosIcon(l[0]) as IconName} /> : null))}
            </span>
          </button>
        )}
      </nav>

      {/* v10.3 — optional Launchpad-style grid of every app (iPad, Settings → Home Screen → Dock App Button) */}
      {lpOpen && (
        <div className="ios-lp" role="dialog" aria-label="All Apps" onClick={() => setLpOpen(false)}>
          <label className="ios-lp-q" onClick={(e) => e.stopPropagation()}>
            <SysIcon n="search" size={15} />
            <input autoFocus value={lpQ} onChange={(e) => setLpQ(e.target.value)} placeholder={t('iSearch')} aria-label="Search apps" onKeyDown={(e) => e.key === 'Escape' && setLpOpen(false)} />
          </label>
          <div className="ios-lp-grid" onClick={(e) => e.stopPropagation()}>
            {[...IOS_APPS]
              .filter((x) => !lpQ.trim() || `${iosLabel(x)} ${x.keywords ?? ''}`.toLowerCase().includes(lpQ.trim().toLowerCase()))
              .sort((a, b) => iosLabel(a).localeCompare(iosLabel(b)))
              .map((li) => (
                <button
                  key={li.id}
                  type="button"
                  onClick={(e) => {
                    setLpOpen(false);
                    launchLi(li, e.currentTarget.querySelector('.ios-icon-img'));
                  }}
                >
                  <Icon item={li} badge={badges[li.id]} />
                </button>
              ))}
          </div>
          <button type="button" className="ios-lp-done" onClick={() => setLpOpen(false)}>
            {t('iDone')}
          </button>
        </div>
      )}

      {/* folder */}
      {folder && (
        <div className="ios-folder-back" onClick={() => setFolder(null)}>
          <div className="ios-folder" onClick={(e) => e.stopPropagation()}>
            {editing ? (
              <input
                className="ios-folder-name"
                value={folder.name}
                onChange={(e) => {
                  const name = e.target.value.slice(0, 24);
                  setFolder({ ...folder, name });
                  set((l) => ({ ...l, pages: l.pages.map((pg) => pg.map((x) => (x.t === 'folder' && x.id === folder.id ? { ...x, name } : x))) }));
                }}
                aria-label="Folder name"
              />
            ) : (
              <h2 className="ios-folder-name">{folder.name}</h2>
            )}
            <div className="ios-folder-grid ios-glass">
              {folder.apps.map((id) => {
                const li = appById(id);
                return li ? (
                  <div key={id} className="ios-folder-app">
                    <button type="button" onClick={(e) => !editing && launchLi(li, e.currentTarget.querySelector('.ios-icon-img'))}>
                      <Icon item={li} badge={badges[li.id]} />
                    </button>
                    {editing && (
                      <button type="button" className="ios-minus" aria-label={`Move ${iosLabel(li)} out of the folder`} onClick={() => removeFromFolder(folder.id, id)}>
                        −
                      </button>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* App Library category */}
      {libCat && (
        <div className="ios-folder-back" onClick={() => setLibCat(null)}>
          <div className="ios-folder" onClick={(e) => e.stopPropagation()}>
            <h2 className="ios-folder-name">{libCat}</h2>
            <div className="ios-folder-grid ios-glass scroll">
              {(groups.find((g) => g[0] === libCat)?.[1] ?? []).map((li) => (
                <button key={li.id} type="button" onClick={(e) => launchLi(li, e.currentTarget.querySelector('.ios-icon-img'))}>
                  <Icon item={li} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* quick actions */}
      {menu && <QuickActions menu={menu} onClose={() => setMenu(null)} onEdit={() => (setMenu(null), ios.setEdit(true))} onRemove={() => {
        const { item, pi, idx } = menu;
        setMenu(null);
        setConfirm({ title: item.t === 'widget' ? 'Remove Widget?' : `Remove “${item.t === 'app' ? iosLabel(appById(item.id)!) : item.name}”?`, text: item.t === 'app' ? 'It stays in the App Library.' : 'Nothing is deleted.', ok: 'Remove', run: () => removeItem(pi, idx) });
      }} onResize={(size) => {
        const { pi, idx } = menu;
        setMenu(null);
        set((l) => {
          const pages = l.pages.map((p) => [...p]);
          const it = pages[pi][idx];
          if (it?.t === 'widget') pages[pi][idx] = { ...it, size };
          return { ...l, pages: normalize(pages, cap) };
        });
      }} launch={launchLi} />}

      {confirm && (
        <div className="ios-alert-back" onClick={() => setConfirm(null)}>
          <div className="ios-alert" role="alertdialog" aria-label={confirm.title} onClick={(e) => e.stopPropagation()}>
            <b>{confirm.title}</b>
            <p>{confirm.text}</p>
            <button
              type="button"
              className="ios-alert-btn danger"
              onClick={() => {
                confirm.run();
                setConfirm(null);
              }}
            >
              {confirm.ok}
            </button>
            <button type="button" className="ios-alert-btn strong" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {stackEdit && (() => {
        const it = layout.pages[stackEdit.pi]?.[stackEdit.idx];
        if (!it || it.t !== 'widget') return null;
        return (
          <StackEditor
            items={it.stack?.length ? it.stack : STACK_DEFAULT}
            rotate={it.rotate !== false}
            onClose={() => setStackEdit(null)}
            onSave={(stack, rotate) =>
              set((l) => {
                const pages = l.pages.map((pg) => [...pg]);
                const cur = pages[stackEdit.pi]?.[stackEdit.idx];
                if (cur?.t === 'widget') pages[stackEdit.pi][stackEdit.idx] = { ...cur, stack, rotate };
                return { ...l, pages };
              })
            }
          />
        );
      })()}
      {ios.panel === 'widgets' && <WidgetGallery onAdd={addWidget} onClose={() => ios.setPanel('none')} ipad={ipad} />}
      {ios.panel === 'customize' && <Customize onClose={() => ios.setPanel('none')} />}
      {ios.panel === 'pages' && (
        <div className="ios-sheet-back" onClick={() => ios.setPanel('none')}>
          <div className="ios-pages-edit" onClick={(e) => e.stopPropagation()}>
            <div className="ios-pages-thumbs">
              {layout.pages.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className={`ios-page-thumb ${layout.hidden.includes(i) ? 'off' : ''}`}
                  onClick={() => set((l) => ({ ...l, hidden: l.hidden.includes(i) ? l.hidden.filter((x) => x !== i) : l.hidden.length >= l.pages.length - 1 ? l.hidden : [...l.hidden, i] }))}
                  aria-pressed={!layout.hidden.includes(i)}
                >
                  <span className="ios-page-mini">
                    {p.slice(0, 24).map((it, k) => (
                      <i key={k} className={it.t === 'widget' ? `w-${it.size}` : ''} />
                    ))}
                  </span>
                  <b>{layout.hidden.includes(i) ? '○' : '✓'}</b>
                </button>
              ))}
            </div>
            <p>Tap a page to hide or show it. Hidden pages keep their apps.</p>
            <div className="ios-pages-actions">
              <button type="button" className="ios-pill" onClick={() => setConfirm({ title: 'Reset Home Screen Layout?', text: 'Every page, folder and widget goes back to the original layout.', ok: 'Reset', run: () => resetLayout() })}>
                Reset Layout
              </button>
              <button type="button" className="ios-pill strong" onClick={() => ios.setPanel('none')}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      <AddToHome />
    </div>
  );
}

function EditMenu({ onAdd, onCustomize, onPages }: { onAdd: () => void; onCustomize: () => void; onPages: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ios-edit-menu">
      <button type="button" className="ios-pill" onClick={() => setOpen((o) => !o)}>
        Edit
      </button>
      {open && (
        <div className="ios-menu ios-glass" role="menu" onClick={() => setOpen(false)}>
          <button type="button" role="menuitem" onClick={onAdd}>
            Add Widget <SysIcon n="widget" size={17} />
          </button>
          <button type="button" role="menuitem" onClick={onCustomize}>
            Customize <SysIcon n="brush" size={17} />
          </button>
          <button type="button" role="menuitem" onClick={onPages}>
            Edit Pages <SysIcon n="pages" size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

function QuickActions({
  menu,
  onClose,
  onEdit,
  onRemove,
  onResize,
  launch,
}: {
  menu: { x: number; y: number; item: HomeItem };
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onResize: (s: WidgetSize) => void;
  launch: (li: LaunchItem) => void;
}) {
  const it = menu.item;
  const li = it.t === 'app' ? appById(it.id) : undefined;
  const extra: [string, string, () => void][] = [];
  if (li) {
    const aid = appOf(li);
    if (aid === 'mail') extra.push(['New Message', 'pencil', () => launch({ ...li, action: { app: 'mail', args: { compose: '1' } } })]);
    if (aid === 'camera') extra.push(['Take Selfie', 'camera', () => launch(li)]);
    if (aid === 'preview') extra.push(['Download CV', 'download', () => window.open('./cv/M_R_AHAMED_CV.pdf', '_blank', 'noopener')]);
    if (aid === 'notes') extra.push(['New Note', 'pencil', () => launch({ ...li, action: { app: 'notes', args: { new: '1' } } })]);
    if (aid === 'phone') extra.push(['Keypad', 'keypad', () => launch({ ...li, action: { app: 'phone', args: { tab: 'keypad' } } })]);
    extra.push([
      'Share App',
      'share',
      () => {
        const url = `${location.origin}${location.pathname}#/app/${aid || li.id}`;
        if (navigator.share) void navigator.share({ title: iosLabel(li), url }).catch(() => undefined);
        else void navigator.clipboard?.writeText(url);
      },
    ]);
  }
  const sizes = it.t === 'widget' ? IOS_WIDGETS.find((x) => x.w === it.w)?.sizes ?? [] : [];
  // keep the menu on screen
  const sh = document.querySelector('.ios-shell')?.getBoundingClientRect();
  const left = sh ? Math.min(Math.max(menu.x - 120, sh.left + 10), sh.right - 250) - sh.left : menu.x;
  const top = sh ? Math.min(menu.y + 8, sh.bottom - 300) - sh.top : menu.y;
  const qaDown = useRef(false);
  return (
    <div
      className="ios-qa-back"
      // v10.3 fix — only a new tap closes the menu; the finger lifting from the long-press that opened it does not
      onPointerDown={() => (qaDown.current = true)}
      onClick={() => qaDown.current && onClose()}
    >
      <div className="ios-qa ios-glass" style={{ left, top }} role="menu" onClick={(e) => e.stopPropagation()}>
        {extra.map(([label, g, run]) => (
          <button
            key={label}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              run();
            }}
          >
            {label} <SysIcon n={g} size={18} />
          </button>
        ))}
        {sizes.length > 1 && (
          <div className="ios-qa-sizes">
            {sizes.map((s) => (
              <button key={s} type="button" className={it.t === 'widget' && it.size === s ? 'on' : ''} onClick={() => onResize(s)} aria-label={`Size ${s}`}>
                <SysIcon n={s === 's' ? 'sizeS' : s === 'm' ? 'sizeM' : 'sizeL'} size={18} />
              </button>
            ))}
          </div>
        )}
        <button type="button" role="menuitem" onClick={onEdit}>
          Edit Home Screen <SysIcon n="appGrid" size={18} />
        </button>
        <button type="button" role="menuitem" className="danger" onClick={onRemove}>
          {it.t === 'widget' ? 'Remove Widget' : it.t === 'folder' ? 'Remove Folder' : 'Remove App'} <SysIcon n="minusCircle" size={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * v10.3 — widget gallery like iOS 18 / iPadOS 18.
 *  iPhone: search, big suggestions, then every app; tap an app → swipe through its
 *          sizes (page dots) and tap “Add Widget”.
 *  iPad:   two panes — apps + search on the left, the selected app's sizes on the right.
 */
/** v10.3 — open a launch item at a specific section (widget deep links) */
const withArgs = (li: LaunchItem, args?: Record<string, string>): LaunchItem => (args && 'app' in li.action ? { ...li, action: { app: li.action.app, args: { ...li.action.args, ...args } } } : li);

const FEATURED: [string, WidgetSize][] = [
  ['profile', 'm'],
  ['weather', 's'],
  ['calendar', 's'],
  ['music', 'm'],
  ['projects', 'm'],
];
const SIZE_NAME: Record<WidgetSize, string> = { s: 'Small', m: 'Medium', l: 'Large' };
const wgIcon = (x: { icon: string }) => (appById(x.icon)?.icon ?? 'settings') as IconName;

function WgPreview({ w, size, onClick }: { w: string; size: WidgetSize; onClick?: () => void }) {
  return (
    <button type="button" className={`ios-wg-preview w-${size}`} onClick={onClick} tabIndex={onClick ? 0 : -1} aria-label={`${IOS_WIDGETS.find((x) => x.w === w)?.label} — ${SIZE_NAME[size]}`}>
      <span className="ios-widget ios-glass" inert>
        <IOSWidget w={w} size={size} />
      </span>
    </button>
  );
}

function WidgetGallery({ onAdd, onClose, ipad }: { onAdd: (w: string, s: WidgetSize) => void; onClose: () => void; ipad?: boolean }) {
  const [sel, setSel] = useState<string | null>(ipad ? 'profile' : null);
  const [q, setQ] = useState('');
  const [pg, setPg] = useState(0);
  const [size, setSize] = useState<WidgetSize>('m');
  const pager = useRef<HTMLDivElement>(null);
  const cur = IOS_WIDGETS.find((x) => x.w === sel);
  const ql = q.trim().toLowerCase();
  const list = IOS_WIDGETS.filter((x) => !ql || x.label.toLowerCase().includes(ql));
  const sizes = cur ? (['s', 'm', 'l'] as WidgetSize[]).filter((z) => cur.sizes.includes(z)) : [];
  const open = (w: string) => {
    const it = IOS_WIDGETS.find((x) => x.w === w);
    setSel(w);
    setPg(0);
    setSize(it ? (['s', 'm', 'l'] as WidgetSize[]).find((z) => it.sizes.includes(z)) ?? 'm' : 'm');
    pager.current?.scrollTo({ left: 0 });
  };
  const pageSize = sizes[pg] ?? sizes[0];
  const searchBox = (
    <label className="ios-wg-search">
      <SysIcon n="search" size={15} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Widgets" aria-label="Search Widgets" />
    </label>
  );
  const appRows = (
    <div className="ios-wg-list">
      {list.map((x) => (
        <button key={x.w} type="button" className={ipad && sel === x.w ? 'on' : ''} onClick={() => open(x.w)}>
          <AppIcon name={wgIcon(x)} />
          <span>{x.label}</span>
          <SysIcon n="chev" size={13} className="ios-wg-chev" />
        </button>
      ))}
      {!list.length && <p className="ios-wg-none">No widgets match “{q}”.</p>}
    </div>
  );

  if (ipad)
    return (
      <div className="ios-sheet-back" onClick={onClose}>
        <div className="ios-sheet ios-wg-ipad" role="dialog" aria-label="Add Widget" onClick={(e) => e.stopPropagation()}>
          <aside className="ios-wg-side">
            {searchBox}
            {appRows}
          </aside>
          <section className="ios-wg-main">
            <button type="button" className="ios-wg-x" onClick={onClose} aria-label="Close">
              <SysIcon n="x" size={14} />
            </button>
            {cur ? (
              <>
                <h2>
                  <AppIcon name={wgIcon(cur)} className="ios-wg-hico" /> {cur.label}
                </h2>
                <p className="ios-wg-sub">Choose a size, then add it to your Home Screen.</p>
                <div className="ios-wg-sizes">
                  {sizes.map((z) => (
                    <div key={z} className={`ios-wg-size ${size === z ? 'on' : ''}`}>
                      <WgPreview w={cur.w} size={z} onClick={() => setSize(z)} />
                      <small>{SIZE_NAME[z]}</small>
                    </div>
                  ))}
                </div>
                <button type="button" className="ios-big-btn" onClick={() => onAdd(cur.w, size)}>
                  <SysIcon n="plusCircle" size={18} /> Add Widget
                </button>
              </>
            ) : null}
          </section>
        </div>
      </div>
    );

  return (
    <div className="ios-sheet-back" onClick={onClose}>
      <div className="ios-sheet tall ios-wg-sheet" role="dialog" aria-label="Add Widget" onClick={(e) => e.stopPropagation()}>
        <span className="ios-grabber" />
        {!cur ? (
          <>
            <div className="ios-wg-top">
              {searchBox}
              <button type="button" className="ios-wg-x" onClick={onClose} aria-label="Close">
                <SysIcon n="x" size={14} />
              </button>
            </div>
            {!ql && (
              <div className="ios-wg-featured">
                {FEATURED.map(([w, z]) => (
                  <div key={w} className={`ios-wg-feat w-${z}`}>
                    <WgPreview w={w} size={z} onClick={() => open(w)} />
                  </div>
                ))}
              </div>
            )}
            {appRows}
          </>
        ) : (
          <>
            <div className="ios-wg-top">
              <button type="button" className="ios-back" onClick={() => setSel(null)}>
                ‹ Widgets
              </button>
              <button type="button" className="ios-wg-x" onClick={onClose} aria-label="Close">
                <SysIcon n="x" size={14} />
              </button>
            </div>
            <div className="ios-wg-head">
              <AppIcon name={wgIcon(cur)} className="ios-wg-hico" />
              <h2>{cur.label}</h2>
              <p className="ios-wg-sub">{SIZE_NAME[pageSize]}</p>
            </div>
            <div
              className="ios-wg-pager"
              ref={pager}
              onScroll={(e) => {
                const el = e.currentTarget;
                setPg(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
              }}
            >
              {sizes.map((z) => (
                <div key={z} className="ios-wg-page">
                  <WgPreview w={cur.w} size={z} />
                </div>
              ))}
            </div>
            {sizes.length > 1 && (
              <div className="ios-wg-dots" role="tablist" aria-label="Widget sizes">
                {sizes.map((z, k) => (
                  <button key={z} type="button" role="tab" aria-selected={pg === k} aria-label={SIZE_NAME[z]} className={pg === k ? 'on' : ''} onClick={() => pager.current?.scrollTo({ left: k * pager.current.clientWidth, behavior: 'smooth' })} />
                ))}
              </div>
            )}
            <button type="button" className="ios-big-btn" onClick={() => onAdd(cur.w, pageSize)}>
              <SysIcon n="plusCircle" size={18} /> Add Widget
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** v10.3 — Edit Stack: choose, order and auto-rotate the widgets in a Smart Stack (saved with the Home Screen) */
function StackEditor({ items, rotate, onSave, onClose }: { items: string[]; rotate: boolean; onSave: (stack: string[], rotate: boolean) => void; onClose: () => void }) {
  const [list, setList] = useState(items);
  const [rot, setRot] = useState(rotate);
  const name = (w: string) => IOS_WIDGETS.find((x) => x.w === w)?.label ?? w;
  const icon = (w: string) => wgIcon(IOS_WIDGETS.find((x) => x.w === w) ?? { icon: 'settings' });
  const commit = (l: string[], r = rot) => {
    setList(l);
    onSave(l, r);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const l = [...list];
    [l[i], l[j]] = [l[j], l[i]];
    commit(l);
  };
  return (
    <div className="ios-sheet-back" onClick={onClose}>
      <div className="ios-sheet ios-stack-ed" role="dialog" aria-label="Edit Stack" onClick={(e) => e.stopPropagation()}>
        <span className="ios-grabber" />
        <div className="ios-wg-top">
          <h2>Edit Stack</h2>
          <button type="button" className="ios-pill strong" onClick={onClose}>
            Done
          </button>
        </div>
        <label className="ios-row-toggle">
          <span>
            Smart Rotate
            <small>Flips to another widget every few seconds</small>
          </span>
          <input
            type="checkbox"
            checked={rot}
            onChange={(e) => {
              setRot(e.target.checked);
              onSave(list, e.target.checked);
            }}
          />
        </label>
        <h3 className="ios-stack-h">In this stack</h3>
        <div className="ios-wg-list">
          {list.map((w, i) => (
            <div key={w} className="ios-stack-row">
              <button type="button" className="ios-stack-rm" aria-label={`Remove ${name(w)}`} disabled={list.length <= 2} onClick={() => commit(list.filter((x) => x !== w))}>
                <SysIcon n="minusCircle" size={20} />
              </button>
              <AppIcon name={icon(w)} />
              <span>{name(w)}</span>
              <button type="button" aria-label={`Move ${name(w)} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <SysIcon n="arrowUp" size={15} />
              </button>
              <button type="button" aria-label={`Move ${name(w)} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                <SysIcon n="arrowDown" size={15} />
              </button>
            </div>
          ))}
        </div>
        {STACK_CHOICES.some((w) => !list.includes(w)) && (
          <>
            <h3 className="ios-stack-h">Add to stack</h3>
            <div className="ios-wg-list">
              {STACK_CHOICES.filter((w) => !list.includes(w)).map((w) => (
                <div key={w} className="ios-stack-row">
                  <button type="button" className="ios-stack-add" aria-label={`Add ${name(w)}`} disabled={list.length >= 8} onClick={() => commit([...list, w])}>
                    <SysIcon n="plusCircle" size={20} />
                  </button>
                  <AppIcon name={icon(w)} />
                  <span>{name(w)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="ios-stack-note">A stack holds 2 to 8 widgets. Swipe up or down on it to flip; tap opens the widget on top.</p>
      </div>
    </div>
  );
}

const TINTS = ['#5b8cff', '#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#a55eea', '#ff5fa2', '#c8d6e5'];
function Customize({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();
  return (
    <div className="ios-sheet-back light" onClick={onClose}>
      <div className="ios-sheet ios-custom" role="dialog" aria-label="Customize Home Screen" onClick={(e) => e.stopPropagation()}>
        <span className="ios-grabber" />
        <div className="ios-seg four">
          {(['default', 'dark', 'clear', 'tinted'] as const).map((k) => (
            <button key={k} type="button" className={(settings.iosIconLook ?? 'default') === k ? 'on' : ''} onClick={() => update({ iosIconLook: k })}>
              <span className={`ios-look-sw ${k}`} />
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div className="ios-seg">
          {(['light', 'dark', 'auto'] as const).map((k) => (
            <button key={k} type="button" className={(settings.iosIconMode ?? 'auto') === k ? 'on' : ''} onClick={() => update({ iosIconMode: k, ...(k !== 'auto' ? { appearance: k } : {}) })}>
              <SysIcon n={k === 'light' ? 'sun' : k === 'dark' ? 'moon' : 'contrast'} size={15} /> {k === 'light' ? 'Light' : k === 'dark' ? 'Dark' : 'Auto'}
            </button>
          ))}
        </div>
        {settings.iosIconLook === 'tinted' && (
          <>
            <span className="ios-tint-h">From your wallpaper</span>
            <div className="ios-tints">
              {(wallpaperById(deviceWall(settings, document.documentElement.dataset.device === 'ipad' ? 'ipad' : 'iphone')).palette ?? []).map((c) => (
                <button key={`w${c}`} type="button" aria-label={`Wallpaper colour ${c}`} className={!settings.iosTintAuto && settings.iosTint === c ? 'on' : ''} style={{ background: c }} onClick={() => update({ iosTint: c, iosTintAuto: false })} />
              ))}
            </div>
            <label className="ios-row-toggle">
              <span>Match Wallpaper Automatically</span>
              <input type="checkbox" checked={!!settings.iosTintAuto} onChange={(e) => update({ iosTintAuto: e.target.checked })} />
            </label>
          </>
        )}
        {(settings.iosIconLook === 'tinted' || settings.iosIconLook === 'clear') && (
          <div className="ios-tints">
            {TINTS.map((c) => (
              <button key={c} type="button" aria-label={`Tint ${c}`} className={settings.iosTint === c ? 'on' : ''} style={{ background: c }} onClick={() => update({ iosTint: c, iosTintAuto: false })} />
            ))}
            <input type="color" value={settings.iosTint ?? '#5b8cff'} onChange={(e) => update({ iosTint: e.target.value })} aria-label="Custom tint" />
          </div>
        )}
        <label className="ios-row-toggle">
          <span>Large Icons (no labels)</span>
          <input type="checkbox" checked={!!settings.iosLargeIcons} onChange={(e) => update({ iosLargeIcons: e.target.checked, iosLabels: !e.target.checked })} />
        </label>
        <label className="ios-row-toggle">
          <span>Show App Names</span>
          <input type="checkbox" checked={settings.iosLabels !== false} onChange={(e) => update({ iosLabels: e.target.checked })} />
        </label>
      </div>
    </div>
  );
}

/** "Add to Home Screen" hint for Safari on iPhone / iPad (once) */
function AddToHome() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone || window.matchMedia?.('(display-mode: standalone)').matches;
    let seen = false;
    try {
      seen = !!localStorage.getItem('mra-a2hs-seen');
    } catch {
      seen = true;
    }
    if (!iOS || standalone || seen) return;
    const t = window.setTimeout(() => setShow(true), 6000);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem('mra-a2hs-seen', '1');
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="ios-a2hs ios-glass" role="status">
      <b>Install this portfolio</b>
      <span>
        Tap <i className="ios-share-glyph"><SysIcon n="share" size={15} /></i> Share, then <b>Add to Home Screen</b> — it opens full-screen like an app.
      </span>
      <button type="button" onClick={close} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}