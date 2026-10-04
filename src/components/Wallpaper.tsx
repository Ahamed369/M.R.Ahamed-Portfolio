import { memo, useEffect, useState } from 'react';
import { isProcWall, wallpaperById, wallpapers, type WallpaperDef } from '../data/media';
import { ProcWall } from './ProcWall';

/** v10 — pick the wallpaper size that matches this screen (1920 / 2880 WebP, or the 4K original). */
export function wallSrc(def: WallpaperDef): string {
  const m = /assets\/wallpapers\/([^/]+)\.jpg$/.exec(def.src);
  if (!m) return def.src;
  const px = Math.max(window.screen.width, window.screen.height, window.innerWidth) * Math.min(2, window.devicePixelRatio || 1);
  if (px <= 2000) return `./assets/wallpapers/w1920/${m[1]}.webp`;
  if (px <= 3000) return `./assets/wallpapers/w2880/${m[1]}.webp`;
  return def.src;
}

function WallLayer({ def, on }: { def: WallpaperDef; on: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const src = wallSrc(def);
  if (isProcWall(def))
    return (
      <div className={`wallpaper-layer wl-v10 ${on ? 'on' : 'off'} ready`}>
        <ProcWall id={def.id} still={!on} />
      </div>
    );
  return (
    <div className={`wallpaper-layer wl-v10 ${on ? 'on' : 'off'} ${loaded ? 'ready' : ''}`}>
      {/* blurred thumbnail first, so nothing pops in */}
      {!loaded && <img className="wl-blur" src={def.thumb} alt="" decoding="async" draggable={false} />}
      <img className="wl-full" src={src} alt="" decoding="async" draggable={false} onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
    </div>
  );
}

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
        return <WallLayer key={w === 'custom' ? `custom-${custom ?? ''}`.slice(0, 80) + (custom?.length ?? 0) : `${w}-${def.src}`} def={def} on={w === current.id} />;
      })}
    </div>
  );
});

/** Small thumbnail for System Settings / context menus. */
export function WallpaperThumb({ id }: { id: string }) {
  return (
    <div className="wp-thumb">
      <WallImage id={id} thumb />
    </div>
  );
}

/** v10.2 — any wallpaper (photo or drawn) as a still picture: thumbnails, lock screens, previews */
export function WallImage({ id, thumb = false, className = '', live = false }: { id: string; thumb?: boolean; className?: string; live?: boolean }) {
  const def = wallpaperById(id);
  if (isProcWall(def))
    return (
      <span className={`wp-proc-thumb ${className}`}>
        <ProcWall id={def.id} still={!live} />
      </span>
    );
  return <img className={className} src={thumb ? def.thumb : wallSrc(def)} alt="" loading="lazy" draggable={false} />;
}

export { wallpapers };
