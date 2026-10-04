/**
 * v8 — timed notifications once the visitor reaches the desktop
 * (after the start-up and lock screens):
 *   ≈ 8 s   Welcome
 *   ≈ 45 s  Follow me — round social icons that open each profile
 *   ≈ 90 s  Reminder (Options ▾ Mark as Completed / Remind Me …)
 *   ≈ 3 min Weather in Kandy (only when the forecast actually loads)
 * Each fires once per browser session. Reminders with a due time today also
 * notify when that time arrives.
 */
import { useEffect, useRef } from 'react';
import { notify } from './notify';
import { useSystem } from './SystemContext';
import { useWM } from './WindowManager';
import { isoDay, useReminders } from './reminders';
import { personal, projects, socials } from '../data/portfolio';
import { sharePortfolio } from './share';
import { t } from './i18n';

const flagKey = (k: string) => `mra-sched-${k}`;
const done = (k: string) => {
  try {
    return sessionStorage.getItem(flagKey(k)) === '1';
  } catch {
    return false;
  }
};
const mark = (k: string) => {
  try {
    sessionStorage.setItem(flagKey(k), '1');
  } catch {
    /* ignore */
  }
};

const WX: Record<number, [string, string]> = {
  0: ['☀️', 'Clear'],
  1: ['🌤', 'Mainly clear'],
  2: ['⛅️', 'Partly cloudy'],
  3: ['☁️', 'Overcast'],
  45: ['🌫', 'Fog'],
  51: ['🌦', 'Light drizzle'],
  61: ['🌧', 'Light rain'],
  63: ['🌧', 'Rain'],
  65: ['🌧', 'Heavy rain'],
  80: ['🌦', 'Rain showers'],
  81: ['🌧', 'Rain showers'],
  95: ['⛈', 'Thunderstorm'],
};

