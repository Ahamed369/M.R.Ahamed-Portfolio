/**
 * v8 — Web Notifications API bridge.
 * When the visitor opts in (System Settings → Notifications), portfolio
 * notifications are mirrored as real browser notifications while the tab is
 * in the background. Uses the service worker registration when available
 * (showNotification), otherwise the Notification constructor. Permission is
 * only ever requested from a user gesture.
 */
import type { NotifyInput } from './notify';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showSystemNotification(n: NotifyInput): void {
  try {
    if (!notificationsSupported() || Notification.permission !== 'granted') return;
    if (!document.hidden) return; // the in-portfolio banner is already visible
    const title = `${n.app} — ${n.title}`;
    const opts: NotificationOptions = { body: n.body ?? '', icon: './favicon.svg', tag: n.key ?? `${n.app}-${n.title}`, silent: true };
    const sw = navigator.serviceWorker;
    if (sw?.controller) {
      void sw.ready.then((reg) => reg.showNotification(title, opts)).catch(() => undefined);
    } else {
      const note = new Notification(title, opts);
      note.onclick = () => {
        window.focus();
        note.close();
      };
    }
  } catch {
    /* ignore — some browsers only allow notifications from a service worker */
  }
}

/** Registers the offline / notification service worker (not on the Vite dev server). */
export function registerServiceWorker(): void {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    if (/^517\d$/.test(location.port)) return; // vite dev server
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => undefined);
    });
  } catch {
    /* ignore */
  }
}
