import { DEVICE_DEFAULT_WALL, wallFor, wallpaperById, type WallDevice } from '../data/media';
import { settingsApi } from './SettingsContext';
import type { Settings } from './types';

/** v10.2 — which device this view is (from the shell: <html data-device>) */
export function currentDevice(): WallDevice {
  const d = document.documentElement.dataset.device;
  return d === 'iphone' || d === 'ipad' ? d : 'mac';
}
export const wallKey = (dev: WallDevice): 'wallpaper' | 'wallIpad' | 'wallIphone' => (dev === 'mac' ? 'wallpaper' : dev === 'ipad' ? 'wallIpad' : 'wallIphone');

/** the Home Screen / Desktop wallpaper id for a device */
export function deviceWall(s: Settings, dev: WallDevice): string {
  if (dev === 'mac') return s.wallpaper;
  const v = dev === 'ipad' ? s.wallIpad : s.wallIphone;
  return v || DEVICE_DEFAULT_WALL[dev];
}
/** the Lock Screen wallpaper id for a device */
export function lockWallFor(s: Settings, dev: WallDevice): string {
  return s.lockWall?.[dev] || deviceWall(s, dev);
}

export function setDeviceWall(id: string, dev: WallDevice = currentDevice(), target: 'home' | 'lock' | 'both' = 'home') {
  const s = settingsApi.get();
  const patch: Partial<Settings> = {};
  if (target !== 'lock') (patch as Record<string, unknown>)[wallKey(dev)] = id;
  if (target !== 'home') patch.lockWall = { ...(s.lockWall ?? { mac: '', ipad: '', iphone: '' }), [dev]: target === 'both' ? '' : id };
  settingsApi.update(patch);
}

/** next / previous wallpaper for this device (Terminal, Assistant) — returns the new id */
export function nextWallpaper(step: 1 | -1, filter?: (id: string) => boolean): string {
  const dev = currentDevice();
  const list = wallFor(dev)
    .map((w) => w.id)
    .filter((id) => !filter || filter(id));
  const cur = deviceWall(settingsApi.get(), dev);
  const i = list.indexOf(cur);
  const id = list[(i + step + list.length) % list.length] ?? list[0];
  setDeviceWall(id, dev);
  return id;
}
export const wallpaperName = (id: string) => wallpaperById(id).name;
