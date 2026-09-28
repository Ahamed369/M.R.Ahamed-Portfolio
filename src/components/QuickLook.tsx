import { useEffect, useLayoutEffect, useRef } from 'react';
import { AppIcon, type IconName } from './AppIcons';
import { useSystem } from '../system/SystemContext';
import { useSettings } from '../system/SettingsContext';

/**
 * macOS-style Quick Look. Zooms out of the element it was opened from.
 * Space or Escape closes; ← / → move between images.
 */
export function QuickLook() {
  const sys = useSystem();
  const { motionReduced } = useSettings();
  const ql = sys.quickLook;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ql) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        sys.setQuickLook(null);
      } else if (ql.kind === 'images' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const n = ql.items.length;
        sys.setQuickLook({ ...ql, origin: null, index: (ql.index + (e.key === 'ArrowRight' ? 1 : -1) + n) % n });
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ql, sys]);

  // zoom from the source thumbnail (FLIP)
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el || !ql?.origin || motionReduced) return;
    const to = el.getBoundingClientRect();
    const o = ql.origin;
    const sx = o.width / to.width;
    const sy = o.height / to.height;
    el.animate(
      [
        { transform: `translate(${o.left + o.width / 2 - (to.left + to.width / 2)}px, ${o.top + o.height / 2 - (to.top + to.height / 2)}px) scale(${sx}, ${sy})`, opacity: 0.4 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' },
    );
  }, [ql, motionReduced]);

  if (!ql) return null;
  const item = ql.kind === 'images' ? ql.items[ql.index] : null;

  return (
    <div className="ql-backdrop" onPointerDown={(e) => e.target === e.currentTarget && sys.setQuickLook(null)}>
      <div className={`ql-panel ${ql.kind}`} ref={panelRef} role="dialog" aria-label={item ? item.title : ql.kind === 'info' ? ql.title : 'Quick Look'}>
        <div className="ql-bar">
          <button type="button" className="ql-close" aria-label="Close Quick Look" onClick={() => sys.setQuickLook(null)}>
            ✕
          </button>
          <span className="ql-title">{item ? item.title : ql.kind === 'info' ? ql.title : ''}</span>
          {item && (
            <span className="ql-count">
              {ql.kind === 'images' && `${ql.index + 1} of ${ql.items.length}`}
            </span>
          )}
        </div>
        {ql.kind === 'images' && item && (
          <div className="ql-image">
            <img key={item.src} src={item.src} alt={item.title} />
            {ql.items.length > 1 && (
              <>
                <button type="button" className="ql-nav prev" aria-label="Previous" onClick={() => sys.setQuickLook({ ...ql, origin: null, index: (ql.index - 1 + ql.items.length) % ql.items.length })}>
                  ‹
                </button>
                <button type="button" className="ql-nav next" aria-label="Next" onClick={() => sys.setQuickLook({ ...ql, origin: null, index: (ql.index + 1) % ql.items.length })}>
                  ›
                </button>
              </>
            )}
            {item.caption && <div className="ql-caption">{item.caption}</div>}
          </div>
        )}
        {ql.kind === 'info' && (
          <div className="ql-info">
            {ql.icon && (
              <span className="ql-info-ico">
                <AppIcon name={ql.icon as IconName} />
              </span>
            )}
            <h3>{ql.title}</h3>
            {ql.text && <p>{ql.text}</p>}
            <dl>
              {ql.rows.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
