import { useMemo, useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { LoginGate } from '../components/LoginGate';
import { readStore, writeStore } from '../system/storage';

type Pane = 'all' | 'generator' | 'check' | 'security' | 'deleted';
interface Entry {
  id: string;
  site: string;
  user: string;
  pass: string;
  at: number;
  deleted?: boolean;
}

const KEY = 'mra-passwords-demo';
const WORDS = 'river apple cloud tiger maple orbit pixel lemon candle rocket forest ocean silver planet garden coffee violet thunder falcon harbor meadow canyon glacier ember lantern compass jasmine velvet summit breeze'.split(' ');

function rand(n: number) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}

function generate(len: number, digits: boolean, symbols: boolean, memorable: boolean): string {
  if (memorable) {
    const w = Array.from({ length: Math.max(3, Math.round(len / 6)) }, () => WORDS[rand(WORDS.length)]);
    w[rand(w.length)] = w[0].charAt(0).toUpperCase() + w[0].slice(1);
    return w.join('-') + (digits ? String(rand(90) + 10) : '') + (symbols ? '!@#$%&*?'[rand(8)] : '');
  }
  let chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  if (digits) chars += '23456789';
  if (symbols) chars += '!@#$%^&*()-_=+?';
  return Array.from({ length: len }, () => chars[rand(chars.length)]).join('');
}

/** Rough entropy (bits) from character pool size — a common estimate. */
function strength(p: string) {
  if (!p) return { bits: 0, label: 'Empty', score: 0, crack: '—' };
  let pool = 0;
  if (/[a-z]/.test(p)) pool += 26;
  if (/[A-Z]/.test(p)) pool += 26;
  if (/\d/.test(p)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(p)) pool += 33;
  let bits = p.length * Math.log2(Math.max(pool, 1));
  if (/^(password|qwerty|123456|letmein|admin|welcome)/i.test(p)) bits = Math.min(bits, 10);
  if (/(.)\1\1/.test(p)) bits *= 0.8;
  const secs = 2 ** bits / 1e10; // 10 billion guesses / second (offline attack)
  const crack =
    secs < 1 ? 'instantly' : secs < 3600 ? `${Math.round(secs / 60) || 1} minutes` : secs < 86400 * 365 ? `${Math.round(secs / 86400) || 1} days` : secs < 3.15e7 * 1e6 ? `${Math.round(secs / 3.15e7).toLocaleString()} years` : 'millions of years';
  const score = bits < 28 ? 1 : bits < 45 ? 2 : bits < 65 ? 3 : 4;
  return { bits: Math.round(bits), label: ['Empty', 'Weak', 'Fair', 'Strong', 'Very strong'][score], score, crack };
}

const NAV: { id: Pane; label: string; color: string; glyph: string }[] = [
  { id: 'all', label: 'All', color: '#0a84ff', glyph: '🔑' },
  { id: 'generator', label: 'Generator', color: '#34c759', glyph: '✨' },
  { id: 'check', label: 'Check a Password', color: '#ff9f0a', glyph: '🛡' },
  { id: 'security', label: 'Security Tips', color: '#ff453a', glyph: '⚠︎' },
  { id: 'deleted', label: 'Recently Deleted', color: '#8e8e93', glyph: '🗑' },
];

export default function PasswordsApp() {
  return <LoginGate id="passwords" title="Passwords" icon="passwords">{(lock) => <PasswordsInner lock={lock} />}</LoginGate>;
}

