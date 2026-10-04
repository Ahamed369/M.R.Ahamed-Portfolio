import { useCustomize } from '../system/customize';
import { daysLeft, eraseDeleted, restoreDeleted, useDeleted } from '../system/history';
import { useSettings } from '../system/SettingsContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppIcon, type IconName } from '../components/AppIcons';
import { cv, education, experience, projects, projectsUsing, timeline, type ExperienceCategory, type ExperienceEntry } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { useSystem } from '../system/SystemContext';
import { openExternal } from '../system/notify';
import { fmtMonth } from '../components/NotificationCenter';
import type { AppProps } from '../components/Desktop';
import { addFiles, duplicateFile, fileUrl, fmtSize, kindOf, removeFile, renameFile, setFileTags, TAGS, useMyFiles, type MyFile } from '../system/myFiles';
import { SysIcon } from '../components/SysIcons';

type Folder = 'all' | 'entrepreneurial' | 'technology' | 'business' | 'leadership' | 'university' | 'education' | 'projects' | 'timeline' | 'myfiles' | 'trash' | `tag-${string}`;

const FOLDERS: { id: Folder; label: string; glyph: string; section: 'Experience' | 'Portfolio' | 'Locations'; cat?: ExperienceCategory; color?: string }[] = [
  { id: 'all', label: 'All Experience', glyph: 'briefcase', section: 'Experience' },
  { id: 'entrepreneurial', label: 'Entrepreneurial', glyph: 'sparkles', section: 'Experience', cat: 'Entrepreneurial' },
  { id: 'technology', label: 'Technology', glyph: 'device', section: 'Experience', cat: 'Technology' },
  { id: 'business', label: 'Business', glyph: 'bars', section: 'Experience', cat: 'Business' },
  { id: 'leadership', label: 'Leadership', glyph: 'starFill', section: 'Experience', cat: 'Leadership' },
  { id: 'university', label: 'University', glyph: 'graduation', section: 'Experience', cat: 'University' },
  { id: 'education', label: 'Education', glyph: 'graduation', section: 'Portfolio' },
  { id: 'projects', label: 'Projects', glyph: 'code', section: 'Portfolio' },
  { id: 'timeline', label: 'Timeline', glyph: 'timer', section: 'Portfolio' },
  { id: 'myfiles', label: 'My Files', glyph: 'folder', section: 'Locations' },
  { id: 'trash', label: 'Trash', glyph: 'trash', section: 'Locations' },
  ...TAGS.map((t) => ({ id: `tag-${t.id}` as Folder, label: t.label, glyph: '●', section: 'Locations' as const, color: t.color })),
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

const fileIcon = (t: string): IconName => (t.startsWith('image/') ? 'photos' : t.startsWith('video/') ? 'tv' : t.startsWith('audio/') ? 'music' : t === 'application/pdf' ? 'pdf' : 'textedit') as IconName;

function MyFileDetail({ f, onDelete }: { f: MyFile; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [name, setName] = useState(f.name);
  useEffect(() => {
    let live = true;
    void fileUrl(f.id).then((u) => {
      if (!live) return;
      setUrl(u);
      if (u && (f.type.startsWith('text/') || /\.(md|txt|json|csv|js|ts|css|html)$/i.test(f.name)) && f.size < 200000)
        void fetch(u)
          .then((r) => r.text())
          .then((t) => live && setText(t.slice(0, 4000)));
    });
    setName(f.name);
    return () => {
      live = false;
    };
  }, [f.id, f.name, f.type, f.size]);
  return (
    <>
      <h3>{f.name}</h3>
      <div className="fd-sub">
        {kindOf(f.type)} · {fmtSize(f.size)} · added {new Date(f.added).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </div>
      <div className="fd-file-prev">
        {url && f.type.startsWith('image/') && <img src={url} alt={f.name} />}
        {url && f.type.startsWith('video/') && <video src={url} controls playsInline />}
        {url && f.type.startsWith('audio/') && <audio src={url} controls />}
        {url && f.type === 'application/pdf' && <iframe src={url} title={f.name} />}
        {text !== null && <pre>{text}</pre>}
      </div>
      <h4>Tags</h4>
      <div className="fd-tags">
        {TAGS.map((t) => {
          const on = f.tags.includes(t.id);
          return (
            <button key={t.id} type="button" className={`fd-tag ${on ? 'on' : ''}`} style={{ ['--tag' as string]: t.color }} aria-pressed={on} onClick={() => void setFileTags(f.id, on ? f.tags.filter((x) => x !== t.id) : [...f.tags, t.id])}>
              <i />
              {t.label}
            </button>
          );
        })}
      </div>
      <h4>Name</h4>
      <form
        className="fd-rename"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && name.trim() !== f.name) void renameFile(f.id, name.trim());
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} aria-label="File name" />
        <button type="submit" className="btn" disabled={!name.trim() || name.trim() === f.name}>
          Rename
        </button>
      </form>
      <div className="fd-actions">
        {url && (
          <a className="btn btn-primary" href={url} target="_blank" rel="noopener noreferrer">
            Open
          </a>
        )}
        {url && (
          <a className="btn" href={url} download={f.name}>
            Download
          </a>
        )}
        <button type="button" className="btn" onClick={() => void duplicateFile(f.id)}>
          Duplicate
        </button>
        <button type="button" className="btn" data-noconfirm onClick={onDelete}>
          Delete…
        </button>
      </div>
    </>
  );
}

export default function FinderApp({ win }: AppProps) {
  const wm = useWM();
  const sys = useSystem();
  const cz = useCustomize();
  const deleted = useDeleted();
  const { settings: fset } = useSettings();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const normalise = (f?: string): Folder => (f === 'experience' ? 'all' : ((FOLDERS.some((x) => x.id === f) ? f : 'all') as Folder));
  const [tabs, setTabs] = useState<Folder[]>(() => [normalise(win.args?.folder)]);
  const [tabIx, setTabIx] = useState(0);
  const folder = tabs[Math.min(tabIx, tabs.length - 1)];
  const setFolder = (f: Folder) => setTabs((l) => l.map((x, i) => (i === Math.min(tabIx, l.length - 1) ? f : x)));
  const myFiles = useMyFiles();
  const [dropping, setDropping] = useState(false);
  const [askDelFile, setAskDelFile] = useState<MyFile | null>(null);
  const pick = useRef<HTMLInputElement>(null);
  const newTab = () => {
    setTabs((l) => [...l, folder]);
    setTabIx(tabs.length);
  };
  const closeTab = (i: number) => {
    if (tabs.length < 2) return;
    setTabs((l) => l.filter((_, k) => k !== i));
    setTabIx((x) => (i < x || x === tabs.length - 1 ? Math.max(0, x - 1) : x));
  };
  useEffect(() => {
    const dup = (e: Event) => {
      if ((e as CustomEvent<string>).detail === 'finder' && sel && myFiles.some((f) => f.id === sel)) void duplicateFile(sel);
    };
    window.addEventListener('mra-duplicate', dup);
    return () => window.removeEventListener('mra-duplicate', dup);
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || wm.focusedId !== 'finder') return;
      if (e.key.toLowerCase() === 'd' && sel && myFiles.some((f) => f.id === sel)) {
        e.preventDefault();
        void duplicateFile(sel);
        return;
      }
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        newTab();
      } else if (e.key.toLowerCase() === 'w' && tabs.length > 1) {
        e.preventDefault();
        closeTab(tabIx);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
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
      case 'myfiles':
        return myFiles.map((f) => ({ id: f.id, name: f.name, kind: `${kindOf(f.type)} · ${fmtSize(f.size)}`, icon: fileIcon(f.type), open: () => void fileUrl(f.id).then((u) => u && window.open(u, '_blank', 'noopener')), detail: () => <MyFileDetail f={f} onDelete={() => setAskDelFile(f)} /> }));
      case 'trash':
        return [
          ...deleted.map((d) => ({
            id: `del-${d.id}`,
            name: d.title,
            kind: `${d.app} item`,
            icon: 'trashfull' as IconName,
            open: () => restoreDeleted(d),
            detail: () => (
              <>
                <h3>{d.title}</h3>
                <div className="fd-sub">
                  From {d.app} · deleted {new Date(d.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  {fset.trashAutoEmpty ? ` · ${daysLeft(d, fset.trashAutoEmpty)} days left` : ''}
                </div>
                <p>Put it back to restore it exactly where it was in {d.app}.</p>
                <div className="fd-actions">
                  <button type="button" className="btn btn-primary" onClick={() => restoreDeleted(d)}>
                    Put Back
                  </button>
                  <button type="button" className="btn" onClick={() => eraseDeleted(d.id)}>
                    Delete Immediately
                  </button>
                </div>
              </>
            ),
          })),
          ...cz.trash.map((t) => ({
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
        })),
        ];
      default:
        if (folder.startsWith('tag-')) {
          const tg = folder.slice(4);
          return myFiles.filter((f) => f.tags.includes(tg)).map((f) => ({ id: f.id, name: f.name, kind: `${kindOf(f.type)} · ${fmtSize(f.size)}`, icon: fileIcon(f.type), open: () => void fileUrl(f.id).then((u) => u && window.open(u, '_blank', 'noopener')), detail: () => <MyFileDetail f={f} onDelete={() => setAskDelFile(f)} /> }));
        }
        return [];
    }
  })();

  const current = entries.find((e) => e.id === sel) ?? null;

  return (
    <div
      className={`finder ${detailOpen && current ? 'detail-open' : ''} ${dropping ? 'fd-dropping' : ''}`}
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
        void addFiles(e.dataTransfer.files).then(() => goFolder('myfiles'));
      }}
    >
      <aside className="fd-side">
        {(['Experience', 'Portfolio', 'Locations'] as const).map((sec) => (
          <div key={sec}>
            <div className="fd-side-h">{sec}</div>
            {FOLDERS.filter((f) => f.section === sec && !f.color).map((f) => (
              <button key={f.id} type="button" className={`fd-nav ${folder === f.id ? 'on' : ''}`} onClick={() => goFolder(f.id)}>
                <span aria-hidden="true" className="fd-nav-ico">
                  <SysIcon n={f.glyph} size={16} />
                </span>{' '}
                {f.label}
              </button>
            ))}
          </div>
        ))}
        <div>
          <div className="fd-side-h">Tags</div>
          {FOLDERS.filter((f) => f.color).map((f) => (
            <button key={f.id} type="button" className={`fd-nav ${folder === f.id ? 'on' : ''}`} onClick={() => goFolder(f.id)}>
              <i className="fd-tag-dot" style={{ background: f.color }} aria-hidden="true" /> {f.label}
            </button>
          ))}
        </div>
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
          {folder === 'myfiles' && (
            <>
              <input ref={pick} type="file" multiple hidden onChange={(e) => e.target.files && void addFiles(e.target.files).then(() => (e.target.value = ''))} />
              <button type="button" className="btn fd-empty-btn" onClick={() => pick.current?.click()}>
                Add Files…
              </button>
            </>
          )}
          <button type="button" className="fd-newtab" onClick={newTab} aria-label="New tab" title="New Tab (⌘T)">
            ＋
          </button>
          {folder === 'trash' && (
            <button type="button" className="btn fd-empty-btn" disabled={!cz.trash.length && !deleted.length} onClick={() => setConfirmEmpty(true)}>
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
        {tabs.length > 1 && (
          <div className="fd-tabs" role="tablist" aria-label="Finder tabs">
            {tabs.map((t, i) => (
              <div key={i} role="tab" aria-selected={i === tabIx} className={`fd-tab ${i === tabIx ? 'on' : ''}`} onClick={() => (setTabIx(i), setSel(null), setDetailOpen(false))}>
                <button type="button" aria-label="Close tab" onClick={(e) => (e.stopPropagation(), closeTab(i))}>
                  ✕
                </button>
                <span>{FOLDERS.find((f) => f.id === t)?.label}</span>
              </div>
            ))}
          </div>
        )}
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
              {!entries.length && <div className="fd-empty">{folder === 'trash' ? 'Trash is empty' : folder === 'myfiles' ? 'Drag files here from your computer, or click “Add Files…”. They stay in this browser only.' : folder.startsWith('tag-') ? 'No files with this tag yet — add tags in My Files.' : 'No items'}</div>}
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
      {askDelFile && (
        <ConfirmDialog
          icon="trash"
          message={`Delete “${askDelFile.name}”?`}
          detail="It is removed from this browser. The original on your computer isn’t touched."
          confirmLabel="Delete"
          onCancel={() => setAskDelFile(null)}
          onConfirm={() => {
            void removeFile(askDelFile.id);
            setAskDelFile(null);
            setSel(null);
            setDetailOpen(false);
          }}
        />
      )}
      {dropping && <div className="fd-drop-hint">Drop to add to My Files</div>}
      {confirmEmpty && (
        <ConfirmDialog
          icon="trash"
          message="Are you sure you want to permanently erase the items in the Trash?"
          detail="You can’t undo this action. (Restore defaults in Launchpad → Edit brings everything back.)"
          confirmLabel="Empty Trash"
          onCancel={() => setConfirmEmpty(false)}
          onConfirm={() => {
            cz.emptyTrash();
            eraseDeleted();
            setConfirmEmpty(false);
            setSel(null);
            setDetailOpen(false);
          }}
        />
      )}
    </div>
  );
}
