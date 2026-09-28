import { useState, type KeyboardEvent, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react';
import { AppIcon, type IconName } from './AppIcons';
import { useWM } from '../system/WindowManager';
import { useSystem, type QuickLookState } from '../system/SystemContext';
import { cv, education, experience, personal, projects, skillNotes } from '../data/portfolio';
import type { AppId } from '../system/types';
import { photos } from '../data/media';
import { ALL_SERVICES } from '../data/services';
import { useDeskApps, useFreeDrag, useIconPositions, type Pos } from '../system/desk';
import { LAUNCH_ITEMS } from '../system/launch';
import { useLaunch } from '../system/useLaunch';

export interface DeskItem {
  id: string;
  label: string;
  icon: IconName;
  app: AppId;
  args?: Record<string, string>;
  kind: string;
}

export const DESK_ITEMS: DeskItem[] = [
  { id: 'services', label: 'My Services', icon: 'folder', app: 'services', kind: 'Folder — Expertise & Capabilities' },
  { id: 'skills', label: 'My Skills', icon: 'notes', app: 'notes', kind: 'Notes folder' },
  { id: 'achievements', label: 'Achievements.pptx', icon: 'slides', app: 'slides', kind: 'Presentation' },
  { id: 'xcode', label: 'Portfolio.xcodeproj', icon: 'xcode', app: 'xcode', kind: 'Xcode project' },
  { id: 'experience', label: 'Experience', icon: 'folder', app: 'finder', args: { folder: 'all' }, kind: 'Folder' },
  { id: 'education', label: 'Education', icon: 'folder', app: 'finder', args: { folder: 'education' }, kind: 'Folder' },
  { id: 'cv', label: cv.displayName, icon: 'pdf', app: 'preview', kind: 'PDF document' },
  { id: 'resume', label: 'Résumé.pages', icon: 'pages', app: 'pages', kind: 'Pages document' },
  { id: 'numbers', label: 'Projects.numbers', icon: 'numbers', app: 'numbers', kind: 'Numbers spreadsheet' },
  { id: 'screenshots', label: 'Screenshots', icon: 'folder', app: 'photos', args: { album: 'Screenshots' }, kind: 'Folder' },
  { id: 'vcard', label: 'M.R. Ahamed.vcf', icon: 'contacts', app: 'contacts', kind: 'vCard (contact card)' },
];

/** Quick Look / Get Info content for a desktop item. */
export function quickLookFor(id: string, origin?: DOMRect | null): QuickLookState {
  const it = DESK_ITEMS.find((d) => d.id === id);
  if (!it) return null;
  if (id === 'cv')
    return {
      kind: 'images',
      origin,
      index: 0,
      items: cv.pages.map((src, i) => ({ src, title: `${cv.displayName} — page ${i + 1}` })),
    };
  const rows: [string, string][] = [['Kind', it.kind]];
  let text = '';
  if (id === 'skills') {
    rows.push(['Notes', String(skillNotes.length)]);
    text = 'Evidence-based skills: each technology links to the projects that use it.';
  } else if (id === 'xcode') {
    rows.push(['Projects', String(projects.length)], ['On GitHub', String(projects.filter((p) => p.repo).length)]);
    text = projects.map((p) => p.name).join(' · ');
  } else if (id === 'experience') {
    rows.push(['Items', String(experience.length)]);
    text = experience.slice(0, 5).map((e) => `${e.title} — ${e.role}`).join(' · ');
  } else if (id === 'education') {
    rows.push(['Items', String(education.length)]);
    text = education.map((e) => e.qualification).join(' · ');
  } else if (id === 'resume') {
    rows.push(['Pages', '1 (A4)'], ['Sections', 'Profile, Education, Projects, Experience, Skills']);
    text = `Résumé generated from the portfolio data — ${personal.headline}. Open it in Pages to edit or export a PDF.`;
  } else if (id === 'numbers') {
    rows.push(['Sheets', 'Projects · Skills · Education'], ['Projects', String(projects.length)]);
    text = 'Spreadsheet of every project with its stack, status and repository, plus skill counts.';
  } else if (id === 'screenshots') {
    rows.push(['Items', String(photos.filter((p) => p.album === 'Screenshots').length)]);
    text = 'Screenshots of this portfolio desktop — opens the Screenshots album in Photos.';
  } else if (id === 'vcard') {
    rows.push(['Phone', personal.phone], ['Email', personal.email], ['Location', personal.location]);
    text = `Contact card for ${personal.name} — open Contacts to call, message or download the .vcf.`;
  } else if (id === 'services') {
    rows.push(['Groups', '01 Technology · 02 Entrepreneurship & Business'], ['Services', String(ALL_SERVICES.length)]);
    text = 'Expertise & Capabilities — technology services linked to real projects, and business services from ventures in automotive, trade, electronics and property.';
  } else if (id === 'achievements') {
    text = 'Achievement deck: executive summary, four ventures with verified metrics, leadership, education and contact.';
  }
  rows.push(['Owner', personal.name]);
  return { kind: 'info', title: it.label, icon: it.icon, rows, text, origin };
}

export function DesktopIcons({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const wm = useWM();
  const sys = useSystem();
  const [lastTap, setLastTap] = useState<{ id: string; t: number } | null>(null);

  const launch = useLaunch();
  const [pos, setPos] = useIconPositions();
  const [deskApps, setDeskApps] = useDeskApps();
  const shortcuts = deskApps.map((id) => LAUNCH_ITEMS.find((l) => l.id === id)).filter((x): x is (typeof LAUNCH_ITEMS)[number] => !!x);
  const open = (it: DeskItem) => {
    if (it.id.startsWith('app:')) {
      const li = LAUNCH_ITEMS.find((l) => l.id === it.id.slice(4));
      if (li) launch(li.action, li.label);
      return;
    }
    wm.open(it.app, it.args);
  };
  const items: DeskItem[] = [...DESK_ITEMS, ...shortcuts.map((l) => ({ id: `app:${l.id}`, label: l.label, icon: l.icon, app: 'finder' as AppId, kind: 'Application shortcut' }))];

  const onPointerUp = (e: RPointerEvent, it: DeskItem) => {
    if (e.button !== 0) return;
    // Touch devices: single tap opens (there is no double-click on phones).
    if (e.pointerType === 'touch') {
      open(it);
      return;
    }
    const now = performance.now();
    if (lastTap && lastTap.id === it.id && now - lastTap.t < 420) {
      open(it);
      setLastTap(null);
    } else setLastTap({ id: it.id, t: now });
  };

  const onKey = (e: KeyboardEvent, it: DeskItem) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      open(it);
    } else if (e.key === ' ') {
      e.preventDefault();
      sys.setQuickLook(quickLookFor(it.id, (e.currentTarget as HTMLElement).getBoundingClientRect()));
    }
  };

  const onContext = (e: RMouseEvent, it: DeskItem) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(it.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Open', action: () => open(it) },
        { label: 'Quick Look', action: () => sys.setQuickLook(quickLookFor(it.id, rect)) },
        {
          label: 'Get Info',
          action: () =>
            sys.setQuickLook({
              kind: 'info',
              title: `${it.label} Info`,
              icon: it.icon,
              rows: [
                ['Kind', it.kind],
                ['Where', 'Desktop'],
                ['Opens with', it.app === 'finder' ? 'Finder' : it.app === 'preview' ? 'Preview' : it.label],
                ['Owner', personal.name],
              ],
              origin: rect,
            }),
        },
        ...(it.id === 'cv' ? [{ label: '', sep: true }, { label: 'Download PDF', action: () => window.open(cv.url, '_blank', 'noopener') }] : []),
        { label: '', sep: true },
        ...(pos[it.id]
          ? [
              {
                label: 'Put Back in Grid',
                action: () =>
                  setPos((m) => {
                    const n = { ...m };
                    delete n[it.id];
                    return n;
                  }),
              },
            ]
          : []),
        ...(it.id.startsWith('app:') ? [{ label: 'Remove from Desktop', action: () => setDeskApps((l) => l.filter((x) => `app:${x}` !== it.id)) }] : []),
      ],
    });
  };

  return (
    <div className="desk-icons" role="list" aria-label="Desktop">
      {items.map((it, i) => (
        <DeskIconSlot
          key={it.id}
          it={it}
          i={i}
          pos={pos[it.id]}
          selected={selected === it.id}
          onSelect={onSelect}
          onPlace={(p) => setPos((m) => ({ ...m, [it.id]: p }))}
          onPointerUp={onPointerUp}
          onKey={onKey}
          onContext={onContext}
        />
      ))}
    </div>
  );
}

