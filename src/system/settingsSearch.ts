/**
 * v10.3 — Settings search jumps to the exact setting: after the matching page
 * opens, scroll to the first row whose text contains the search words and
 * flash it briefly (Mac System Settings and iPhone / iPad Settings).
 */
export function flashSettingRow(container: HTMLElement | null, words: string[]): void {
  if (!container || !words.length) return;
  const rows = [...container.querySelectorAll<HTMLElement>('.ss-row, .is-row, .ss-sec-title, .is-sec-title, h3, h4')];
  const txt = (el: HTMLElement) => (el.textContent ?? '').toLowerCase();
  const all = rows.find((r) => words.every((w) => txt(r).includes(w)));
  const longest = [...words].sort((a, b) => b.length - a.length)[0];
  const row = all ?? rows.find((r) => txt(r).includes(longest));
  if (!row) return;
  row.scrollIntoView({ block: 'center', behavior: document.documentElement.dataset.motion === 'reduced' ? 'auto' : 'smooth' });
  row.classList.remove('set-flash');
  void row.offsetWidth;
  row.classList.add('set-flash');
  window.setTimeout(() => row.classList.remove('set-flash'), 2200);
}
