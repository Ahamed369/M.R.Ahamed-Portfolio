import { useState, type FormEvent, type ReactNode } from 'react';
import { AppIcon, type IconName } from './AppIcons';
import { DragBar, Lights } from './Window';
import { integrations } from '../data/portfolio';
import { notify } from '../system/notify';

const SKEY = (id: string) => `mra-unlocked-${id}`;
export function isUnlocked(id: string): boolean {
  try {
    return sessionStorage.getItem(SKEY(id)) === '1';
  } catch {
    return false;
  }
}
export function relock(id: string) {
  try {
    sessionStorage.removeItem(SKEY(id));
  } catch {
    /* ignore */
  }
}

/**
 * v8 — demo username + password screen shown before an app opens
 * (Wallet, Passwords). The demo credentials are shown on screen — this is a
 * portfolio demonstration, so visitors should never type a real password.
 */
export function LoginGate({ id, title, icon, children }: { id: string; title: string; icon: IconName; children: (lock: () => void) => ReactNode }) {
  const [ok, setOk] = useState(() => isUnlocked(id));
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(0);
  const [show, setShow] = useState(false);

  const lock = () => {
    relock(id);
    setOk(false);
    setPass('');
    notify({ app: title, icon, title: `${title} locked` });
  };
  if (ok) return <>{children(lock)}</>;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (user.trim().toLowerCase() === integrations.demoUser.toLowerCase() && pass === integrations.demoPassword) {
      try {
        sessionStorage.setItem(SKEY(id), '1');
      } catch {
        /* ignore */
      }
      setErr('');
      setOk(true);
      notify({ app: title, icon, title: `${title} unlocked`, body: `Signed in as ${integrations.demoUser} (demo)` });
    } else {
      setErr('Incorrect username or password. Use the demo login shown below.');
      setShake((s) => s + 1);
    }
  };

  return (
    <div className="gate">
      <DragBar className="gate-drag">
        <Lights />
      </DragBar>
      <form className={`gate-card ${shake ? 'shake' : ''}`} key={shake} onSubmit={submit} noValidate>
        <span className="gate-ico">
          <AppIcon name={icon} />
        </span>
        <h2>{title} is locked</h2>
        <p>Sign in with the demo account to continue.</p>
        <label className="gate-field">
          <span>Username</span>
          <input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Username" autoFocus />
        </label>
        <label className="gate-field">
          <span>Password</span>
          <span className="gate-pw">
            <input type={show ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" placeholder="Password" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>
        {err && (
          <div className="gate-err" role="alert">
            {err}
          </div>
        )}
        <button type="submit" className="gate-btn">
          Unlock
        </button>
        <div className="gate-demo">
          <span>
            Demo login — username <code>{integrations.demoUser}</code> · password <code>{integrations.demoPassword}</code>
          </span>
          <button
            type="button"
            className="gate-fill"
            onClick={() => {
              setUser(integrations.demoUser);
              setPass(integrations.demoPassword);
              setErr('');
            }}
          >
            Fill demo login
          </button>
        </div>
        <small className="gate-warn">🔒 Demo only — never enter a real password here.</small>
      </form>
    </div>
  );
}
