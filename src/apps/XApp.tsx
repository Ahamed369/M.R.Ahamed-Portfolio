import { useMemo, useState, type MouseEvent as RMouseEvent } from 'react';
import { DragBar, Lights } from '../components/Window';
import { AppIcon } from '../components/AppIcons';
import { personal, projects, timeline } from '../data/portfolio';
import { usePersisted, uid, fmtWhen } from '../system/useStore';
import { useSystem } from '../system/SystemContext';
import { useWM } from '../system/WindowManager';
import { useAccount } from '../system/account';
import { copyText, deepLink } from '../system/share';
import { notify } from '../system/notify';

/**
 * v8 — X-style feed inside the portfolio. The "M.R. Ahamed" posts are his
 * real portfolio milestones and projects (he doesn't list an X account, so
 * this is clearly a portfolio feed, not his profile). Visitors can post,
 * reply, like, repost, bookmark, pin, edit and delete — stored in this
 * browser — and share any post to the real X with the intent URL.
 */
interface Post {
  id: string;
  author: 'owner' | 'me';
  name: string;
  text: string;
  at: number;
  replyTo?: string;
  projectId?: string;
  edited?: boolean;
}
interface State {
  likes: string[];
  reposts: string[];
  bookmarks: string[];
  pinned?: string;
}

const OWNER_POSTS: Post[] = [
  ...projects.map<Post>((p, i) => ({
    id: `p-${p.id}`,
    author: 'owner',
    name: personal.name,
    text: `🚀 ${p.name} — ${p.description}\n\n${Object.values(p.stack).flat().slice(0, 5).map((t) => `#${t.replace(/[^A-Za-z0-9]/g, '')}`).join(' ')}`,
    at: new Date(`${p.updated ?? '2026-09-01'}T10:00:00+05:30`).getTime() - i * 3600000,
    projectId: p.id,
  })),
  ...timeline.slice(0, 8).map<Post>((tl, i) => ({
    id: `t-${i}`,
    author: 'owner',
    name: personal.name,
    text: `📌 ${tl.title} — ${tl.detail}`,
    at: new Date(`${tl.start.length === 4 ? `${tl.start}-01` : tl.start}-01T09:00:00+05:30`).getTime(),
  })),
];

