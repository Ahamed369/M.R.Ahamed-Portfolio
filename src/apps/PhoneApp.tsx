import { useState } from 'react';
import { DragBar, Lights } from '../components/Window';
import { personal } from '../data/portfolio';
import { startCall } from '../system/call';
import { usePersisted } from '../system/useStore';
import { useWM } from '../system/WindowManager';
import { playTick } from '../system/sounds';
import type { AppProps } from '../components/Desktop';

type Tab = 'favorites' | 'recents' | 'contacts' | 'keypad' | 'voicemail';
interface Recent {
  id: string;
  number: string;
  name?: string;
  at: number;
  kind: 'out' | 'demo';
}

const KEYS: [string, string][] = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', ''],
];
const digits = (s: string) => s.replace(/[^\d+*#]/g, '');
const HIS = digits(personal.phoneHref.replace('tel:', ''));

const Glyph = {
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" />,
  clock: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm.8 4.5v4.9l3.6 2.1-.8 1.3-4.4-2.6V7.5z" />,
  person: <path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zm0 1.8c-3.9 0-7.5 2-7.5 4.6V20h15v-1.6c0-2.6-3.6-4.6-7.5-4.6z" />,
  grid: (
    <>
      {[5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.2" />))}
    </>
  ),
  vm: <path d="M6.5 8a4 4 0 1 0 3.2 6.4h4.6A4 4 0 1 0 17.5 8a4 4 0 0 0-3.2 6.4H9.7A4 4 0 0 0 6.5 8zm0 1.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zm11 0a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z" />,
};

/**
 * v10 — Phone (iPhone Dock app; also opens on the Mac like the Phone app in macOS Tahoe).
 * Calls to M.R. Ahamed's real number open your own phone app (tel:) or a demo call
 * inside the portfolio; any other number places a demo call only.
 */
export default function PhoneApp({ win }: AppProps) {
  const wm = useWM();
  const [tab, setTab] = useState<Tab>((win.args?.tab as Tab) || 'keypad');
  const [num, setNum] = useState('');
  const [recents, setRecents] = usePersisted<Recent[]>('mra-phone-recents', []);
  const [ask, setAsk] = useState<string | null>(null);

  const call = (number: string, name?: string) => {
    if (!digits(number)) return;
    if (digits(number).endsWith(HIS.slice(-9))) {
      setAsk(number);
      return;
    }
    setRecents((r) => [{ id: `c${Date.now()}`, number, name, at: Date.now(), kind: 'demo' as const }, ...r].slice(0, 40));
    startCall({ app: 'facetime', video: false });
  };
  const press = (k: string) => {
    playTick();
    setNum((n) => (n + k).slice(0, 18));
  };

  return (
    <div className="ph10">
      <DragBar className="ph10-bar">
        <Lights />
        <b className="ph10-title">{{ favorites: 'Favorites', recents: 'Recents', contacts: 'Contacts', keypad: '', voicemail: 'Voicemail' }[tab]}</b>
      </DragBar>

      <div className="ph10-body">
        {tab === 'keypad' && (
          <div className="ph10-keypad">
            <div className="ph10-num" aria-live="polite">
              {num || <span className="ph10-ph"> </span>}
            </div>
            {num && digits(num).endsWith(HIS.slice(-9)) && <button className="ph10-match" type="button" onClick={() => setTab('contacts')}>{personal.name}</button>}
            <div className="ph10-keys">
              {KEYS.map(([k, l]) => (
                <button key={k} type="button" className="ph10-key" onClick={() => press(k)} aria-label={k}>
                  <b>{k}</b>
                  {l && <small>{l}</small>}
                </button>
              ))}
              <span />
              <button type="button" className="ph10-call" aria-label="Call" onClick={() => call(num)}>
                <svg viewBox="0 0 24 24" width="30" height="30">
                  <path fill="#fff" d="M6.6 3.5 9.3 3l1.6 4-2 1.4a11 11 0 0 0 6.7 6.7l1.4-2 4 1.6-.5 2.7c-.2 1-1.1 1.6-2.1 1.6C10.8 19 5 13.2 5 5.6c0-1 .6-1.9 1.6-2.1Z" />
                </svg>
              </button>
              {num ? (
                <button type="button" className="ph10-del" aria-label="Delete digit" onClick={() => setNum((n) => n.slice(0, -1))}>
                  ⌫
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        )}

        {tab === 'contacts' && (
          <div className="ph10-list">
            <div className="ph10-me">
              <img src={personal.avatar} alt="" />
              <div>
                <b>{personal.name}</b>
                <small>{personal.shortTitle}</small>
              </div>
            </div>
            <button type="button" className="ph10-row" onClick={() => call(personal.phone, personal.name)}>
              <span className="ph10-av">MA</span>
              <span>
                <b>{personal.name}</b>
                <small>mobile · {personal.phone}</small>
              </span>
            </button>
            <button type="button" className="ph10-row" onClick={() => wm.open('contacts')}>
              <span className="ph10-av alt">＋</span>
              <span>
                <b>Open Contacts</b>
                <small>Full contact card, email and socials</small>
              </span>
            </button>
          </div>
        )}

        {tab === 'favorites' && (
          <div className="ph10-list">
            <button type="button" className="ph10-row" onClick={() => call(personal.phone, personal.name)}>
              <img className="ph10-av" src={personal.avatar} alt="" />
              <span>
                <b>{personal.name}</b>
                <small>mobile</small>
              </span>
              <i className="ph10-i">ⓘ</i>
            </button>
            <button type="button" className="ph10-row" onClick={() => startCall({ app: 'facetime', video: true })}>
              <img className="ph10-av" src={personal.avatar} alt="" />
              <span>
                <b>{personal.name}</b>
                <small>FaceTime video · demo</small>
              </span>
            </button>
          </div>
        )}

        {tab === 'recents' && (
          <div className="ph10-list">
            {!recents.length && <p className="ph10-empty">No recent calls. Calls you place here are kept only in this browser.</p>}
            {recents.map((r) => (
              <button key={r.id} type="button" className="ph10-row" onClick={() => call(r.number, r.name)}>
                <span className="ph10-av alt">📞</span>
                <span>
                  <b>{r.name ?? r.number}</b>
                  <small>{r.kind === 'demo' ? 'Demo call' : 'Outgoing'}</small>
                </span>
                <time>{new Date(r.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</time>
              </button>
            ))}
            {recents.length > 0 && (
              <button type="button" className="ph10-clear" onClick={() => setRecents([])}>
                Clear Recents
              </button>
            )}
          </div>
        )}

        {tab === 'voicemail' && <p className="ph10-empty big">No Voicemail</p>}
      </div>

      <nav className="ph10-tabs" aria-label="Phone">
        {(
          [
            ['favorites', 'Favorites', Glyph.star],
            ['recents', 'Recents', Glyph.clock],
            ['contacts', 'Contacts', Glyph.person],
            ['keypad', 'Keypad', Glyph.grid],
            ['voicemail', 'Voicemail', Glyph.vm],
          ] as const
        ).map(([id, label, g]) => (
          <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)} aria-current={tab === id}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
              {g}
            </svg>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {ask && (
        <div className="ios-alert-back" onClick={() => setAsk(null)}>
          <div className="ios-alert" role="alertdialog" aria-label={`Call ${personal.name}`} onClick={(e) => e.stopPropagation()}>
            <b>Call {personal.name}?</b>
            <p>“Call with your phone” uses your own phone app to dial {personal.phone}. “Demo call” stays inside the portfolio.</p>
            <a
              className="ios-alert-btn strong"
              href={personal.phoneHref}
              onClick={() => {
                setRecents((r) => [{ id: `c${Date.now()}`, number: ask, name: personal.name, at: Date.now(), kind: 'out' as const }, ...r].slice(0, 40));
                setAsk(null);
              }}
            >
              Call with your phone
            </a>
            <button
              type="button"
              className="ios-alert-btn"
              onClick={() => {
                setRecents((r) => [{ id: `c${Date.now()}`, number: ask, name: personal.name, at: Date.now(), kind: 'demo' as const }, ...r].slice(0, 40));
                setAsk(null);
                startCall({ app: 'facetime', video: false });
              }}
            >
              Demo call
            </button>
            <button type="button" className="ios-alert-btn" onClick={() => setAsk(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