function PasswordsInner({ lock }: { lock: () => void }) {
  const [pane, setPane] = useState<Pane>('generator');
  const [len, setLen] = useState(20);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [memorable, setMemorable] = useState(false);
  const [pw, setPw] = useState(() => generate(20, true, true, false));
  const [check, setCheck] = useState('');
  const [copied, setCopied] = useState('');
  const [entries, setEntries] = useState<Entry[]>(() => readStore(KEY, { list: [] as Entry[] }).list);
  const [show, setShow] = useState<string | null>(null);
  const [site, setSite] = useState('');
  const [user, setUser] = useState('');

  const save = (list: Entry[]) => {
    setEntries(list);
    writeStore(KEY, { list });
  };
  const copy = async (v: string, id: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(id);
      window.setTimeout(() => setCopied(''), 1400);
    } catch {
      /* ignore */
    }
  };
  const regen = (o?: Partial<{ len: number; digits: boolean; symbols: boolean; memorable: boolean }>) => {
    const v = { len, digits, symbols, memorable, ...o };
    setPw(generate(v.len, v.digits, v.symbols, v.memorable));
  };
  const gs = useMemo(() => strength(pw), [pw]);
  const cs = useMemo(() => strength(check), [check]);
  const live = entries.filter((e) => !e.deleted);
  const deleted = entries.filter((e) => e.deleted);

  const meter = (s: ReturnType<typeof strength>) => (
    <div className="pw-meter">
      <div className="pw-bars">
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= s.score ? `on s${s.score}` : ''} />
        ))}
      </div>
      <span>
        <b>{s.label}</b> · ~{s.bits} bits · cracked {s.crack === 'instantly' ? 'instantly' : `in about ${s.crack}`}*
      </span>
    </div>
  );

  const list = (items: Entry[], trash: boolean) =>
    items.length ? (
      <div className="pw-list">
        {items.map((e) => (
          <div key={e.id} className="pw-row">
            <span className="pw-site-ico">{e.site.charAt(0).toUpperCase()}</span>
            <span className="pw-row-main">
              <b>{e.site}</b>
              <small>{e.user || '—'}</small>
            </span>
            <code>{show === e.id ? e.pass : '••••••••••'}</code>
            {!trash && (
              <>
                <button type="button" className="pw-mini" onClick={() => setShow(show === e.id ? null : e.id)}>
                  {show === e.id ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="pw-mini" onClick={() => void copy(e.pass, e.id)}>
                  {copied === e.id ? 'Copied ✓' : 'Copy'}
                </button>
              </>
            )}
            <button type="button" className="pw-mini" onClick={() => save(trash ? entries.map((x) => (x.id === e.id ? { ...x, deleted: false } : x)) : entries.map((x) => (x.id === e.id ? { ...x, deleted: true } : x)))}>
              {trash ? 'Recover' : 'Delete'}
            </button>
            {trash && (
              <button type="button" className="pw-mini danger" onClick={() => save(entries.filter((x) => x.id !== e.id))}>
                Erase
              </button>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="pw-empty">{trash ? 'No recently deleted passwords.' : 'No saved demo passwords yet — generate one and save it.'}</p>
    );

  return (
    <div className="pw">
      <aside className="pw-side">
        <DragBar className="pw-drag">
          <Lights />
        </DragBar>
        <div className="pw-tiles">
          {NAV.map((n) => (
            <button key={n.id} type="button" className={`pw-tile ${pane === n.id ? 'on' : ''}`} style={{ ['--c' as string]: n.color }} onClick={() => setPane(n.id)}>
              <span className="pw-tile-ico">{n.glyph}</span>
              <b>{n.id === 'all' ? live.length : n.id === 'deleted' ? deleted.length : ''}</b>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="pw-main scroll-smooth">
        <DragBar className="pw-drag main">
          <button type="button" className="gate-lock-btn" onClick={lock} title="Lock Passwords">
            🔒 Lock
          </button>
        </DragBar>
        <div className="pw-body fade-swap" key={pane}>
          {pane === 'generator' && (
            <>
              <h2>Password Generator</h2>
              <div className="pw-card">
                <div className="pw-gen">
                  <code className="pw-out">{pw}</code>
                  <button type="button" className="btn" onClick={() => regen()} aria-label="Generate another">
                    ↻
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => void copy(pw, 'gen')}>
                    {copied === 'gen' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                {meter(gs)}
                <div className="pw-opts">
                  <label>
                    Length <b>{len}</b>
                    <input type="range" min={8} max={48} value={len} onChange={(e) => (setLen(+e.target.value), regen({ len: +e.target.value }))} />
                  </label>
                  {(
                    [
                      ['Digits', digits, (v: boolean) => (setDigits(v), regen({ digits: v }))],
                      ['Symbols', symbols, (v: boolean) => (setSymbols(v), regen({ symbols: v }))],
                      ['Memorable words', memorable, (v: boolean) => (setMemorable(v), regen({ memorable: v }))],
                    ] as [string, boolean, (v: boolean) => void][]
                  ).map(([l, v, f]) => (
                    <label key={l} className="pw-check">
                      <input type="checkbox" checked={v} onChange={(e) => f(e.target.checked)} /> {l}
                    </label>
                  ))}
                </div>
              </div>
              <h3>Save as a demo entry</h3>
              <form
                className="pw-card pw-save"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!site.trim()) return;
                  save([{ id: `p${Date.now()}`, site: site.trim(), user: user.trim(), pass: pw, at: Date.now() }, ...entries]);
                  setSite('');
                  setUser('');
                  setPane('all');
                }}
              >
                <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="Website (e.g. example.com)" aria-label="Website" />
                <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Username (optional)" aria-label="Username" />
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </form>
              <p className="pw-note">Demo only: entries are stored in this browser only. Please don’t save your real passwords here — use your device’s password manager.</p>
            </>
          )}
          {pane === 'all' && (
            <>
              <h2>All Passwords</h2>
              {list(live, false)}
              <p className="pw-note">Stored only in this browser (demo). Don’t save real passwords here.</p>
            </>
          )}
          {pane === 'deleted' && (
            <>
              <h2>Recently Deleted</h2>
              {list(deleted, true)}
            </>
          )}
          {pane === 'check' && (
            <>
              <h2>Check a Password</h2>
              <div className="pw-card">
                <input className="pw-check-in" type="password" value={check} onChange={(e) => setCheck(e.target.value)} placeholder="Type a password to test its strength" aria-label="Password to check" autoComplete="off" />
                {meter(cs)}
                <ul className="pw-hints">
                  <li className={check.length >= 14 ? 'ok' : ''}>At least 14 characters</li>
                  <li className={/[A-Z]/.test(check) && /[a-z]/.test(check) ? 'ok' : ''}>Upper- and lower-case letters</li>
                  <li className={/\d/.test(check) ? 'ok' : ''}>A number</li>
                  <li className={/[^a-zA-Z0-9]/.test(check) ? 'ok' : ''}>A symbol</li>
                </ul>
              </div>
              <p className="pw-note">What you type here never leaves this page — it isn’t saved or sent anywhere. *Estimates assume an offline attack at 10 billion guesses per second.</p>
            </>
          )}
          {pane === 'security' && (
            <>
              <h2>Security Tips</h2>
              <div className="pw-card pw-tips">
                {[
                  ['Use a unique password for every site', 'If one site leaks, your other accounts stay safe.'],
                  ['Prefer long passphrases', 'Four or more random words beat short, complex passwords.'],
                  ['Turn on two-factor authentication', 'A code or passkey stops most account takeovers.'],
                  ['Use a password manager', 'Let your device remember strong passwords for you.'],
                  ['Watch out for phishing', 'Check the address bar before typing a password.'],
                  ['Use passkeys where offered', 'Passkeys can’t be phished or reused.'],
                ].map(([t, d]) => (
                  <div key={t}>
                    <b>{t}</b>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
