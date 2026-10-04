import { rightClick } from '../../system/input';
import { startCall } from '../../system/call';
import { socials } from '../../data/portfolio';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as RKeyboardEvent, type MouseEvent as RMouseEvent } from 'react';
import { DragBar, Lights } from '../../components/Window';
import { AppIcon, type IconName } from '../../components/AppIcons';
import { useSystem } from '../../system/SystemContext';
import { usePersisted, uid, fmtWhen } from '../../system/useStore';
import { notify } from '../../system/notify';
import { copyText, sharePortfolio } from '../../system/share';
import { clearBadge } from '../../system/badges';
import { personal, timeline } from '../../data/portfolio';

/**
 * v8 — shared chat engine for the WhatsApp and Telegram portfolio apps.
 * Chats: new · search · pin · mute · archive / unarchive · mark read / unread ·
 * clear · delete. Messages: send · reply (quote) · edit · delete · copy ·
 * forward · star · react · attach a photo or link. Everything is stored in
 * this browser. The "M.R. Ahamed" chat can hand your message to the real
 * WhatsApp (click-to-chat) or email.
 */
export interface ChatMsg {
  id: string;
  from: 'me' | 'them';
  text: string;
  at: number;
  edited?: boolean;
  reply?: { id: string; text: string; from: 'me' | 'them' };
  reactions?: string[];
  starred?: boolean;
  image?: string;
  fwd?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  action?: { label: string; href: string };
}
export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  about?: string;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  unread: number;
  readonly?: boolean;
  owner?: boolean;
  self?: boolean;
  msgs: ChatMsg[];
}

export interface ChatTheme {
  app: 'whatsapp' | 'telegram';
  title: string;
  icon: IconName;
  storeKey: string;
  seed: () => Chat[];
  /** where the owner chat's "send for real" button goes */
  realSend: (text: string) => { label: string; href: string } | null;
  autoReply: (text: string) => string;
}

const REACTS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];
const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function updatesChannel(color: string): Chat {
  return {
    id: 'updates',
    name: 'Portfolio Updates',
    color,
    about: 'Milestones from M.R. Ahamed’s timeline',
    readonly: true,
    unread: 0,
    msgs: [...timeline]
      .slice(0, 10)
      .reverse()
      .map((tl, i) => ({ id: `u${i}`, from: 'them' as const, text: `📌 ${tl.title}\n${tl.detail}\n🗓 ${tl.start}${tl.end ? ` – ${tl.end}` : ''}`, at: new Date(`${tl.start.length === 4 ? `${tl.start}-01` : tl.start}-01T09:00:00`).getTime() })),
  };
}

