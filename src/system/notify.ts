/**
 * Tiny event bus so any component (even non-React helpers) can raise a
 * portfolio notification. SystemContext subscribes and shows the banner
 * (unless Focus is on) and stores it in Notification Center history.
 */
export interface NotifyAction {
  label: string;
  /** Runs inside the portfolio */
  run?: () => void;
  /** Opens a link in a new tab */
  href?: string;
  primary?: boolean;
}

export interface NotifyLink {
  /** Icon name from AppIcons */
  icon: string;
  label: string;
  href: string;
}

export interface NotifyInput {
  title: string;
  /** Small grey label above the title, e.g. "TIME SENSITIVE" */
  label?: string;
  /** Buttons shown under the text (e.g. Reply · Open) */
  actions?: NotifyAction[];
  /** "Options ▾" menu items (e.g. Mark as Completed · Remind Me in an Hour) */
  options?: NotifyAction[];
  /** Row of round icon links (Follow-me notification) */
  links?: NotifyLink[];
  /** Clicking the banner body */
  onClick?: () => void;
  /** How long the banner stays (ms). Default 5200; links/options banners stay longer. */
  duration?: number;
  /** No sound for this one */
  silent?: boolean;
  /** Stable key — a notification with the same key replaces the older one */
  key?: string;
  body?: string;
  /** Short app label shown on the banner, e.g. "GitHub", "Music" */
  app: string;
  /** Icon name from AppIcons */
  icon?: string;
  /** Critical notifications still show while Focus is on */
  critical?: boolean;
}

type Listener = (n: NotifyInput) => void;
const listeners = new Set<Listener>();

let last = { key: '', t: 0 };

export function notify(n: NotifyInput): void {
  // de-duplicate identical notifications fired in quick succession
  const key = `${n.app}|${n.title}|${n.body ?? ''}`;
  const now = Date.now();
  if (key === last.key && now - last.t < 900) return;
  last = { key, t: now };
  listeners.forEach((l) => l(n));
}

export function onNotify(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Open an external link in a new tab and raise a matching notification. */
export function openExternal(url: string, n?: Omit<NotifyInput, 'app'> & { app?: string }): void {
  if (n) notify({ app: n.app ?? 'Safari', ...n });
  if (url.startsWith('http')) window.open(url, '_blank', 'noopener,noreferrer');
  else window.location.href = url;
}