export function useScheduledNotifications() {
  const sys = useSystem();
  const wm = useWM();
  const [reminders, setReminders] = useReminders();
  const remRef = useRef(reminders);
  remRef.current = reminders;
  const wmRef = useRef(wm);
  wmRef.current = wm;
  const active = sys.phase === 'ready' && !sys.locked && !sys.asleep;

  useEffect(() => {
    if (!active) return;
    const timers: number[] = [];
    const at = (key: string, ms: number, fn: () => void) => {
      if (done(key)) return;
      timers.push(
        window.setTimeout(() => {
          mark(key);
          fn();
        }, ms),
      );
    };

    at('welcome', 8000, () =>
      notify({
        app: 'Portfolio',
        icon: 'guidebook',
        key: 'welcome',
        title: t('welcomeTitle'),
        body: t('welcomeBody'),
        onClick: () => wmRef.current.open('guidebook'),
        actions: [
          { label: t('openGuide'), primary: true, run: () => wmRef.current.open('guidebook') },
          { label: t('takeTour'), run: () => window.dispatchEvent(new Event('mra-onboarding')) },
        ],
        duration: 12000,
      }),
    );

    at('follow', 45000, () =>
      notify({
        app: personal.name,
        icon: 'contacts',
        key: 'follow',
        label: t('followLabel'),
        title: t('followTitle'),
        body: t('followBody'),
        links: [
          { icon: 'github', label: 'GitHub — Ahamed369', href: socials.github },
          { icon: 'linkedin', label: 'LinkedIn — M.R. Ahamed', href: socials.linkedin },
          { icon: 'instagram', label: `Instagram — ${socials.instagramHandle}`, href: socials.instagram },
          { icon: 'facebook', label: 'Facebook', href: socials.facebook },
          { icon: 'threads', label: 'Threads', href: socials.threads },
          { icon: 'whatsapp', label: 'WhatsApp', href: socials.whatsapp },
          { icon: 'spotify', label: 'Spotify', href: socials.spotify },
        ],
        actions: [{ label: t('sharePortfolio'), run: () => void sharePortfolio() }],
        duration: 14000,
      }),
    );

    at('reminder', 90000, () => {
      const r = remRef.current.find((x) => !x.done && x.app) ?? remRef.current.find((x) => !x.done);
      if (!r) return;
      const setDue = (days: number, time?: string) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        setReminders((l) => l.map((x) => (x.id === r.id ? { ...x, due: isoDay(d), time } : x)));
      };
      notify({
        app: 'Reminders',
        icon: 'reminders',
        key: `rem-${r.id}`,
        label: t('timeSensitive'),
        title: r.text,
        body: `${t('today')}, ${new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`,
        onClick: () => (r.app ? wmRef.current.open(r.app) : wmRef.current.open('reminders')),
        options: [
          { label: t('markCompleted'), run: () => setReminders((l) => l.map((x) => (x.id === r.id ? { ...x, done: true } : x))) },
          {
            label: t('remindHour'),
            run: () => {
              const d = new Date(Date.now() + 3600000);
              setDue(0, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
            },
          },
          { label: t('remindAfternoon'), run: () => setDue(0, '15:00') },
          { label: t('remindTomorrow'), run: () => setDue(1, '09:00') },
        ],
      });
    });

    at('weather', 180000, () => {
      const ctrl = new AbortController();
      fetch('https://api.open-meteo.com/v1/forecast?latitude=7.2906&longitude=80.6337&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FColombo&forecast_days=1', { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('weather'))))
        .then((d: { current?: { temperature_2m?: number; weather_code?: number }; daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] } }) => {
          const temp = d.current?.temperature_2m;
          if (typeof temp !== 'number') return;
          const [ico, label] = WX[d.current?.weather_code ?? -1] ?? ['🌡', 'Current conditions'];
          const hi = d.daily?.temperature_2m_max?.[0];
          const lo = d.daily?.temperature_2m_min?.[0];
          notify({
            app: 'Weather',
            icon: 'weather',
            key: 'weather',
            title: `${ico} ${Math.round(temp)}° · ${label} in ${personal.city}`,
            body: hi != null && lo != null ? `H:${Math.round(hi)}° L:${Math.round(lo)}° — ${t('weatherBody')}` : t('weatherBody'),
            onClick: () => wmRef.current.open('weather'),
          });
        })
        .catch(() => undefined);
    });

    at('casestudy', 300000, () => {
      const p = projects[Math.floor(Math.random() * Math.min(5, projects.length))];
      notify({
        app: 'Case Studies',
        icon: 'casestudies',
        key: 'casestudy',
        title: `${t('caseStudy')}: ${p.name}`,
        body: p.description,
        onClick: () => wmRef.current.open('casestudies', { project: p.id }),
        actions: [{ label: t('read'), primary: true, run: () => wmRef.current.open('casestudies', { project: p.id }) }],
      });
    });

    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [active, setReminders]);

  // Reminders with a due date + time today → notify when the time arrives
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const now = new Date();
      const today = isoDay(now);
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      remRef.current.forEach((r) => {
        if (r.done || r.due !== today || !r.time || r.time > hm) return;
        const k = `due-${r.id}-${r.due}-${r.time}`;
        if (done(k)) return;
        mark(k);
        notify({
          app: 'Reminders',
          icon: 'reminders',
          key: `rem-${r.id}`,
          label: t('timeSensitive'),
          title: r.text,
          body: `${t('today')}, ${r.time}`,
          onClick: () => wmRef.current.open('reminders'),
          options: [
            { label: t('markCompleted'), run: () => setReminders((l) => l.map((x) => (x.id === r.id ? { ...x, done: true } : x))) },
            {
              label: t('remindHour'),
              run: () => {
                const d = new Date(Date.now() + 3600000);
                setReminders((l) => l.map((x) => (x.id === r.id ? { ...x, time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` } : x)));
              },
            },
            {
              label: t('remindTomorrow'),
              run: () => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                setReminders((l) => l.map((x) => (x.id === r.id ? { ...x, due: isoDay(d), time: '09:00' } : x)));
              },
            },
          ],
        });
      });
    };
    tick();
    const iv = window.setInterval(tick, 20000);
    return () => window.clearInterval(iv);
  }, [active, setReminders]);
}
