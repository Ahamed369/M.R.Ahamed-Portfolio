import { useMemo, useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { LEARNING, type QuizQ, type SectionId, type Topic } from '../data/learning';
import { projectsUsing } from '../data/portfolio';
import { readStore, writeStore } from '../system/storage';
import { notify } from '../system/notify';
import { useWM } from '../system/WindowManager';
import { useSettings } from '../system/SettingsContext';
import { APPS } from '../system/apps';
import { AppIcon } from '../components/AppIcons';
import type { AppProps } from '../components/Desktop';

const KEY = 'mra-learning-v10';
/** Learning Hub topic → ready-made Flashcards deck */
const TOPIC_DECK: Record<string, string> = { fundamentals: 'b-fund', javascript: 'b-js', python: 'b-py', java: 'b-java', html: 'b-web', css: 'b-web', web: 'b-web', react: 'b-react', sql: 'b-sql', git: 'b-git', networking: 'b-net', oop: 'b-oop', dsa: 'b-dsa', security: 'b-sec' };
interface Store {
  done: string[];
  /** best quiz score per topic: [correct, total] */
  quiz?: Record<string, [number, number]>;
}

/* ───── interface text (English / Sinhala / Tamil) ───── */
const L = {
  title: { en: 'Learning Hub', si: 'ඉගෙනුම් මධ්‍යස්ථානය', ta: 'கற்றல் மையம்' },
  studied: { en: 'studied', si: 'අධ්‍යයනය කළා', ta: 'படித்தவை' },
  search: { en: 'Search topics', si: 'මාතෘකා සොයන්න', ta: 'தலைப்புகளைத் தேடு' },
  topics: { en: '‹ Topics', si: '‹ මාතෘකා', ta: '‹ தலைப்புகள்' },
  key: { en: 'Key points', si: 'ප්‍රධාන කරුණු', ta: 'முக்கிய குறிப்புகள்' },
  res: { en: 'Free resources', si: 'නොමිලේ සම්පත්', ta: 'இலவச வளங்கள்' },
  ext: { en: 'External', si: 'බාහිර', ta: 'வெளி' },
  used: { en: 'Used in these portfolio projects', si: 'මෙම ව්‍යාපෘතිවල භාවිත කර ඇත', ta: 'இந்த திட்டங்களில் பயன்படுத்தப்பட்டது' },
  practise: { en: 'Practise in', si: 'පුහුණු වන්න', ta: 'பயிற்சி செய்ய' },
  mark: { en: 'Mark as Studied', si: 'අධ්‍යයනය කළ ලෙස සලකුණු කරන්න', ta: 'படித்ததாகக் குறி' },
  marked: { en: '✓ Studied', si: '✓ අධ්‍යයනය කළා', ta: '✓ படித்தது' },
  notes: { en: 'Save to Notes', si: 'Notes වෙත සුරකින්න', ta: 'Notes-இல் சேமி' },
  quiz: { en: 'Quick quiz', si: 'කෙටි ප්‍රශ්නාවලිය', ta: 'சிறு வினாடி வினா' },
  check: { en: 'Check answers', si: 'පිළිතුරු පරීක්ෂා කරන්න', ta: 'விடைகளைச் சரிபார்' },
  again: { en: 'Try again', si: 'නැවත උත්සාහ කරන්න', ta: 'மீண்டும் முயற்சி' },
  best: { en: 'Best score', si: 'හොඳම ලකුණු', ta: 'சிறந்த மதிப்பெண்' },
  answerAll: { en: 'Answer every question first.', si: 'පළමුව සියලු ප්‍රශ්නවලට පිළිතුරු දෙන්න.', ta: 'முதலில் எல்லா கேள்விகளுக்கும் பதிலளிக்கவும்.' },
  pick: { en: 'Choose a topic to see key points, free resources and a quick quiz.', si: 'ප්‍රධාන කරුණු, සම්පත් සහ ප්‍රශ්නාවලිය බැලීමට මාතෘකාවක් තෝරන්න.', ta: 'முக்கிய குறிப்புகள், வளங்கள் மற்றும் வினாடி வினாவைக் காண ஒரு தலைப்பைத் தேர்ந்தெடுக்கவும்.' },
  none: { en: 'No topics match', si: 'ගැළපෙන මාතෘකා නැත', ta: 'பொருந்தும் தலைப்புகள் இல்லை' },
  note: { en: 'General study guidance — not a personal qualification. External sites belong to their owners and open in a new tab.', si: 'සාමාන්‍ය ඉගෙනුම් මඟපෙන්වීමක් — පුද්ගලික සුදුසුකමක් නොවේ. බාහිර වෙබ් අඩවි නව ටැබයක විවෘත වේ.', ta: 'பொதுவான கற்றல் வழிகாட்டல் — தனிப்பட்ட தகுதி அல்ல. வெளி தளங்கள் புதிய தாவலில் திறக்கும்.' },
} as const;
type LK = keyof typeof L;

const SEC_NAME: Record<SectionId, { si: string; ta: string }> = {
  it: { si: 'IT සහ ක්‍රමලේඛනය', ta: 'IT & நிரலாக்கம்' },
  english: { si: 'ඉංග්‍රීසි', ta: 'ஆங்கிலம்' },
  business: { si: 'ව්‍යවසායකත්වය', ta: 'தொழில்முனைவு' },
  study: { si: 'ඉගෙනුම් කුසලතා', ta: 'படிப்புத் திறன்கள்' },
  career: { si: 'වෘත්තීය සංවර්ධනය', ta: 'தொழில் வளர்ச்சி' },
  productivity: { si: 'ඵලදායිතාව', ta: 'உற்பத்தித்திறன்' },
};

/** Original section glyphs (24 × 24, filled) — no emoji. */
const SEC_ICON: Record<SectionId, { d: string; c: string }> = {
  it: { c: '#0a84ff', d: 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 14.5zm6.3 3.2L6.6 11l2.7 2.3 1-1.1L8.7 11l1.6-1.2zm5.4 0-1 1.1 1.6 1.2-1.6 1.2 1 1.1 2.7-2.3zM8 19.5h8a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2z' },
  english: { c: '#ff9f0a', d: 'M4 4h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5l-4.5 3.6A.6.6 0 0 1 5.5 19v-3H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zm4.4 3.2L5.8 13.4h1.7l.5-1.3h2.6l.5 1.3h1.7L10.2 7.2zm.9 2 .8 1.7H8.5zM22 9.5v6a3 3 0 0 1-3 3h-.5v1.8a.5.5 0 0 1-.8.4L15.5 18.5' },
  business: { c: '#ff375f', d: 'M14.6 2.4c2.6-.5 5.5-.4 6.6.4.8 1.1.9 4 .4 6.6-.6 2.8-2.4 5.4-5.6 7.6l.3 3.1a1 1 0 0 1-.5 1l-3 1.6-.8-3.6-3.3-3.3-3.6-.8 1.6-3a1 1 0 0 1 1-.5l3.1.3c2.2-3.2 4.8-5 7.6-5.6zM16.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5.2 15.3l3.5 3.5c-1 1.6-3.3 2.6-6.2 2.7.1-2.9 1.1-5.2 2.7-6.2z' },
  study: { c: '#30d158', d: 'M3 5.2c2.7-1 5.6-.8 8 .7v14c-2.4-1.5-5.3-1.7-8-.7a.7.7 0 0 1-1-.6V5.9a.8.8 0 0 1 1-.7zm18 0c-2.7-1-5.6-.8-8 .7v14c2.4-1.5 5.3-1.7 8-.7a.7.7 0 0 0 1-.6V5.9a.8.8 0 0 0-1-.7z' },
  career: { c: '#5e5ce6', d: 'M9 3h6a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v3.5c-2.8 1.3-6.2 2-10 2s-7.2-.7-10-2V8a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2zm0 2v1h6V5zm1.5 8.6h3V15h-3zM2 13.4c2.9 1.2 6.3 1.8 10 1.8s7.1-.6 10-1.8V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z' },
  productivity: { c: '#bf5af2', d: 'M10 1.5h4a1 1 0 0 1 0 2h-1v1.1a9 9 0 1 1-2 0V3.5h-1a1 1 0 0 1 0-2zM12 8a1 1 0 0 0-1 1v4.2a1 1 0 0 0 .4.8l2.6 2a1 1 0 1 0 1.2-1.6L13 12.7V9a1 1 0 0 0-1-1zm7.1-3.5 1.4 1.4-1.4 1.4-1.4-1.4z' },
};

function SecIcon({ id, size = 18 }: { id: SectionId; size?: number }) {
  const s = SEC_ICON[id];
  return (
    <span className="lh-sico" style={{ background: s.c, width: size + 8, height: size + 8 }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <path d={s.d} fill="#fff" fillRule="evenodd" />
      </svg>
    </span>
  );
}

/** Deterministic shuffle so the right answer isn't always in the same place. */
function order(seed: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function Quiz({ topic, best, onScore, tr }: { topic: Topic; best?: [number, number]; onScore: (c: number, t: number) => void; tr: (k: LK) => string }) {
  const [ans, setAns] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [warn, setWarn] = useState(false);
  const qs: QuizQ[] = topic.quiz;
  if (!qs.length) return null;
  const score = qs.reduce((s, q, i) => s + (ans[i] === q.c ? 1 : 0), 0);
  const check = () => {
    if (Object.keys(ans).length < qs.length) return setWarn(true);
    setWarn(false);
    setChecked(true);
    onScore(score, qs.length);
  };
  return (
    <section className="lh-quiz" aria-label={tr('quiz')}>
      <h4>
        {tr('quiz')}
        {best && (
          <span className="lh-best">
            {tr('best')}: {best[0]}/{best[1]}
          </span>
        )}
      </h4>
      {qs.map((q, i) => (
        <fieldset key={q.q} className="lh-q">
          <legend>
            {i + 1}. {q.q}
          </legend>
          {order(topic.id + i, q.a.length).map((k) => {
            const picked = ans[i] === k;
            const state = checked ? (k === q.c ? 'right' : picked ? 'wrong' : '') : picked ? 'picked' : '';
            return (
              <label key={k} className={`lh-opt ${state}`}>
                <input type="radio" name={`${topic.id}-${i}`} checked={picked} disabled={checked} onChange={() => setAns((a) => ({ ...a, [i]: k }))} />
                <span>{q.a[k]}</span>
              </label>
            );
          })}
          {checked && <p className={`lh-why ${ans[i] === q.c ? 'ok' : 'no'}`}>{q.why}</p>}
        </fieldset>
      ))}
      <div className="lh-qbar">
        {checked ? (
          <>
            <b className="lh-score">
              {score}/{qs.length}
            </b>
            <button type="button" onClick={() => (setAns({}), setChecked(false))}>
              {tr('again')}
            </button>
          </>
        ) : (
          <button type="button" className="primary" onClick={check}>
            {tr('check')}
          </button>
        )}
        {warn && <small role="alert">{tr('answerAll')}</small>}
      </div>
    </section>
  );
}

/**
 * v10.3 — Learning Hub: short study guides (IT, English, Entrepreneurship,
 * Study Skills, Career, Productivity) with clearly-marked links to free
 * external resources and a short quiz for every topic. Mark topics as studied,
 * save any guide to Notes and jump to the related practice apps.
 */
export default function LearningApp({ win }: Partial<AppProps>) {
  const wm = useWM();
  const { settings } = useSettings();
  const lang = (settings.language ?? 'en') as 'en' | 'si' | 'ta';
  const tr = (k: LK) => L[k][lang] ?? L[k].en;
  const secName = (id: SectionId, en: string) => (lang === 'en' ? en : SEC_NAME[id][lang]);
  const [sec, setSec] = useState<SectionId>((win?.args?.section as SectionId) ?? 'it');
  const [sel, setSel] = useState<string | null>(win?.args?.topic ?? null);
  const [q, setQ] = useState('');
  const [store, setStore] = useState<Store>(() => {
    const s = readStore<Store>(KEY, { done: [] });
    return { done: Array.isArray(s.done) ? s.done : [], quiz: s.quiz ?? {} };
  });
  const save = (next: Store) => (setStore(next), writeStore(KEY, next));
  const done = store.done;
  const toggleDone = (id: string) => save({ ...store, done: done.includes(id) ? done.filter((x) => x !== id) : [...done, id] });
  const onScore = (id: string, c: number, t: number) => {
    const prev = store.quiz?.[id];
    const best: [number, number] = !prev || c >= prev[0] ? [c, t] : prev;
    save({ ...store, quiz: { ...store.quiz, [id]: best }, done: c === t && !done.includes(id) ? [...done, id] : done });
  };
  const section = LEARNING.find((s) => s.id === sec) ?? LEARNING[0];
  const all = useMemo(() => LEARNING.flatMap((s) => s.topics.map((t) => ({ ...t, sec: s.id }))), []);
  const list: (Topic & { sec?: string })[] = q.trim() ? all.filter((t) => `${t.title} ${t.summary} ${t.points.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())) : section.topics;
  const topic = all.find((t) => t.id === sel) ?? null;
  const total = all.length;
  const saveToNotes = (t: Topic) => {
    const cur = readStore<{ list: { id: string; title: string; body: string; at: number }[] }>('mra-notes-mine', { list: [] }).list ?? [];
    const body = `${t.summary}\n\n${t.points.map((p) => `• ${p}`).join('\n')}\n\nResources:\n${t.resources.map((r) => `${r.title} (${r.by}) — ${r.url}`).join('\n')}`;
    writeStore('mra-notes-mine', { list: [{ id: `m${Date.now()}`, title: `Study: ${t.title}`, body, at: Date.now() }, ...cur] });
    notify({ app: 'Notes', icon: 'notes', title: 'Saved to Notes', body: `Study: ${t.title}`, actions: [{ label: 'Open Notes', run: () => wm.open('notes') }] });
  };
  return (
    <div className={`lh ${topic ? 'detail' : ''}`}>
      <DragBar className="lh-bar">
        <Lights />
        <b>{tr('title')}</b>
        <span className="lh-progress" title="Topics marked as studied">
          {done.filter((d) => all.some((t) => t.id === d)).length}/{total} {tr('studied')}
        </span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('search')} aria-label={tr('search')} data-nodrag />
      </DragBar>
      <div className="lh-body">
        <nav className="lh-side" aria-label="Sections">
          {LEARNING.map((s) => (
            <button key={s.id} type="button" className={s.id === sec && !q ? 'on' : ''} onClick={() => (setSec(s.id), setSel(null), setQ(''))}>
              <SecIcon id={s.id} size={14} /> {secName(s.id, s.title)}
              <small>
                {s.topics.filter((t) => done.includes(t.id)).length}/{s.topics.length}
              </small>
            </button>
          ))}
        </nav>
        <section className="lh-list" aria-label="Topics">
          {list.map((t) => (
            <button key={t.id} type="button" className={`lh-topic ${sel === t.id ? 'on' : ''}`} onClick={() => setSel(t.id)}>
              <b>
                {done.includes(t.id) && (
                  <i className="lh-tick" aria-label="Studied">
                    ✓
                  </i>
                )}
                {t.title}
              </b>
              <small>{t.summary}</small>
              {store.quiz?.[t.id] && (
                <em className="lh-qs">
                  {tr('quiz')} {store.quiz[t.id][0]}/{store.quiz[t.id][1]}
                </em>
              )}
            </button>
          ))}
          {!list.length && (
            <p className="lh-empty">
              {tr('none')} “{q}”.
            </p>
          )}
        </section>
        <article className="lh-detail" aria-live="polite">
          {topic ? (
            <>
              <button type="button" className="lh-back" onClick={() => setSel(null)}>
                {tr('topics')}
              </button>
              <h2>{topic.title}</h2>
              <p className="lh-sum">{topic.summary}</p>
              <h4>{tr('key')}</h4>
              <ul>
                {topic.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <h4>{tr('res')}</h4>
              <div className="lh-res">
                {topic.resources.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="lh-r">
                    <b>{r.title} ↗</b>
                    <small>
                      {tr('ext')} · {r.kind} · {r.by}
                    </small>
                  </a>
                ))}
              </div>
              {topic.tech && topic.tech.some((x) => projectsUsing(x).length) && (
                <>
                  <h4>{tr('used')}</h4>
                  <div className="lh-proj">
                    {Array.from(new Map(topic.tech.flatMap((x) => projectsUsing(x)).map((p) => [p.id, p])).values()).map((p) => (
                      <button key={p.id} type="button" onClick={() => wm.open('xcode', { project: p.id })}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {topic.apps.length > 0 && (
                <>
                  <h4>{tr('practise')}</h4>
                  <div className="lh-apps">
                    {topic.apps.map((a) => (
                      <button key={a} type="button" onClick={() => wm.open(a, a === 'flashcards' ? (TOPIC_DECK[topic.id] ? { deck: TOPIC_DECK[topic.id] } : undefined) : a === 'playground' ? { topic: topic.id } : undefined)}>
                        <AppIcon name={APPS[a].icon} className="lh-appico" />
                        {APPS[a].title}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <Quiz key={topic.id} topic={topic} best={store.quiz?.[topic.id]} onScore={(c, t) => onScore(topic.id, c, t)} tr={tr} />
              <div className="lh-actions">
                <button type="button" className={done.includes(topic.id) ? 'on' : ''} onClick={() => toggleDone(topic.id)} aria-pressed={done.includes(topic.id)}>
                  {done.includes(topic.id) ? tr('marked') : tr('mark')}
                </button>
                <button type="button" onClick={() => saveToNotes(topic)}>
                  {tr('notes')}
                </button>
              </div>
              <p className="lh-note">{tr('note')}</p>
            </>
          ) : (
            <div className="lh-placeholder">
              <SecIcon id={section.id} size={34} />
              <b>{secName(section.id, section.title)}</b>
              <small>{tr('pick')}</small>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
