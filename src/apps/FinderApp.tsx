import { useCustomize } from '../system/customize';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useEffect, useState, type ReactNode } from 'react';
import { AppIcon, type IconName } from '../components/AppIcons';
import { cv, education, experience, projects, projectsUsing, timeline, type ExperienceCategory, type ExperienceEntry } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { useSystem } from '../system/SystemContext';
import { openExternal } from '../system/notify';
import { fmtMonth } from '../components/NotificationCenter';
import type { AppProps } from '../components/Desktop';

type Folder = 'all' | 'entrepreneurial' | 'technology' | 'business' | 'leadership' | 'university' | 'education' | 'projects' | 'timeline' | 'trash';

const FOLDERS: { id: Folder; label: string; glyph: string; section: 'Experience' | 'Portfolio' | 'Locations'; cat?: ExperienceCategory }[] = [
  { id: 'all', label: 'All Experience', glyph: '💼', section: 'Experience' },
  { id: 'entrepreneurial', label: 'Entrepreneurial', glyph: '🚀', section: 'Experience', cat: 'Entrepreneurial' },
  { id: 'technology', label: 'Technology', glyph: '📱', section: 'Experience', cat: 'Technology' },
  { id: 'business', label: 'Business', glyph: '📈', section: 'Experience', cat: 'Business' },
  { id: 'leadership', label: 'Leadership', glyph: '⭐️', section: 'Experience', cat: 'Leadership' },
  { id: 'university', label: 'University', glyph: '🏛', section: 'Experience', cat: 'University' },
  { id: 'education', label: 'Education', glyph: '🎓', section: 'Portfolio' },
  { id: 'projects', label: 'Projects', glyph: '🧩', section: 'Portfolio' },
  { id: 'timeline', label: 'Timeline', glyph: '🕒', section: 'Portfolio' },
  { id: 'trash', label: 'Trash', glyph: '🗑', section: 'Locations' },
];

interface Entry {
  id: string;
  name: string;
  kind: string;
  icon?: IconName;
  tile?: { text: string; color: string };
  detail: () => ReactNode;
  open?: () => void;
}

function initials(s: string) {
  return s
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h4>{title}</h4>
      {children}
    </>
  );
}

