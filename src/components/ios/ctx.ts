import { createContext, useContext } from 'react';
import type { DeviceMode } from '../../system/ios';
import type { LaunchItem } from '../../system/launch';
import type { AppId } from '../../system/types';

export type Panel = 'none' | 'cc' | 'nc' | 'switcher' | 'search' | 'poweroff' | 'customize' | 'widgets' | 'pages' | 'lockcustom';

export interface IOSCtx {
  mode: DeviceMode;
  /** app currently on screen (null = Home Screen) */
  current: AppId | null;
  recents: AppId[];
  panel: Panel;
  setPanel: (p: Panel) => void;
  edit: boolean;
  setEdit: (on: boolean) => void;
  launch: (item: LaunchItem, from?: DOMRect | null) => void;
  openApp: (id: AppId, args?: Record<string, string>, from?: DOMRect | null) => void;
  goHome: () => void;
  switchTo: (id: AppId) => void;
  closeApp: (id: AppId) => void;
  snapshots: Record<string, HTMLCanvasElement>;
  /** iPad */
  split: { a: AppId; b: AppId; ratio: number } | null;
  setSplit: (s: { a: AppId; b: AppId; ratio: number } | null) => void;
  slide: AppId | null;
  setSlide: (id: AppId | null) => void;
  pendingSplit: AppId | null;
  setPendingSplit: (id: AppId | null) => void;
}

export const IOS = createContext<IOSCtx | null>(null);
export function useIOS(): IOSCtx {
  const c = useContext(IOS);
  if (!c) throw new Error('useIOS outside IOSShell');
  return c;
}

/** where each app was launched from — the zoom animation grows from (and returns to) that rectangle */
export const launchRects = new Map<string, DOMRect>();
/** which Home Screen icon (launch item id) last opened each app */
export const launchIcon = new Map<string, string>();
