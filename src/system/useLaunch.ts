import { useCallback } from 'react';
import { useWM } from './WindowManager';
import { useSystem } from './SystemContext';
import { openExternal } from './notify';
import type { LaunchAction } from './launch';

/** Launch an internal app, a system overlay (Mission Control) or an external web app (with a notification). */
export function useLaunch() {
  const wm = useWM();
  const { setOverlay } = useSystem();
  return useCallback(
    (action: LaunchAction, label?: string) => {
      if ('app' in action) {
        wm.open(action.app, action.args);
        return;
      }
      if ('overlay' in action) {
        // let the caller's own "close overlay" land first, then open this one
        window.setTimeout(() => setOverlay(action.overlay), 0);
        return;
      }
      openExternal(action.url, { title: action.notifyTitle ?? `Opening ${label ?? 'link'}`, app: 'Safari', icon: 'safari' });
    },
    [wm, setOverlay],
  );
}
