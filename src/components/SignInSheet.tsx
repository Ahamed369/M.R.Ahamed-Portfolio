import { useEffect, useRef, useState } from 'react';
import { AppIcon } from './AppIcons';
import { loadGsi, onSignInRequest, renderGoogleButton, setAccount, type SignInRequest } from '../system/account';
import { integrations } from '../data/portfolio';

/**
 * v8 — "Sign in to continue" sheet shown before protected actions.
 * Offers the Portfolio ID demo account and — when a Google Client ID is
 * configured — Google's official "Sign in with Google" button.
 */
export function SignInSheet() {
  const [req, setReq] = useState<SignInRequest | null>(null);
  const [name, setName] = useState('');
  const [gsi, setGsi] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const gRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef<SignInRequest | null>(null);
  reqRef.current = req;

  useEffect(
    () =>
      onSignInRequest((r) => {
        reqRef.current?.resolve(false);
        setName('');
        setReq(r);
      }),
    [],
  );

  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };

  useEffect(() => {
    if (!req || !integrations.googleClientId) return;
    setGsi('loading');
    let alive = true;
    void loadGsi().then((ok) => {
      if (!alive) return;
      if (!ok || !gRef.current) {
        setGsi('failed');
        return;
      }
      renderGoogleButton(gRef.current, integrations.googleClientId, (a) => {
        setAccount(a);
        reqRef.current?.resolve(true);
        setReq(null);
      });
      setGsi('ready');
    });
    return () => {
      alive = false;
    };
  }, [req]);

  useEffect(() => {
    if (!req) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!req) return null;
  const portfolio = () => {
    setAccount({ kind: 'portfolio', name: name.trim() || 'Guest', since: Date.now() });
    close(true);
  };
  return (
    <div className="share-back" onPointerDown={(e) => e.target === e.currentTarget && close(false)}>
      <div className="signin-sheet" role="dialog" aria-modal="true" aria-labelledby="signin-h">
        <span className="signin-ico">
          <AppIcon name="contacts" />
        </span>
        <h2 id="signin-h">Sign in to continue</h2>
        <p className="signin-reason">{req.reason}</p>

        <div className="signin-block">
          <b>Portfolio ID</b>
          <span>A demo account for this portfolio — no password, stored only in your browser.</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" aria-label="Your name" autoFocus onKeyDown={(e) => e.key === 'Enter' && portfolio()} />
          <button type="button" className="signin-primary" onClick={portfolio}>
            Continue with Portfolio ID
          </button>
        </div>

        <div className="signin-or">
          <span>or</span>
        </div>

        {integrations.googleClientId ? (
          <div className="signin-google">
            <div ref={gRef} className="signin-gbtn" />
            {gsi === 'loading' && <span className="signin-note">Loading Google sign-in…</span>}
            {gsi === 'failed' && <span className="signin-note">Google sign-in couldn’t load (offline or blocked). Use Portfolio ID instead.</span>}
            <span className="signin-note">Google shows its own secure sign-in window — this portfolio never sees your password.</span>
          </div>
        ) : (
          <div className="signin-google off">
            <button type="button" className="signin-gdisabled" disabled>
              <AppIcon name="google" /> Sign in with Google
            </button>
            <span className="signin-note">Google sign-in isn’t configured on this copy of the portfolio yet (the owner adds a Google Client ID). Portfolio ID works right away.</span>
          </div>
        )}
        <button type="button" className="signin-cancel" onClick={() => close(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
