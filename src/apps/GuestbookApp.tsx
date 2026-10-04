import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { DragBar, Lights } from '../components/Window';
import { AppIcon } from '../components/AppIcons';
import { integrations, personal } from '../data/portfolio';
import { usePersisted, uid, fmtWhen } from '../system/useStore';
import { readStore, writeStore } from '../system/storage';
import { notify } from '../system/notify';
import { copyText, deepLink, sharePortfolio } from '../system/share';
import { clearBadge } from '../system/badges';
import { useSettings } from '../system/SettingsContext';
import { t } from '../system/i18n';

/**
 * v10.3 — Visitor Guestbook.
 *  • Always works: entries are saved in this browser.
 *  • Shared mode: when integrations.supabaseUrl + supabaseAnonKey are set,
 *    entries are also posted to / read from a Supabase "guestbook" table so
 *    every visitor (and M.R. Ahamed) can read them all. Setup: UPDATE-GUIDE.md.
 *  • Optional email: never shown, never sent to Supabase, never stored in the
 *    public entry list. It is only passed to /api/guestbook-notify (owner email)
 *    when integrations.guestbookNotify is true. While a notification is still
 *    pending (e.g. sharing failed and may be retried) it is kept in a separate
 *    private key in this browser and removed as soon as the notification ran.
 *  • Success is only reported after the save really happened.
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
  /** shared mode only: state of the upload of a visitor's own entry */
  sync?: 'sending' | 'failed' | 'shared';
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
/** `guestbookNotify` is optional in the Integrations config — read it safely. */
const notifyOn = () => (integrations as unknown as { guestbookNotify?: boolean }).guestbookNotify === true;
const headers = () => ({ apikey: integrations.supabaseAnonKey, Authorization: `Bearer ${integrations.supabaseAnonKey}`, 'Content-Type': 'application/json' });

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const emailValid = (s: string) => s.length <= 254 && EMAIL_RE.test(s);

/* private, never-public store for pending owner notifications: {list:[{id,email}]} */
const PRIV = 'mra-guestbook-private-v1';
type Priv = { list: { id: string; email: string }[] };
const privGet = (id: string) => readStore<Priv>(PRIV, { list: [] }).list.find((x) => x.id === id)?.email ?? '';
const privSet = (id: string, email: string) => {
  const list = readStore<Priv>(PRIV, { list: [] }).list.filter((x) => x.id !== id);
  writeStore(PRIV, { list: email ? [{ id, email }, ...list].slice(0, 20) : list });
};
const privDrop = (id: string) => privSet(id, '');

async function loadRemote(): Promise<Entry[]> {
  const r = await fetch(`${integrations.supabaseUrl}/rest/v1/guestbook?select=id,name,message,mood,location,created_at&order=created_at.desc&limit=200`, { headers: headers() });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  const rows = (await r.json()) as { id: number; name: string; message: string; mood?: string; location?: string; created_at: string }[];
  return rows.map((x) => ({ id: `r${x.id}`, name: x.name, message: x.message, mood: x.mood || '👋', location: x.location || undefined, at: new Date(x.created_at).getTime(), likes: 0, remote: true }));
}
async function postRemote(e: Entry): Promise<void> {
  // public columns only — the email is never part of this request
  const r = await fetch(`${integrations.supabaseUrl}/rest/v1/guestbook`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify({ name: e.name, message: e.message, mood: e.mood, location: e.location ?? null }) });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
}
async function postNotify(e: Entry, email: string): Promise<boolean> {
  try {
    const r = await fetch('/api/guestbook-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: e.name, email, message: e.message, mood: e.mood, at: e.at }),
    });
    const j = (await r.json().catch(() => null)) as { ok?: boolean } | null;
    return r.ok && j?.ok === true;
  } catch {
    return false;
  }
}

