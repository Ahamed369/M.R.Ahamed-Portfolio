import type { CSSProperties } from 'react';

/**
 * v10.3 — Mac Lock Screen clock style (System Settings → Lock Screen → Clock).
 * Stored in the Settings prefs as choices 'lock-font' and 'lock-color'.
 */
export const LOCK_FONTS: { id: string; label: string; style: CSSProperties }[] = [
  { id: 'classic', label: 'Classic', style: { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif', fontWeight: 600 } },
  { id: 'thin', label: 'Thin', style: { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif', fontWeight: 200, letterSpacing: '-0.01em' } },
  { id: 'rounded', label: 'Rounded', style: { fontFamily: 'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif', fontWeight: 700 } },
  { id: 'serif', label: 'Serif', style: { fontFamily: 'ui-serif, "New York", "Iowan Old Style", Georgia, "Times New Roman", serif', fontWeight: 500 } },
  { id: 'mono', label: 'Mono', style: { fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace', fontWeight: 500, letterSpacing: '-0.04em' } },
];
export const LOCK_COLORS: { id: string; label: string; color: string }[] = [
  { id: 'white', label: 'White', color: '#ffffff' },
  { id: 'cream', label: 'Cream', color: '#fff1d6' },
  { id: 'yellow', label: 'Yellow', color: '#ffd60a' },
  { id: 'orange', label: 'Orange', color: '#ff9f0a' },
  { id: 'pink', label: 'Pink', color: '#ff6482' },
  { id: 'purple', label: 'Purple', color: '#d0a2ff' },
  { id: 'blue', label: 'Blue', color: '#64d2ff' },
  { id: 'green', label: 'Green', color: '#66e08a' },
];

export function lockClockStyle(font: string, color: string): CSSProperties {
  const f = LOCK_FONTS.find((x) => x.id === font) ?? LOCK_FONTS[0];
  const c = LOCK_COLORS.find((x) => x.id === color) ?? LOCK_COLORS[0];
  return { ...f.style, color: c.color };
}
