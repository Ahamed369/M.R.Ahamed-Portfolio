import { useMemo, useState } from 'react';
import { encodeQR, qrPath } from '../system/qr';

/** v10.2 — a real, scannable QR code (rendered as SVG, no network). */
export function QRCode({ text, size = 220, label }: { text: string; size?: number; label?: string }) {
  const q = useMemo(() => encodeQR(text, 'M'), [text]);
  const n = q.size + 8;
  return (
    <svg className="qr-svg" viewBox={`0 0 ${n} ${n}`} width={size} height={size} role="img" aria-label={label ?? 'QR code'} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      <path d={qrPath(q)} fill="#000" />
    </svg>
  );
}

export function QRSheet({ title, text, caption, onClose }: { title: string; text: string; caption: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="qr-sheet-back" onClick={(e) => (e.stopPropagation(), onClose())}>
      <div className="qr-sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <b>{title}</b>
        <QRCode text={text} label={title} />
        <p>{caption}</p>
        <div className="qr-sheet-btns">
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard
                ?.writeText(text)
                .then(() => setCopied(true))
                .catch(() => setCopied(false))
            }
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button type="button" className="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