type Lng = 'en' | 'si' | 'ta';
const L = {
  from: { en: 'From (optional)', si: 'ප්‍රදේශය (අමතර)', ta: 'எங்கிருந்து (விருப்பம்)' },
  cityPh: { en: 'City, country', si: 'නගරය, රට', ta: 'நகரம், நாடு' },
  namePh: { en: 'Your name', si: 'ඔබේ නම', ta: 'உங்கள் பெயர்' },
  email: { en: 'Email (optional)', si: 'ඊමේල් (අමතර)', ta: 'மின்னஞ்சல் (விருப்பம்)' },
  emailPh: { en: 'you@example.com', si: 'you@example.com', ta: 'you@example.com' },
  emailHint: { en: 'Only M.R. Ahamed sees this — it’s never shown publicly.', si: 'මෙය දකින්නේ M.R. Ahamed පමණි — කිසි විටෙක ප්‍රසිද්ධියේ නොපෙන්වයි.', ta: 'இதை M.R. Ahamed மட்டுமே பார்ப்பார் — இது ஒருபோதும் பொதுவில் காட்டப்படாது.' },
  emailErr: { en: 'That email doesn’t look right — check it, or leave the field empty.', si: 'මෙම ඊමේල් ලිපිනය නිවැරදි නොවේ — පරීක්ෂා කරන්න, නැතහොත් හිස්ව තබන්න.', ta: 'இந்த மின்னஞ்சல் சரியாகத் தெரியவில்லை — சரிபார்க்கவும் அல்லது காலியாக விடவும்.' },
  msgPh: { en: 'Say hello, share feedback, or suggest an idea…', si: 'ආයුබෝවන් කියන්න, අදහස් බෙදාගන්න…', ta: 'வணக்கம் சொல்லுங்கள், கருத்தைப் பகிருங்கள்…' },
  mood: { en: 'Mood', si: 'හැඟීම', ta: 'மனநிலை' },
  errName: { en: 'Please add your name.', si: 'කරුණාකර ඔබේ නම එක් කරන්න.', ta: 'உங்கள் பெயரைச் சேர்க்கவும்.' },
  errShort: { en: 'Please write a short message.', si: 'කරුණාකර කෙටි පණිවිඩයක් ලියන්න.', ta: 'ஒரு சிறிய செய்தியை எழுதவும்.' },
  errLong: { en: 'Please keep it under 500 characters.', si: 'අක්ෂර 500ට අඩුවෙන් තබන්න.', ta: '500 எழுத்துகளுக்குள் வைக்கவும்.' },
  errLinks: { en: 'Too many links — please keep it simple.', si: 'සබැඳි වැඩියි — සරලව තබන්න.', ta: 'இணைப்புகள் அதிகம் — எளிமையாக வைக்கவும்.' },
  sending: { en: 'Sending…', si: 'යවමින්…', ta: 'அனுப்புகிறது…' },
  thanksLocal: { en: 'Thanks for signing! Saved in this browser.', si: 'අත්සන් කළාට ස්තූතියි! මෙම බ්‍රව්සරයේ සුරැකිණි.', ta: 'கையொப்பமிட்டதற்கு நன்றி! இந்த உலாவியில் சேமிக்கப்பட்டது.' },
  thanksShared: { en: 'Thanks for signing! Shared with every visitor.', si: 'අත්සන් කළාට ස්තූතියි! සියලු අමුත්තන් සමඟ බෙදාගන්නා ලදී.', ta: 'கையொப்பமிட்டதற்கு நன்றி! அனைத்து பார்வையாளர்களுடனும் பகிரப்பட்டது.' },
  shareFail: { en: 'Couldn’t share it right now — saved in this browser.', si: 'දැන් බෙදාගත නොහැකි විය — මෙම බ්‍රව්සරයේ සුරැකිණි.', ta: 'இப்போது பகிர முடியவில்லை — இந்த உலாவியில் சேமிக்கப்பட்டது.' },
  retry: { en: 'Retry', si: 'නැවත', ta: 'மீண்டும்' },
  notifyFail: { en: 'Saved — email notification couldn’t be sent.', si: 'සුරැකිණි — ඊමේල් දැනුම්දීම යැවිය නොහැකි විය.', ta: 'சேமிக்கப்பட்டது — மின்னஞ்சல் அறிவிப்பை அனுப்ப முடியவில்லை.' },
  notifyOk: { en: 'M.R. Ahamed was notified by email.', si: 'M.R. Ahamed හට ඊමේල් මගින් දැනුම් දෙන ලදී.', ta: 'M.R. Ahamed-க்கு மின்னஞ்சல் மூலம் தெரிவிக்கப்பட்டது.' },
  notifying: { en: 'Notifying M.R. Ahamed…', si: 'M.R. Ahamed හට දැනුම් දෙමින්…', ta: 'M.R. Ahamed-க்கு தெரிவிக்கிறது…' },
  dismiss: { en: 'Dismiss', si: 'වසන්න', ta: 'மூடு' },
  stShared: { en: 'Shared with all visitors', si: 'සියලු අමුත්තන් සමඟ බෙදාගත්', ta: 'அனைவருடனும் பகிரப்பட்டது' },
  stSync: { en: 'Syncing…', si: 'සමමුහුර්ත වෙමින්…', ta: 'ஒத்திசைக்கிறது…' },
  stErr: { en: 'Offline — saved locally', si: 'නොබැඳි — දේශීයව සුරැකේ', ta: 'இணைப்பில்லை — உள்ளூரில் சேமிக்கப்படும்' },
  stLocal: { en: 'Saved in this browser', si: 'මෙම බ්‍රව්සරයේ සුරැකේ', ta: 'இந்த உலாவியில் சேமிக்கப்படும்' },
  privacy: { en: 'Your name and message are shown publicly in this guestbook. Please don’t share private information.', si: 'ඔබේ නම සහ පණිවිඩය මෙම පොතේ ප්‍රසිද්ධියේ පෙන්වයි. පුද්ගලික තොරතුරු බෙදා නොගන්න.', ta: 'உங்கள் பெயரும் செய்தியும் இங்கே பொதுவில் காட்டப்படும். தனிப்பட்ட தகவல்களைப் பகிர வேண்டாம்.' },
  search: { en: 'Search messages', si: 'පණිවිඩ සොයන්න', ta: 'செய்திகளைத் தேடு' },
  sort: { en: 'Sort', si: 'පෙළගස්වන්න', ta: 'வரிசைப்படுத்து' },
  newest: { en: 'Newest', si: 'නවතම', ta: 'புதியவை' },
  oldest: { en: 'Oldest', si: 'පැරණිම', ta: 'பழையவை' },
  liked: { en: 'Most liked', si: 'වැඩිපුර කැමති', ta: 'அதிகம் விரும்பியவை' },
  refresh: { en: 'Refresh', si: 'නැවුම් කරන්න', ta: 'புதுப்பி' },
  messages: { en: '{n} messages', si: 'පණිවිඩ {n}', ta: '{n} செய்திகள்' },
  message1: { en: '1 message', si: 'පණිවිඩ 1', ta: '1 செய்தி' },
  owner: { en: 'Owner', si: 'හිමිකරු', ta: 'உரிமையாளர்' },
  you: { en: 'You', si: 'ඔබ', ta: 'நீங்கள்' },
  badgeSending: { en: 'Sending…', si: 'යවමින්…', ta: 'அனுப்புகிறது…' },
  badgeFailed: { en: 'Only in this browser', si: 'මෙම බ්‍රව්සරයේ පමණි', ta: 'இந்த உலாவியில் மட்டும்' },
  badgeShared: { en: 'Shared', si: 'බෙදාගත්', ta: 'பகிரப்பட்டது' },
  like: { en: 'Like', si: 'කැමතියි', ta: 'விருப்பம்' },
  copy: { en: 'Copy', si: 'පිටපත්', ta: 'நகல்' },
  copied: { en: 'Message copied', si: 'පණිවිඩය පිටපත් විය', ta: 'செய்தி நகலெடுக்கப்பட்டது' },
  copyFail: { en: 'Couldn’t copy the message', si: 'පිටපත් කළ නොහැකි විය', ta: 'நகலெடுக்க முடியவில்லை' },
  share: { en: 'Share', si: 'බෙදාගන්න', ta: 'பகிர்' },
  edit: { en: 'Edit', si: 'සංස්කරණය', ta: 'திருத்து' },
  del: { en: 'Delete', si: 'මකන්න', ta: 'நீக்கு' },
  save: { en: 'Save', si: 'සුරකින්න', ta: 'சேமி' },
  cancel: { en: 'Cancel', si: 'අවලංගු', ta: 'ரத்து' },
  empty: { en: 'Be the first visitor to sign the guestbook!', si: 'අමුත්තන්ගේ පොතේ අත්සන් කරන පළමු අමුත්තා වන්න!', ta: 'விருந்தினர் புத்தகத்தில் முதலில் கையொப்பமிடுங்கள்!' },
  noMatch: { en: 'No messages match your search.', si: 'ඔබේ සෙවුමට ගැළපෙන පණිවිඩ නැත.', ta: 'உங்கள் தேடலுக்குப் பொருந்தும் செய்திகள் இல்லை.' },
  thanksTitle: { en: 'Thanks for signing!', si: 'අත්සන් කළාට ස්තූතියි!', ta: 'கையொப்பமிட்டதற்கு நன்றி!' },
} satisfies Record<string, Record<Lng, string>>;