function ExperienceDetail({ e }: { e: ExperienceEntry }) {
  const wm = useWM();
  const related = Array.from(new Set(e.skills.flatMap((s) => projectsUsing(s).map((p) => p.id))));
  return (
    <>
      <div className="fd-head">
        <span className="fd-tile" style={{ background: e.color }}>
          {initials(e.org)}
        </span>
        <div>
          <h3>{e.title}</h3>
          <div className="fd-sub">
            {e.role} · {e.period}
          </div>
        </div>
      </div>
      <div className="fd-cats">
        {e.categories.map((c) => (
          <span key={c} className="chip">
            {c}
          </span>
        ))}
      </div>
      {e.stats.length > 0 && (
        <div className="fd-stats">
          {e.stats.map((s) => (
            <div key={s.label}>
              <b style={{ color: e.color }}>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <Section title="Overview">
        <p>{e.overview}</p>
      </Section>
      {e.responsibilities.length > 0 && (
        <Section title="Role & Responsibilities">
          <ul>
            {e.responsibilities.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>
      )}
      {e.operations.length > 0 && (
        <Section title="Operations & Services">
          <div className="fd-chips">
            {e.operations.map((f) => (
              <span key={f} className="chip">
                {f}
              </span>
            ))}
          </div>
        </Section>
      )}
      {e.skills.length > 0 && (
        <Section title="Skills Developed">
          <div className="fd-chips">
            {e.skills.map((f) => (
              <span key={f} className="chip accent">
                {f}
              </span>
            ))}
          </div>
        </Section>
      )}
      {e.highlights.length > 0 && (
        <Section title="Highlights & Achievements">
          <ul>
            {e.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Timeline">
        <p>{e.period.includes('+') ? `${e.period} of operations (as supplied)` : e.period}</p>
      </Section>
      {related.length > 0 && (
        <Section title="Related Projects">
          <div className="fd-chips">
            {related.map((id) => (
              <button key={id} type="button" className="chip link" onClick={() => wm.open('xcode', { project: id })}>
                {projects.find((p) => p.id === id)?.name}
              </button>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

export default function FinderApp({ win }: AppProps) {
  const wm = useWM();
  const sys = useSystem();
  const cz = useCustomize();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const normalise = (f?: string): Folder => (f === 'experience' ? 'all' : ((FOLDERS.some((x) => x.id === f) ? f : 'all') as Folder));
  const [folder, setFolder] = useState<Folder>(normalise(win.args?.folder));
  const [sel, setSel] = useState<string | null>(win.args?.item ?? null);
  const [view, setView] = useState<'icons' | 'list'>('icons');
  const [detailOpen, setDetailOpen] = useState(!!win.args?.item);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (win.args?.folder) {
      setFolder(normalise(win.args.folder));
      setSel(win.args.item ?? null);
      setDetailOpen(!!win.args.item);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.launchKey, win.args?.folder, win.args?.item]);

  const goFolder = (f: Folder) => {
    setDir(FOLDERS.findIndex((x) => x.id === f) >= FOLDERS.findIndex((x) => x.id === folder) ? 1 : -1);
    setFolder(f);
    setSel(null);
    setDetailOpen(false);
  };

  const meta = FOLDERS.find((f) => f.id === folder)!;

  const entries: Entry[] = (() => {
    if (meta.section === 'Experience') {
      const list = meta.cat ? experience.filter((e) => e.categories.includes(meta.cat!)) : experience;
      return list.map((e) => ({ id: e.id, name: e.title, kind: e.role, tile: { text: initials(e.org), color: e.color }, detail: () => <ExperienceDetail e={e} /> }));
    }
    switch (folder) {
      case 'education':
        return education.map((e) => ({
          id: e.id,
          name: e.qualification.split(' — ')[0],
          kind: `${e.institution} · ${e.period}`,
          icon: 'graduation' as IconName,
          detail: () => (
            <>
              <h3>{e.qualification}</h3>
              <div className="fd-sub">
                {e.institution} · {e.period}
                {e.location ? ` · ${e.location}` : ''}
              </div>
              {e.details?.map((d) => (
                <p key={d}>{d}</p>
              ))}
            </>
          ),
        }));
      case 'projects':
        return [
          ...projects.map<Entry>((p) => ({
            id: p.id,
            name: p.name,
            kind: p.category,
            icon: 'xcode',
            open: () => wm.open('xcode', { project: p.id }),
            detail: () => (
              <>
                <h3>{p.name}</h3>
                <div className="fd-sub">
                  {p.category}
                  {p.period ? ` · ${p.period}` : ''}
                </div>
                <p>{p.description}</p>
                <div className="fd-chips">
                  {Object.values(p.stack)
                    .flat()
                    .slice(0, 12)
                    .map((t) => (
                      <span key={t as string} className="chip">
                        {t as string}
                      </span>
                    ))}
                </div>
                <div className="fd-actions">
                  <button type="button" className="btn btn-primary" onClick={() => wm.open('xcode', { project: p.id })}>
                    Open in Xcode
                  </button>
                  {p.repo && (
                    <button type="button" className="btn" onClick={() => openExternal(p.repo!, { title: `Opening ${p.name} repository`, app: 'GitHub', icon: 'github' })}>
                      GitHub ↗
                    </button>
                  )}
                </div>
              </>
            ),
          })),
          {
            id: 'cv',
            name: cv.displayName,
            kind: 'PDF Document',
            icon: 'pdf',
            open: () => wm.open('preview'),
            detail: () => (
              <>
                <h3>{cv.displayName}</h3>
                <div className="fd-actions">
                  <button type="button" className="btn btn-primary" onClick={() => wm.open('preview')}>
                    Open
                  </button>
                  <a className="btn" href={cv.url} download={cv.fileName}>
                    Download
                  </a>
                </div>
              </>
            ),
          },
        ];
      case 'trash':
        return cz.trash.map((t) => ({
          id: `${t.kind}-${t.id}`,
          name: t.label,
          kind: t.kind === 'app' ? 'Application' : 'Widget',
          icon: t.icon,
          open: () => cz.putBack(t),
          detail: () => (
            <>
              <h3>{t.label}</h3>
              <div className="fd-sub">
                {t.kind === 'app' ? 'Application' : 'Desktop widget'} · moved to the Trash {new Date(t.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <p>{t.kind === 'app' ? 'Deleted from Launchpad. Put it back to show it in Launchpad, the Dock and Spotlight again.' : 'Removed from the desktop. Put it back to show it with the other widgets.'}</p>
              <div className="fd-actions">
                <button type="button" className="btn btn-primary" onClick={() => cz.putBack(t)}>
                  Put Back
                </button>
              </div>
            </>
          ),
        }));
      default:
        return [];
    }
  })();

  const current = entries.find((e) => e.id === sel) ?? null;

  return (
    <div className={`finder ${detailOpen && current ? 'detail-open' : ''}`}>
      <aside className="fd-side">
        {(['Experience', 'Portfolio', 'Locations'] as const).map((sec) => (
          <div key={sec}>
            <div className="fd-side-h">{sec}</div>
            {FOLDERS.filter((f) => f.section === sec).map((f) => (
              <button key={f.id} type="button" className={`fd-nav ${folder === f.id ? 'on' : ''}`} onClick={() => goFolder(f.id)}>
                <span aria-hidden="true">{f.glyph}</span> {f.label}
              </button>
            ))}
          </div>
        ))}
      </aside>
      <section className="fd-main">
        <div className="fd-toolbar">
          {detailOpen && current ? (
            <button type="button" className="fd-back" onClick={() => setDetailOpen(false)} aria-label="Back to folder">
              ‹
            </button>
          ) : null}
          <select className="fd-folder-select" value={folder} onChange={(e) => goFolder(e.target.value as Folder)} aria-label="Folder">
            {FOLDERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <b className="fd-title">{meta.label}</b>
          <span className="fd-count">{folder === 'timeline' ? `${timeline.length} milestones` : `${entries.length} item${entries.length === 1 ? '' : 's'}`}</span>
          <span className="fd-spacer" />
          {folder === 'trash' && (
            <button type="button" className="btn fd-empty-btn" disabled={!cz.trash.length} onClick={() => setConfirmEmpty(true)}>
              Empty
            </button>
          )}
          {folder !== 'timeline' && (
            <div className="seg-ctl light" role="group" aria-label="View">
              <button type="button" className={view === 'icons' ? 'on' : ''} onClick={() => setView('icons')} aria-label="Icon view" aria-pressed={view === 'icons'}>
                ▦
              </button>
              <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}>
                ☰
              </button>
            </div>
          )}
        </div>
        {folder === 'timeline' ? (
          <ol className={`fd-timeline scroll-smooth slide-${dir > 0 ? 'r' : 'l'}`} key="timeline">
            {timeline.map((t, i) => (
              <li key={t.title + t.start} className={`tl-${t.kind.toLowerCase()}`} style={{ ['--i' as string]: i }}>
                <span className="tl-date">
                  {fmtMonth(t.start)}
                  {t.end ? ` – ${fmtMonth(t.end)}` : ''}
                </span>
                <span className="tl-dot" />
                <span className="tl-body">
                  <b>{t.title}</b>
                  <span>
                    {t.kind} · {t.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="fd-content">
            <div className={`fd-items ${view} scroll-smooth slide-${dir > 0 ? 'r' : 'l'}`} key={folder + view}>
              {!entries.length && <div className="fd-empty">{folder === 'trash' ? 'Trash is empty' : 'No items'}</div>}
              {entries.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`fd-item ${sel === e.id ? 'sel' : ''}`}
                  onClick={() => {
                    setSel(e.id);
                    setDetailOpen(true);
                  }}
                  onDoubleClick={() => e.open?.()}
                  onKeyDown={(ev) => {
                    if (ev.key === ' ') {
                      ev.preventDefault();
                      sys.setQuickLook({ kind: 'info', title: e.name, icon: e.icon ?? 'briefcase', rows: [['Kind', e.kind]], origin: ev.currentTarget.getBoundingClientRect() });
                    }
                  }}
                  title={e.name}
                >
                  <span className="fd-item-ico">
                    {e.icon ? (
                      <AppIcon name={e.icon} />
                    ) : (
                      <span className="fd-tile" style={{ background: e.tile?.color }}>
                        {e.tile?.text}
                      </span>
                    )}
                  </span>
                  <span className="fd-item-name">{e.name}</span>
                  <span className="fd-item-kind">{e.kind}</span>
                </button>
              ))}
            </div>
            <div className="fd-detail scroll-smooth" key={current?.id ?? 'none'}>
              {current ? current.detail() : <div className="fd-placeholder">Select an item to see its details</div>}
            </div>
          </div>
        )}
      </section>
      {confirmEmpty && (
        <ConfirmDialog
          icon="trash"
          message="Are you sure you want to permanently erase the items in the Trash?"
          detail="You can’t undo this action. (Restore defaults in Launchpad → Edit brings everything back.)"
          confirmLabel="Empty Trash"
          onCancel={() => setConfirmEmpty(false)}
          onConfirm={() => {
            cz.emptyTrash();
            setConfirmEmpty(false);
            setSel(null);
            setDetailOpen(false);
          }}
        />
      )}
    </div>
  );
}
