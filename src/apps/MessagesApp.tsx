import { islandPing } from '../system/island';
import { useEffect, useMemo, useRef, useState, type MouseEvent as RMouseEvent } from 'react';
import { usePersisted } from '../system/useStore';
import { useSystem } from '../system/SystemContext';
import { shrink } from './chat/ChatClient';
import { clearBadge } from '../system/badges';
import { allSkills, education, personal, projects, socials, ventures } from '../data/portfolio';
import { photos } from '../data/media';
import { notify, openExternal } from '../system/notify';
import { useWM } from '../system/WindowManager';
import type { AppId } from '../system/types';

/** 'ahamed' · 'bot' · or a visitor-created conversation id */
type Conv = string;
interface ConvMeta {
  id: string;
  name: string;
  number?: string;
}
interface ConvFlags {
  pinned?: boolean;
  unread?: boolean;
}
type Via = 'sms' | 'whatsapp';

interface Bubble {
  id: number;
  from: 'me' | 'you';
  text?: string;
  image?: string;
  time: number;
  /** ahamed thread: how the visitor's text was handed off */
  via?: Via;
  /** shown with an "Automatic reply" label */
  auto?: boolean;
  actions?: { label: string; app: AppId; args?: Record<string, string> }[];
  /** v8 — tapbacks, edits, forwards */
  reactions?: string[];
  edited?: boolean;
  fwd?: boolean;
}
const TAPBACKS = ['❤️', '👍', '👎', '😂', '‼️', '❓'];

let seq = 1;
const mk = (b: Omit<Bubble, 'id' | 'time'> & { time?: number }): Bubble => ({ ...b, id: seq++, time: b.time ?? Date.now() });

const NUMBER = personal.phoneHref.replace('tel:', '');
const WHATSAPP = `https://wa.me/${NUMBER.replace(/\D/g, '')}`;

/* In the thread, "me" is M.R. Ahamed's side (left, grey) and "you" is the visitor (right). */
const INTRO = (): Bubble[] => {
  const t = Date.now() - 60_000;
  return [
    mk({ from: 'me', auto: true, time: t, text: `Hi! This is ${personal.name}’s portfolio — send a message and it will open in your SMS/WhatsApp app to reach me.` }),
    mk({ from: 'me', auto: true, time: t, text: `${personal.headline}, based in ${personal.location}.` }),
    mk({ from: 'me', auto: true, time: t, text: `I've built ${projects.length} projects across web, mobile, desktop and APIs — open the Portfolio in Xcode to explore them.`, actions: [{ label: 'Open Xcode', app: 'xcode' }] }),
    mk({ from: 'me', auto: true, time: t, text: `${personal.status}. Type a message below and press Send — your phone’s messaging app (or WhatsApp) opens with the text ready to send.` }),
  ];
};

const BOT_INTRO = (): Bubble[] => [
  mk({
    from: 'me',
    time: Date.now() - 30_000,
    text: `I’m the Portfolio Bot 🤖 — an automatic helper that answers questions about ${personal.name} using the facts in this portfolio. Try one of these:`,
  }),
];

const SUGGEST = ['Skills', 'Projects', 'Education', 'Experience', 'Contact', 'CV', 'Available for work?'];

