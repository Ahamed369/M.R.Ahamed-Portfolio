import { integrations } from '../data/portfolio';

/**
 * v10 — optional, privacy-friendly analytics hook. Nothing loads unless
 * integrations.analyticsScript is set (e.g. Plausible or Umami). Visitors can
 * opt out with Do Not Track.
 */
export function initAnalytics() {
  const src = integrations.analyticsScript;
  if (!src || typeof document === 'undefined') return;
  if (navigator.doNotTrack === '1') return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = src;
  if (integrations.analyticsId) {
    s.dataset.domain = integrations.analyticsId;
    s.dataset.websiteId = integrations.analyticsId;
  }
  document.head.appendChild(s);
}

/** custom event (app opened, CV downloaded…) — a no-op without analytics */
export function track(name: string, props?: Record<string, string>) {
  const w = window as unknown as { plausible?: (n: string, o?: { props?: Record<string, string> }) => void; umami?: { track: (n: string, p?: Record<string, string>) => void } };
  try {
    w.plausible?.(name, props ? { props } : undefined);
    w.umami?.track(name, props);
  } catch {
    /* ignore */
  }
}
