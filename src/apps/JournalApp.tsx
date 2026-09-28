import { useEffect, useMemo, useRef, useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { personal, projects, timeline, type TimelineEntry } from '../data/portfolio';
import { readStore, writeStore } from '../system/storage';

type JournalId = 'all' | 'milestones' | 'mine' | 'deleted' | 'places';

interface Entry {
  id: string;
  journal: 'milestones' | 'mine';
  date: string; // YYYY-MM-DD
  title: string;
  text: string;
  mood?: string;
  place?: string;
  kind?: TimelineEntry['kind'];
  period?: string;
  deletedAt?: number;
}

const MOODS = [
  { id: 'great', e: '😄', label: 'Great' },
  { id: 'good', e: '🙂', label: 'Good' },
  { id: 'okay', e: '😐', label: 'Okay' },
  { id: 'low', e: '😔', label: 'Low' },
  { id: 'rough', e: '😣', label: 'Rough' },
];
const moodOf = (id?: string) => MOODS.find((m) => m.id === id);

const KEY = 'mra-journal';
interface Stored {
  entries: Entry[];
}

const PLACES = ['Kandy', 'Gampola', 'Colombo'];

/** Read-only milestones generated from the portfolio timeline and projects. */
const MILESTONES: Entry[] = timeline.map((t, i) => {
  const [y, m] = t.start.split('-');
  const proj = projects.find((p) => p.name.toLowerCase() === t.title.toLowerCase() || t.title.toLowerCase().startsWith(p.name.toLowerCase()));
  const place = PLACES.find((p) => t.detail.includes(p) || t.title.includes(p));
  const end = t.end === 'present' ? 'present' : t.end;
  return {
    id: `ms-${i}`,
    journal: 'milestones',
    date: `${y}-${m ?? '01'}-01`,
    title: t.title,
    text: [t.detail, proj?.overview].filter(Boolean).join('\n\n'),
    place,
    kind: t.kind,
    period: end ? `${t.start} – ${end}` : t.start,
  };
});

const P = {
  sidebar: 'M4 5h16v14H4ZM9.5 5v14',
  back: 'M15 5l-7 7 7 7',
  compose: 'M12 20h8M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4Z',
  all: 'M5 5h3v3H5ZM10.5 5h3v3h-3ZM16 5h3v3h-3ZM5 10.5h3v3H5ZM10.5 10.5h3v3h-3ZM16 10.5h3v3h-3ZM5 16h3v3H5ZM10.5 16h3v3h-3ZM16 16h3v3h-3Z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  book: 'M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5ZM12 6v14',
  trash: 'M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13',
  photo: 'M4 6h16v12H4ZM4 15l4.5-4.5 4 4 2.5-2.5L20 17M15.5 9.5h.01',
  pin: 'M12 21s-6.5-5.4-6.5-11a6.5 6.5 0 0 1 13 0c0 5.6-6.5 11-6.5 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  restore: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4',
  close: 'M6 6l12 12M18 6 6 18',
  lock: 'M6 11h12v9H6ZM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
};
function G({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const niceDate = (s: string, withDay = true) => {
  const d = new Date(`${s}T12:00:00`);
  return d.toLocaleDateString([], withDay ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' } : { month: 'long', year: 'numeric' });
};

interface Draft {
  id: string | null;
  title: string;
  text: string;
  date: string;
  mood?: string;
  place: string;
}

export default function JournalApp() {
  const [mine, setMine] = useState<Entry[]>(() => {
    const s = readStore<Stored>(KEY, { entries: [] });
    return Array.isArray(s.entries) ? s.entries : [];
  });
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const [view, setView] = useState<JournalId>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(null);
  const [side, setSide] = useState(true);

  // release object URLs when the window closes
  useEffect(() => () => Object.values(photosRef.current).forEach((u) => URL.revokeObjectURL(u)), []);

  const persist = (list: Entry[]) => {
    setMine(list);
    writeStore(KEY, { entries: list });
  };

  const live = mine.filter((e) => !e.deletedAt);
  const deleted = mine.filter((e) => e.deletedAt);
  const all = useMemo(() => [...live, ...MILESTONES].sort((a, b) => b.date.localeCompare(a.date)), [live]);

  // insights from real entries
  const insights = useMemo(() => {
    const days = new Set(all.map((e) => e.date));
    const yr = String(new Date().getFullYear());
    let streak = 0;
    const d = new Date();
    for (;;) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (days.has(k)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (streak === 0 && k === today()) d.setDate(d.getDate() - 1);
      else break;
      if (streak > 3650) break;
    }
    return { streak, year: all.filter((e) => e.date.startsWith(yr)).length, days: days.size };
  }, [all]);
  const places = useMemo(() => Array.from(new Set(all.map((e) => e.place).filter((p): p is string => !!p))), [all]);

  const list = view === 'all' ? all : view === 'milestones' ? MILESTONES : view === 'mine' ? live.slice().sort((a, b) => b.date.localeCompare(a.date)) : view === 'deleted' ? deleted : all.filter((e) => e.place);
  const openEntry = open ? [...all, ...deleted].find((e) => e.id === open) ?? null : null;

  const newEntry = () => {
    setDraft({ id: null, title: '', text: '', date: today(), mood: undefined, place: '' });
    setDraftPhoto(null);
    setOpen(null);
  };
  const editEntry = (e: Entry) => {
    setDraft({ id: e.id, title: e.title, text: e.text, date: e.date, mood: e.mood, place: e.place ?? '' });
    setDraftPhoto(photos[e.id] ?? null);
  };
  const saveDraft = () => {
    if (!draft) return;
    if (!draft.title.trim() && !draft.text.trim()) {
      setDraft(null);
      return;
    }
    const id = draft.id ?? `me-${Date.now()}`;
    const e: Entry = { id, journal: 'mine', date: draft.date || today(), title: draft.title.trim() || 'Untitled', text: draft.text, mood: draft.mood, place: draft.place.trim() || undefined };
    persist(draft.id ? mine.map((x) => (x.id === id ? e : x)) : [e, ...mine]);
    setPhotos((p) => {
      const n = { ...p };
      if (draftPhoto) n[id] = draftPhoto;
      else delete n[id];
      return n;
    });
    setDraft(null);
    setOpen(id);
  };
  const del = (id: string) => {
    persist(mine.map((x) => (x.id === id ? { ...x, deletedAt: Date.now() } : x)));
    setOpen(null);
  };
  const restore = (id: string) => persist(mine.map((x) => (x.id === id ? { ...x, deletedAt: undefined } : x)));
  const purge = (id: string) => {
    persist(mine.filter((x) => x.id !== id));
    const u = photos[id];
    if (u) URL.revokeObjectURL(u);
    setOpen(null);
  };

  const journals: { id: JournalId; label: string; d: string; n: number; tone: string }[] = [
    { id: 'all', label: 'All Entries', d: P.all, n: all.length, tone: 'violet' },
    { id: 'milestones', label: 'Portfolio Milestones', d: P.flag, n: MILESTONES.length, tone: 'orange' },
    { id: 'mine', label: 'My Journal', d: P.book, n: live.length, tone: 'blue' },
    { id: 'deleted', label: 'Recently Deleted', d: P.trash, n: deleted.length, tone: 'gray' },
  ];
  const title = view === 'places' ? 'Places' : journals.find((j) => j.id === view)?.label ?? '';

  const Card = ({ e, i }: { e: Entry; i: number }) => {
    const ph = photos[e.id];
    return (
      <button type="button" className={`jr-card ${e.journal}`} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }} onClick={() => (setOpen(e.id), setDraft(null))}>
        {ph && <img className="jr-card-ph" src={ph} alt="" />}
        <span className="jr-card-body">
          <span className="jr-card-top">
            <span className={`jr-tag ${e.journal}`}>{e.journal === 'milestones' ? e.kind ?? 'Milestone' : 'My Journal'}</span>
            {moodOf(e.mood) && <span aria-label={moodOf(e.mood)?.label}>{moodOf(e.mood)?.e}</span>}
          </span>
          <b>{e.title}</b>
          <span className="jr-card-txt">{e.text.replace(/\n+/g, " ")}</span>
          <small>
            {e.journal === 'milestones' ? e.period : niceDate(e.date)}
            {e.place ? ` · ${e.place}` : ''}
          </small>
        </span>
      </button>
    );
  };

  let main;
  if (draft) {
    main = (
      <div className="jr-editor fade-swap">
        {draftPhoto && (
          <div className="jr-photo">
            <img src={draftPhoto} alt="Attached from your device" />
            <button type="button" className="jr-x" aria-label="Remove photo" onClick={() => setDraftPhoto(null)}>
              <G d={P.close} size={12} />
            </button>
          </div>
        )}
        <input className="jr-title-in" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" aria-label="Entry title" autoFocus />
        <textarea className="jr-text-in" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="Start writing…" aria-label="Entry text" />
        <div className="jr-fields">
          <label>
            <span>Date</span>
            <input type="date" value={draft.date} max={today()} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label>
            <span>Place</span>
            <input value={draft.place} onChange={(e) => setDraft({ ...draft, place: e.target.value })} placeholder="Optional" />
          </label>
          <div className="jr-moods" role="radiogroup" aria-label="Mood">
            {MOODS.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={draft.mood === m.id} className={draft.mood === m.id ? 'on' : ''} title={m.label} aria-label={m.label} onClick={() => setDraft({ ...draft, mood: draft.mood === m.id ? undefined : m.id })}>
                {m.e}
              </button>
            ))}
          </div>
        </div>
        <p className="jr-privacy">
          <G d={P.lock} size={13} /> Text is saved in this browser only. Photos stay in memory for this session and are never uploaded.
        </p>
      </div>
    );
  } else if (openEntry) {
    const ph = photos[openEntry.id];
    const ro = openEntry.journal === 'milestones';
    main = (
      <article className="jr-read fade-swap">
        {ph && (
          <div className="jr-photo">
            <img src={ph} alt="" />
          </div>
        )}
        {openEntry.place && (
          <div className="jr-place">
            <G d={P.pin} size={14} /> {openEntry.place}
          </div>
        )}
        <h2>{openEntry.title}</h2>
        <div className="jr-read-meta">
          <span className={`jr-tag ${openEntry.journal}`}>{ro ? openEntry.kind : 'My Journal'}</span>
          {ro ? openEntry.period : niceDate(openEntry.date)}
          {moodOf(openEntry.mood) && ` · ${moodOf(openEntry.mood)?.e} ${moodOf(openEntry.mood)?.label}`}
        </div>
        {openEntry.text.split('\n\n').map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {ro && <p className="jr-ro">Read-only · generated from {personal.name}’s portfolio timeline.</p>}
        {openEntry.deletedAt ? (
          <div className="jr-actions">
            <button type="button" className="jr-btn" onClick={() => (restore(openEntry.id), setOpen(null))}>
              <G d={P.restore} size={14} /> Restore
            </button>
            <button type="button" className="jr-btn danger" onClick={() => purge(openEntry.id)}>
              Delete Permanently
            </button>
          </div>
        ) : (
          !ro && (
            <div className="jr-actions">
              <button type="button" className="jr-btn" onClick={() => editEntry(openEntry)}>
                <G d={P.compose} size={14} /> Edit
              </button>
              <button type="button" className="jr-btn danger" onClick={() => del(openEntry.id)}>
                <G d={P.trash} size={14} /> Delete
              </button>
            </div>
          )
        )}
      </article>
    );
  } else {
    main = (
      <div key={view} className="jr-list fade-swap">
        <h1 className="jr-h1">{title}</h1>
        {view === 'deleted' && list.length > 0 && <p className="jr-sub">Restore an entry or delete it permanently.</p>}
        {view === 'places' && <p className="jr-sub">{places.length ? places.join(' · ') : 'No places yet.'}</p>}
        {list.length === 0 ? (
          <div className="jr-empty">
            <G d={view === 'deleted' ? P.trash : P.book} size={34} />
            <b>{view === 'deleted' ? 'No Recently Deleted Entries' : 'No Entries Yet'}</b>
            {view === 'mine' && (
              <>
                <p>Write your first entry — it stays in this browser.</p>
                <button type="button" className="jr-btn primary" onClick={newEntry}>
                  <G d={P.compose} size={14} /> New Entry
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="jr-cards">
            {list.map((e, i) => (
              <div key={e.id} className="jr-card-wrap">
                <Card e={e} i={i} />
                {view === 'deleted' && (
                  <div className="jr-del-actions">
                    <button type="button" className="jr-btn sm" onClick={() => restore(e.id)}>
                      Restore
                    </button>
                    <button type="button" className="jr-btn sm danger" onClick={() => purge(e.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const headTitle = draft ? (draft.id ? 'Edit Entry' : niceDate(draft.date || today())) : openEntry ? (openEntry.journal === 'milestones' ? openEntry.period : niceDate(openEntry.date)) : '';

  return (
    <div className="jr-root">
      <div className={`jr ${side ? '' : 'no-side'} ${draft || openEntry ? 'detail' : ''}`}>
      <aside className="jr-side">
        <DragBar className="jr-drag">
          <Lights />
          <button type="button" className="jr-ibtn" aria-label="Hide sidebar" onPointerDown={(e) => e.stopPropagation()} onClick={() => setSide(false)}>
            <G d={P.sidebar} size={18} />
          </button>
        </DragBar>
        <div className="jr-side-scroll">
          <div className="jr-insights">
            <b>Insights</b>
            <div className="jr-ins-grid">
              <div className="jr-streak">
                <strong>{insights.streak}</strong>
                <span>
                  {insights.streak === 1 ? 'Day' : 'Days'}
                  <br />
                  Streak
                </span>
              </div>
              <div className="jr-ins-small">
                <span>
                  <b>{insights.year}</b> Entries This Year
                </span>
                <span>
                  <b>{insights.days}</b> Days Journaled
                </span>
              </div>
            </div>
          </div>
          <button type="button" className={`jr-places ${view === 'places' ? 'on' : ''}`} onClick={() => (setView('places'), setOpen(null), setDraft(null))}>
            <b>Places</b>
            <span className="jr-places-n">
              <G d={P.pin} size={12} /> {places.length}
            </span>
            <span className="jr-map-pin">{places.length}</span>
          </button>
          <div className="jr-sec">Journals</div>
          {journals.map((j) => (
            <button key={j.id} type="button" className={`jr-item ${view === j.id ? 'on' : ''}`} onClick={() => (setView(j.id), setOpen(null), setDraft(null))}>
              <span className={`jr-ico ${j.tone}`}>
                <G d={j.d} size={16} />
              </span>
              <span className="jr-item-l">{j.label}</span>
              <em>{j.n}</em>
            </button>
          ))}
        </div>
      </aside>
      <section className="jr-main">
        <DragBar className="jr-bar">
          <span className="jr-lights-alt">
            <Lights />
          </span>
          {!side && (
            <button type="button" className="jr-ibtn" aria-label="Show sidebar" onPointerDown={(e) => e.stopPropagation()} onClick={() => setSide(true)}>
              <G d={P.sidebar} size={18} />
            </button>
          )}
          {(draft || openEntry) && (
            <button type="button" className="jr-round" aria-label="Back" onPointerDown={(e) => e.stopPropagation()} onClick={() => (setDraft(null), setOpen(null))}>
              <G d={P.back} size={16} />
            </button>
          )}
          <b className="jr-bar-title">{headTitle}</b>
          <span className="jr-spacer" />
          {draft ? (
            <>
              <label className="jr-round" aria-label="Add photo from your device" onPointerDown={(e) => e.stopPropagation()}>
                <G d={P.photo} size={17} />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setDraftPhoto(URL.createObjectURL(file));
                    e.target.value = '';
                  }}
                />
              </label>
              <button type="button" className="jr-round accent" aria-label="Done" onPointerDown={(e) => e.stopPropagation()} onClick={saveDraft}>
                <G d={P.check} size={17} />
              </button>
            </>
          ) : (
            <button type="button" className="jr-round" aria-label="New entry" onPointerDown={(e) => e.stopPropagation()} onClick={newEntry}>
              <G d={P.compose} size={17} />
            </button>
          )}
        </DragBar>
        <div className="jr-scroll scroll-smooth">{main}</div>
      </section>
      </div>
    </div>
  );
}