export default function XApp() {
  const sys = useSystem();
  const wm = useWM();
  const account = useAccount();
  const [mine, setMine] = usePersisted<Post[]>('mra-x-posts-v8', []);
  const [st, setSt] = usePersisted<State>('mra-x-state-v8', { likes: [], reposts: [], bookmarks: [] });
  const [tab, setTab] = useState<'feed' | 'profile' | 'mine' | 'bookmarks'>('feed');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const me = account?.name ?? 'You';

  const all = useMemo(() => [...mine, ...OWNER_POSTS].sort((a, b) => b.at - a.at), [mine]);
  const replies = (id: string) => mine.filter((p) => p.replyTo === id);
  const visible = useMemo(() => {
    let l = all.filter((p) => !p.replyTo);
    if (tab === 'profile') l = l.filter((p) => p.author === 'owner');
    if (tab === 'mine') l = mine.filter((p) => !p.replyTo);
    if (tab === 'bookmarks') l = all.filter((p) => st.bookmarks.includes(p.id));
    if (q) l = l.filter((p) => p.text.toLowerCase().includes(q.toLowerCase()));
    if (st.pinned && tab !== 'bookmarks') {
      const pin = l.find((p) => p.id === st.pinned);
      if (pin) l = [pin, ...l.filter((p) => p.id !== st.pinned)];
    }
    return l;
  }, [all, mine, tab, q, st.bookmarks, st.pinned]);

  const toggle = (k: 'likes' | 'reposts' | 'bookmarks', id: string) => setSt((s) => ({ ...s, [k]: s[k].includes(id) ? s[k].filter((x) => x !== id) : [...s[k], id] }));
  const post = () => {
    const v = text.trim();
    if (!v || v.length > 280) return;
    if (editId) {
      setMine((l) => l.map((p) => (p.id === editId ? { ...p, text: v, edited: true } : p)));
      setEditId(null);
    } else {
      setMine((l) => [{ id: uid('x'), author: 'me', name: me, text: v, at: Date.now(), replyTo: replyTo?.id }, ...l]);
      notify({ app: 'X', icon: 'xapp', title: replyTo ? 'Reply posted' : 'Post published', body: 'Saved in this browser — use Share to post it on X.' });
    }
    setText('');
    setReplyTo(null);
  };
  const shareX = (p: Post) => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(p.text.slice(0, 240))}&url=${encodeURIComponent(p.projectId ? deepLink('casestudies', { project: p.projectId }) : deepLink())}`, '_blank', 'noopener,noreferrer');

  const menu = (e: RMouseEvent, p: Post) => {
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: st.bookmarks.includes(p.id) ? 'Remove bookmark' : 'Bookmark', action: () => toggle('bookmarks', p.id) },
        { label: 'Copy text', action: () => void copyText(p.text) },
        { label: 'Copy link', action: () => void copyText(p.projectId ? deepLink('casestudies', { project: p.projectId }) : deepLink('xapp')) },
        { label: 'Share on X…', action: () => shareX(p) },
        ...(p.author === 'me'
          ? [
              { label: '', sep: true },
              { label: st.pinned === p.id ? 'Unpin from profile' : 'Pin to your profile', action: () => setSt((s) => ({ ...s, pinned: s.pinned === p.id ? undefined : p.id })) },
              { label: 'Edit post', action: () => (setEditId(p.id), setText(p.text), setReplyTo(null)) },
              { label: 'Delete post', action: () => setMine((l) => l.filter((x) => x.id !== p.id && x.replyTo !== p.id)) },
            ]
          : []),
      ],
    });
  };

  const Card = ({ p, nested }: { p: Post; nested?: boolean }) => {
    const reps = replies(p.id);
    return (
      <article className={`xp ${nested ? 'nested' : ''}`} onContextMenu={(e) => menu(e, p)}>
        <span className="xp-av">{p.author === 'owner' ? <img src={personal.avatar} alt="" /> : me.slice(0, 1).toUpperCase()}</span>
        <div className="xp-body">
          <header>
            <b>{p.name}</b>
            {p.author === 'owner' && <span className="xp-badge">Portfolio</span>}
            <small>· {fmtWhen(p.at)}</small>
            {st.pinned === p.id && <small className="xp-pin">📌 Pinned</small>}
            {p.edited && <small>· edited</small>}
          </header>
          <p>
            {p.text.split(/(#[A-Za-z0-9]+)/).map((w, i) =>
              w.startsWith('#') ? (
                <button key={i} type="button" className="xp-tag" onClick={() => setQ(w)}>
                  {w}
                </button>
              ) : (
                <span key={i}>{w}</span>
              ),
            )}
          </p>
          {p.projectId && (
            <button type="button" className="xp-card" onClick={() => wm.open('casestudies', { project: p.projectId! })}>
              <AppIcon name="casestudies" />
              <span>
                <b>Case study</b>
                <small>{projects.find((x) => x.id === p.projectId)?.name}</small>
              </span>
            </button>
          )}
          <footer>
            <button type="button" onClick={() => (setReplyTo(p), setEditId(null))} title="Reply">
              💬 {reps.length || ''}
            </button>
            <button type="button" className={st.reposts.includes(p.id) ? 'on rt' : ''} onClick={() => toggle('reposts', p.id)} title="Repost">
              🔁 {st.reposts.includes(p.id) ? 1 : ''}
            </button>
            <button type="button" className={st.likes.includes(p.id) ? 'on like' : ''} onClick={() => toggle('likes', p.id)} title="Like">
              {st.likes.includes(p.id) ? '♥' : '♡'} {st.likes.includes(p.id) ? 1 : ''}
            </button>
            <button type="button" className={st.bookmarks.includes(p.id) ? 'on' : ''} onClick={() => toggle('bookmarks', p.id)} title="Bookmark">
              🔖
            </button>
            <button type="button" onClick={() => shareX(p)} title="Share on X">
              ↗
            </button>
            {p.author === 'me' && (
              <button type="button" onClick={(e) => menu(e, p)} title="More">
                ⋯
              </button>
            )}
          </footer>
          {reps.map((r) => (
            <Card key={r.id} p={r} nested />
          ))}
        </div>
      </article>
    );
  };

  return (
    <div className="xa">
      <aside className="xa-nav">
        <DragBar className="xa-drag">
          <Lights />
        </DragBar>
        <span className="xa-logo">
          <AppIcon name="xapp" />
        </span>
        {(
          [
            ['feed', '🏠', 'Home'],
            ['profile', '👤', personal.name],
            ['mine', '✍️', 'Your posts'],
            ['bookmarks', '🔖', 'Bookmarks'],
          ] as const
        ).map(([id, ico, label]) => (
          <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <span>{ico}</span>
            <b>{label}</b>
          </button>
        ))}
      </aside>
      <main className="xa-main scroll-smooth">
        <DragBar className="xa-head">
          <b>{tab === 'feed' ? 'Home' : tab === 'profile' ? personal.name : tab === 'mine' ? 'Your posts' : 'Bookmarks'}</b>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts or #tags" aria-label="Search posts" />
        </DragBar>
        {tab === 'profile' && (
          <div className="xa-profile">
            <div className="xa-cover" />
            <img src={personal.avatar} alt={personal.name} />
            <h2>{personal.name}</h2>
            <p>{personal.headline}</p>
            <small>📍 {personal.location} · Portfolio feed — not an X account</small>
          </div>
        )}
        {tab !== 'bookmarks' && tab !== 'profile' && (
          <div className="xa-compose">
            <span className="xp-av">{me.slice(0, 1).toUpperCase()}</span>
            <div>
              {replyTo && (
                <div className="xa-replying">
                  Replying to <b>{replyTo.name}</b>
                  <button type="button" onClick={() => setReplyTo(null)}>
                    ✕
                  </button>
                </div>
              )}
              {editId && (
                <div className="xa-replying">
                  Editing your post
                  <button type="button" onClick={() => (setEditId(null), setText(''))}>
                    ✕
                  </button>
                </div>
              )}
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={replyTo ? 'Post your reply' : 'What’s happening?'} rows={2} maxLength={280} />
              <div className="xa-compose-foot">
                <small className={text.length > 260 ? 'warn' : ''}>{280 - text.length}</small>
                <button type="button" onClick={post} disabled={!text.trim()}>
                  {editId ? 'Save' : replyTo ? 'Reply' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}
        {visible.map((p) => (
          <Card key={p.id} p={p} />
        ))}
        {visible.length === 0 && <p className="xa-empty">{tab === 'bookmarks' ? 'No bookmarks yet.' : tab === 'mine' ? 'You haven’t posted yet.' : 'Nothing found.'}</p>}
      </main>
    </div>
  );
}