function DeskIconSlot({
  it,
  i,
  pos,
  selected,
  onSelect,
  onPlace,
  onPointerUp,
  onKey,
  onContext,
}: {
  it: DeskItem;
  i: number;
  pos?: Pos;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onPlace: (p: Pos) => void;
  onPointerUp: (e: RPointerEvent, it: DeskItem) => void;
  onKey: (e: KeyboardEvent, it: DeskItem) => void;
  onContext: (e: RMouseEvent, it: DeskItem) => void;
}) {
  const drag = useFreeDrag({ enabled: window.innerWidth >= 700, onDrop: onPlace });
  return (
    <div role="listitem" className={pos ? 'desk-placed' : ''} style={pos ? { left: pos.x, top: pos.y, ['--i' as string]: i } : { ['--i' as string]: i }} onPointerDown={(e) => (drag.onPointerDown(e), e.stopPropagation())}>
      <button
        type="button"
        className={`desk-icon ${selected ? 'selected' : ''}`}
        aria-label={`${it.label} — double-click to open, drag to move, Space for Quick Look`}
        onPointerDown={() => onSelect(it.id)}
        onPointerUp={(e) => !drag.wasDragged() && onPointerUp(e, it)}
        onKeyDown={(e) => onKey(e, it)}
        onContextMenu={(e) => onContext(e, it)}
      >
        <span className="desk-icon-img">
          <AppIcon name={it.icon} />
        </span>
        <span className="desk-icon-label">{it.label}</span>
      </button>
    </div>
  );
}
