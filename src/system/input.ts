/** v10 — wording that matches the device: "Right-click" on a Mac, "Touch and hold" on an iPhone / iPad. */
export function isTouchUI(): boolean {
  const d = document.documentElement.dataset.device;
  if (d === 'iphone' || d === 'ipad') return true;
  if (d === 'mac') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}
export const rightClick = (lower = false) => (isTouchUI() ? (lower ? 'touch and hold' : 'Touch and hold') : lower ? 'right-click' : 'Right-click');
export const doubleClick = (lower = false) => (isTouchUI() ? (lower ? 'double-tap' : 'Double-tap') : lower ? 'double-click' : 'Double-click');