/* ── original inline icons ── */
const I = {
  pen: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="gb-ic">
      <path fill="currentColor" d="M15.6 4.6a2.2 2.2 0 0 1 3.1 0l.7.7a2.2 2.2 0 0 1 0 3.1L9.6 18.2l-4.4 1.1a.6.6 0 0 1-.7-.7l1.1-4.4 10-9.6Z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M13 20h6.5" opacity=".55" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="gb-ic">
      <path fill="currentColor" d="M8.5 3.5h7a1 1 0 0 1 .8 1.6L15 7v4.2l2.8 2.6a1 1 0 0 1-.7 1.7H13v5l-1 1.5-1-1.5v-5H6.9a1 1 0 0 1-.7-1.7L9 11.2V7L7.7 5.1a1 1 0 0 1 .8-1.6Z" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="gb-ic">
      <path fill="currentColor" d="M12 20.3c-.3 0-.6-.1-.8-.3C6.3 16 3.3 13.2 3.3 9.4 3.3 6.7 5.4 4.6 8 4.6c1.6 0 3 .8 4 2 1-1.2 2.4-2 4-2 2.6 0 4.7 2.1 4.7 4.8 0 3.8-3 6.6-7.9 10.6-.2.2-.5.3-.8.3Z" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="gb-ic">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 12a7 7 0 1 1-2.1-5M19 4.5V8h-3.5" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="gb-ic">
      <rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="currentColor" />
      <path fill="none" stroke="currentColor" strokeWidth="2" d="M8.3 10.5V8a3.7 3.7 0 0 1 7.4 0v2.5" />
    </svg>
  ),
  ok: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="gb-ic">
      <circle cx="12" cy="12" r="9.5" fill="currentColor" />
      <path fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="m7.8 12.3 2.8 2.8 5.6-6" />
    </svg>
  ),
  warn: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="gb-ic">
      <path fill="currentColor" d="M10.3 4.3a2 2 0 0 1 3.4 0l7.4 12.8a2 2 0 0 1-1.7 3H4.6a2 2 0 0 1-1.7-3l7.4-12.8Z" />
      <path fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" d="M12 9.3v4.2m0 2.9v.1" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="gb-ic">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m7 7 10 10M17 7 7 17" />
    </svg>
  ),
};