/** Very small FAQ matcher — every answer is built from src/data/portfolio.ts. */
function botAnswer(q: string): Omit<Bubble, 'id' | 'time'>[] {
  const s = q.toLowerCase();
  const has = (...w: string[]) => w.some((x) => s.includes(x));
  if (has('skill', 'stack', 'tech', 'language', 'framework', 'know')) {
    return [{ from: 'me', text: `${personal.name} works with ${allSkills.slice(0, 14).join(', ')}${allSkills.length > 14 ? ` and ${allSkills.length - 14} more` : ''}.`, actions: [{ label: 'Skills in Notes', app: 'notes' }] }];
  }
  if (has('project', 'built', 'portfolio', 'app', 'github', 'code')) {
    const shot = photos.find((p) => p.id === 's02');
    return [
      { from: 'me', text: `${projects.length} projects, including ${projects.slice(0, 4).map((p) => p.name).join(', ')}.`, actions: [{ label: 'Open Xcode', app: 'xcode' }, { label: 'Numbers sheet', app: 'numbers' }] },
      ...(shot ? [{ from: 'me' as const, image: shot.src, text: undefined }] : []),
    ];
  }
  if (has('educat', 'study', 'degree', 'university', 'uni', 'school', 'college')) {
    return [{ from: 'me', text: education.map((e) => `${e.qualification} — ${e.institution} (${e.period})`).join('\n'), actions: [{ label: 'Education in Finder', app: 'finder', args: { folder: 'education' } }] }];
  }
  if (has('experience', 'business', 'venture', 'work', 'company', 'job history')) {
    return [{ from: 'me', text: ventures.map((v) => `${v.role} — ${v.company} (${v.duration})`).join('\n'), actions: [{ label: 'Experience in Finder', app: 'finder', args: { folder: 'experience' } }] }];
  }
  if (has('contact', 'email', 'phone', 'call', 'reach', 'number', 'mail')) {
    return [{ from: 'me', text: `Email ${personal.email} · Phone ${personal.phone}. You can also message ${personal.name} directly from the “${personal.name}” conversation here.`, actions: [{ label: 'Contacts', app: 'contacts' }, { label: 'Mail', app: 'mail' }] }];
  }
  if (has('cv', 'resume', 'résumé', 'pdf')) {
    return [{ from: 'me', text: `The CV opens in Preview, where you can download the PDF. A résumé generated from this portfolio is also in Pages.`, actions: [{ label: 'Open CV', app: 'preview' }, { label: 'Pages résumé', app: 'pages' }] }];
  }
  if (has('where', 'location', 'based', 'live', 'city')) {
    return [{ from: 'me', text: `${personal.name} is based in ${personal.location}.`, actions: [{ label: 'Maps', app: 'maps' }] }];
  }
  if (has('intern', 'hire', 'available', 'status', 'open to', 'job')) {
    return [{ from: 'me', text: `${personal.status}. ${personal.objective}` }];
  }
  if (has('hi', 'hello', 'hey')) return [{ from: 'me', text: 'Hello! 👋 Ask me about skills, projects, education, experience, contact details or the CV.' }];
  return [{ from: 'me', text: 'I only know what’s in this portfolio 🙂 Try asking about skills, projects, education, experience, contact details or the CV.' }];
}

const EMOJI = ['😀', '😂', '😊', '😍', '🤩', '😎', '🤔', '🙌', '👏', '👍', '🙏', '💪', '🎉', '🔥', '✨', '💯', '❤️', '💙', '💚', '🚀', '💻', '📱', '📚', '🎓', '☕️', '🌟', '👋', '🤝', '✅', '📞', '✉️', '📍', '🇱🇰', '😅', '🥳', '😴'];

const timeLabel = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Messages-style contact app. The website never sends an SMS itself — it hands
 * the text over to the visitor's own messaging app through an sms: link (or WhatsApp).
 */
