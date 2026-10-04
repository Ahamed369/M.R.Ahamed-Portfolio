import { islandPing } from '../../system/island';
import { useEffect, useMemo, useState, type FormEvent, type MouseEvent as RMouseEvent } from 'react';
import { DragBar, Lights } from '../../components/Window';
import { AppIcon, type IconName } from '../../components/AppIcons';
import { useSystem } from '../../system/SystemContext';
import { usePersisted, uid, fmtWhen } from '../../system/useStore';
import { notify } from '../../system/notify';
import { copyText, sharePortfolio } from '../../system/share';
import { clearBadge } from '../../system/badges';
import { cv, personal, socials } from '../../data/portfolio';
import { SysIcon } from '../../components/SysIcons';

/**
 * v8 — full mail client shared by Mail and Yahoo Mail.
 * Mailboxes: Inbox · Flagged · Drafts · Sent · Archive · Trash.
 * Actions: compose · reply · reply all · forward · save draft · send ·
 * delete / restore / delete permanently · archive · move · flag · pin ·
 * mark read / unread · search · copy · share.
 * "Send" really delivers: mail to M.R. Ahamed opens in the visitor's mail
 * app (Mail) or Yahoo Mail compose (Yahoo), and a copy is kept in Sent.
 */
export type Box = 'inbox' | 'flagged' | 'drafts' | 'sent' | 'archive' | 'trash';
export interface Mail {
  id: string;
  box: Exclude<Box, 'flagged'>;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  at: number;
  read: boolean;
  flagged?: boolean;
  pinned?: boolean;
  prevBox?: Exclude<Box, 'flagged' | 'trash'>;
  attachment?: { name: string; href: string };
}

export interface MailTheme {
  app: 'mail' | 'yahoomail';
  title: string;
  icon: IconName;
  storeKey: string;
  /** Real delivery for a composed mail */
  deliver: (to: string, subject: string, body: string) => void;
}

const seedInbox = (): Mail[] => {
  const now = Date.now();
  return [
    {
      id: 'welcome',
      box: 'inbox',
      from: personal.name,
      fromEmail: personal.email,
      to: 'You',
      subject: 'Welcome to my portfolio 👋',
      body: `Hi there,\n\nThanks for stopping by! This desktop is my portfolio — every app is built to work: open Xcode for projects, Case Studies for the story behind them, Notes for my skills and Finder for my experience.\n\nI'm ${personal.status.toLowerCase()}. If you'd like to talk, reply to this email — it will reach me at ${personal.email}.\n\nBest regards,\n${personal.name}\n${personal.phone} · ${personal.location}`,
      at: now - 5 * 60000,
      read: false,
      pinned: true,
    },
    {
      id: 'cv',
      box: 'inbox',
      from: personal.name,
      fromEmail: personal.email,
      to: 'You',
      subject: 'My CV and where to find my work',
      body: `Hello again,\n\nMy CV is attached as a PDF. You can also find my code on GitHub (${socials.github}) and connect with me on LinkedIn (${socials.linkedin}).\n\nThank you,\n${personal.name}`,
      at: now - 60 * 60000,
      read: false,
      attachment: { name: cv.fileName, href: cv.url },
    },
  ];
};

const BOXES: { id: Box; label: string; ico: string }[] = [
  { id: 'inbox', label: 'Inbox', ico: 'inbox' },
  { id: 'flagged', label: 'Flagged', ico: 'flag' },
  { id: 'drafts', label: 'Drafts', ico: 'doc' },
  { id: 'sent', label: 'Sent', ico: 'share' },
  { id: 'archive', label: 'Archive', ico: 'archive' },
  { id: 'trash', label: 'Trash', ico: 'trash' },
];

interface Draft {
  id?: string;
  to: string;
  subject: string;
  body: string;
  fromName: string;
  replyEmail: string;
}