type Notice = { kind: 'ok' | 'warn' | 'sending'; text: string; retryId?: string; mail?: { kind: 'ok' | 'warn' | 'sending'; text: string } };

export default function GuestbookApp() {
  const { settings } = useSettings();
  const lng: Lng = settings.language === 'si' || settings.language === 'ta' ? settings.language : 'en';
  const tx = (k: keyof typeof L) => L[k][lng];

  const [local, setLocal] = usePersisted<Entry[]>('mra-guestbook-v8', []);
  const [likes, setLikes] = usePersisted<Record<string, number>>('mra-guestbook-likes', {});
  const [remote, setRemote] = useState<Entry[]>([]);
  const [status, setStatus] = useState<'local' | 'loading' | 'shared' | 'error'>(remoteOn() ? 'loading' : 'local');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState(false);
  const [msg, setMsg] = useState('');
  const [mood, setMood] = useState('👋');
  const [loc, setLoc] = useState('');
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'new' | 'old' | 'liked'>('new');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const alive = useRef(true);
  const lastId = useRef('');

  useEffect(() => clearBadge('guestbook'), []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // An upload that was in flight when the page closed never finished → mark it honestly.
  useEffect(() => {
    if (local.some((e) => e.sync === 'sending')) setLocal((l) => l.map((e) => (e.sync === 'sending' ? { ...e, sync: 'failed' } : e)));
    // older builds may have put extra fields on entries — public entries hold public fields only
    if (local.some((e) => 'email' in (e as unknown as Record<string, unknown>))) {
      setLocal((l) =>
        l.map((e) => {
          const { email: _drop, ...rest } = e as Entry & { email?: string };
          return rest;
        }),
      );
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => {
    if (!remoteOn()) return;
    setStatus('loading');
    loadRemote()
      .then((r) => {
        if (!alive.current) return;
        setRemote(r);
        setStatus('shared');
      })
      .catch(() => alive.current && setStatus('error'));
  }, []);
  useEffect(refresh, [refresh]);

  const { all, total } = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...local, ...remote].filter((e) => {
      const k = `${e.name}|${e.message}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    let list = merged.map((e) => ({ ...e, likes: e.likes + (likes[e.id] ?? 0) }));
    const total = list.length;
    if (q) list = list.filter((e) => `${e.name} ${e.message} ${e.location ?? ''}`.toLowerCase().includes(q.toLowerCase()));
    list.sort((a, b) => (sort === 'liked' ? b.likes - a.likes || b.at - a.at : sort === 'old' ? a.at - b.at : b.at - a.at));
    return { all: [{ ...OWNER, likes: likes.owner ?? 0 }, ...list], total };
  }, [local, remote, likes, q, sort]);

  const setSync = (id: string, sync: Entry['sync']) => setLocal((l) => l.map((x) => (x.id === id ? { ...x, sync } : x)));
  const thanksToast = (body: string) => notify({ app: 'Guestbook', icon: 'guestbook', title: tx('thanksTitle'), body });

  /** Owner email — only after a real save, only when enabled. The entry itself is never touched here. */
  const notifyOwner = async (e: Entry, base: Notice) => {
    const mail = privGet(e.id);
    if (!notifyOn()) {
      privDrop(e.id);
      return;
    }
    if (alive.current && lastId.current === e.id) setNotice({ ...base, mail: { kind: 'sending', text: tx('notifying') } });
    const ok = await postNotify(e, mail);
    privDrop(e.id);
    if (alive.current && lastId.current === e.id) setNotice({ ...base, mail: ok ? { kind: 'ok', text: tx('notifyOk') } : { kind: 'warn', text: tx('notifyFail') } });
  };

  const share = async (e: Entry) => {
    setSync(e.id, 'sending');
    lastId.current = e.id;
    setNotice({ kind: 'sending', text: tx('sending') });
    try {
      await postRemote(e);
    } catch {
      setSync(e.id, 'failed');
      if (alive.current && lastId.current === e.id) setNotice({ kind: 'warn', text: tx('shareFail'), retryId: e.id });
      setStatus('error');
      return;
    }
    setSync(e.id, 'shared');
    const base: Notice = { kind: 'ok', text: tx('thanksShared') };
    if (alive.current && lastId.current === e.id) setNotice(base);
    thanksToast(tx('thanksShared'));
    refresh();
    await notifyOwner(e, base);
  };

  const checkEmail = (v: string) => {
    const s = v.trim();
    return !s || emailValid(s);
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const n = name.trim();
    const m = msg.trim();
    const em = email.trim();
    if (!n) return setErr(tx('errName'));
    if (m.length < 2) return setErr(tx('errShort'));
    if (m.length > 500) return setErr(tx('errLong'));
    if (/https?:\/\//i.test(m) && m.split(/https?:\/\//i).length > 3) return setErr(tx('errLinks'));
    if (!checkEmail(em)) {
      setErr('');
      setEmailErr(true);
      (document.getElementById('gb-email') as HTMLInputElement | null)?.focus();
      return;
    }
    setErr('');
    setEmailErr(false);
    // public entry: no email field, ever
    const entry: Entry = { id: uid('g'), name: n.slice(0, 40), message: m, mood, location: loc.trim().slice(0, 40) || undefined, at: Date.now(), likes: 0, mine: true, sync: remoteOn() ? 'sending' : undefined };
    if (em && notifyOn()) privSet(entry.id, em);
    setLocal((l) => [entry, ...l]);
    // verify the browser really stored it before saying so
    const stored = readStore<{ v: Entry[] | null }>('mra-guestbook-v8', { v: null }).v?.some((x) => x.id === entry.id);
    setMsg('');
    setEmail('');
    lastId.current = entry.id;
    if (remoteOn()) {
      await share(entry);
      return;
    }
    if (!stored) {
      // storage unavailable (private mode etc.) — it only lives in this tab
      setNotice({ kind: 'warn', text: tx('shareFail').split('—')[0].trim() === '' ? tx('shareFail') : tx('thanksLocal') });
    }
    const base: Notice = { kind: 'ok', text: tx('thanksLocal') };
    setNotice(base);
    thanksToast(tx('stLocal'));
    await notifyOwner(entry, base);
  };

  const like = (id: string) => setLikes((l) => ({ ...l, [id]: (l[id] ?? 0) > 0 ? 0 : 1 }));
  const remove = (id: string) => {
    setLocal((l) => l.filter((x) => x.id !== id));
    privDrop(id);
    if (notice?.retryId === id) setNotice(null);
  };
  const saveEdit = (id: string) => {
    const v = editText.trim();
    if (v.length < 2) return;
    setLocal((l) => l.map((x) => (x.id === id ? { ...x, message: v } : x)));
    setEditing(null);
  };
  const retry = (id: string) => {
    const e = local.find((x) => x.id === id);
    if (e) void share(e);
  };

  const statusText = status === 'shared' ? tx('stShared') : status === 'loading' ? tx('stSync') : status === 'error' ? tx('stErr') : tx('stLocal');
  const icFor = (k: Notice['kind']): ReactNode => (k === 'ok' ? I.ok : k === 'warn' ? I.warn : <span className="gb-spin" aria-hidden="true" />);

  return (
    <div className="gb gb10">
      <DragBar className="gb-bar">
        <Lights />
        <span className="gb-title">
          <AppIcon name="guestbook" /> {t('guestbook')}
        </span>
        <span className={`gb-status ${status}`}>
          <i className="gb-dot" aria-hidden="true" />
          {statusText}
        </span>
      </DragBar>
      <div className="gb-wrap">
        <form className="gb-form" onSubmit={(e) => void submit(e)} noValidate>
          <h2>
            {I.pen} {t('leaveMessage')}
          </h2>
          <label>
            <span>{t('yourName')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={tx('namePh')} autoComplete="name" />
          </label>
          <label>
            <span>{tx('from')}</span>
            <input value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={40} placeholder={tx('cityPh')} />
          </label>
          <label className="gb-email">
            <span>{tx('email')}</span>
            <input
              id="gb-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailErr && checkEmail(e.target.value)) setEmailErr(false);
              }}
              onBlur={() => setEmailErr(!checkEmail(email))}
              maxLength={254}
              placeholder={tx('emailPh')}
              autoComplete="email"
              spellCheck={false}
              aria-invalid={emailErr}
              aria-describedby={emailErr ? 'gb-email-err gb-email-hint' : 'gb-email-hint'}
              className={emailErr ? 'invalid' : ''}
            />
            {emailErr && (
              <small id="gb-email-err" className="gb-field-err" role="alert">
                {tx('emailErr')}
              </small>
            )}
            <small id="gb-email-hint" className="gb-hint">
              {I.lock}
              {tx('emailHint')}
            </small>
          </label>
          <label>
            <span>{t('message')}</span>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} rows={5} placeholder={tx('msgPh')} dir="auto" />
            <small className="gb-count">{msg.length}/500</small>
          </label>
          <div className="gb-moods" role="radiogroup" aria-label={tx('mood')}>
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
          <button type="submit" className="gb-submit" disabled={notice?.kind === 'sending'}>
            {t('sign')}
          </button>
          {notice && (
            <div className={`gb-notice ${notice.kind}`} role="status" aria-live="polite">
              <div className="gb-notice-row">
                {icFor(notice.kind)}
                <span>{notice.text}</span>
                {notice.retryId && remoteOn() && (
                  <button type="button" className="gb-retry" onClick={() => retry(notice.retryId!)}>
                    {I.refresh}
                    {tx('retry')}
                  </button>
                )}
                {notice.kind !== 'sending' && notice.mail?.kind !== 'sending' && (
                  <button type="button" className="gb-x" aria-label={tx('dismiss')} onClick={() => setNotice(null)}>
                    {I.close}
                  </button>
                )}
              </div>
              {notice.mail && (
                <div className={`gb-notice-row sub ${notice.mail.kind}`}>
                  {icFor(notice.mail.kind)}
                  <span>{notice.mail.text}</span>
                </div>
              )}
            </div>
          )}
          <p className="gb-privacy">{tx('privacy')}</p>
        </form>
        <section className="gb-list">
          <div className="gb-tools">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('search')} aria-label={tx('search')} type="search" />
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label={tx('sort')}>
              <option value="new">{tx('newest')}</option>
              <option value="old">{tx('oldest')}</option>
              <option value="liked">{tx('liked')}</option>
            </select>
            {remoteOn() && (
              <button type="button" onClick={refresh} title={tx('refresh')} aria-label={tx('refresh')}>
                {I.refresh}
              </button>
            )}
          </div>
          <div className="gb-count-line">{all.length === 1 ? tx('message1') : tx('messages').replace('{n}', String(all.length))}</div>
          <div className="gb-entries scroll-smooth">
            {all.map((e) => (
              <article key={e.id} className={`gb-entry ${e.pinned ? 'pinned' : ''} ${e.mine ? 'mine' : ''} ${e.sync ? `sync-${e.sync}` : ''}`}>
                <span className="gb-mood">{e.mood}</span>
                <div className="gb-body">
                  <header>
                    <b>{e.name}</b>
                    {e.pinned && (
                      <span className="gb-pin">
                        {I.pin}
                        {tx('owner')}
                      </span>
                    )}
                    {e.mine && <span className="gb-you">{tx('you')}</span>}
                    {e.mine && e.sync === 'sending' && <span className="gb-sync sending">{tx('badgeSending')}</span>}
                    {e.mine && e.sync === 'failed' && <span className="gb-sync failed">{tx('badgeFailed')}</span>}
                    {e.mine && e.sync === 'shared' && <span className="gb-sync shared">{tx('badgeShared')}</span>}
                    {e.location && <small>· {e.location}</small>}
                    <time dateTime={new Date(e.at).toISOString()} title={new Date(e.at).toLocaleString()}>
                      {fmtWhen(e.at)}
                    </time>
                  </header>
                  {editing === e.id ? (
                    <div className="gb-edit">
                      <textarea value={editText} onChange={(x) => setEditText(x.target.value)} rows={3} maxLength={500} autoFocus dir="auto" />
                      <div>
                        <button type="button" onClick={() => saveEdit(e.id)}>
                          {tx('save')}
                        </button>
                        <button type="button" onClick={() => setEditing(null)}>
                          {tx('cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p dir="auto">{e.message}</p>
                  )}
                  <footer>
                    <button type="button" className={`gb-like ${(likes[e.id] ?? 0) > 0 ? 'on' : ''}`} onClick={() => like(e.id)} aria-pressed={(likes[e.id] ?? 0) > 0} aria-label={tx('like')}>
                      {I.heart} {e.likes || ''}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(`“${e.message}” — ${e.name}`)
                          .then(() => notify({ app: 'Guestbook', icon: 'guestbook', title: tx('copied') }))
                          .catch(() => notify({ app: 'Guestbook', icon: 'guestbook', title: tx('copyFail') }))
                      }
                    >
                      {tx('copy')}
                    </button>
                    <button type="button" onClick={() => void sharePortfolio({ title: `${e.name} signed ${personal.name}’s guestbook`, text: `“${e.message}” — ${e.name}`, url: deepLink('guestbook') })}>
                      {tx('share')}
                    </button>
                    {e.mine && !e.remote && e.sync === 'failed' && remoteOn() && (
                      <button type="button" className="gb-retry-sm" onClick={() => retry(e.id)}>
                        {tx('retry')}
                      </button>
                    )}
                    {e.mine && !e.remote && e.sync !== 'shared' && e.sync !== 'sending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(e.id);
                            setEditText(e.message);
                          }}
                        >
                          {tx('edit')}
                        </button>
                        <button type="button" className="danger" onClick={() => remove(e.id)}>
                          {tx('del')}
                        </button>
                      </>
                    )}
                  </footer>
                </div>
              </article>
            ))}
            {total === 0 && <p className="gb-empty">{tx('empty')}</p>}
            {total > 0 && all.length === 1 && q && <p className="gb-empty">{tx('noMatch')}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
