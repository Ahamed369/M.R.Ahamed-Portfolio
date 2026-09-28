/**
 * Sunrise / sunset estimate (NOAA simplified algorithm) — used by
 * Auto appearance "Sunset to Sunrise". No network or location permission:
 * visitors in Sri Lanka use Kandy's coordinates, everyone else gets an
 * estimate from their time-zone offset (longitude) and a mid latitude.
 */
const RAD = Math.PI / 180;

function approxCoords(): { lat: number; lon: number } {
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    /* ignore */
  }
  if (tz === 'Asia/Colombo') return { lat: 7.29, lon: 80.63 };
  const offsetH = -new Date().getTimezoneOffset() / 60;
  return { lat: 30, lon: offsetH * 15 };
}

/** Returns sunrise & sunset for the given day as Date objects (local time). */
export function sunTimes(day = new Date(), coords = approxCoords()): { sunrise: Date; sunset: Date } {
  const start = new Date(day.getFullYear(), 0, 0);
  const n = Math.floor((day.getTime() - start.getTime()) / 86400000);
  const g = ((2 * Math.PI) / 365) * (n - 1);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const lat = coords.lat * RAD;
  const cosH = (Math.cos(90.833 * RAD) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));
  const ha = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD;
  const utcMid = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  const riseMin = 720 - 4 * (coords.lon + ha) - eqTime;
  const setMin = 720 - 4 * (coords.lon - ha) - eqTime;
  return { sunrise: new Date(utcMid + riseMin * 60000), sunset: new Date(utcMid + setMin * 60000) };
}

export function isNight(now = new Date()): boolean {
  const { sunrise, sunset } = sunTimes(now);
  return now < sunrise || now > sunset;
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
