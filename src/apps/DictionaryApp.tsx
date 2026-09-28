import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppProps } from '../components/Desktop';

type Source = 'all' | 'english' | 'thesaurus' | 'tech' | 'wiki';

interface Sense {
  pos: string;
  defs: { d: string; ex?: string }[];
  syn: string[];
  ant: string[];
}
interface Entry {
  word: string;
  phonetic?: string;
  audio?: string;
  senses: Sense[];
}

/** Offline glossary of technologies used in the portfolio. */
const TECH: Record<string, string> = {
  react: 'A JavaScript library for building user interfaces out of reusable components that re-render when their state changes.',
  typescript: 'A typed superset of JavaScript that adds static types, catching mistakes before the code runs.',
  javascript: 'The programming language of the web, running in browsers and (with Node.js) on servers.',
  'node.js': 'A JavaScript runtime built on Chrome’s V8 engine for building servers and command-line tools.',
  express: 'A minimal web framework for Node.js used to build REST APIs and web servers.',
  php: 'A server-side scripting language widely used to build dynamic websites, often with MySQL.',
  mysql: 'A popular open-source relational database that stores data in tables queried with SQL.',
  mongodb: 'A document database that stores data as flexible JSON-like documents.',
  sqlite: 'A small, self-contained SQL database engine stored in a single file — common in mobile and desktop apps.',
  sql: 'Structured Query Language — the standard language for querying and changing relational databases.',
  'sql injection': 'An attack where untrusted input changes a database query; prevented with parameterised queries.',
  xss: 'Cross-site scripting — injecting malicious scripts into pages viewed by other users; prevented by escaping output.',
  csrf: 'Cross-site request forgery — tricking a signed-in user’s browser into making unwanted requests; prevented with tokens.',
  jwt: 'JSON Web Token — a signed token used to prove a user’s identity between a client and an API.',
  'rest api': 'An API style where resources are accessed with standard HTTP methods such as GET, POST, PUT and DELETE.',
  api: 'Application Programming Interface — a defined way for programs to talk to each other.',
  html: 'HyperText Markup Language — the structure of web pages.',
  css: 'Cascading Style Sheets — the language that styles web pages (layout, colours, fonts, animation).',
  bootstrap: 'A CSS framework with a responsive grid and ready-made components.',
  jquery: 'A JavaScript library that simplifies DOM manipulation, events and animation.',
  java: 'A class-based, object-oriented language that runs on the Java Virtual Machine — used for Android and desktop apps.',
  'java swing': 'Java’s classic toolkit for building desktop graphical user interfaces.',
  android: 'Google’s mobile operating system; apps are commonly written in Java or Kotlin.',
  python: 'A readable general-purpose programming language used for scripting, data, web and desktop apps.',
  tkinter: 'Python’s standard library for building desktop GUIs.',
  git: 'A distributed version-control system that tracks changes to code.',
  github: 'A platform for hosting Git repositories, collaborating and showcasing code.',
  oop: 'Object-oriented programming — organising code into objects with state and behaviour (classes, inheritance, encapsulation, polymorphism).',
  mvc: 'Model–View–Controller — an architecture that separates data, presentation and control logic.',
  authentication: 'Verifying who a user is (e.g. password, passkey, token).',
  authorization: 'Deciding what an authenticated user is allowed to do.',
  hashing: 'Turning data into a fixed-length fingerprint; passwords are stored hashed (e.g. bcrypt), never in plain text.',
  bcrypt: 'A slow, salted password-hashing function designed to resist brute-force attacks.',
  https: 'HTTP over TLS — encrypts traffic between browser and server.',
  'responsive design': 'Designing layouts that adapt to any screen size, from phones to desktops.',
  localstorage: 'A browser API that stores small key–value data on the visitor’s device.',
  'e-commerce': 'Buying and selling goods online — product catalogues, carts, checkout and payments.',
  'full-stack': 'Working on both the front end (what users see) and the back end (servers, databases, APIs).',
  'front-end': 'The client side of an application — HTML, CSS, JavaScript and UI frameworks.',
  'back-end': 'The server side of an application — business logic, databases and APIs.',
  crud: 'Create, Read, Update, Delete — the four basic operations on stored data.',
  'data structures': 'Ways of organising data (arrays, lists, trees, hash maps) for efficient access.',
  algorithm: 'A step-by-step procedure for solving a problem.',
  vite: 'A fast front-end build tool and development server.',
  json: 'JavaScript Object Notation — a lightweight text format for exchanging data.',
  figma: 'A collaborative interface-design tool.',
  'penetration testing': 'Authorised simulated attacks on a system to find security weaknesses.',
  owasp: 'Open Worldwide Application Security Project — known for the OWASP Top 10 web security risks.',
  'mpandroidchart': 'An Android charting library for line, bar and pie charts.',
  portfolio: 'A curated collection of work that shows someone’s skills and projects — like this one.',
  'ui/ux': 'User interface and user experience — how a product looks and how it feels to use.',
};

