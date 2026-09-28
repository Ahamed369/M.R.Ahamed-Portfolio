import { memo, useEffect, useState } from 'react';
import { wallpaperById, wallpapers } from '../data/media';

/**
 * Desktop wallpaper — original artwork stored as image files in
 * public/assets/wallpapers. Switching cross-fades (with a soft blur) between
 * the previous and the new image. In Dark Mode the wallpaper gets the
 * graphite tint seen in the reference (can be turned off in Settings).
 */
export const Wallpaper = memo(function Wallpaper({ id, tint, custom }: { id: string; tint: boolean; custom?: string }) {
  const current = wallpaperById(id);
  const [layers, setLayers] = useState<string[]>([current.id]);
  const [, tick] = useState(0);
  useEffect(() => {
    if (id !== 'dynamic') return;
    const t = window.setInterval(() => tick((x) => x + 1), 60000);
    return () => window.clearInterval(t);
  }, [id]);

  useEffect(() => {
    setLayers((l) => (l[l.length - 1] === current.id ? l : [...l.filter((x) => x !== current.id), current.id].slice(-2)));
  }, [current.id]);

  return (
    <div className={`wallpaper ${tint ? 'tint' : ''}`} aria-hidden="true">
      {layers.map((w) => {
        const def = wallpaperById(w);
        return <img key={w === 'custom' ? `custom-${custom ?? ''}`.slice(0, 80) + (custom?.length ?? 0) : w} className={`wallpaper-layer ${w === current.id ? 'on' : 'off'}`} src={def.src} alt="" decoding="async" draggable={false} />;
      })}
    </div>
  );
});

/** Small thumbnail for System Settings / context menus. */
export function WallpaperThumb({ id }: { id: string }) {
  const def = wallpaperById(id);
  return (
    <div className="wp-thumb">
      <img src={def.thumb} alt="" loading="lazy" draggable={false} />
    </div>
  );
}

export { wallpapers };