export function MailClient({ theme, composeOnOpen, subject: initSubject = '', body: initBody = '' }: { theme: MailTheme; composeOnOpen?: boolean; subject?: string; body?: string }) {
  const sys = useSystem();
  const [mails, setMails] = usePersisted<Mail[]>(theme.storeKey, seedInbox);
  const [box, setBox] = useState<Box>('inbox');
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState<Draft | null>(composeOnOpen ? { to: personal.email, subject: initSubject, body: initBody, fromName: '', replyEmail: '' } : null);
  const [err, setErr] = useState('');
  const [pane, setPane] = useState<'list' | 'read'>('list');

  useEffect(() => clearBadge(theme.app), [theme.app]);
  useEffect(() => {
    if (composeOnOpen) setDraft((d) => d ?? { to: personal.email, subject: initSubject, body: initBody, fromName: '', replyEmail: '' });
  }, [composeOnOpen]);

  const upd = (id: string, patch: Partial<Mail>) => setMails((l) => l.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const inBox = (m: Mail, b: Box) => (b === 'flagged' ? !!m.flagged && m.box !== 'trash' : m.box === b);
  const count = (b: Box) => mails.filter((m) => inBox(m, b) && (b === 'inbox' ? !m.read : b === 'drafts' || b === 'trash' || b === 'flagged')).length;
  const list = useMemo(
    () =>
      mails
        .filter((m) => inBox(m, box) && (!q || `${m.from} ${m.to} ${m.subject} ${m.body}`.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.at - a.at),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mails, box, q],
  );
  const cur = mails.find((m) => m.id === sel) ?? null;

  const open = (m: Mail) => {
    if (m.box === 'drafts') {
      setDraft({ id: m.id, to: m.to, subject: m.subject, body: m.body, fromName: '', replyEmail: '' });
      return;
    }
    setSel(m.id);
    setPane('read');
    if (!m.read) upd(m.id, { read: true });
  };
  const trash = (m: Mail) => {
    if (m.box === 'trash') {
      setMails((l) => l.filter((x) => x.id !== m.id));
      notify({ app: theme.title, icon: theme.icon, title: 'Deleted permanently', body: m.subject });
    } else {
      upd(m.id, { box: 'trash', prevBox: m.box });
      notify({ app: theme.title, icon: theme.icon, title: 'Moved to Trash', body: m.subject, actions: [{ label: 'Undo', run: () => upd(m.id, { box: m.box }) }] });
    }
    if (sel === m.id) setSel(null);
  };
  const reply = (m: Mail, fwd = false) =>
    setDraft({
      to: fwd ? '' : m.box === 'sent' ? m.to : m.fromEmail,
      subject: `${fwd ? 'Fwd' : 'Re'}: ${m.subject.replace(/^(Re|Fwd): /i, '')}`,
      body: `\n\n— On ${new Date(m.at).toLocaleString()}, ${m.from} wrote:\n${m.body
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')}`,
      fromName: '',
      replyEmail: '',
    });

  const menu = (e: RMouseEvent, m: Mail) => {
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Open', action: () => open(m) },
        { label: m.read ? 'Mark as Unread' : 'Mark as Read', action: () => upd(m.id, { read: !m.read }) },
        { label: m.flagged ? 'Unflag' : 'Flag', action: () => upd(m.id, { flagged: !m.flagged }) },
        { label: m.pinned ? 'Unpin' : 'Pin to top', action: () => upd(m.id, { pinned: !m.pinned }) },
        { label: '', sep: true },
        { label: 'Reply', action: () => reply(m), disabled: m.box === 'drafts' },
        { label: 'Forward', action: () => reply(m, true), disabled: m.box === 'drafts' },
        { label: 'Copy Text', action: () => void copyText(`${m.subject}\n\n${m.body}`) },
        { label: '', sep: true },
        ...(m.box === 'trash' || m.box === 'archive'
          ? [{ label: 'Restore', action: () => upd(m.id, { box: m.prevBox ?? 'inbox' }) }]
          : [{ label: 'Archive', action: () => upd(m.id, { box: 'archive', prevBox: m.box === 'trash' || m.box === 'archive' ? 'inbox' : m.box }) }]),
        ...(['inbox', 'archive'] as const).filter((b) => b !== m.box).map((b) => ({ label: `Move to ${b === 'inbox' ? 'Inbox' : 'Archive'}`, action: () => upd(m.id, { box: b }) })),
        { label: m.box === 'trash' ? 'Delete Permanently' : 'Move to Trash', action: () => trash(m) },
      ],
    });
  };

  const saveDraft = () => {
    if (!draft) return;
    const id = draft.id ?? uid('d');
    const m: Mail = { id, box: 'drafts', from: 'You', fromEmail: draft.replyEmail || 'you', to: draft.to, subject: draft.subject || '(no subject)', body: draft.body, at: Date.now(), read: true };
    setMails((l) => [m, ...l.filter((x) => x.id !== id)]);
    setDraft(null);
    notify({ app: theme.title, icon: theme.icon, title: 'Draft saved', body: m.subject });
  };
  const send = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft) return;
    const to = draft.to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return setErr('Please enter a valid email address in “To”.');
    if (!draft.body.trim()) return setErr('Please write a message first.');
    if (draft.replyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.replyEmail)) return setErr('Your reply-to address doesn’t look right.');
    setErr('');
    const sig = [draft.fromName && `— ${draft.fromName}`, draft.replyEmail && `Reply to: ${draft.replyEmail}`].filter(Boolean).join('\n');
    const body = `${draft.body.trim()}${sig ? `\n\n${sig}` : ''}`;
    const subject = draft.subject.trim() || `Hello from your portfolio${draft.fromName ? ` — ${draft.fromName}` : ''}`;
    theme.deliver(to, subject, body);
    islandPing({ icon: 'mail', title: 'Opening your email app', sub: 'Press Send there', tint: '#0a84ff', ms: 1600 });
    const m: Mail = { id: uid('s'), box: 'sent', from: draft.fromName || 'You', fromEmail: draft.replyEmail || 'you', to, subject, body, at: Date.now(), read: true };
    setMails((l) => [m, ...l.filter((x) => x.id !== draft.id)]);
    setDraft(null);
    setBox('sent');
    notify({ app: theme.title, icon: theme.icon, title: 'Message ready to send', body: `Your ${theme.app === 'yahoomail' ? 'Yahoo Mail compose window' : 'email app'} is opening — press Send there. A copy is in Sent.` });
  };

  return (
    <div className={`mc mc-${theme.app} ${pane === 'read' ? 'm-read' : ''}`}>
      <aside className="mc-side">
        <DragBar className="mc-drag">
          <Lights />
        </DragBar>
        <button type="button" className="mc-compose" onClick={() => setDraft({ to: personal.email, subject: '', body: '', fromName: '', replyEmail: '' })}>
          <SysIcon n="pencil" size={15} /> Compose
        </button>
        {BOXES.map((b) => {
          const c = count(b.id);
          return (
            <button key={b.id} type="button" className={`mc-box ${box === b.id ? 'on' : ''}`} onClick={() => (setBox(b.id), setSel(null), setPane('list'))}>
              <span className="mc-bico">
                <SysIcon n={b.ico} size={17} />
              </span>
              <b>{b.label}</b>
              {c > 0 && <em className={b.id === 'inbox' ? 'unread' : ''}>{c}</em>}
            </button>
          );
        })}
        <div className="mc-side-foot">
          <small>
            Mail to <b>{personal.email}</b> reaches M.R. Ahamed directly.
          </small>
        </div>
      </aside>
      <section className="mc-list">
        <DragBar className="mc-list-head">
          <b>{BOXES.find((b) => b.id === box)?.label}</b>
          <small>{list.length} messages</small>
        </DragBar>
        <input className="mc-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail" aria-label="Search mail" />
        {box === 'trash' && list.length > 0 && (
          <button type="button" className="mc-empty-trash" onClick={() => setMails((l) => l.filter((m) => m.box !== 'trash'))}>
            Empty Trash
          </button>
        )}
        <div className="mc-rows scroll-smooth">
          {list.map((m) => (
            <button key={m.id} type="button" className={`mc-row ${m.id === sel ? 'on' : ''} ${m.read ? '' : 'unread'}`} onClick={() => open(m)} onContextMenu={(e) => menu(e, m)}>
              <span className="mc-dot" />
              <span className="mc-row-t">
                <span className="mc-row-top">
                  <b>{m.box === 'sent' || m.box === 'drafts' ? `To: ${m.to || '—'}` : m.from}</b>
                  <time>{fmtWhen(m.at)}</time>
                </span>
                <span className="mc-subj">
                  {m.pinned && <SysIcon n="pin" size={12} className="mc-mark pin" />}
                  {m.flagged && <SysIcon n="flag" size={12} className="mc-mark flag" />}
                  {m.attachment && <SysIcon n="paperclip" size={12} className="mc-mark" />}
                  {m.subject}
                </span>
                <small>{m.body.replace(/\n+/g, ' ').slice(0, 90)}</small>
              </span>
            </button>
          ))}
          {list.length === 0 && <p className="mc-none">No messages{q ? ` matching “${q}”` : ''}.</p>}
        </div>
      </section>
      <section className="mc-read">
        {cur ? (
          <>
            <DragBar className="mc-toolbar">
              <button type="button" className="mc-back" onClick={() => setPane('list')}>
                ‹
              </button>
              <button type="button" onClick={() => reply(cur)} title="Reply">
                <SysIcon n="reply" size={15} /> Reply
              </button>
              <button type="button" onClick={() => reply(cur, true)} title="Forward">
                <SysIcon n="forward" size={15} /> Forward
              </button>
              <button type="button" onClick={() => upd(cur.id, { flagged: !cur.flagged })} title="Flag">
                <SysIcon n="flag" size={15} /> {cur.flagged ? 'Unflag' : 'Flag'}
              </button>
              {cur.box === 'archive' || cur.box === 'trash' ? (
                <button type="button" onClick={() => upd(cur.id, { box: cur.prevBox ?? 'inbox' })}>
                  <SysIcon n="undo" size={15} /> Restore
                </button>
              ) : (
                <button type="button" onClick={() => (upd(cur.id, { box: 'archive', prevBox: cur.box === 'trash' || cur.box === 'archive' ? 'inbox' : cur.box }), setSel(null))}>
                  <SysIcon n="archive" size={15} /> Archive
                </button>
              )}
              <button type="button" onClick={() => trash(cur)} title="Delete" aria-label="Delete">
                <SysIcon n="trash" size={16} />
              </button>
              <button type="button" onClick={(e) => menu(e as unknown as RMouseEvent, cur)} title="More">
                ⋯
              </button>
            </DragBar>
            <article className="mc-msg scroll-smooth">
              <h2>{cur.subject}</h2>
              <div className="mc-from">
                <span className="mc-av">{cur.from === personal.name ? <img src={personal.avatar} alt="" /> : cur.from.slice(0, 1)}</span>
                <span>
                  <b>{cur.from}</b> <small>&lt;{cur.fromEmail}&gt;</small>
                  <br />
                  <small>
                    To: {cur.to} · {new Date(cur.at).toLocaleString()}
                  </small>
                </span>
              </div>
              <pre className="mc-body">{cur.body}</pre>
              {cur.attachment && (
                <a className="mc-att" href={cur.attachment.href} download={cur.attachment.name}>
                  <AppIcon name="pdf" />
                  <span>
                    <b>{cur.attachment.name}</b>
                    <small>PDF · Download</small>
                  </span>
                </a>
              )}
              <div className="mc-quick">
                <button type="button" onClick={() => reply(cur)}>
                  <SysIcon n="reply" size={15} /> Reply
                </button>
                <button type="button" onClick={() => void copyText(cur.body).then(() => notify({ app: theme.title, icon: theme.icon, title: 'Copied' }))}>
                  Copy
                </button>
                <button type="button" onClick={() => void sharePortfolio({ title: cur.subject, text: cur.body.slice(0, 200) })}>
                  Share
                </button>
              </div>
            </article>
          </>
        ) : (
          <div className="mc-nosel">
            <AppIcon name={theme.icon} />
            <p>No message selected</p>
          </div>
        )}
      </section>

      {draft && (
        <div className="mc-compose-back" onPointerDown={(e) => e.target === e.currentTarget && saveDraft()}>
          <form className="mc-compose-win" onSubmit={send} noValidate role="dialog" aria-label="New message">
            <header>
              <b>{draft.subject || 'New Message'}</b>
              <span>
                <button type="button" onClick={saveDraft} title="Save draft and close">
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (draft.id) setMails((l) => l.filter((x) => x.id !== draft.id));
                    setDraft(null);
                  }}
                  title="Discard"
                >
                  Discard
                </button>
              </span>
            </header>
            <label>
              <span>To:</span>
              <input value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} placeholder="name@example.com" />
            </label>
            <label>
              <span>From:</span>
              <input value={draft.fromName} onChange={(e) => setDraft({ ...draft, fromName: e.target.value })} placeholder="Your name" autoComplete="name" />
            </label>
            <label>
              <span>Reply-To:</span>
              <input type="email" value={draft.replyEmail} onChange={(e) => setDraft({ ...draft, replyEmail: e.target.value })} placeholder="you@example.com" autoComplete="email" />
            </label>
            <label>
              <span>Subject:</span>
              <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Internship opportunity" />
            </label>
            <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder={`Hi ${personal.name},\n\n`} aria-label="Message" autoFocus />
            {err && (
              <div className="mc-err" role="alert">
                {err}
              </div>
            )}
            <footer>
              <small>
                Sends through {theme.app === 'yahoomail' ? 'Yahoo Mail' : 'your email app'} · replies arrive in your inbox.
              </small>
              <button type="submit" className="mc-send">
                <SysIcon n="share" size={15} /> Send
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
