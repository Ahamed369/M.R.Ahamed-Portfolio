import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon, type IconName } from './AppIcons';
import { settingsApi } from '../system/SettingsContext';
import { playAlert } from '../system/sounds';

/** macOS-style confirmation ("Are you sure you want to delete …?") — Cancel / Delete. */
export function ConfirmDialog({
  icon,
  message,
  detail,
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
}: {
  icon: IconName;
  message: string;
  detail?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const okRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  useEffect(() => {
    // v10.3 — macOS plays the chosen alert sound when a dialog asks you something (Settings → Sound → Alert sound)
    const st = settingsApi.get();
    if (st.uiSounds !== false) playAlert(st.alertSound || 'Boop', st.alertVolume ?? 0.5);
    okRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        cancelRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return createPortal(
    <div
      className="cf-scrim"
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onCancel();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cf" role="alertdialog" aria-modal="true" aria-label={message}>
        <span className="cf-icon">
          <AppIcon name={icon} />
        </span>
        <div className="cf-body">
          <p className="cf-msg">{message}</p>
          {detail && <p className="cf-detail">{detail}</p>}
          <div className="cf-actions">
            <button type="button" className="cf-btn" onClick={onCancel}>
              Cancel
            </button>
            <button ref={okRef} type="button" className={`cf-btn primary ${/delete|remove|erase|empty|reset/i.test(confirmLabel) ? 'destructive' : ''}`} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
