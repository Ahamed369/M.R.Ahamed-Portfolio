import { useEffect, useState } from 'react';
import { readStore, writeStore } from './storage';

/**
 * v9 — battery level history for Settings → Battery (Last 24 Hours / Last 10 Days).
 * Real readings from the Battery Status API, one every 5 minutes while the
 * portfolio is open, kept for 10 days on this device only.
 */
export interface BatPoint {
  t: number;
  l: number;
  c: boolean;
}
const KEY = 'mra-battery-log-v9';
const EVT = 'mra-battery-log';
const KEEP = 10 * 86400000;

let log: BatPoint[] = readStore<{ p: BatPoint[] }>(KEY, { p: [] }).p.filter((x) => Date.now() - x.t < KEEP);

export interface BatteryManagerLike {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  addEventListener: (t: string, f: () => void) => void;
  removeEventListener: (t: string, f: () => void) => void;
}

export function getBatteryManager(): Promise<BatteryManagerLike | null> {
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
  if (!nav.getBattery) return Promise.resolve(null);
  return nav.getBattery().catch(() => null);
}

export function recordBattery(level: number, charging: boolean, force = false) {
  const last = log[log.length - 1];
  if (!force && last && Date.now() - last.t < 5 * 60000 && last.c === charging) return;
  log = [...log.filter((x) => Date.now() - x.t < KEEP), { t: Date.now(), l: level, c: charging }];
  writeStore(KEY, { p: log });
  window.dispatchEvent(new Event(EVT));
}

export function useBatteryLog(): BatPoint[] {
  const [p, setP] = useState(log);
  useEffect(() => {
    const on = () => setP(log);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return p;
}
