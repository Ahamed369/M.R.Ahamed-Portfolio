import { useEffect, useState } from 'react';
import { useSettings } from '../system/SettingsContext';
import { useScreenTime, dayKey } from '../system/screenTime';
import { APPS } from '../system/apps';
import type { AppId } from '../system/types';

/** apps that always open, even during Downtime */
const ALWAYS: string[] = ['phone', 'messages', 'settings', 'hireme', 'contacts', 'facetime'];
const KEY = 'mra-limit-ignore';

function ignored(): Record<string, number> {
  try {
    const o = JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as { day?: string; until?: Record<string, number> };
    return o.day === dayKey(new Date()) ? (o.until ?? {}) : {};
  } catch {
    return {};
  }
}
function ignore(id: string, until: number) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ day: dayKey(new Date()), until: { ...ignored(), [id]: until } }));
  } catch {
    /* private mode — the limit simply shows again */
  }
}
const mins = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export function inDowntime(dt: { on: boolean; from: string; to: string } | undefined, d = new Date()): boolean {
  if (!dt?.on) return false;
  const now = d.getHours() * 60 + d.getMinutes();
  const a = mins(dt.from);
  const b = mins(dt.to);
  return a <= b ? now >= a && now < b : now >= a || now < b;
}

/**
 * v10.1 — Screen Time: App Limits and Downtime. Covers the app with the
 * familiar hourglass screen once today's limit is used up (or during
 * Downtime). The visitor can always continue — it is a reminder, not a lock.
 */
export function LimitGate({ id }: { id: AppId }) {
  const { settings } = useSettings();
  const st = useScreenTime();
  const [, force] = useState(0);
  const limit = settings.appLimits?.[id] ?? 0;
  const down = !ALWAYS.includes(id) && inDowntime(settings.downtime);
  const used = st.perApp[id] ?? 0;
  const until = ignored()[id] ?? 0;
  const over = (limit > 0 && used >= limit * 60000) || down;
  const blocked = over && Date.now() > until;
  useEffect(() => {
    if (!until || until === Infinity) return;
    const t = window.setTimeout(() => force((x) => x + 1), Math.max(0, until - Date.now()) + 50);
    return () => window.clearTimeout(t);
  }, [until]);
  useEffect(() => {
    if (!settings.downtime?.on) return;
    const t = window.setInterval(() => force((x) => x + 1), 30000);
    return () => window.clearInterval(t);
  }, [settings.downtime?.on]);
  if (!blocked) return null;
  const name = APPS[id]?.title ?? 'This app';
  return (
    <div className="limit-gate" role="alertdialog" aria-label={down ? 'Downtime' : 'Time Limit'}>
      <span className="limit-ico" aria-hidden="true">
        ⌛
      </span>
      <b>{down ? 'Downtime' : 'Time Limit'}</b>
      <p>{down ? `${name} isn’t available during Downtime (${settings.downtime?.from}–${settings.downtime?.to}).` : `You’ve reached your limit on ${name} (${limit} min a day).`}</p>
      <button type="button" className="limit-btn" onClick={() => (ignore(id, Date.now() + 60000), force((x) => x + 1))}>
        One More Minute
      </button>
      <button type="button" className="limit-btn" onClick={() => (ignore(id, Number.MAX_SAFE_INTEGER), force((x) => x + 1))}>
        Ignore Limit for Today
      </button>
    </div>
  );
}
