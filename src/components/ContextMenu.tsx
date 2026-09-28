import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSystem } from '../system/SystemContext';

/** Right-click menu that scales/fades in from the pointer position. */
export function ContextMenu() {
  const sys = useSystem();
  const menu = sys.contextMenu;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, ox: 'left', oy: 'top' });
  const [sub, setSub] = useState<number | null>(null);
  useEffect(() => setSub(null), [menu]);

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const flipX = menu.x + r.width > window.innerWidth - 6;
    const flipY = menu.y + r.height > window.innerHeight - 6;
    setPos({ x: flipX ? menu.x - r.width : menu.x, y: flipY ? menu.y - r.height : menu.y, ox: flipX ? 'right' : 'left', oy: flipY ? 'bottom' : 'top' });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof PointerEvent && ref.current?.contains(e.target as Node)) return;
      sys.setContextMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && sys.setContextMenu(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu, sys]);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }, [menu]);

  if (!menu) return null;
  return (
    <div
      ref={ref}
      className="ctx-menu"
      role="menu"
      style={{ left: pos.x, top: pos.y, transformOrigin: `${pos.oy} ${pos.ox}` }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const btns = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>(':scope > button:not(:disabled), :scope > .ctx-sub-wrap > button:not(:disabled)') ?? []);
        const i = btns.indexOf(document.activeElement as HTMLButtonElement);
        btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length]?.focus();
      }}
    >
      {menu.items.map((it, i) =>
        it.sep ? (
          <div key={i} className="mb-sep" role="separator" />
        ) : it.submenu ? (
          <div key={i} className="ctx-sub-wrap" onPointerEnter={() => setSub(i)} onPointerLeave={() => setSub((x) => (x === i ? null : x))}>
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={sub === i}
              className={`mb-item ctx-has-sub ${sub === i ? 'open' : ''}`}
              disabled={it.disabled}
              onClick={() => setSub((x) => (x === i ? null : i))}
              onKeyDown={(e) => e.key === 'ArrowRight' && (setSub(i), window.setTimeout(() => ref.current?.querySelector<HTMLButtonElement>('.ctx-sub button')?.focus(), 0))}
            >
              <span className="check" />
              {it.label}
              <span className="ctx-arrow">›</span>
            </button>
            {sub === i && (
              <div className={`ctx-menu ctx-sub ${pos.ox === 'right' || pos.x + 440 > window.innerWidth ? 'left' : ''}`} role="menu">
                {it.submenu.map((sit, j) =>
                  sit.sep ? (
                    <div key={j} className="mb-sep" role="separator" />
                  ) : (
                    <button
                      key={j}
                      type="button"
                      role="menuitem"
                      className="mb-item"
                      disabled={sit.disabled}
                      onKeyDown={(e) => e.key === 'ArrowLeft' && setSub(null)}
                      onClick={() => {
                        sys.setContextMenu(null);
                        sit.action?.();
                      }}
                    >
                      <span className="check">{sit.checked ? '✓' : ''}</span>
                      {sit.label}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            className="mb-item"
            disabled={it.disabled}
            onClick={() => {
              sys.setContextMenu(null);
              it.action?.();
            }}
          >
            <span className="check">{it.checked ? '✓' : ''}</span>
            {it.label}
          </button>
        ),
      )}
    </div>
  );
}
