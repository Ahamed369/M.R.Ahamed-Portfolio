import { startCall } from '../system/call';
import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { usePersisted, uid } from '../system/useStore';
import { useSystem } from '../system/SystemContext';
import { education, personal, socials } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { notify, openExternal } from '../system/notify';
import { AppIcon, type IconName } from '../components/AppIcons';
import { DragBar, Lights } from '../components/Window';
import { readStore, writeStore } from '../system/storage';
import { SysIcon } from '../components/SysIcons';

/** Builds a vCard 3.0 so visitors can save M.R. Ahamed to their phone. */
function vcard(): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:Ahamed;M.R.;;;`,
    `FN:${personal.name}`,
    `TITLE:${personal.headline}`,
    `ORG:${education[0].institution}`,
    `TEL;TYPE=CELL:${personal.phone.replace(/\s/g, '')}`,
    `EMAIL;TYPE=INTERNET:${personal.email}`,
    `ADR;TYPE=HOME:;;;Kandy;;;Sri Lanka`,
    `URL:${socials.github}`,
    `X-SOCIALPROFILE;TYPE=linkedin:${socials.linkedin}`,
    `X-SOCIALPROFILE;TYPE=instagram:${socials.instagram}`,
    `X-SOCIALPROFILE;TYPE=facebook:${socials.facebook}`,
    `NOTE:${personal.status}. Portfolio contact card.`,
    'END:VCARD',
  ];
  return lines.join('\r\n');
}

const LINKS: { label: string; value: string; url: string; icon: IconName }[] = [
  { label: 'GitHub', value: `github.com/${socials.githubHandle}`, url: socials.github, icon: 'github' },
  { label: 'LinkedIn', value: 'M.R. Ahamed', url: socials.linkedin, icon: 'linkedin' },
  { label: 'Instagram', value: socials.instagramHandle, url: socials.instagram, icon: 'instagram' },
  { label: 'Facebook', value: 'M.R. Ahamed', url: socials.facebook, icon: 'facebook' },
  { label: 'Threads', value: socials.instagramHandle, url: socials.threads, icon: 'threads' },
  { label: 'Spotify', value: 'My profile', url: socials.spotify, icon: 'spotify' },
];

type Group = 'all' | 'portfolio' | 'mine' | 'favorites' | 'hiring';
const GROUPS: { id: Group; label: string; section: string }[] = [
  { id: 'all', label: 'All Contacts', section: 'On My Mac' },
  { id: 'portfolio', label: 'Portfolio', section: 'On My Mac' },
  { id: 'mine', label: 'My Contacts', section: 'On My Mac' },
  { id: 'favorites', label: 'Favorites', section: 'Smart Groups' },
  { id: 'hiring', label: 'Open to Internships', section: 'Smart Groups' },
];

/* v8 — visitor-created contacts (stored only in this browser) */
interface VContact {
  id: string;
  first: string;
  last: string;
  company: string;
  phone: string;
  email: string;
  url: string;
  note: string;
  favorite?: boolean;
}
const EMPTY: Omit<VContact, 'id'> = { first: '', last: '', company: '', phone: '', email: '', url: '', note: '' };
const fullName = (c: VContact) => `${c.first} ${c.last}`.trim() || c.company || 'No Name';
const initialsOf = (c: VContact) => (fullName(c).split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '?').toUpperCase();
function vcardOf(c: VContact): string {
  return ['BEGIN:VCARD', 'VERSION:3.0', `N:${c.last};${c.first};;;`, `FN:${fullName(c)}`, c.company && `ORG:${c.company}`, c.phone && `TEL;TYPE=CELL:${c.phone}`, c.email && `EMAIL;TYPE=INTERNET:${c.email}`, c.url && `URL:${c.url}`, c.note && `NOTE:${c.note}`, 'END:VCARD']
    .filter(Boolean)
    .join('\r\n');
}
function downloadText(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function VisitorCard({ c, onSave, onDelete, onDuplicate, onFav, startEditing }: { c: VContact; onSave: (c: VContact) => void; onDelete: () => void; onDuplicate: () => void; onFav: () => void; startEditing: boolean }) {
  const [edit, setEdit] = useState(startEditing);
  const [d, setD] = useState<VContact>(c);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState('');
  const save = () => {
    if (!d.first.trim() && !d.last.trim() && !d.company.trim()) return setErr('Add a name or company.');
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return setErr('That email address doesn’t look right.');
    if (d.phone && !/^[+()\d\s-]{5,}$/.test(d.phone)) return setErr('Phone numbers can use digits, spaces, + ( ) and -.');
    setErr('');
    onSave({ ...d, first: d.first.trim(), last: d.last.trim() });
    setEdit(false);
  };
  const field = (k: keyof Omit<VContact, 'id' | 'favorite'>, label: string, type = 'text') => (
    <div key={k}>
      <dt>{label}</dt>
      <dd>
        {edit ? (
          k === 'note' ? (
            <textarea className="ct3-note" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} placeholder="Note" />
          ) : (
            <input className="ct8-input" type={type} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} placeholder={label} />
          )
        ) : k === 'phone' && c.phone ? (
          <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
        ) : k === 'email' && c.email ? (
          <a href={`mailto:${c.email}`}>{c.email}</a>
        ) : k === 'url' && c.url ? (
          <a href={/^https?:/.test(c.url) ? c.url : `https://${c.url}`} target="_blank" rel="noopener noreferrer">
            {c.url}
          </a>
        ) : (
          <span className="ct3-note-text">{c[k] || '—'}</span>
        )}
      </dd>
    </div>
  );
  return (
    <div className="ct3-scroll scroll-smooth fade-swap" key={c.id}>
      <div className="ct3-head">
        <span className="ct8-av">{initialsOf(edit ? d : c)}</span>
        <div>
          {edit ? (
            <div className="ct8-names">
              <input className="ct8-input" value={d.first} onChange={(e) => setD({ ...d, first: e.target.value })} placeholder="First name" autoFocus />
              <input className="ct8-input" value={d.last} onChange={(e) => setD({ ...d, last: e.target.value })} placeholder="Last name" />
            </div>
          ) : (
            <h2>
              {fullName(c)} {c.favorite && (
                <span title="Favorite" className="ct-fav">
                  <SysIcon n="starFill" size={16} />
                </span>
              )}
            </h2>
          )}
          {!edit && c.company && <span>{c.company}</span>}
        </div>
      </div>
      {!edit && (
        <div className="ct3-actions">
          <a className="ct3-act" href={c.phone ? `sms:${c.phone.replace(/\s/g, '')}` : undefined} aria-disabled={!c.phone}>
            <span className="ct3-act-ico">
              <Round d={ICON.message} filled />
            </span>
            message
          </a>
          <a className="ct3-act" href={c.phone ? `tel:${c.phone.replace(/\s/g, '')}` : undefined} aria-disabled={!c.phone}>
            <span className="ct3-act-ico">
              <Round d={ICON.call} filled />
            </span>
            call
          </a>
          <a className="ct3-act" href={c.email ? `mailto:${c.email}` : undefined} aria-disabled={!c.email}>
            <span className="ct3-act-ico">
              <Round d={ICON.mail} />
            </span>
            mail
          </a>
        </div>
      )}
      <dl className="ct3-fields">
        {edit && field('company', 'company')}
        {field('phone', 'mobile', 'tel')}
        {field('email', 'email', 'email')}
        {field('url', 'website', 'url')}
        {field('note', 'note')}
      </dl>
      {err && <p className="ct8-err">{err}</p>}
      <div className="ct8-actions">
        {edit ? (
          <>
            <button type="button" className="primary" onClick={save}>
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                setD(c);
                setEdit(false);
                setErr('');
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setEdit(true)}>
              Edit
            </button>
            <button type="button" onClick={onFav}>
              {c.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>
            <button type="button" onClick={onDuplicate}>
              Duplicate
            </button>
            <button type="button" onClick={() => downloadText(vcardOf(c), `${fullName(c).replace(/\W+/g, '_')}.vcf`, 'text/vcard')}>
              Share vCard
            </button>
            {confirmDel ? (
              <button type="button" className="danger" onClick={onDelete}>
                Confirm Delete
              </button>
            ) : (
              <button type="button" className="danger" onClick={() => setConfirmDel(true)}>
                Delete Contact
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const Round = ({ d, filled }: { d: string; filled?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICON = {
  message: 'M12 4c4.97 0 9 3.13 9 7s-4.03 7-9 7c-.93 0-1.82-.1-2.66-.3L5 20l1.1-3.5C4.2 15.2 3 13.2 3 11c0-3.87 4.03-7 9-7Z',
  call: 'M6.6 3.5 9.3 3l1.6 4-2 1.4a11 11 0 0 0 6.7 6.7l1.4-2 4 1.6-.5 2.7c-.2 1-1.1 1.6-2.1 1.6C10.8 19 5 13.2 5 5.6c0-1 .6-1.9 1.6-2.1Z',
  video: 'M3.5 7.5A1.5 1.5 0 0 1 5 6h9a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 14 18H5a1.5 1.5 0 0 1-1.5-1.5ZM15.5 10.5 20.5 7v10l-5-3.5Z',
  mail: 'M3.5 6.5h17v11h-17ZM3.5 7l8.5 6.5L20.5 7',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21ZM12 7.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4',
};

const NOTE_KEY = 'mra-contacts-note';

/** macOS Contacts: groups sidebar, contact list and the card for M.R. Ahamed. */
export default function ContactsApp() {
  const wm = useWM();
  const [copied, setCopied] = useState<string | null>(null);
  const [group, setGroup] = useState<Group>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(true);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<string>(() => readStore(NOTE_KEY, { text: '' }).text);
  const sys = useSystem();
  const [mine, setMine] = usePersisted<VContact[]>('mra-contacts-v8', []);
  const [ownerFav, setOwnerFav] = usePersisted<boolean>('mra-contacts-owner-fav', true);
  const [sel, setSel] = useState<string>('owner');
  const [fresh, setFresh] = useState<string | null>(null);
  const qq = q.trim().toLowerCase();
  const visible = useMemo(
    () =>
      mine
        .filter((c) => (group === 'all' || group === 'mine' || (group === 'favorites' && c.favorite)) && (!qq || `${fullName(c)} ${c.company} ${c.email} ${c.phone}`.toLowerCase().includes(qq)))
        .sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [mine, group, qq],
  );
  const addContact = () => {
    const c: VContact = { id: uid('c'), ...EMPTY, first: 'New', last: 'Contact' };
    setMine((l) => [...l, c]);
    setGroup('mine');
    setSel(c.id);
    setFresh(c.id);
  };
  const cur = mine.find((c) => c.id === sel);
  const contactMenu = (e: ReactMouseEvent, c: VContact) => {
    e.preventDefault();
    sys.setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Open', action: () => setSel(c.id) },
        { label: c.favorite ? 'Remove from Favorites' : 'Add to Favorites', action: () => setMine((l) => l.map((x) => (x.id === c.id ? { ...x, favorite: !x.favorite } : x))) },
        { label: 'Duplicate', action: () => setMine((l) => [...l, { ...c, id: uid('c'), first: `${c.first} copy` }]) },
        { label: 'Export vCard…', action: () => downloadText(vcardOf(c), `${fullName(c).replace(/\W+/g, '_')}.vcf`, 'text/vcard') },
        { label: '', sep: true },
        { label: 'Delete Contact', action: () => (setMine((l) => l.filter((x) => x.id !== c.id)), sel === c.id && setSel('owner')) },
      ],
    });
  };

  const copy = async (label: string, v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  const download = () => {
    const blob = new Blob([vcard()], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'M_R_Ahamed.vcf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify({ app: 'Contacts', icon: 'contacts', title: 'Contact card downloaded', body: 'M_R_Ahamed.vcf — open it to save to your phone or address book.' });
  };

  const actions: { label: string; icon: string; filled?: boolean; run: () => void }[] = [
    { label: 'message', icon: ICON.message, filled: true, run: () => wm.open('messages') },
    { label: 'call', icon: ICON.call, filled: true, run: () => openExternal(personal.phoneHref, { title: `Calling ${personal.name}`, app: 'Phone', icon: 'contacts' }) },
    { label: 'video', icon: ICON.video, filled: true, run: () => startCall({ app: 'facetime', video: true }) },
    { label: 'whatsapp', icon: ICON.message, filled: true, run: () => openExternal(socials.whatsapp, { title: 'Opening WhatsApp chat with M.R. Ahamed', app: 'WhatsApp', icon: 'whatsapp' }) },
    { label: 'mail', icon: ICON.mail, run: () => wm.open('mail', { compose: '1' }) },
    { label: 'directions', icon: ICON.pin, run: () => wm.open('maps') },
  ];

  const matches = group !== 'mine' && (group !== 'favorites' || ownerFav) && `${personal.name} ${personal.headline} ${personal.location} ${personal.email}`.toLowerCase().includes(q.trim().toLowerCase());
  const showCard = selected && matches && sel === 'owner';
  const counts: Record<Group, number> = { all: mine.length + 1, portfolio: 1, mine: mine.length, favorites: mine.filter((c) => c.favorite).length + (ownerFav ? 1 : 0), hiring: 1 };

  return (
    <div className="contacts-wrap">
      <div className="ct3">
        <aside className="ct3-groups">
          <DragBar className="ct3-drag">
            <Lights />
          </DragBar>
          {['On My Mac', 'Smart Groups'].map((sec) => (
            <div key={sec}>
              <div className="ct3-sec">{sec}</div>
              {GROUPS.filter((g) => g.section === sec).map((g) => (
                <button key={g.id} type="button" className={`ct3-group ${group === g.id ? 'on' : ''}`} onClick={() => (setGroup(g.id), setSelected(true))}>
                  {g.label}
                  <span>{counts[g.id]}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>
        <section className="ct3-list">
          <DragBar className="ct3-drag list">
            <span className="ct3-lights-alt">
              <Lights />
            </span>
          </DragBar>
          <label className="ct3-search">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="m10.5 10.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${GROUPS.find((g) => g.id === group)?.label}`} aria-label="Search contacts" />
          </label>
          {matches && (
            <>
              <div className="ct3-letter">A</div>
              <button type="button" className={`ct3-person ${selected && sel === 'owner' ? 'on' : ''}`} onClick={() => (setSelected(true), setSel('owner'))}>
                <img src={personal.avatar} alt="" />
                <span>
                  <b>{personal.name}</b>
                  <small>{personal.shortTitle}</small>
                </span>
              </button>
            </>
          )}
          {group !== 'portfolio' && group !== 'hiring' &&
            visible.map((c, i) => {
              const letter = fullName(c)[0]?.toUpperCase() ?? '#';
              const prev = i ? fullName(visible[i - 1])[0]?.toUpperCase() : '';
              return (
                <div key={c.id}>
                  {letter !== prev && <div className="ct3-letter">{letter}</div>}
                  <button type="button" className={`ct3-person ${sel === c.id ? 'on' : ''}`} onClick={() => (setSel(c.id), setFresh(null))} onContextMenu={(e) => contactMenu(e, c)}>
                    <span className="ct8-av sm">{initialsOf(c)}</span>
                    <span>
                      <b>
                        {fullName(c)} {c.favorite && <SysIcon n="starFill" size={12} className="ct-fav" />}
                      </b>
                      <small>{c.company || c.email || c.phone || 'Saved on this device'}</small>
                    </span>
                  </button>
                </div>
              );
            })}
          {!matches && (group === 'portfolio' || group === 'hiring' || !visible.length) && <p className="ct3-empty">{group === 'mine' && !qq ? 'No contacts yet — press + to add one.' : 'No Results'}</p>}
          <div className="ct3-count">
            {(matches ? 1 : 0) + (group === 'portfolio' || group === 'hiring' ? 0 : visible.length)} cards
          </div>
        </section>
        <section className="ct3-card">
          <DragBar className="ct3-drag card" />
          {cur && sel !== 'owner' ? (
            <VisitorCard
              key={cur.id}
              c={cur}
              startEditing={fresh === cur.id}
              onSave={(c) => {
                setMine((l) => l.map((x) => (x.id === c.id ? c : x)));
                setFresh(null);
                notify({ app: 'Contacts', icon: 'contacts', title: 'Contact saved', body: fullName(c) });
              }}
              onDelete={() => {
                setMine((l) => l.filter((x) => x.id !== cur.id));
                setSel('owner');
                notify({ app: 'Contacts', icon: 'contacts', title: 'Contact deleted', body: fullName(cur), actions: [{ label: 'Undo', run: () => setMine((l) => [...l, cur]) }] });
              }}
              onDuplicate={() => setMine((l) => [...l, { ...cur, id: uid('c'), first: `${cur.first} copy` }])}
              onFav={() => setMine((l) => l.map((x) => (x.id === cur.id ? { ...x, favorite: !x.favorite } : x)))}
            />
          ) : showCard ? (
            <div className="ct3-scroll scroll-smooth fade-swap">
              <div className="ct3-head">
                <img src={personal.avatar} alt={`Portrait of ${personal.name}`} />
                <div>
                  <h2>{personal.name}</h2>
                  <span>{personal.headline}</span>
                  <small>{education[0].institution}</small>
                </div>
              </div>
              <div className="ct3-actions">
                {actions.map((a) => (
                  <button key={a.label} type="button" className="ct3-act" onClick={a.run}>
                    <span className="ct3-act-ico">
                      <Round d={a.icon} filled={a.filled} />
                    </span>
                    {a.label}
                  </button>
                ))}
              </div>
              <dl className="ct3-fields">
                <div>
                  <dt>mobile</dt>
                  <dd>
                    <a href={personal.phoneHref}>{personal.phone}</a>
                    <button type="button" className="ct3-copy" onClick={() => void copy('phone', personal.phone)}>
                      {copied === 'phone' ? 'Copied ✓' : 'Copy'}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>WhatsApp / SMS</dt>
                  <dd>
                    <a href={socials.sms}>Text {personal.phone}</a>
                  </dd>
                </div>
                <div>
                  <dt>email</dt>
                  <dd>
                    <a href={socials.email}>{personal.email}</a>
                    <button type="button" className="ct3-copy" onClick={() => void copy('email', personal.email)}>
                      {copied === 'email' ? 'Copied ✓' : 'Copy'}
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>home</dt>
                  <dd>
                    <button type="button" className="ct3-link" onClick={() => wm.open('maps')}>
                      {personal.location}
                    </button>
                  </dd>
                </div>
                {LINKS.map((l) => (
                  <div key={l.label}>
                    <dt>{l.label}</dt>
                    <dd>
                      <button type="button" className="ct3-link with-ico" onClick={() => openExternal(l.url, { title: `Opening ${l.label}`, app: 'Contacts', icon: 'contacts' })}>
                        <AppIcon name={l.icon} className="ct3-mini" />
                        {l.value}
                      </button>
                    </dd>
                  </div>
                ))}
                <div>
                  <dt>status</dt>
                  <dd>{personal.status}</dd>
                </div>
                <div>
                  <dt>note</dt>
                  <dd>
                    {editing ? (
                      <textarea
                        className="ct3-note"
                        value={note}
                        autoFocus
                        placeholder="Add a private note (saved only on this device)"
                        onChange={(e) => setNote(e.target.value)}
                      />
                    ) : (
                      <span className="ct3-note-text">{note || 'Portfolio contact card'}</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="ct3-none">No Contact Selected</div>
          )}
          <div className="ct3-bar">
            <button type="button" className="ct3-bar-btn" title="New contact" aria-label="Add contact" onClick={addContact}>
              +
            </button>
            {sel === 'owner' && (
              <button type="button" className="ct3-bar-btn" onClick={() => setOwnerFav((v) => !v)} title={ownerFav ? 'Remove from Favorites' : 'Add to Favorites'}>
                {ownerFav ? '★' : '☆'}
              </button>
            )}
            <span className="ct3-bar-space" />
            <button type="button" className="ct3-bar-btn" onClick={() => wm.open('preview')}>
              CV
            </button>
            {sel === 'owner' && (
              <button
                type="button"
                className="ct3-bar-btn"
                onClick={() => {
                  if (editing) writeStore(NOTE_KEY, { text: note });
                  setEditing((x) => !x);
                }}
              >
                {editing ? 'Done' : 'Edit'}
              </button>
            )}
            <button type="button" className="ct3-bar-btn" onClick={download} aria-label="Share — download vCard" title="Share (download vCard)">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
