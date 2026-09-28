import { DragBar, Lights } from '../components/Window';
import { useMemo, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import { notify } from '../system/notify';
import { useWM } from '../system/WindowManager';
import { useSystem } from '../system/SystemContext';
import { isoDay, listColor, SEED, useReminderLists, useReminders, type Reminder } from '../system/reminders';

/**
 * macOS Reminders-style checklist. Items are saved on this device (localStorage).
 * v8: edit in place, details (notes · due date & time · priority · flag · list),
 * duplicate, move, delete, clear completed, search, custom lists (add · rename ·
 * delete) and right-click menus. Reminders with a due time notify when due.
 */
const COLORS = ['#ff3b30', '#ff9f0a', '#ffcc00', '#34c759', '#5ac8fa', '#0a84ff', '#5e5ce6', '#af52de', '#ff2d55', '#8e8e93'];

export default function RemindersApp() {
  const wm = useWM();
  const sys = useSystem();
  const [items, setItems] = useReminders();
  const [lists, setLists] = useReminderLists();
  const [list, setList] = useState<string>('all');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [newList, setNewList] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const today = isoDay();

  const visible = useMemo(() => {
    let v = items;
    if (list === 'today') v = items.filter((i) => i.due === today && !i.done);
    else if (list === 'scheduled') v = items.filter((i) => i.due && !i.done).sort((a, b) => `${a.due}${a.time ?? ''}`.localeCompare(`${b.due}${b.time ?? ''}`));
    else if (list === 'flagged') v = items.filter((i) => i.flagged);
    else if (list === 'done') v = items.filter((i) => i.done);
    else if (list !== 'all') v = items.filter((i) => i.list === list);
    if (q.trim()) v = v.filter((i) => `${i.text} ${i.notes ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
    return v;
  }, [items, list, q, today]);

  const upd = (id: string, patch: Partial<Reminder>) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const toggle = (id: string) =>
    setItems((l) =>
      l.map((i) => {
        if (i.id !== id) return i;
        if (!i.done) notify({ app: 'Reminders', icon: 'reminders', title: 'Completed', body: i.text, actions: [{ label: 'Undo', run: () => upd(id, { done: false }) }] });
        return { ...i, done: !i.done };
      }),
    );
  const remove = (r: Reminder) => {
    setItems((l) => l.filter((x) => x.id !== r.id));
    if (info === r.id) setInfo(null);
    notify({ app: 'Reminders', icon: 'reminders', title: 'Reminder deleted', body: r.text, actions: [{ label: 'Undo', run: () => setItems((l) => [...l, r]) }] });
  };
  const add = () => {
    const t = text.trim();
    if (!t) return;
    const target = ['all', 'flagged', 'done', 'today', 'scheduled'].includes(list) ? 'mine' : list;
    setItems((l) => [...l, { id: `u${Date.now()}`, text: t, done: false, list: target, due: list === 'today' ? today : undefined, flagged: list === 'flagged' || undefined }]);
    setText('');
    inputRef.current?.focus();
  };
  const saveEdit = () => {
    if (editId && editText.trim()) upd(editId, { text: editText.trim() });
    setEditId(null);
  };

  const itemMenu = (e: RMouseEvent, r: Reminder) => {
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: r.done ? 'Mark as Not Completed' : 'Mark as Completed', action: () => toggle(r.id) },
        { label: 'Edit', action: () => (setEditId(r.id), setEditText(r.text)) },
        { label: 'Show Info', action: () => setInfo(r.id) },
        { label: r.flagged ? 'Unflag' : 'Flag', action: () => upd(r.id, { flagged: !r.flagged }) },
        { label: 'Due Today', action: () => upd(r.id, { due: today }) },
        { label: 'Duplicate', action: () => setItems((l) => [...l, { ...r, id: `u${Date.now()}`, done: false }]) },
        { label: '', sep: true },
        ...lists.filter((l) => l.id !== r.list).map((l) => ({ label: `Move to ${l.label}`, action: () => upd(r.id, { list: l.id }) })),
        { label: '', sep: true },
        { label: 'Delete', action: () => remove(r) },
      ],
    });
  };

  const listMenu = (e: RMouseEvent, id: string) => {
    const l = lists.find((x) => x.id === id);
    if (!l?.user) return;
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Rename List', action: () => setRenaming(id) },
        ...COLORS.slice(0, 6).map((c, i) => ({ label: `Colour ${['Red', 'Orange', 'Yellow', 'Green', 'Teal', 'Blue'][i]}`, action: () => setLists((ls) => ls.map((x) => (x.id === id ? { ...x, color: c } : x))) })),
        { label: '', sep: true },
        {
          label: 'Delete List',
          action: () => {
            setLists((ls) => ls.filter((x) => x.id !== id));
            setItems((it) => it.map((r) => (r.list === id ? { ...r, list: 'mine' } : r)));
            if (list === id) setList('all');
          },
        },
      ],
    });
  };

  const counts = {
    today: items.filter((i) => i.due === today && !i.done).length,
    scheduled: items.filter((i) => i.due && !i.done).length,
    all: items.filter((i) => !i.done).length,
    flagged: items.filter((i) => i.flagged && !i.done).length,
    done: items.filter((i) => i.done).length,
  };
  const smart: Record<string, [string, string]> = { today: ['Today', '#0a84ff'], scheduled: ['Scheduled', '#ff3b30'], all: ['All', '#1c1c1e'], flagged: ['Flagged', '#ff9f0a'], done: ['Completed', '#8e8e93'] };
  const title = smart[list]?.[0] ?? lists.find((x) => x.id === list)?.label;
  const color = smart[list]?.[1] ?? listColor(list);
  const cur = items.find((i) => i.id === info);

  return (
    <div className="reminders">
      <aside className="rm-side">
        <DragBar className="v7-side-drag">
          <Lights />
        </DragBar>
        <input className="rm8-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search reminders" />
        <div className="rm-smart">
          {(
            [
              ['today', 'Today', '#0a84ff', counts.today, '▦'],
              ['scheduled', 'Scheduled', '#ff3b30', counts.scheduled, '◷'],
              ['all', 'All', '#1c1c1e', counts.all, '☰'],
              ['flagged', 'Flagged', '#ff9f0a', counts.flagged, '⚑'],
              ['done', 'Completed', '#8e8e93', counts.done, '✓'],
            ] as const
          ).map(([id, label, c, n, g]) => (
            <button key={id} type="button" className={`rm-card ${list === id ? 'on' : ''}`} onClick={() => setList(id)}>
              <span className="rm-dot" style={{ background: c }}>
                {g}
              </span>
              <b>{n}</b>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="rm-side-h">My Lists</div>
        {lists.map((l) =>
          renaming === l.id ? (
            <input
              key={l.id}
              className="rm8-rename"
              defaultValue={l.label}
              autoFocus
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v) setLists((ls) => ls.map((x) => (x.id === l.id ? { ...x, label: v } : x)));
                setRenaming(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <button key={l.id} type="button" className={`rm-list ${list === l.id ? 'on' : ''}`} onClick={() => setList(l.id)} onContextMenu={(e) => listMenu(e, l.id)} onDoubleClick={() => l.user && setRenaming(l.id)}>
              <span className="rm-dot small" style={{ background: l.color }} />
              {l.label}
              <span className="rm-n">{items.filter((i) => i.list === l.id && !i.done).length}</span>
            </button>
          ),
        )}
        {newList !== null ? (
          <form
            className="rm8-newlist"
            onSubmit={(e) => {
              e.preventDefault();
              const v = newList.trim();
              if (!v) return;
              const id = `l${Date.now().toString(36)}`;
              setLists((ls) => [...ls, { id, label: v.slice(0, 30), color: COLORS[ls.length % COLORS.length], user: true }]);
              setNewList(null);
              setList(id);
            }}
          >
            <input value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="List name" autoFocus onKeyDown={(e) => e.key === 'Escape' && setNewList(null)} />
          </form>
        ) : (
          <button type="button" className="rm8-addlist" onClick={() => setNewList('')}>
            ⊕ Add List
          </button>
        )}
      </aside>
      <section className="rm-main">
        <div className="rm8-head">
          <h2 style={{ color }} key={list} className="fade-swap">
            {title}
          </h2>
          {counts.done > 0 && (list === 'done' || list === 'all') && (
            <button type="button" className="rm8-clear" onClick={() => setItems((l) => l.filter((i) => !i.done))}>
              Clear {counts.done} Completed
            </button>
          )}
        </div>
        <ul className="rm-items scroll-smooth">
          {visible.map((i) => (
            <li key={i.id} className={i.done ? 'done' : ''} onContextMenu={(e) => itemMenu(e, i)}>
              <button type="button" className="rm-check" style={{ ['--c' as string]: listColor(i.list) }} onClick={() => toggle(i.id)} aria-label={i.done ? `Mark “${i.text}” as not done` : `Complete “${i.text}”`} aria-pressed={i.done}>
                <span />
              </button>
              {editId === i.id ? (
                <input className="rm8-edit" value={editText} autoFocus onChange={(e) => setEditText(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => (e.key === 'Enter' ? saveEdit() : e.key === 'Escape' && setEditId(null))} aria-label="Edit reminder" />
              ) : (
                <span className="rm-text" onDoubleClick={() => (setEditId(i.id), setEditText(i.text))} title="Double-click to edit">
                  {!!i.priority && <b className="rm8-pri">{'!'.repeat(i.priority)} </b>}
                  {i.text}
                  {(i.due || i.notes) && (
                    <small className="rm8-sub">
                      {i.due && `${i.due === today ? 'Today' : new Date(`${i.due}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}${i.time ? `, ${i.time}` : ''}`}
                      {i.due && i.notes && ' · '}
                      {i.notes}
                    </small>
                  )}
                </span>
              )}
              {i.flagged && (
                <span className="rm-flag" aria-label="flagged">
                  ⚑
                </span>
              )}
              {i.app && (
                <button type="button" className="rm-open" onClick={() => wm.open(i.app!)}>
                  Open
                </button>
              )}
              <button type="button" className="rm8-info" aria-label={`Details for “${i.text}”`} onClick={() => setInfo(info === i.id ? null : i.id)}>
                ⓘ
              </button>
              <button type="button" className="rm-del" aria-label={`Delete “${i.text}”`} onClick={() => remove(i)}>
                ✕
              </button>
            </li>
          ))}
          {!visible.length && <li className="rm-empty">{q ? 'No matching reminders.' : 'Nothing here.'}</li>}
        </ul>
        {list !== 'done' && (
          <form
            className="rm-add"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <span className="rm-plus">＋</span>
            <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="New Reminder" aria-label="New reminder" />
          </form>
        )}
        <button type="button" className="rm-reset" onClick={() => setItems(SEED)}>
          Reset checklist
        </button>
        {cur && (
          <div className="rm8-info-panel fade-swap" role="dialog" aria-label="Reminder details">
            <header>
              <b>Details</b>
              <button type="button" onClick={() => setInfo(null)} aria-label="Close details">
                ✕
              </button>
            </header>
            <label>
              <span>Title</span>
              <input value={cur.text} onChange={(e) => upd(cur.id, { text: e.target.value })} />
            </label>
            <label>
              <span>Notes</span>
              <textarea rows={2} value={cur.notes ?? ''} onChange={(e) => upd(cur.id, { notes: e.target.value || undefined })} />
            </label>
            <div className="rm8-row">
              <label>
                <span>Date</span>
                <input type="date" value={cur.due ?? ''} onChange={(e) => upd(cur.id, { due: e.target.value || undefined, time: e.target.value ? cur.time : undefined })} />
              </label>
              <label>
                <span>Time</span>
                <input type="time" value={cur.time ?? ''} disabled={!cur.due} onChange={(e) => upd(cur.id, { time: e.target.value || undefined })} />
              </label>
            </div>
            <div className="rm8-row">
              <label>
                <span>Priority</span>
                <select value={cur.priority ?? 0} onChange={(e) => upd(cur.id, { priority: Number(e.target.value) || undefined })}>
                  <option value={0}>None</option>
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                </select>
              </label>
              <label>
                <span>List</span>
                <select value={cur.list} onChange={(e) => upd(cur.id, { list: e.target.value })}>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="rm8-check">
              <input type="checkbox" checked={!!cur.flagged} onChange={(e) => upd(cur.id, { flagged: e.target.checked || undefined })} /> Flagged
            </label>
            <small className="rm8-note">With a date and time, a banner notification appears when it’s due.</small>
          </div>
        )}
      </section>
    </div>
  );
}
