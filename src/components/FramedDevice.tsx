import { useEffect, useState } from 'react';
import { useSettings } from '../system/SettingsContext';
import { chooseView, type DeviceMode } from '../system/ios';

const SIZE: Record<'iphone' | 'ipad', { w: number; h: number; r: number; b: number }> = {
  iphone: { w: 402, h: 874, r: 54, b: 11 },
  ipad: { w: 1180, h: 820, r: 30, b: 16 },
};

/** URL of the embedded device view (keeps the current #/app/… link) */
export function deviceUrl(mode: 'iphone' | 'ipad', hash = location.hash) {
  const u = new URL(location.href);
  u.searchParams.set('view', mode);
  u.searchParams.set('embed', '1');
  u.hash = hash;
  return u.pathname + u.search + u.hash;
}

/**
 * v10 — on a computer, "View as iPhone / iPad" shows a real phone-sized view in a
 * device frame (an embedded copy of the portfolio), so every app uses its true
 * phone or tablet layout. Settings, notes and everything else are shared.
 */
export function FramedDevice({ mode }: { mode: Exclude<DeviceMode, 'mac'> }) {
  const { update } = useSettings();
  const d = SIZE[mode];
  const fit = () => Math.min(1, (window.innerHeight - 90) / (d.h + d.b * 2), (window.innerWidth - 40) / (d.w + d.b * 2));
  const [scale, setScale] = useState(fit);
  const [src] = useState(() => deviceUrl(mode));
  useEffect(() => {
    const on = () => setScale(fit());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  return (
    <div className="ios-stage has-frame dev-stage">
      <div className="ios-viewas" role="group" aria-label="View as">
        {(['mac', 'iphone', 'ipad'] as const).map((m) => (
          <button key={m} type="button" className={mode === m ? 'on' : ''} onClick={() => chooseView(update, m)}>
            {m === 'mac' ? 'Mac' : m === 'iphone' ? 'iPhone' : 'iPad'}
          </button>
        ))}
        <button type="button" onClick={() => window.dispatchEvent(new Event('mra-classic'))}>
          Quick View
        </button>
      </div>
      <div className="dev-scale" style={{ width: (d.w + d.b * 2) * scale, height: (d.h + d.b * 2) * scale }}>
        <div className={`dev-frame dev-${mode}`} style={{ width: d.w, height: d.h, borderRadius: d.r, borderWidth: d.b, transform: `scale(${scale})` }}>
          <iframe key={mode} title={mode === 'iphone' ? 'iPhone' : 'iPad'} src={src} allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen; autoplay" />
        </div>
      </div>
      <p className="dev-note">Showing the {mode === 'iphone' ? 'iPhone' : 'iPad'} version · it works exactly like on a real {mode === 'iphone' ? 'phone' : 'tablet'}</p>
    </div>
  );
}