export async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const s = Math.min(1, 520 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ChatClient({ theme }: { theme: ChatTheme }) {
  const sys = useSystem();
  const [chats, setChats] = usePersisted<Chat[]>(theme.storeKey, theme.seed);
  const [sel, setSel] = useState<string | null>(() => chats.find((c) => c.owner)?.id ?? chats[0]?.id ?? null);
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [text, setText] = useState('');
  const [reply, setReply] = useState<ChatMsg | null>(null);
  const [edit, setEdit] = useState<ChatMsg | null>(null);
  const [fwd, setFwd] = useState<ChatMsg | null>(null);
  const [newChat, setNewChat] = useState(false);
  const [newName, setNewName] = useState('');
  const [mobileList, setMobileList] = useState(true);
  const [starredView, setStarredView] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => clearBadge(theme.app), [theme.app]);
  const chat = chats.find((c) => c.id === sel) ?? null;

  const upd = (id: string, fn: (c: Chat) => Chat) => setChats((l) => l.map((c) => (c.id === id ? fn(c) : c)));

  useEffect(() => {
    if (chat && chat.unread) upd(chat.id, (c) => ({ ...c, unread: 0 }));
    endRef.current?.scrollIntoView({ block: 'end' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, chat?.msgs.length]);

  const list = useMemo(() => {
    const f = chats.filter((c) => !!c.archived === showArchived && (!q || `${c.name} ${c.msgs.map((m) => m.text).join(' ')}`.toLowerCase().includes(q.toLowerCase())));
    return f.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.msgs[b.msgs.length - 1]?.at ?? 0) - (a.msgs[a.msgs.length - 1]?.at ?? 0));
  }, [chats, q, showArchived]);
  const archivedCount = chats.filter((c) => c.archived).length;

  const send = (e?: FormEvent, image?: string) => {
    e?.preventDefault();
    if (!chat || chat.readonly) return;
    const v = text.trim();
    if (!v && !image) return;
    if (edit) {
      upd(chat.id, (c) => ({ ...c, msgs: c.msgs.map((m) => (m.id === edit.id ? { ...m, text: v, edited: true } : m)) }));
      setEdit(null);
      setText('');
      return;
    }
    const m: ChatMsg = { id: uid('m'), from: 'me', text: v, at: Date.now(), status: 'sent', image, reply: reply ? { id: reply.id, text: reply.text || '📷 Photo', from: reply.from } : undefined };
    upd(chat.id, (c) => ({ ...c, msgs: [...c.msgs, m] }));
    setText('');
    setReply(null);
    const cid = chat.id;
    window.setTimeout(() => upd(cid, (c) => ({ ...c, msgs: c.msgs.map((x) => (x.id === m.id ? { ...x, status: 'delivered' } : x)) })), 700);
    if (chat.owner) {
      window.setTimeout(() => {
        const real = theme.realSend(v);
        const r: ChatMsg = { id: uid('m'), from: 'them', text: theme.autoReply(v), at: Date.now(), action: real ?? undefined };
        upd(cid, (c) => ({ ...c, msgs: [...c.msgs.map((x) => (x.id === m.id ? { ...x, status: 'read' as const } : x)), r] }));
        if (sel !== cid || document.hidden) notify({ app: theme.title, icon: theme.icon, title: personal.name, body: r.text });
      }, 1600);
    }
  };

  const onKey = (e: RKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    if (e.key === 'Escape') {
      setEdit(null);
      setReply(null);
      setText('');
    }
  };

  const msgMenu = (e: RMouseEvent, m: ChatMsg) => {
    e.preventDefault();
    if (!chat) return;
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        ...REACTS.map((r) => ({ label: `${r}  React`, action: () => react(m, r) })),
        { label: '', sep: true },
        ...(!chat.readonly ? [{ label: 'Reply', action: () => (setReply(m), inputRef.current?.focus()) }] : []),
        { label: 'Copy', action: () => void copyText(m.text) },
        { label: 'Forward…', action: () => setFwd(m) },
        { label: m.starred ? 'Unstar' : 'Star', action: () => upd(chat.id, (c) => ({ ...c, msgs: c.msgs.map((x) => (x.id === m.id ? { ...x, starred: !x.starred } : x)) })) },
        { label: 'Share…', action: () => void sharePortfolio({ text: m.text }) },
        ...(m.from === 'me' && !m.image ? [{ label: 'Edit', action: () => (setEdit(m), setText(m.text), inputRef.current?.focus()) }] : []),
        { label: '', sep: true },
        { label: 'Delete for me', action: () => upd(chat.id, (c) => ({ ...c, msgs: c.msgs.filter((x) => x.id !== m.id) })) },
      ],
    });
  };
  const react = (m: ChatMsg, r: string) =>
    chat && upd(chat.id, (c) => ({ ...c, msgs: c.msgs.map((x) => (x.id === m.id ? { ...x, reactions: x.reactions?.includes(r) ? x.reactions.filter((y) => y !== r) : [...(x.reactions ?? []), r] } : x)) }));

  const chatMenu = (e: RMouseEvent, c: Chat) => {
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: c.pinned ? 'Unpin chat' : 'Pin chat', action: () => upd(c.id, (x) => ({ ...x, pinned: !x.pinned })) },
        { label: c.muted ? 'Unmute' : 'Mute notifications', action: () => upd(c.id, (x) => ({ ...x, muted: !x.muted })) },
        { label: c.unread ? 'Mark as read' : 'Mark as unread', action: () => upd(c.id, (x) => ({ ...x, unread: x.unread ? 0 : 1 })) },
        { label: c.archived ? 'Unarchive' : 'Archive chat', action: () => (upd(c.id, (x) => ({ ...x, archived: !x.archived })), sel === c.id && setSel(null)) },
        { label: '', sep: true },
        { label: 'Clear messages', action: () => upd(c.id, (x) => ({ ...x, msgs: [] })), disabled: !!c.readonly },
        {
          label: 'Delete chat',
          disabled: !!c.owner || !!c.readonly,
          action: () => {
            setChats((l) => l.filter((x) => x.id !== c.id));
            if (sel === c.id) setSel(null);
          },
        },
      ],
    });
  };

  const create = () => {
    const n = newName.trim();
    if (!n) return;
    const c: Chat = { id: uid('c'), name: n.slice(0, 40), color: ['#34c759', '#0a84ff', '#ff9f0a', '#af52de', '#ff375f'][chats.length % 5], unread: 0, msgs: [] };
    setChats((l) => [c, ...l]);
    setSel(c.id);
    setNewChat(false);
    setNewName('');
    setMobileList(false);
  };

  const attach = async (f?: File | null) => {
    if (!f || !chat) return;
    if (!f.type.startsWith('image/')) {
      notify({ app: theme.title, icon: theme.icon, title: 'Only photos can be attached here' });
      return;
    }
    try {
      const data = await shrink(f);
      send(undefined, data);
    } catch {
      notify({ app: theme.title, icon: theme.icon, title: 'Couldn’t attach that photo' });
    }
  };

  const starred = chats.flatMap((c) => c.msgs.filter((m) => m.starred).map((m) => ({ c, m })));

  return (
    <div className={`chat chat-${theme.app} ${mobileList ? 'm-list' : 'm-conv'}`}>
      <aside className="chat-side">
        <DragBar className="chat-side-bar">
          <Lights />
          <b>{showArchived ? 'Archived' : starredView ? 'Starred' : theme.title}</b>
          <button type="button" className="chat-ib" title="New chat" onClick={() => setNewChat(true)}>
            ✎
          </button>
        </DragBar>
        <input className="chat-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or start a new chat" aria-label="Search chats" />
        <div className="chat-filters">
          <button type="button" className={!showArchived && !starredView ? 'on' : ''} onClick={() => (setShowArchived(false), setStarredView(false))}>
            All
          </button>
          <button type="button" className={starredView ? 'on' : ''} onClick={() => (setStarredView(true), setShowArchived(false))}>
            ★ Starred
          </button>
          <button type="button" className={showArchived ? 'on' : ''} onClick={() => (setShowArchived(true), setStarredView(false))}>
            Archived {archivedCount ? `(${archivedCount})` : ''}
          </button>
        </div>
        {newChat && (
          <div className="chat-new">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name for the new chat" autoFocus onKeyDown={(e) => e.key === 'Enter' && create()} />
            <button type="button" onClick={create}>
              Create
            </button>
            <button type="button" onClick={() => setNewChat(false)}>
              ✕
            </button>
          </div>
        )}
        <div className="chat-list scroll-smooth">
          {starredView ? (
            starred.length ? (
              starred.map(({ c, m }) => (
                <button key={m.id} type="button" className="chat-row" onClick={() => (setSel(c.id), setStarredView(false), setMobileList(false))}>
                  <span className="chat-av" style={{ background: c.color }}>
                    ★
                  </span>
                  <span className="chat-row-t">
                    <b>{c.name}</b>
                    <small>{m.text || '📷 Photo'}</small>
                  </span>
                  <time>{fmtWhen(m.at)}</time>
                </button>
              ))
            ) : (
              <p className="chat-empty">No starred messages — {rightClick(true)} a message and choose Star.</p>
            )
          ) : (
            list.map((c) => {
              const last = c.msgs[c.msgs.length - 1];
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`chat-row ${c.id === sel ? 'on' : ''}`}
                  onClick={() => {
                    setSel(c.id);
                    setMobileList(false);
                  }}
                  onContextMenu={(e) => chatMenu(e, c)}
                >
                  <span className="chat-av" style={{ background: c.color }}>
                    {c.avatar ? <img src={c.avatar} alt="" /> : c.self ? '🔖' : initials(c.name)}
                  </span>
                  <span className="chat-row-t">
                    <b>
                      {c.name} {c.muted && <i title="Muted">🔕</i>}
                    </b>
                    <small>
                      {last ? `${last.from === 'me' ? 'You: ' : ''}${last.image ? '📷 Photo' : last.text.split('\n')[0]}` : c.about ?? 'No messages yet'}
                    </small>
                  </span>
                  <span className="chat-row-r">
                    <time>{last ? fmtWhen(last.at) : ''}</time>
                    <span>
                      {c.pinned && <i title="Pinned">📌</i>}
                      {c.unread > 0 && <em className="chat-unread">{c.unread}</em>}
                    </span>
                  </span>
                </button>
              );
            })
          )}
          {!starredView && list.length === 0 && <p className="chat-empty">{showArchived ? 'No archived chats.' : 'No chats found.'}</p>}
        </div>
        <p className="chat-tip">{rightClick()} a chat or message for more options.</p>
      </aside>

      <section className="chat-main">
        {chat ? (
          <>
            <DragBar className="chat-head">
              <button type="button" className="chat-back" onClick={() => setMobileList(true)} aria-label="Back to chats">
                ‹
              </button>
              <span className="chat-av sm" style={{ background: chat.color }}>
                {chat.avatar ? <img src={chat.avatar} alt="" /> : chat.self ? '🔖' : initials(chat.name)}
              </span>
              <span className="chat-head-t">
                <b>{chat.name}</b>
                <small>{chat.readonly ? 'Channel · read only' : chat.owner ? 'Portfolio owner · replies here are automatic' : chat.self ? 'Your notes' : 'Local chat (this browser)'}</small>
              </span>
              {theme.app === 'whatsapp' && chat.owner && (
                <>
                  <button type="button" className="chat-ib" title="Video call" aria-label="Video call" onClick={() => startCall({ app: 'whatsapp', video: true })}>
                    🎥
                  </button>
                  <button type="button" className="chat-ib" title="Voice call" aria-label="Voice call" onClick={() => startCall({ app: 'whatsapp', video: false })}>
                    📞
                  </button>
                  <a className="chat-ib chat-wa-real" href={socials.whatsapp} target="_blank" rel="noopener noreferrer" title="Open a real WhatsApp chat with M.R. Ahamed">
                    ↗
                  </a>
                </>
              )}
              <button type="button" className="chat-ib" onClick={(e) => chatMenu(e as unknown as RMouseEvent, chat)} title="Chat options">
                ⋯
              </button>
            </DragBar>
            <div className="chat-msgs scroll-smooth">
              {chat.msgs.length === 0 && <p className="chat-empty center">No messages yet — say hello 👋</p>}
              {chat.msgs.map((m, i) => {
                const day = new Date(m.at).toDateString();
                const prevDay = i ? new Date(chat.msgs[i - 1].at).toDateString() : '';
                return (
                  <div key={m.id}>
                    {day !== prevDay && <div className="chat-day">{new Date(m.at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                    <div className={`chat-msg ${m.from}`} onContextMenu={(e) => msgMenu(e, m)} onDoubleClick={() => react(m, '❤️')}>
                      <div className="chat-bubble">
                        {m.fwd && <small className="chat-fwd">↪ Forwarded</small>}
                        {m.reply && (
                          <div className="chat-quote">
                            <b>{m.reply.from === 'me' ? 'You' : chat.name}</b>
                            <span>{m.reply.text}</span>
                          </div>
                        )}
                        {m.image && <img className="chat-img" src={m.image} alt="Attached" />}
                        {m.text && (
                          <span className="chat-text">
                            {m.text.split(/(https?:\/\/\S+)/).map((part, j) =>
                              /^https?:\/\//.test(part) ? (
                                <a key={j} href={part} target="_blank" rel="noopener noreferrer">
                                  {part}
                                </a>
                              ) : (
                                <span key={j}>{part}</span>
                              ),
                            )}
                          </span>
                        )}
                        {m.action && (
                          <a className="chat-cta" href={m.action.href} target="_blank" rel="noopener noreferrer">
                            {m.action.label}
                          </a>
                        )}
                        <span className="chat-meta">
                          {m.starred && '★ '}
                          {m.edited && 'edited · '}
                          {new Date(m.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                          {m.from === 'me' && <i className={`chat-tick ${m.status ?? 'sent'}`}>{m.status === 'sent' ? '✓' : '✓✓'}</i>}
                        </span>
                        {m.reactions && m.reactions.length > 0 && <span className="chat-reacts">{m.reactions.join('')}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            {chat.readonly ? (
              <div className="chat-ro">This channel is read-only. {rightClick()} a post to star, copy or forward it.</div>
            ) : (
              <form className="chat-compose" onSubmit={send}>
                {(reply || edit) && (
                  <div className="chat-replying">
                    <span>
                      {edit ? '✎ Editing message' : `↩ Replying to ${reply?.from === 'me' ? 'yourself' : chat.name}`}: <i>{(edit ?? reply)?.text.slice(0, 80) || '📷 Photo'}</i>
                    </span>
                    <button type="button" onClick={() => (setReply(null), setEdit(null), edit && setText(''))} aria-label="Cancel">
                      ✕
                    </button>
                  </div>
                )}
                <div className="chat-compose-row">
                  <button type="button" className="chat-ib" title="Attach a photo" onClick={() => fileRef.current?.click()}>
                    📎
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => (void attach(e.target.files?.[0]), (e.target.value = ''))} />
                  <textarea ref={inputRef} rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="Type a message" aria-label="Message" />
                  <button type="submit" className="chat-send" disabled={!text.trim()} aria-label="Send">
                    ➤
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="chat-empty-main">
            <AppIcon name={theme.icon} />
            <h3>{theme.title} for the portfolio</h3>
            <p>Select a chat, or start a new one. Messages stay in this browser.</p>
          </div>
        )}
      </section>

      {fwd && (
        <div className="chat-fwd-sheet" onPointerDown={(e) => e.target === e.currentTarget && setFwd(null)}>
          <div className="chat-fwd-card" role="dialog" aria-label="Forward message">
            <h3>Forward to…</h3>
            {chats
              .filter((c) => !c.readonly)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    upd(c.id, (x) => ({ ...x, msgs: [...x.msgs, { id: uid('m'), from: 'me', text: fwd.text, image: fwd.image, at: Date.now(), fwd: true, status: 'delivered' }] }));
                    setFwd(null);
                    notify({ app: theme.title, icon: theme.icon, title: 'Message forwarded', body: `to ${c.name}` });
                  }}
                >
                  <span className="chat-av sm" style={{ background: c.color }}>
                    {c.self ? '🔖' : initials(c.name)}
                  </span>
                  {c.name}
                </button>
              ))}
            <button type="button" className="chat-fwd-cancel" onClick={() => setFwd(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
