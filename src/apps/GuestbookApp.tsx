import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { DragBar, Lights } from '../components/Window';
import { AppIcon } from '../components/AppIcons';
import { integrations, personal } from '../data/portfolio';
import { usePersisted, uid, fmtWhen } from '../system/useStore';
import { notify } from '../system/notify';
import { copyText, deepLink, sharePortfolio } from '../system/share';
import { clearBadge } from '../system/badges';
import { t } from '../system/i18n';

/**
 * v8 — Visitor Guestbook.
 *  • Always works: entries are saved in this browser.
 *  • Shared mode: when integrations.supabaseUrl + supabaseAnonKey are set,
 *    entries are also posted to / read from a Supabase "guestbook" table so
 *    every visitor (and M.R. Ahamed) can read them all. Setup: UPDATE-GUIDE.md.
 */
interface Entry {
  id: string;
  name: string;
  message: string;
  mood: string;
  location?: string;
  at: number;
  likes: number;
  mine?: boolean;
  remote?: boolean;
  pinned?: boolean;
}

const MOODS = ['👋', '🚀', '💡', '🔥', '❤️', '👏', '🎉', '🤝'];
const OWNER: Entry = {
  id: 'owner',
  name: personal.name,
  message: 'Welcome to my guestbook! Thanks for exploring my portfolio — leave a note, feedback or just say hello. 😊',
  mood: '👋',
  location: personal.location,
  at: new Date('2026-09-27T09:00:00+05:30').getTime(),
  likes: 0,
  pinned: true,
};

const remoteOn = () => !!(integrations.supabaseUrl && integrations.supabaseAnonKey);
const headers = () => ({ apikey: integrations.supabaseAnonKey, Authorization: `Bearer ${integrations.supabaseAnonKey}`, 'Content-Type': 'application/json' });

async function loadRemote(): Promise<Entry[]> {
  const r = await fetch(`${integrations.supabaseUrl}/rest/v1/guestbook?select=*&order=created_at.desc&limit=200`, { headers: headers() });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  const rows = (await r.json()) as { id: number; name: string; message: string; mood?: string; location?: string; created_at: string }[];
  return rows.map((x) => ({ id: `r${x.id}`, name: x.name, message: x.message, mood: x.mood || '👋', location: x.location || undefined, at: new Date(x.created_at).getTime(), likes: 0, remote: true }));
}
async function postRemote(e: Entry): Promise<void> {
  const r = await fetch(`${integrations.supabaseUrl}/rest/v1/guestbook`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify({ name: e.name, message: e.message, mood: e.mood, location: e.location ?? null }) });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
}