export default function MessagesApp() {
  const wm = useWM();
  const [conv, setConv] = useState<Conv>('ahamed');
  const sys = useSystem();
  const [threads, setThreads] = usePersisted<Record<Conv, Bubble[]>>('mra-messages-v8', () => ({ ahamed: INTRO(), bot: BOT_INTRO() }));
  const [customs, setCustoms] = usePersisted<ConvMeta[]>('mra-messages-convs-v8', []);
  const [flags, setFlags] = usePersisted<Record<string, ConvFlags>>('mra-messages-flags-v8', {});
  const [newConv, setNewConv] = useState<{ name: string; number: string } | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [fwd, setFwd] = useState<Bubble | null>(null);
  // keep bubble ids unique across reloads
  useEffect(() => {
    const max = Math.max(0, ...Object.values(threads).flat().map((b) => b.id));
    if (seq <= max) seq = max + 1;
    clearBadge('messages');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [text, setText] = useState('');
  const [via, setVia] = useState<Via>('sms');
  const [q, setQ] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [attach, setAttach] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false); // phone layout: chat shown instead of list
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  const thread = threads[conv] ?? [];
  const meta = customs.find((c) => c.id === conv);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread, typing, conv]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const push = (c: Conv, b: Bubble[]) => setThreads((t) => ({ ...t, [c]: [...(t[c] ?? []), ...b] }));

  const send = () => {
    const body = text.trim();
    if (editing !== null) {
      if (body) setThreads((t) => ({ ...t, [conv]: (t[conv] ?? []).map((b) => (b.id === editing ? { ...b, text: body, edited: true } : b)) }));
      setEditing(null);
      setText('');
      return;
    }
    if (!body && !attach) return;
    const out: Bubble[] = [];
    if (attach) out.push(mk({ from: 'you', image: attach, via: conv === 'ahamed' ? via : undefined }));
    if (body) out.push(mk({ from: 'you', text: body, via: conv === 'ahamed' ? via : undefined }));
    push(conv, out);
    // honest status: real delivery happens in your own Messages / WhatsApp app
    if (conv !== 'bot') islandPing({ icon: '↗', title: via === 'whatsapp' && conv === 'ahamed' ? 'Opening WhatsApp' : 'Opening Messages', sub: 'Press Send there', tint: '#34c759', ms: 1600 });
    setText('');
    setEmoji(false);
    const hadImage = !!attach;
    setAttach(null);

    if (meta) {
      if (body && meta.number) {
        window.location.href = `sms:${meta.number.replace(/\s/g, '')}?&body=${encodeURIComponent(body)}`;
        notify({ app: 'Messages', icon: 'messages', title: `Opening Messages for ${meta.name}`, body: 'Your device’s messaging app will open with this text.', island: true });
      }
      return;
    }
    if (conv === 'bot') {
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        push('bot', botAnswer(body || 'image').map((b) => mk(b)));
      }, 650);
      return;
    }

    if (body) {
      if (via === 'whatsapp') {
        openExternal(`${WHATSAPP}?text=${encodeURIComponent(body)}`, { title: 'Opening WhatsApp', body: `Your message to ${personal.name} is ready to send.`, app: 'Messages', icon: 'messages' });
      } else {
        // "?&body=" works on iOS and Android messaging apps
        window.location.href = `sms:${NUMBER}?&body=${encodeURIComponent(body)}`;
        notify({ app: 'Messages', icon: 'messages', title: 'Opening Messages', body: 'Your device’s messaging app will open with this text.', island: true });
      }
    }
    window.setTimeout(
      () =>
        push('ahamed', [
          mk({
            from: 'me',
            auto: true,
            text: hadImage && !body
              ? 'Photos stay on this device — attach them in your own messaging app after it opens.'
              : 'Thanks! If your messaging app didn’t open (for example on a desktop), use Mail or call me instead.',
          }),
        ]),
      900,
    );
  };

  const pickConv = (c: Conv) => {
    setConv(c);
    setOpen(true);
    setEmoji(false);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const onFile = (f: File | undefined) => {
    if (!f || !f.type.startsWith('image/')) return;
    // downscaled data URL so the photo survives a reload (stays in this browser)
    void shrink(f)
      .then(setAttach)
      .catch(() => {
        const u = URL.createObjectURL(f);
        urls.current.push(u);
        setAttach(u);
      });
  };

  const bubbleMenu = (e: RMouseEvent, b: Bubble) => {
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        ...TAPBACKS.map((r) => ({
          label: `${r}  Tapback`,
          action: () => setThreads((t) => ({ ...t, [conv]: (t[conv] ?? []).map((x) => (x.id === b.id ? { ...x, reactions: x.reactions?.includes(r) ? x.reactions.filter((y) => y !== r) : [...(x.reactions ?? []), r] } : x)) })),
        })),
        { label: '', sep: true },
        { label: 'Copy', action: () => void navigator.clipboard?.writeText(b.text ?? '').catch(() => undefined), disabled: !b.text },
        ...(b.from === 'you' && b.text ? [{ label: 'Edit', action: () => (setEditing(b.id), setText(b.text ?? ''), inputRef.current?.focus()) }] : []),
        { label: 'Forward…', action: () => setFwd(b) },
        { label: '', sep: true },
        { label: 'Delete', action: () => setThreads((t) => ({ ...t, [conv]: (t[conv] ?? []).filter((x) => x.id !== b.id) })) },
      ],
    });
  };

  const convMenu = (e: RMouseEvent, id: Conv) => {
    e.preventDefault();
    const f = flags[id] ?? {};
    const custom = customs.some((c) => c.id === id);
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: f.pinned ? 'Unpin' : 'Pin', action: () => setFlags((x) => ({ ...x, [id]: { ...f, pinned: !f.pinned } })) },
        { label: f.unread ? 'Mark as Read' : 'Mark as Unread', action: () => setFlags((x) => ({ ...x, [id]: { ...f, unread: !f.unread } })) },
        { label: '', sep: true },
        {
          label: custom ? 'Delete Conversation' : 'Clear Conversation',
          action: () => {
            if (custom) {
              setCustoms((l) => l.filter((c) => c.id !== id));
              setThreads((t) => {
                const n = { ...t };
                delete n[id];
                return n;
              });
              if (conv === id) setConv('ahamed');
            } else setThreads((t) => ({ ...t, [id]: id === 'bot' ? BOT_INTRO() : INTRO() }));
          },
        },
      ],
    });
  };

  const createConv = () => {
    if (!newConv || !newConv.name.trim()) return;
    const id = `c${Date.now().toString(36)}`;
    setCustoms((l) => [...l, { id, name: newConv.name.trim().slice(0, 40), number: newConv.number.trim() || undefined }]);
    setThreads((t) => ({ ...t, [id]: [] }));
    setNewConv(null);
    pickConv(id);
  };

  const convs = useMemo(
    () =>
      (
        [
          { id: 'ahamed', name: personal.name, avatar: personal.avatar },
          { id: 'bot', name: 'Portfolio Bot', avatar: '' },
          ...customs.map((c) => ({ id: c.id, name: c.name, avatar: '' })),
        ] as { id: Conv; name: string; avatar: string }[]
      )
        .map((c) => {
          const th = threads[c.id] ?? [];
          const last = th[th.length - 1];
          return { ...c, last, preview: !last ? 'No messages yet' : last.image && !last.text ? '📷 Photo' : last.text ?? '', pinned: !!flags[c.id]?.pinned, unread: !!flags[c.id]?.unread };
        })
        .filter((c) => !q.trim() || `${c.name} ${(threads[c.id] ?? []).map((b) => b.text ?? '').join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [threads, q, customs, flags],
  );

  const lastMine = [...thread].reverse().find((b) => b.from === 'you');
  const name = conv === 'ahamed' ? personal.name : conv === 'bot' ? 'Portfolio Bot' : meta?.name ?? 'Conversation';

  return (
    <div className="ms7-wrap">
      <div className={`ms7 ${open ? 'ms7-open' : ''}`}>
        <aside className="ms7-side" aria-label="Conversations">
          <div className="ms7-side-top">
            <div className="ms7-search">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="m10.4 10.4 3.2 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search conversations" />
            </div>
            <button type="button" className="ms7-compose" aria-label="New message" title="New message" onClick={() => setNewConv({ name: '', number: '' })}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9 3.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h10a1.5 1.5 0 0 0 1.5-1.5v-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M15.2 2.8a1.4 1.4 0 0 1 2 2L10 12l-2.6.6L8 10z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {newConv && (
            <form className="ms8-new" onSubmit={(e) => (e.preventDefault(), createConv())}>
              <input value={newConv.name} onChange={(e) => setNewConv({ ...newConv, name: e.target.value })} placeholder="To: name" autoFocus aria-label="Recipient name" />
              <input value={newConv.number} onChange={(e) => setNewConv({ ...newConv, number: e.target.value })} placeholder="Phone (optional)" inputMode="tel" aria-label="Phone number" />
              <div>
                <button type="submit" disabled={!newConv.name.trim()}>
                  Start
                </button>
                <button type="button" onClick={() => setNewConv(null)}>
                  Cancel
                </button>
                <button type="button" onClick={() => (setNewConv(null), pickConv('ahamed'))}>
                  Message {personal.name.split(' ').pop()}
                </button>
              </div>
            </form>
          )}
          <div className="ms7-list scroll-smooth">
            {convs.length === 0 && <p className="ms7-none">No conversations match “{q}”.</p>}
            {convs.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`ms7-conv ${conv === c.id ? 'on' : ''} ${c.unread ? 'ms8-unread' : ''}`}
                aria-current={conv === c.id}
                onClick={() => {
                  if (c.unread) setFlags((x) => ({ ...x, [c.id]: { ...x[c.id], unread: false } }));
                  pickConv(c.id);
                }}
                onContextMenu={(e) => convMenu(e, c.id)}
              >
                <Avatar id={c.id} src={c.avatar} name={c.name} />
                <span className="ms7-conv-t">
                  <span className="ms7-conv-row">
                    <b>
                      {c.pinned && '📌 '}
                      {c.name}
                    </b>
                    <small>{c.last ? timeLabel(c.last.time) : ''}</small>
                  </span>
                  <span className="ms7-conv-p">{c.preview}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="ms7-main" aria-label={`Conversation with ${name}`}>
          <header className="ms7-head">
            <button type="button" className="ms7-back" onClick={() => setOpen(false)} aria-label="Back to conversations">
              ‹
            </button>
            <div className="ms7-who">
              <Avatar id={conv} src={conv === 'ahamed' ? personal.avatar : ''} name={name} />
              <b>{name} ›</b>
              {conv === 'ahamed' ? <small>{personal.phone}</small> : conv === 'bot' ? <small>Automatic answers from portfolio data</small> : <small>{meta?.number ? `${meta.number} · opens your SMS app` : 'Local conversation (this browser)'}</small>}
            </div>
            <div className="ms7-acts">
              {conv === 'ahamed' ? (
                <>
                  <a className="ms7-act" href={personal.phoneHref} aria-label={`Call ${personal.name}`} title="Call" onClick={() => notify({ app: 'Phone', icon: 'phone', title: `Calling ${personal.name}` })}>
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M6.2 3.2 4.3 3.6C3.6 3.8 3.1 4.5 3.2 5.2c.7 6 5.6 10.9 11.6 11.6.7.1 1.4-.4 1.6-1.1l.4-1.9-3.2-1.6-1.6 1.6a9 9 0 0 1-4.8-4.8l1.6-1.6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </a>
                  <button type="button" className="ms7-act" aria-label="Email" title="Email" onClick={() => openExternal(socials.email, { title: 'Opening Mail', app: 'Mail', icon: 'mail' })}>
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <rect x="2.8" y="4.5" width="14.4" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                      <path d="m3.5 5.5 6.5 5 6.5-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button type="button" className="ms7-act ms7-act-txt" aria-label="LinkedIn" title="LinkedIn" onClick={() => openExternal(socials.linkedin, { title: 'Opening LinkedIn — M.R. Ahamed', app: 'Safari', icon: 'linkedin' })}>
                    in
                  </button>
                  <button type="button" className="ms7-act" aria-label="FaceTime" title="FaceTime" onClick={() => wm.open('facetime')}>
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <rect x="2.5" y="5.5" width="10.5" height="9" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                      <path d="m13 9 4.5-2.5v7L13 11z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              ) : (
                <span className="ms7-demo">{conv === 'bot' ? 'Automatic' : 'Local'}</span>
              )}
            </div>
          </header>

          <div className="ms7-thread scroll-smooth" aria-live="polite">
            {conv === 'ahamed' && (
              <div className="ms7-card">
                <img src={personal.avatar} alt="" />
                <b>{personal.name}</b>
                <span>{personal.shortTitle}</span>
                <span>
                  {personal.phone} · {personal.email}
                </span>
              </div>
            )}
            {thread[0] ? <div className="ms7-day">Today {timeLabel(thread[0].time)}</div> : <div className="ms7-day">New conversation — say hello 👋</div>}
            {thread.map((b, i) => {
              const next = thread[i + 1];
              const tail = !next || next.from !== b.from;
              const prev = thread[i - 1];
              return (
                <div key={b.id} className={`ms7-row ${b.from} ${tail ? 'tail' : ''}`} onContextMenu={(e) => bubbleMenu(e, b)} onDoubleClick={() => setThreads((t) => ({ ...t, [conv]: (t[conv] ?? []).map((x) => (x.id === b.id ? { ...x, reactions: x.reactions?.includes('❤️') ? x.reactions.filter((y) => y !== '❤️') : [...(x.reactions ?? []), '❤️'] } : x)) }))}>
                  {b.auto && (!prev || !prev.auto || prev.from !== b.from) && <span className="ms7-auto">Automatic reply</span>}
                  {b.image && (
                    <div className="ms7-img">
                      <img src={b.image} alt={b.from === 'you' ? 'Attached photo' : 'Portfolio screenshot'} />
                    </div>
                  )}
                  {b.text && (
                    <div className={`ms7-b ${b.from === 'you' ? (conv === 'bot' || meta ? 'blue' : b.via === 'whatsapp' ? 'wa' : 'green') : ''}`}>
                      {b.fwd && <small className="ms8-fwd">Forwarded</small>}
                      {b.text}
                      {b.reactions && b.reactions.length > 0 && <span className="ms8-tap">{b.reactions.join('')}</span>}
                    </div>
                  )}
                  {b.edited && <span className="ms7-receipt">Edited</span>}
                  {b.actions && (
                    <div className="ms7-chips">
                      {b.actions.map((a) => (
                        <button key={a.label} type="button" onClick={() => wm.open(a.app, a.args)}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {b === lastMine && conv === 'ahamed' && (
                    <span className="ms7-receipt">{b.via === 'whatsapp' ? 'Handed off to WhatsApp' : 'Handed off to your SMS app'}</span>
                  )}
                  {b === lastMine && conv === 'bot' && <span className="ms7-receipt">Read</span>}
                </div>
              );
            })}
            {conv === 'bot' && (
              <div className="ms7-chips ms7-suggest">
                {SUGGEST.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      push('bot', [mk({ from: 'you', text: s })]);
                      setTyping(true);
                      window.setTimeout(() => {
                        setTyping(false);
                        push('bot', botAnswer(s).map((b) => mk(b)));
                      }, 600);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {typing && conv === 'bot' && (
              <div className="ms7-row me tail">
                <div className="ms7-b ms7-typing" aria-label="Typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {attach && (
            <div className="ms7-attach fade-swap">
              <img src={attach} alt="Attachment preview" />
              <span>{conv === 'ahamed' ? 'Photo preview — stays on this device' : 'Photo preview'}</span>
              <button type="button" aria-label="Remove attachment" onClick={() => setAttach(null)}>
                ×
              </button>
            </div>
          )}
          {emoji && (
            <div className="ms7-emoji fade-swap" role="dialog" aria-label="Emoji">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Insert ${e}`}
                  onClick={() => {
                    setText((t) => t + e);
                    inputRef.current?.focus();
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <form
            className="ms7-compose-bar"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <button type="button" className="ms7-plus" aria-label="Attach a photo" title="Attach a photo" onClick={() => fileRef.current?.click()}>
              +
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = '';
            }} />
            <div className="ms7-field">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={editing !== null ? 'Edit message — Enter to save' : conv === 'ahamed' ? `Text ${personal.name} via ${via === 'sms' ? 'SMS' : 'WhatsApp'}` : conv === 'bot' ? 'Ask the Portfolio Bot' : `Message ${name}`}
                onKeyDown={(e) => e.key === 'Escape' && editing !== null && (setEditing(null), setText(''))}
                aria-label="Message text"
              />
              {conv === 'ahamed' && (
                <button
                  type="button"
                  className={`ms7-via ${via}`}
                  aria-label={`Send with ${via === 'sms' ? 'SMS' : 'WhatsApp'} — click to switch`}
                  title="Switch between SMS and WhatsApp"
                  onClick={() => setVia((v) => (v === 'sms' ? 'whatsapp' : 'sms'))}
                >
                  {via === 'sms' ? 'SMS' : 'WhatsApp'}
                </button>
              )}
              <button type="button" className={`ms7-emo ${emoji ? 'on' : ''}`} aria-label="Emoji" aria-expanded={emoji} onClick={() => setEmoji((v) => !v)}>
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="10" cy="10" r="7.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="7.4" cy="8.3" r="1" fill="currentColor" />
                  <circle cx="12.6" cy="8.3" r="1" fill="currentColor" />
                  <path d="M6.8 11.6a3.8 3.8 0 0 0 6.4 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <button type="submit" className={`ms7-send ${conv === 'bot' ? 'blue' : via}`} disabled={!text.trim() && !attach} aria-label={conv === 'ahamed' ? `Send via ${via === 'sms' ? 'Messages' : 'WhatsApp'}` : 'Send'}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 15.5v-11M5.5 9 10 4.5 14.5 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </section>
      </div>
      {fwd && (
        <div className="chat-fwd-sheet" onPointerDown={(e) => e.target === e.currentTarget && setFwd(null)}>
          <div className="chat-fwd-card" role="dialog" aria-label="Forward message">
            <h3>Forward to…</h3>
            {convs
              .filter((c) => c.id !== 'bot')
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    push(c.id, [mk({ from: 'you', text: fwd.text, image: fwd.image, fwd: true })]);
                    setFwd(null);
                    notify({ app: 'Messages', icon: 'messages', title: 'Message forwarded', body: `to ${c.name}` });
                  }}
                >
                  <Avatar id={c.id} src={c.avatar} name={c.name} />
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

function Avatar({ id, src, name }: { id: Conv; src: string; name?: string }) {
  if (id === 'bot')
    return (
      <span className="ms7-av ms7-av-bot" aria-hidden="true">
        🤖
      </span>
    );
  if (!src)
    return (
      <span className="ms7-av ms8-av" aria-hidden="true">
        {(name ?? '?')
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </span>
    );
  return <img className="ms7-av" src={src} alt="" />;
}
