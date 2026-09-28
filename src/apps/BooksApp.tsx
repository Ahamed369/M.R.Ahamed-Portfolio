import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { DragBar, Lights } from '../components/Window';
import { cv, personal, projects, type Project } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { openExternal } from '../system/notify';
import { readStore, writeStore } from '../system/storage';

type View = 'home' | 'store' | 'all' | 'want' | 'finished' | 'pdfs' | 'docs' | 'classics';

interface Book {
  id: string;
  title: string;
  author: string;
  kind: 'pdf' | 'project' | 'classic';
  colors: [string, string];
  sub: string;
  project?: Project;
  url?: string;
}

const CLASSICS: { id: number; title: string; author: string; colors: [string, string] }[] = [
  { id: 1342, title: 'Pride and Prejudice', author: 'Jane Austen', colors: ['#f4e3c1', '#b5835a'] },
  { id: 84, title: 'Frankenstein', author: 'Mary Shelley', colors: ['#2f4858', '#0b1a22'] },
  { id: 11, title: 'Alice’s Adventures in Wonderland', author: 'Lewis Carroll', colors: ['#ffd6e0', '#7b5ea7'] },
  { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', colors: ['#8b2e2e', '#2a0f0f'] },
  { id: 2701, title: 'Moby Dick', author: 'Herman Melville', colors: ['#6fa8dc', '#0b3954'] },
];

const BOOKS: Book[] = [
  { id: 'cv', title: `${personal.name} — CV`, author: personal.name, kind: 'pdf', colors: ['#fafafa', '#d9d9de'], sub: 'PDF · Curriculum vitae' },
  ...projects.map<Book>((p) => ({
    id: `p-${p.id}`,
    title: p.name,
    author: personal.name,
    kind: 'project',
    colors: [p.preview.accent, p.preview.accent2],
    sub: `Project documentation · ${p.category}`,
    project: p,
  })),
  ...CLASSICS.map<Book>((c) => ({
    id: `g-${c.id}`,
    title: c.title,
    author: c.author,
    kind: 'classic',
    colors: c.colors,
    sub: 'Free classic · Project Gutenberg',
    url: `https://www.gutenberg.org/ebooks/${c.id}`,
  })),
];

const KEY = 'mra-books';
interface Prefs {
  want: string[];
  finished: string[];
  pages: Record<string, number>;
}

const P = {
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.5 15.5 20 20',
  home: 'M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5Z',
  store: 'M5 8h14l-1 12H6ZM9 8a3 3 0 0 1 6 0',
  all: 'M5 4v16M9 4v16M13 5l4 15M18 4v16',
  want: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8 12h8M13 8.5l3.5 3.5-3.5 3.5',
  done: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8 12.5l2.7 2.7L16 9.5',
  pdf: 'M6 3.5h8l4 4v13H6ZM14 3.5v4h4M9 13h6M9 16.5h4',
  list: 'M5 7h14M5 12h14M5 17h14',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  close: 'M6 6l12 12M18 6 6 18',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
};

function G({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={d === P.more ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cover({ b }: { b: Book }) {
  if (b.kind === 'pdf')
    return (
      <span className="bk-cover pdf">
        <img src={cv.pages[0]} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <span className="bk-pdf-tag">PDF</span>
      </span>
    );
  return (
    <span className={`bk-cover ${b.kind}`} style={{ background: `linear-gradient(160deg, ${b.colors[0]}, ${b.colors[1]})` }}>
      {b.kind === 'project' && <span className="bk-cover-kicker">{b.project?.category}</span>}
      <span className="bk-cover-title">{b.title}</span>
      <span className="bk-cover-rule" />
      <span className="bk-cover-author">{b.author}</span>
      {b.kind === 'classic' && <span className="bk-cover-kicker bottom">Public domain</span>}
    </span>
  );
}

/* ─────────── reader pages generated from project data ─────────── */

function pagesFor(p: Project): { h: string; body: ReactNode }[] {
  const pages: { h: string; body: ReactNode }[] = [];
  pages.push({
    h: '',
    body: (
      <div className="bk-title-page">
        <small>{p.category}</small>
        <h1>{p.name}</h1>
        <i>{p.preview.tagline}</i>
        <span className="bk-title-rule" />
        <p>{personal.name}</p>
        {p.period && <p className="bk-dim">{p.period}</p>}
      </div>
    ),
  });
  pages.push({ h: 'Overview', body: <><p className="bk-drop">{p.description}</p><p>{p.overview}</p></> });
  pages.push({
    h: 'Features',
    body: (
      <ul>
        {p.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    ),
  });
  if (p.responsibilities?.length)
    pages.push({
      h: 'My Role',
      body: (
        <ul>
          {p.responsibilities.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ),
    });
  const stack = Object.entries(p.stack).filter(([, v]) => v && v.length) as [string, string[]][];
  pages.push({
    h: 'Technology Stack',
    body: (
      <dl className="bk-stack">
        {stack.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v.join(' · ')}</dd>
          </div>
        ))}
      </dl>
    ),
  });
  pages.push({
    h: 'Architecture',
    body: (
      <>
        <p>{p.architecture ?? 'Architecture notes are not documented for this project.'}</p>
        <p className="bk-dim">
          Status: {p.status}
          {p.updated ? ` · Last updated ${p.updated}` : ''}
        </p>
        {p.repo && <p className="bk-dim">Source: {p.repo.replace('https://', '')}</p>}
      </>
    ),
  });
  return pages;
}

function Reader({ b, start, onClose, onPage }: { b: Book; start: number; onClose: () => void; onPage: (n: number, done: boolean) => void }) {
  const pages = useMemo(() => (b.project ? pagesFor(b.project) : []), [b]);
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const step = wide ? 2 : 1;
  const [pg, setPg] = useState(() => Math.min(start, pages.length - 1));
  const [dir, setDir] = useState<'next' | 'prev' | ''>('');
  const at = wide ? pg - (pg % 2) : pg;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWide(el.clientWidth >= 720));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (d: 1 | -1) => {
    const n = at + d * step;
    if (n < 0 || n >= pages.length) return;
    setDir(d > 0 ? 'next' : 'prev');
    setPg(n);
    onPage(n, n + step >= pages.length);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const show = wide ? [at, at + 1] : [at];
  const accent = b.colors[0];

  return (
    <div className="bk-reader" ref={ref} role="dialog" aria-modal="true" aria-label={`Reading ${b.title}`}>
      <DragBar className="bk-reader-bar">
        <Lights />
        <button type="button" className="bk-rbtn" onPointerDown={(e) => e.stopPropagation()} onClick={onClose} aria-label="Close book">
          <G d={P.close} size={14} />
        </button>
        <b>{b.title}</b>
        <span className="bk-dim">Project documentation</span>
      </DragBar>
      <div className="bk-spread-wrap">
        <button type="button" className="bk-turn prev" aria-label="Previous page" disabled={at === 0} onClick={() => go(-1)}>
          <G d={P.left} size={20} />
        </button>
        <div key={at} className={`bk-spread ${wide ? 'two' : ''} ${dir}`}>
          {show.map((i) =>
            i < pages.length ? (
              <article key={i} className="bk-page" style={{ '--bk-acc': accent } as CSSProperties}>
                {pages[i].h && <h2>{pages[i].h}</h2>}
                <div className="bk-page-body">{pages[i].body}</div>
                <span className="bk-folio">{i + 1}</span>
              </article>
            ) : (
              <article key={i} className="bk-page end">
                <div className="bk-end">The End</div>
              </article>
            ),
          )}
        </div>
        <button type="button" className="bk-turn next" aria-label="Next page" disabled={at + step >= pages.length} onClick={() => go(1)}>
          <G d={P.right} size={20} />
        </button>
      </div>
      <div className="bk-reader-foot">
        <span className="bk-progress">
          <span style={{ width: `${((Math.min(at + step, pages.length)) / pages.length) * 100}%` }} />
        </span>
        <small>
          Page {at + 1}
          {wide && at + 2 <= pages.length ? `–${at + 2}` : ''} of {pages.length}
        </small>
      </div>
    </div>
  );
}

/** Books-style library: the CV, project documentation and free classics. */
export default function BooksApp() {
  const wm = useWM();
  const [view, setView] = useState<View>('home');
  const [q, setQ] = useState('');
  const [prefs, setPrefs] = useState<Prefs>(() => readStore<Prefs>(KEY, { want: [], finished: [], pages: {} }));
  const [menu, setMenu] = useState<string | null>(null);
  const [reading, setReading] = useState<Book | null>(null);

  const save = (n: Prefs) => {
    setPrefs(n);
    writeStore(KEY, n);
  };
  const toggle = (list: 'want' | 'finished', id: string) => {
    const has = prefs[list].includes(id);
    const n = { ...prefs, [list]: has ? prefs[list].filter((x) => x !== id) : [...prefs[list], id] };
    if (list === 'finished' && !has) n.want = n.want.filter((x) => x !== id);
    save(n);
  };

  const open = (b: Book) => {
    setMenu(null);
    if (b.kind === 'pdf') wm.open('preview');
    else if (b.kind === 'classic' && b.url) openExternal(b.url, { title: `Opening ${b.title}`, body: 'Free on Project Gutenberg', app: 'Books', icon: 'books' });
    else setReading(b);
  };

  useEffect(() => {
    if (!menu) return;
    const off = () => setMenu(null);
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [menu]);

  const f = q.trim().toLowerCase();
  const filterQ = (l: Book[]) => (f ? l.filter((b) => `${b.title} ${b.author} ${b.sub}`.toLowerCase().includes(f)) : l);
  const byView: Record<View, Book[]> = {
    home: BOOKS,
    store: BOOKS.filter((b) => b.kind === 'classic'),
    all: BOOKS,
    want: BOOKS.filter((b) => prefs.want.includes(b.id)),
    finished: BOOKS.filter((b) => prefs.finished.includes(b.id)),
    pdfs: BOOKS.filter((b) => b.kind === 'pdf'),
    docs: BOOKS.filter((b) => b.kind === 'project'),
    classics: BOOKS.filter((b) => b.kind === 'classic'),
  };
  const titles: Record<View, string> = {
    home: 'Home',
    store: 'Book Store',
    all: 'All',
    want: 'Want to Read',
    finished: 'Finished',
    pdfs: 'PDFs',
    docs: 'Portfolio Docs',
    classics: 'Free Classics',
  };

  const status = (b: Book) => {
    if (prefs.finished.includes(b.id)) return 'Finished';
    const pg = prefs.pages[b.id];
    if (b.kind === 'project' && pg && b.project) return `${Math.round(((pg + 1) / pagesFor(b.project).length) * 100)}%`;
    if (prefs.want.includes(b.id)) return 'Want to Read';
    return b.kind === 'pdf' ? 'PDF' : b.kind === 'classic' ? 'Free' : '';
  };

  const Grid = ({ list }: { list: Book[] }) => (
    <div className="bk-grid">
      {list.map((b, i) => (
        <div key={b.id} className={`bk-book ${menu === b.id ? 'menu-open' : ''}`} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
          <button type="button" className="bk-open" onClick={() => open(b)} aria-label={`Open ${b.title}`}>
            <Cover b={b} />
          </button>
          <div className="bk-meta">
            <span className={`bk-status ${status(b) === 'Finished' ? 'fin' : ''}`}>{status(b)}</span>
            <button
              type="button"
              className="bk-more"
              aria-label={`More options for ${b.title}`}
              aria-expanded={menu === b.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMenu(menu === b.id ? null : b.id)}
            >
              <G d={P.more} size={16} />
            </button>
            {menu === b.id && (
              <div className="bk-menu fade-swap" role="menu" onPointerDown={(e) => e.stopPropagation()}>
                <button type="button" role="menuitem" onClick={() => open(b)}>
                  {b.kind === 'classic' ? 'Read on Project Gutenberg' : b.kind === 'pdf' ? 'Open in Preview' : 'Read'}
                </button>
                <button type="button" role="menuitem" onClick={() => (toggle('want', b.id), setMenu(null))}>
                  {prefs.want.includes(b.id) ? 'Remove from Want to Read' : 'Add to Want to Read'}
                </button>
                <button type="button" role="menuitem" onClick={() => (toggle('finished', b.id), setMenu(null))}>
                  {prefs.finished.includes(b.id) ? 'Mark as Still Reading' : 'Mark as Finished'}
                </button>
              </div>
            )}
          </div>
          <b className="bk-t">{b.title}</b>
          <small className="bk-a">{b.author}</small>
        </div>
      ))}
    </div>
  );

  const Empty = ({ text }: { text: string }) => <p className="bk-empty">{text}</p>;

  let body: ReactNode;
  if (f) {
    const l = filterQ(BOOKS);
    body = l.length ? <Grid list={l} /> : <Empty text="No books match your search." />;
  } else if (view === 'home') {
    const cont = BOOKS.filter((b) => prefs.pages[b.id] && !prefs.finished.includes(b.id));
    body = (
      <>
        {cont.length > 0 && (
          <>
            <h3 className="bk-h3">Continue Reading</h3>
            <Grid list={cont} />
          </>
        )}
        <h3 className="bk-h3">Portfolio Documentation</h3>
        <p className="bk-lede">Each of {personal.name}’s projects as a short book — overview, features, stack and architecture.</p>
        <Grid list={byView.pdfs.concat(byView.docs)} />
        <h3 className="bk-h3">Free Classics</h3>
        <p className="bk-lede">Public-domain books from Project Gutenberg — they open in a new tab.</p>
        <Grid list={byView.classics} />
      </>
    );
  } else if (view === 'store') {
    body = (
      <>
        <div className="bk-banner">
          <div>
            <small>FREE · PUBLIC DOMAIN</small>
            <h3>Classics from Project Gutenberg</h3>
            <p>Over 70,000 free eBooks. This portfolio doesn’t sell books — these links go straight to the source.</p>
            <button type="button" className="bk-btn" onClick={() => openExternal('https://www.gutenberg.org/ebooks/search/?sort_order=downloads', { title: 'Opening Project Gutenberg', app: 'Books', icon: 'books' })}>
              Browse Top 100 <G d={P.ext} size={13} />
            </button>
          </div>
        </div>
        <Grid list={byView.store} />
      </>
    );
  } else {
    const l = byView[view];
    body = l.length ? (
      <Grid list={l} />
    ) : (
      <Empty text={view === 'want' ? 'Books you add to Want to Read appear here. Use the ••• button under any book.' : 'Books you mark as finished appear here.'} />
    );
  }

  const side = (id: View, label: string, d: string, count?: number) => (
    <button type="button" className={`bk-item ${view === id && !f ? 'on' : ''}`} onClick={() => (setView(id), setQ(''))}>
      <G d={d} size={16} />
      <span>{label}</span>
      {count !== undefined && count > 0 && <em>{count}</em>}
    </button>
  );

  return (
    <div className="bk-root">
      <div className="bk">
      <aside className="bk-side">
        <DragBar className="bk-drag">
          <Lights />
        </DragBar>
        <label className="bk-search">
          <G d={P.search} size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search books" />
        </label>
        <nav className="bk-nav" aria-label="Books">
          {side('home', 'Home', P.home)}
          {side('store', 'Book Store', P.store)}
          <div className="bk-sec">Library</div>
          {side('all', 'All', P.all, BOOKS.length)}
          {side('want', 'Want to Read', P.want, prefs.want.length)}
          {side('finished', 'Finished', P.done, prefs.finished.length)}
          {side('pdfs', 'PDFs', P.pdf, 1)}
          <div className="bk-sec">My Collections</div>
          {side('docs', 'Portfolio Docs', P.list, byView.docs.length)}
          {side('classics', 'Free Classics', P.list, byView.classics.length)}
        </nav>
      </aside>
      <section className="bk-main">
        <DragBar className="bk-main-drag" />
        <div className="bk-scroll scroll-smooth">
          <div key={f ? 'q' : view} className="fade-swap">
            <h1 className="bk-h1">{f ? `Results for “${q.trim()}”` : titles[view]}</h1>
            {body}
          </div>
        </div>
      </section>
      {reading && (
        <Reader
          b={reading}
          start={prefs.pages[reading.id] ?? 0}
          onClose={() => setReading(null)}
          onPage={(n, done) => {
            const next = { ...prefs, pages: { ...prefs.pages, [reading.id]: n } };
            if (done && !next.finished.includes(reading.id)) {
              next.finished = [...next.finished, reading.id];
              next.want = next.want.filter((x) => x !== reading.id);
            }
            save(next);
          }}
        />
      )}
      </div>
    </div>
  );
}