export default function GuestbookApp() {
  const [local, setLocal] = usePersisted<Entry[]>('mra-guestbook-v8', []);
  const [likes, setLikes] = usePersisted<Record<string, number>>('mra-guestbook-likes', {});
  const [remote, setRemote] = useState<Entry[]>([]);
  const [status, setStatus] = useState<'local' | 'loading' | 'shared' | 'error'>(remoteOn() ? 'loading' : 'local');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [mood, setMood] = useState('👋');
  const [loc, setLoc] = useState('');
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'new' | 'old' | 'liked'>('new');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => clearBadge('guestbook'), []);

  const refresh = useCallback(() => {
    if (!remoteOn()) return;
    setStatus('loading');
    loadRemote()
      .then((r) => {
        setRemote(r);
        setStatus('shared');
      })
      .catch(() => setStatus('error'));
  }, []);
  useEffect(refresh, [refresh]);

  const all = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...local, ...remote].filter((e) => {
      const k = `${e.name}|${e.message}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    let list = merged.map((e) => ({ ...e, likes: e.likes + (likes[e.id] ?? 0) }));
    if (q) list = list.filter((e) => `${e.name} ${e.message} ${e.location ?? ''}`.toLowerCase().includes(q.toLowerCase()));
    list.sort((a, b) => (sort === 'liked' ? b.likes - a.likes || b.at - a.at : sort === 'old' ? a.at - b.at : b.at - a.at));
    return [{ ...OWNER, likes: likes.owner ?? 0 }, ...list];
  }, [local, remote, likes, q, sort]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const m = msg.trim();
    if (!n) return setErr('Please add your name.');
    if (m.length < 2) return setErr('Please write a short message.');
    if (m.length > 500) return setErr('Please keep it under 500 characters.');
    if (/https?:\/\//i.test(m) && m.split(/https?:\/\//i).length > 3) return setErr('Too many links — please keep it simple.');
    setErr('');
    const entry: Entry = { id: uid('g'), name: n.slice(0, 40), message: m, mood, location: loc.trim().slice(0, 40) || undefined, at: Date.now(), likes: 0, mine: true };
    setLocal((l) => [entry, ...l]);
    setMsg('');
    notify({ app: 'Guestbook', icon: 'guestbook', title: 'Thanks for signing! ✍️', body: remoteOn() ? 'Your message is shared with every visitor.' : 'Saved in this browser.' });
    if (remoteOn()) {
      try {
        await postRemote(entry);
        refresh();
      } catch {
        setStatus('error');
      }
    }
  };

  const like = (id: string) => setLikes((l) => ({ ...l, [id]: (l[id] ?? 0) > 0 ? 0 : 1 }));
  const remove = (id: string) => setLocal((l) => l.filter((x) => x.id !== id));
  const saveEdit = (id: string) => {
    const v = editText.trim();
    if (v.length < 2) return;
    setLocal((l) => l.map((x) => (x.id === id ? { ...x, message: v } : x)));
    setEditing(null);
  };

  return (
    <div className="gb">
      <DragBar className="gb-bar">
        <Lights />
        <span className="gb-title">
          <AppIcon name="guestbook" /> {t('guestbook')}
        </span>
        <span className={`gb-status ${status}`}>{status === 'shared' ? '● Shared with all visitors' : status === 'loading' ? '… Syncing' : status === 'error' ? '⚠︎ Offline — saved locally' : '● Saved in this browser'}</span>
      </DragBar>
      <div className="gb-wrap">
        <form className="gb-form" onSubmit={(e) => void submit(e)} noValidate>
          <h2>✍️ {t('leaveMessage')}</h2>
          <label>
            <span>{t('yourName')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Your name" autoComplete="name" />
          </label>
          <label>
            <span>From (optional)</span>
            <input value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={40} placeholder="City, country" />
          </label>
          <label>
            <span>{t('message')}</span>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} rows={5} placeholder="Say hello, share feedback, or suggest an idea…" />
            <small className="gb-count">{msg.length}/500</small>
          </label>
          <div className="gb-moods" role="radiogroup" aria-label="Mood">
            {MOODS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mood === m} className={mood === m ? 'on' : ''} onClick={() => setMood(m)}>
                {m}
              </button>
            ))}
          </div>
          {err && (
            <div className="gb-err" role="alert">
              {err}
            </div>
          )}
          <button type="submit" className="gb-submit">
            {t('sign')}
          </button>
          <p className="gb-privacy">Your name and message are shown publicly in this guestbook. Please don’t share private information.</p>
        </form>
        <section className="gb-list">
          <div className="gb-tools">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" aria-label="Search messages" />
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
              <option value="new">Newest</option>
              <option value="old">Oldest</option>
              <option value="liked">Most liked</option>
            </select>
            {remoteOn() && (
              <button type="button" onClick={refresh} title="Refresh">
                ↻
              </button>
            )}
          </div>
          <div className="gb-count-line">{all.length} message{all.length === 1 ? '' : 's'}</div>
          <div className="gb-entries scroll-smooth">
            {all.map((e) => (
              <article key={e.id} className={`gb-entry ${e.pinned ? 'pinned' : ''} ${e.mine ? 'mine' : ''}`}>
                <span className="gb-mood">{e.mood}</span>
                <div className="gb-body">
                  <header>
                    <b>{e.name}</b>
                    {e.pinned && <span className="gb-pin">📌 Owner</span>}
                    {e.mine && <span className="gb-you">You</span>}
                    {e.location && <small>· {e.location}</small>}
                    <time dateTime={new Date(e.at).toISOString()} title={new Date(e.at).toLocaleString()}>
                      {fmtWhen(e.at)}
                    </time>
                  </header>
                  {editing === e.id ? (
                    <div className="gb-edit">
                      <textarea value={editText} onChange={(x) => setEditText(x.target.value)} rows={3} maxLength={500} autoFocus />
                      <div>
                        <button type="button" onClick={() => saveEdit(e.id)}>
                          Save
                        </button>
                        <button type="button" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>{e.message}</p>
                  )}
                  <footer>
                    <button type="button" className={`gb-like ${(likes[e.id] ?? 0) > 0 ? 'on' : ''}`} onClick={() => like(e.id)} aria-pressed={(likes[e.id] ?? 0) > 0}>
                      ♥ {e.likes || ''}
                    </button>
                    <button type="button" onClick={() => void copyText(`“${e.message}” — ${e.name}`).then(() => notify({ app: 'Guestbook', icon: 'guestbook', title: 'Message copied' }))}>
                      Copy
                    </button>
                    <button type="button" onClick={() => void sharePortfolio({ title: `${e.name} signed ${personal.name}’s guestbook`, text: `“${e.message}” — ${e.name}`, url: deepLink('guestbook') })}>
                      Share
                    </button>
                    {e.mine && !e.remote && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(e.id);
                            setEditText(e.message);
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" className="danger" onClick={() => remove(e.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </footer>
                </div>
              </article>
            ))}
            {all.length === 1 && <p className="gb-empty">Be the first visitor to sign the guestbook!</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
