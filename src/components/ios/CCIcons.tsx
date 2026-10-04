import { SysIcon, SYS_ICON_NAMES } from '../SysIcons';
const SYS = Object.fromEntries(SYS_ICON_NAMES.map((k) => [k, 1]));
/** v10.2 — crisp line icons for Control Centre, AssistiveTouch and the Dynamic Island (original artwork). */
const P: Record<string, string> = {
  plane: 'M21 15.5v-1.6l-7.5-4.6V4.6a1.5 1.5 0 0 0-3 0v4.7L3 13.9v1.6l7.5-2.3v4.9l-2 1.5v1.3l3.5-1 3.5 1v-1.3l-2-1.5v-4.9z',
  wifi: 'M2.5 9.2a14 14 0 0 1 19 0M5.6 12.4a9.5 9.5 0 0 1 12.8 0M8.7 15.6a5 5 0 0 1 6.6 0M12 19.2h.01',
  bt: 'M7 7.5l10 9-5 4.5V3l5 4.5-10 9',
  airdrop: 'M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM8.5 15.5a5 5 0 1 1 7 0M5.7 18.3a9 9 0 1 1 12.6 0',
  cell: 'M5 19v-3M9.7 19v-6M14.3 19v-9M19 19V5',
  rotlock: 'M9 11V9a3 3 0 0 1 6 0v2M8 11h8v6H8zM20.5 12a8.5 8.5 0 0 1-15.4 5M3.5 12A8.5 8.5 0 0 1 18.9 7M19 3.5V7h-3.5M5 20.5V17h3.5',
  mirror: 'M4 6h10v7H4zM10 11h10v7H10z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  speaker: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11',
  mute: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5',
  torch: 'M8 2.5h8v4l-2 3V21h-4V9.5l-2-3zM8 6.5h8M12 13v2',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M9.5 2.5h5',
  stopwatch: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 13l3-3M10 2.5h4M19 6l1.5-1.5',
  alarm: 'M12 20a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 9.5V13l2 1.5M4 5.5L7 3M20 5.5L17 3M7 19l-1.5 2M17 19l1.5 2',
  calc: 'M6 3h12v18H6zM8.5 6h7v3h-7zM9 13h.01M12 13h.01M15 13h.01M9 16.5h.01M12 16.5h.01M15 16.5h.01',
  camera: 'M3.5 8h4l1.5-2.5h6L16.5 8h4v11h-17zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  contrast: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 3v18',
  battery: 'M3 8h15v8H3zM18 10.5h2.5v3H18M5.5 10.5h6v3h-6z',
  record: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  note: 'M5 3.5h10l4 4V20.5H5zM15 3.5v4h4M8.5 12h7M8.5 15.5h5',
  nightshift: 'M12 17a5 5 0 1 0 0-10M12 3v1.5M12 19.5V21M4.2 7.5l1.3.8M18.5 15.7l1.3.8M4.2 16.5l1.3-.8M18.5 8.3l1.3-.8M7 12a5 5 0 0 0 5 5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2.2 1.3L14.5 21h-5l-.4-2.3a7.6 7.6 0 0 1-2.2-1.3l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7A7.6 7.6 0 0 1 9.1 5.3L9.5 3h5l.4 2.3a7.6 7.6 0 0 1 2.2 1.3l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 0 1 0 3z',
  heart: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
  music: 'M9 18.5V6l11-2.5v12.5M9 18.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  briefcase: 'M3.5 7.5h17v12h-17zM8.5 7.5v-2h7v2M3.5 12.5h17',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5L21 21',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  bellslash: 'M6 16.5V11a6 6 0 0 1 9.5-4.9M18 11v5.5l1.5 2H8M10 20.5a2 2 0 0 0 4 0M3.5 3.5l17 17',
  mic: 'M12 14.5a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5.5a3 3 0 0 0 3 3zM6 11.5a6 6 0 0 0 12 0M12 17.5V21',
  doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 15.5h6',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  shot: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M9 12h6M12 9v6',
  plus: 'M12 5v14M5 12h14',
  power: 'M12 3v8M7.5 6.5a7 7 0 1 0 9 0',
  home: 'M4 11.5L12 4l8 7.5V20h-5.5v-5h-5v5H4z',
  hotspot: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM8.8 15.2a4.5 4.5 0 0 1 0-6.4M15.2 8.8a4.5 4.5 0 0 1 0 6.4M6 18a8.5 8.5 0 0 1 0-12M18 6a8.5 8.5 0 0 1 0 12',
  textsize: 'M3 19l4-11 4 11M4.5 15h5M13 19l3.5-14L20 19M14 15h5',
  translate: 'M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5.5 7M11 5c-.5 3-3 6.5-6.5 8M13 21l4-9 4 9M14.5 18h5',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2v2h-2zM18 14h2v2h-2z',
  sparkle: 'M12 3l2 5.5L19.5 10.5 14 12.5 12 18l-2-5.5L4.5 10.5 10 8.5zM19 16l.8 2 2 .8-2 .8L19 21.5l-.8-2-2-.8 2-.8z',
  wave: 'M3 12h2M7 9v6M11 6v12M15 8v8M19 10.5v3M21 12h.01',
  pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
  play: 'M7 4.5v15l12.5-7.5z',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z',
  phone: 'M7 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 5 5.5a2 2 0 0 1 2-2z',
  device: 'M7.5 2.5h9v19h-9zM11 18.5h2',
  toggles: 'M7 6h10a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6zM7 12h10a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6zM8 9h.01M16 15h.01',
  undo: 'M9 8.5L4.5 13 9 17.5M5 13h9.5a5 5 0 0 0 0-10H11',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v10h-13z',
  grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
};

export type CCIconName = keyof typeof P;

/**
 * v10.3 — Control Centre / AssistiveTouch / Dynamic Island icons now use the
 * shared solid system glyph set (SysIcons). The old outline paths above stay
 * as a fallback for any name the solid set doesn't have.
 */
export function CCIcon({ n, size = 22, fill = false }: { n: string; size?: number; fill?: boolean }) {
  if (n in SYS) return <SysIcon n={n} size={size} className="cc-ico" />;
  const d = P[n] ?? P.grid;
  return (
    <svg className="cc-ico" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={d} fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={fill ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
