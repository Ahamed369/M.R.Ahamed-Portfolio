import { DragBar, Lights } from '../components/Window';
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as RMouseEvent } from 'react';
import { useSystem } from '../system/SystemContext';
import { copyText, sharePortfolio } from '../system/share';
import { notify } from '../system/notify';
import { projects, projectsUsing, skillNotes } from '../data/portfolio';
import { readStore, writeStore } from '../system/storage';
import { useWM } from '../system/WindowManager';
import type { AppProps } from '../components/Desktop';

interface MyNote {
  id: string;
  title: string;
  body: string;
  at: number;
  pinned?: boolean;
  deleted?: number;
}

export default function NotesApp({ win }: AppProps) {
  const sys = useSystem();
  const wm = useWM();
  const [active, setActive] = useState(win.args?.note && skillNotes.some((n) => n.id === win.args?.note) ? win.args.note : skillNotes[0].id);
  const [q, setQ] = useState('');
  const [folder, setFolder] = useState<'skills' | 'projects' | 'mine' | 'deleted'>('skills');
  const [proj, setProj] = useState(projects[0].id);
  const [mine, setMine] = useState<MyNote[]>(() => readStore('mra-notes-mine', { list: [] as MyNote[] }).list);
  const [mineSel, setMineSel] = useState<string | null>(null);
  useEffect(() => writeStore('mra-notes-mine', { list: mine }), [mine]);
  const live = mine.filter((m) => !m.deleted);
  const trashed = mine.filter((m) => m.deleted);
  const qn = q.trim().toLowerCase();
  const mineVisible = live.filter((m) => !qn || `${m.title} ${m.body}`.toLowerCase().includes(qn)).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.at - a.at);
  const patch = (id: string, p: Partial<MyNote>, touch = false) => setMine((l) => l.map((x) => (x.id === id ? { ...x, ...p, ...(touch ? { at: Date.now() } : {}) } : x)));
  const trashNote = (m: MyNote) => {
    patch(m.id, { deleted: Date.now(), pinned: false });
    if (mineSel === m.id) setMineSel(null);
    notify({ app: 'Notes', icon: 'notes', title: 'Moved to Recently Deleted', body: m.title || 'New Note', actions: [{ label: 'Undo', run: () => patch(m.id, { deleted: undefined }) }] });
  };
  const dupNote = (m: MyNote) => {
    const n = { ...m, id: `m${Date.now()}`, title: `${m.title || 'New Note'} copy`, at: Date.now(), pinned: false };
    setMine((l) => [n, ...l]);
    setMineSel(n.id);
  };
  // v10.1 — Edit → Duplicate (⌘D)
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== 'notes') return;
      const m = mine.find((x) => x.id === mineSel && !x.deleted);
      if (m) dupNote(m);
    };
    window.addEventListener('mra-duplicate', on);
    return () => window.removeEventListener('mra-duplicate', on);
  });
  const noteMenu = (e: RMouseEvent, m: MyNote) => {
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: m.deleted
        ? [
            { label: 'Recover', action: () => patch(m.id, { deleted: undefined }) },
            { label: 'Delete Permanently', action: () => setMine((l) => l.filter((x) => x.id !== m.id)) },
          ]
        : [
            { label: m.pinned ? 'Unpin Note' : 'Pin Note', action: () => patch(m.id, { pinned: !m.pinned }) },
            { label: 'Duplicate', action: () => dupNote(m) },
            { label: 'Copy', action: () => void copyText(`${m.title}\n\n${m.body}`) },
            { label: 'Share…', action: () => void sharePortfolio({ title: m.title || 'Note', text: `${m.title}\n${m.body}`.slice(0, 300) }) },
            { label: '', sep: true },
            { label: 'Delete', action: () => trashNote(m) },
          ],
    });
  };
  const newNote = () => {
    const n: MyNote = { id: `m${Date.now()}`, title: 'New Note', body: '', at: Date.now() };
    setMine((l) => [n, ...l]);
    setMineSel(n.id);
    setFolder('mine');
  };
  const listRef = useRef<HTMLDivElement>(null);
  const note = skillNotes.find((n) => n.id === active) ?? skillNotes[0];
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    if (win.args?.note) setActive(win.args.note);
  }, [win.launchKey, win.args?.note]);

  const query = q.trim().toLowerCase();
  const visible = query ? skillNotes.filter((n) => `${n.title} ${n.subtitle} ${n.tags.join(' ')} ${(n.profile ?? []).join(' ')}`.toLowerCase().includes(query)) : skillNotes;

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = visible.findIndex((n) => n.id === active);
    const next = visible[Math.min(visible.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (!next) return;
    setActive(next.id);
    listRef.current?.querySelector<HTMLElement>(`[data-note="${next.id}"]`)?.focus();
  };

  // Evidence: which projects use each technology in this note
  const evidence = note.tags.map((t) => ({ tag: t, projects: projectsUsing(t) })).filter((x) => x.projects.length);

  return (
    <div className="notes">
      <aside className="notes-side scroll-smooth">
        <DragBar className="v7-side-drag">
          <Lights />
        </DragBar>
        <input className="notes-search" placeholder="Search skills" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search skills" />
        <div className="notes-group">iCloud</div>
        {(
          [
            ['skills', '📁 My Skills', skillNotes.length],
            ['projects', '📁 Projects', projects.length],
            ['mine', '📝 My Notes', live.length],
            ['deleted', '🗑 Recently Deleted', trashed.length],
          ] as ['skills' | 'projects' | 'mine' | 'deleted', string, number][]
        ).map(([id, l, n]) => (
          <button key={id} type="button" className={`notes-folder nt7-folder ${folder === id ? 'on' : ''}`} onClick={() => setFolder(id)}>
            <span>{l}</span>
            <span className="count">{n}</span>
          </button>
        ))}
        {folder === 'projects' && (
          <div className="notes-list" role="listbox" aria-label="Project notes">
            {projects
              .filter((p) => !query || `${p.name} ${p.category}`.toLowerCase().includes(query))
              .map((p) => (
                <button key={p.id} type="button" role="option" aria-selected={p.id === proj} className={`note-item ${p.id === proj ? 'active' : ''}`} onClick={() => setProj(p.id)}>
                  <span className="note-item-title">🧩 {p.name}</span>
                  <span className="note-item-sub">{p.category}</span>
                </button>
              ))}
          </div>
        )}
        {folder === 'mine' && (
          <div className="notes-list" role="listbox" aria-label="My notes">
            <button type="button" className="note-item nt7-new" onClick={newNote}>
              <span className="note-item-title">＋ New Note</span>
              <span className="note-item-sub">Saved only on this device</span>
            </button>
            {mineVisible.map((m) => (
              <button key={m.id} type="button" role="option" aria-selected={m.id === mineSel} className={`note-item ${m.id === mineSel ? 'active' : ''}`} onClick={() => setMineSel(m.id)} onContextMenu={(e) => noteMenu(e, m)}>
                <span className="note-item-title">
                  {m.pinned && '📌 '}
                  {m.title || 'New Note'}
                </span>
                <span className="note-item-sub">{new Date(m.at).toLocaleDateString()} · {m.body.slice(0, 30) || 'No additional text'}</span>
              </button>
            ))}
          </div>
        )}
        {folder === 'deleted' && (
          <div className="notes-list" role="listbox" aria-label="Recently deleted notes">
            {trashed.length === 0 && <p className="nt8-empty">No recently deleted notes.</p>}
            {trashed.map((m) => (
              <div key={m.id} className="note-item nt8-del" onContextMenu={(e) => noteMenu(e, m)}>
                <span className="note-item-title">{m.title || 'New Note'}</span>
                <span className="note-item-sub">Deleted {new Date(m.deleted!).toLocaleDateString()}</span>
                <span className="nt8-del-acts">
                  <button type="button" onClick={() => patch(m.id, { deleted: undefined })}>
                    Recover
                  </button>
                  <button type="button" onClick={() => setMine((l) => l.filter((x) => x.id !== m.id))}>
                    Delete
                  </button>
                </span>
              </div>
            ))}
            {trashed.length > 0 && (
              <button type="button" className="nt8-emptyall" onClick={() => setMine((l) => l.filter((x) => !x.deleted))}>
                Delete All
              </button>
            )}
          </div>
        )}
        {folder === 'skills' && <div className="notes-list" role="listbox" aria-label="Notes" ref={listRef} onKeyDown={onKey}>
          {visible.map((n) => (
            <button
              key={n.id}
              type="button"
              role="option"
              aria-selected={n.id === active}
              data-note={n.id}
              className={`note-item ${n.id === active ? 'active' : ''}`}
              onClick={() => setActive(n.id)}
            >
              <span className="note-item-title">
                {n.emoji} {n.title}
              </span>
              <span className="note-item-sub">{n.subtitle}</span>
            </button>
          ))}
        </div>}
      </aside>
      {folder === 'projects' ? (
        (() => {
          const p = projects.find((x) => x.id === proj) ?? projects[0];
          return (
            <article className="notes-main scroll-smooth" key={p.id}>
              <div className="notes-date">{p.period ?? p.updated ?? ''}</div>
              <h1 className="notes-title">🧩 {p.name}</h1>
              <div className="notes-tags">
                {Object.values(p.stack)
                  .flat()
                  .slice(0, 10)
                  .map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
              </div>
              <p>{p.overview}</p>
              <h2 className="notes-h2">✨ Features</h2>
              <ul className="nt7-ul">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {p.architecture && <p className="notes-src">Architecture: {p.architecture}</p>}
              <p>
                <button type="button" className="ev-link" onClick={() => wm.open('xcode', { project: p.id })}>
                  Open in Xcode
                </button>
                {p.repo && (
                  <a className="ev-link" href={p.repo} target="_blank" rel="noopener noreferrer">
                    View on GitHub ↗
                  </a>
                )}
              </p>
            </article>
          );
        })()
      ) : folder === 'deleted' ? (
        <article className="notes-main nt7-empty">
          <p>Notes you delete stay here until you delete them permanently.</p>
        </article>
      ) : folder === 'mine' ? (
        (() => {
          const m = live.find((x) => x.id === mineSel);
          if (!m)
            return (
              <article className="notes-main nt7-empty">
                <p>Select a note or create a new one.</p>
                <button type="button" className="btn btn-primary" onClick={newNote}>
                  New Note
                </button>
              </article>
            );
          const upd = (p: Partial<MyNote>) => patch(m.id, p, true);
          return (
            <article className="notes-main nt7-edit" key={m.id}>
              <div className="notes-date">{new Date(m.at).toLocaleString()}</div>
              <input className="nt7-title" value={m.title} onChange={(e) => upd({ title: e.target.value })} aria-label="Note title" />
              <textarea className="nt7-body" value={m.body} onChange={(e) => upd({ body: e.target.value })} placeholder="Start typing…" aria-label="Note text" />
              <div className="nt7-actions">
                <span className="notes-src">Saved on this device only · {m.body.trim() ? m.body.trim().split(/\s+/).length : 0} words</span>
                <button type="button" className="btn" onClick={() => patch(m.id, { pinned: !m.pinned })}>
                  {m.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button type="button" className="btn" onClick={() => dupNote(m)}>
                  Duplicate
                </button>
                <button type="button" className="btn" onClick={() => void copyText(`${m.title}\n\n${m.body}`).then(() => notify({ app: 'Notes', icon: 'notes', title: 'Note copied' }))}>
                  Copy
                </button>
                <button type="button" className="btn" onClick={() => void sharePortfolio({ title: m.title || 'Note', text: `${m.title}\n${m.body}`.slice(0, 300) })}>
                  Share
                </button>
                <button type="button" className="btn" onClick={() => trashNote(m)}>
                  Delete Note
                </button>
              </div>
            </article>
          );
        })()
      ) : (
      <article className="notes-main scroll-smooth" key={note.id} aria-live="polite">
        <div className="notes-date">{date}</div>
        <h1 className="notes-title">
          <span aria-hidden="true">{note.emoji}</span> {note.title}
        </h1>
        <div className="notes-tags">
          {note.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
        {note.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {evidence.length > 0 && (
          <>
            <h2 className="notes-h2">✅ Evidence from my projects</h2>
            <ul className="notes-evidence">
              {evidence.map((e) => (
                <li key={e.tag}>
                  <b>{e.tag}</b>
                  <span>
                    {e.projects.map((p) => (
                      <button key={p.id} type="button" className="ev-link" onClick={() => wm.open('xcode', { project: p.id })}>
                        {p.name}
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {note.profile && note.profile.length > 0 && (
          <>
            <h2 className="notes-h2">🧭 Also on my GitHub profile</h2>
            <div className="notes-tags">
              {note.profile.map((t) => (
                <span key={t} className="tag soft">
                  {t}
                </span>
              ))}
            </div>
            <p className="notes-src">Listed in the tech stack of my GitHub profile README (github.com/Ahamed369).</p>
          </>
        )}
      </article>
      )}
    </div>
  );
}
