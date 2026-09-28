import { useEffect, useRef, useState } from 'react';
import { AppIcon, type IconName } from './AppIcons';
import { copyText, onShareSheet, SHARE_TARGETS, type SharePayload } from '../system/share';
import { notify } from '../system/notify';

/** v8 — macOS-style Share sheet (fallback when the Web Share API is unavailable). */
export function ShareSheet() {
  const [p, setP] = useState<SharePayload | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => onShareSheet((x) => (setCopied(false), setP(x))), []);
  useEffect(() => {
    if (!p) return;
    ref.current?.querySelector<HTMLElement>('button, a')?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setP(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [p]);
  if (!p) return null;
  const copy = async () => {
    const ok = await copyText(p.url);
    setCopied(ok);
    notify({ app: 'Share', icon: 'share', title: ok ? 'Link copied' : 'Copy failed', body: ok ? p.url : 'Select and copy the link manually.' });
  };
  return (
    <div className="share-back" onPointerDown={(e) => e.target === e.currentTarget && setP(null)}>
      <div ref={ref} className="share-sheet" role="dialog" aria-modal="true" aria-label="Share">
        <div className="share-head">
          <span className="share-ico">
            <AppIcon name="share" />
          </span>
          <div className="share-meta">
            <b>{p.title}</b>
            <span>{p.url}</span>
          </div>
          <button type="button" className="share-x" aria-label="Close" onClick={() => setP(null)}>
            ×
          </button>
        </div>
        <div className="share-grid">
          {SHARE_TARGETS.map((t) => (
            <a key={t.id} className="share-target" href={t.href(p)} target={t.href(p).startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" onClick={() => window.setTimeout(() => setP(null), 150)}>
              <span className="share-t-ico">
                <AppIcon name={t.icon as IconName} />
              </span>
              <span>{t.label}</span>
            </a>
          ))}
        </div>
        <div className="share-copy">
          <input readOnly value={p.url} aria-label="Link" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="share-copy-btn" onClick={() => void copy()}>
            {copied ? 'Copied ✓' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