const RECENT = ['serendipity', 'resilient', 'algorithm', 'portfolio', 'react'];

export default function DictionaryApp({ win }: AppProps) {
  const [src, setSrc] = useState<Source>('all');
  const [q, setQ] = useState('');
  const [word, setWord] = useState(win.args?.word || 'portfolio');
  const [hist, setHist] = useState<string[]>([win.args?.word || 'portfolio']);
  // v9 — Spotlight "Look up …" opens the Dictionary on a word
  useEffect(() => {
    if (win.args?.word) setWord(win.args.word);
  }, [win.launchKey, win.args?.word]);
  const [pos, setPos] = useState(0);
  const [size, setSize] = useState(15);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [wiki, setWiki] = useState<{ title: string; extract: string; url: string; thumb?: string } | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const techHits = useMemo(() => {
    const t = (q || word).toLowerCase();
    return Object.keys(TECH).filter((k) => k.includes(t) || t.includes(k)).slice(0, 12);
  }, [q, word]);

  useEffect(() => {
    const ctrl = new AbortController();
    setState('loading');
    setEntry(null);
    setWiki(null);
    const w = encodeURIComponent(word.trim());
    Promise.allSettled([
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`, { signal: ctrl.signal }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('nf')))),
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${w}`, { signal: ctrl.signal }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('nf')))),
    ]).then(([d, wk]) => {
      if (ctrl.signal.aborted) return;
      if (d.status === 'fulfilled' && Array.isArray(d.value)) {
        const first = d.value[0];
        const senses: Sense[] = [];
        d.value.forEach((e: { meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[]; synonyms: string[]; antonyms: string[] }[] }) =>
          e.meanings.forEach((m) => senses.push({ pos: m.partOfSpeech, defs: m.definitions.slice(0, 6).map((x) => ({ d: x.definition, ex: x.example })), syn: m.synonyms.slice(0, 10), ant: m.antonyms.slice(0, 6) })),
        );
        const ph = (first.phonetics ?? []) as { text?: string; audio?: string }[];
        setEntry({ word: first.word, phonetic: first.phonetic ?? ph.find((p) => p.text)?.text, audio: ph.find((p) => p.audio)?.audio, senses });
      }
      if (wk.status === 'fulfilled' && wk.value?.extract) setWiki({ title: wk.value.title, extract: wk.value.extract, url: wk.value.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${w}`, thumb: wk.value.thumbnail?.source });
      setState(d.status === 'rejected' && wk.status === 'rejected' ? 'error' : 'idle');
    });
    return () => ctrl.abort();
  }, [word]);

  const look = (w: string) => {
    const v = w.trim();
    if (!v || v === word) return;
    const h = [...hist.slice(0, pos + 1), v];
    setHist(h);
    setPos(h.length - 1);
    setWord(v);
  };
  const nav = (d: number) => {
    const p = Math.max(0, Math.min(hist.length - 1, pos + d));
    setPos(p);
    setWord(hist[p]);
  };

  const tech = TECH[word.toLowerCase()];
  const list = q.trim() ? [q.trim(), ...techHits.filter((k) => k !== q.trim().toLowerCase())] : [...new Set([...hist].reverse().concat(RECENT))].slice(0, 12);

  const showEnglish = src === 'all' || src === 'english';
  const showThes = src === 'all' || src === 'thesaurus';
  const showTech = src === 'all' || src === 'tech';
  const showWiki = src === 'all' || src === 'wiki';
  const syns = entry ? [...new Set(entry.senses.flatMap((s) => s.syn))] : [];
  const ants = entry ? [...new Set(entry.senses.flatMap((s) => s.ant))] : [];

  return (
    <div className="dc" style={{ ['--dc-size' as string]: `${size}px` }}>
      <div className="dc-toolbar">
        <div className="dc-seg">
          <button type="button" onClick={() => nav(-1)} disabled={pos === 0} aria-label="Back">
            ‹
          </button>
          <button type="button" onClick={() => nav(1)} disabled={pos >= hist.length - 1} aria-label="Forward">
            ›
          </button>
        </div>
        <div className="dc-seg">
          <button type="button" onClick={() => setSize((s) => Math.max(12, s - 1))} aria-label="Smaller text" className="sm">
            A
          </button>
          <button type="button" onClick={() => setSize((s) => Math.min(22, s + 1))} aria-label="Larger text">
            A
          </button>
        </div>
        <form
          className="dc-search"
          onSubmit={(e) => {
            e.preventDefault();
            look(q);
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m10.5 10.5 3.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Look up a word" />
          {q && (
            <button type="button" className="dc-x" onClick={() => setQ('')} aria-label="Clear">
              ✕
            </button>
          )}
        </form>
      </div>
      <nav className="dc-tabs">
        {(
          [
            ['all', 'All'],
            ['english', 'English'],
            ['thesaurus', 'Thesaurus'],
            ['tech', 'Tech Glossary'],
            ['wiki', 'Wikipedia'],
          ] as [Source, string][]
        ).map(([id, l]) => (
          <button key={id} type="button" className={src === id ? 'on' : ''} onClick={() => setSrc(id)}>
            {l}
          </button>
        ))}
      </nav>
      <div className="dc-body">
        <aside className="dc-list">
          {list.map((w) => (
            <button key={w} type="button" className={w.toLowerCase() === word.toLowerCase() ? 'on' : ''} onClick={() => look(w)}>
              {w}
            </button>
          ))}
        </aside>
        <article className="dc-entry scroll-smooth" key={word}>
          <header className="fade-swap">
            <h1>{entry?.word ?? word}</h1>
            {entry?.phonetic && <span className="dc-ph">| {entry.phonetic} |</span>}
            {entry?.audio && (
              <button
                type="button"
                className="dc-audio"
                onClick={() => {
                  audioRef.current?.pause();
                  audioRef.current = new Audio(entry.audio);
                  void audioRef.current.play().catch(() => undefined);
                }}
                aria-label="Play pronunciation"
              >
                🔊
              </button>
            )}
          </header>
          {state === 'loading' && <p className="dc-dim">Looking up “{word}”…</p>}
          {showTech && tech && (
            <section className="dc-sec">
              <h2>Tech Glossary</h2>
              <p>{tech}</p>
            </section>
          )}
          {showEnglish &&
            entry?.senses.map((s, i) => (
              <section key={i} className="dc-sec">
                <h2>
                  <span className="dc-letter">{String.fromCharCode(65 + i)}</span> {s.pos}
                </h2>
                <ol>
                  {s.defs.map((d, j) => (
                    <li key={j}>
                      {d.d}
                      {d.ex && <em>“{d.ex}”</em>}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          {showThes && (syns.length > 0 || ants.length > 0) && (
            <section className="dc-sec">
              <h2>Thesaurus</h2>
              {syns.length > 0 && (
                <p>
                  <b>Synonyms: </b>
                  {syns.map((w, i) => (
                    <button key={w} type="button" className="dc-link" onClick={() => look(w)}>
                      {w}
                      {i < syns.length - 1 ? ', ' : ''}
                    </button>
                  ))}
                </p>
              )}
              {ants.length > 0 && (
                <p>
                  <b>Antonyms: </b>
                  {ants.join(', ')}
                </p>
              )}
            </section>
          )}
          {showWiki && wiki && (
            <section className="dc-sec dc-wiki">
              <h2>Wikipedia</h2>
              {wiki.thumb && <img src={wiki.thumb} alt="" />}
              <p>{wiki.extract}</p>
              <a href={wiki.url} target="_blank" rel="noopener noreferrer">
                Read more on Wikipedia ↗
              </a>
            </section>
          )}
          {state === 'error' && !tech && (
            <div className="dc-empty">
              <b>No entries found</b>
              <span>{navigator.onLine ? 'Check the spelling, or try the Tech Glossary.' : 'You’re offline — the Tech Glossary still works.'}</span>
            </div>
          )}
          {state !== 'loading' && !tech && src === 'tech' && <p className="dc-dim">Not in the Tech Glossary. Try: react, jwt, rest api, sql injection, bcrypt…</p>}
        </article>
      </div>
    </div>
  );
}
