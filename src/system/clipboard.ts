/**
 * v10 — Cut / Copy / Paste / Select All for menus, context menus and the iOS
 * edit bar. Remembers the last text field the visitor used (menus take focus)
 * and keeps a small clipboard history (Spotlight → Clipboard).
 */
type Editable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;
let last: Editable | null = null;
let range: { start: number; end: number } | null = null;
const hist: string[] = [];

const isField = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement =>
  !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|email|url|tel|password|)$/i.test((el as HTMLInputElement).type)));

if (typeof window !== 'undefined') {
  document.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    if (isField(t) || t.isContentEditable) last = t;
  });
  document.addEventListener('selectionchange', () => {
    const a = document.activeElement;
    if (isField(a)) {
      try {
        range = { start: a.selectionStart ?? 0, end: a.selectionEnd ?? 0 };
      } catch {
        range = null;
      }
    }
  });
  document.addEventListener('copy', () => remember(String(window.getSelection() ?? '')));
}

function remember(t: string) {
  const s = t.trim();
  if (!s) return;
  const i = hist.indexOf(s);
  if (i >= 0) hist.splice(i, 1);
  hist.unshift(s);
  if (hist.length > 20) hist.pop();
}
export const clipboardHistory = () => [...hist];

function selected(): string {
  if (last && isField(last) && range) return last.value.slice(range.start, range.end);
  return String(window.getSelection() ?? '');
}

export async function writeClipboard(text: string) {
  remember(text);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* clipboard blocked — history still has it */
  }
}

/** insert text into the last used field (keeps the field's own undo where supported) */
export function insertText(text: string) {
  const el = last;
  if (!el) return false;
  el.focus();
  if (isField(el)) {
    const st = range?.start ?? el.value.length;
    const en = range?.end ?? el.value.length;
    try {
      el.setSelectionRange(st, en);
    } catch {
      /* number inputs etc. */
    }
    // execCommand keeps native undo and fires React's onChange
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (!document.execCommand?.('insertText', false, text)) {
      el.setRangeText(text, st, en, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }
  return document.execCommand?.('insertText', false, text) ?? false;
}

export async function editCmd(cmd: 'cut' | 'copy' | 'paste' | 'selectAll' | 'duplicate') {
  const text = selected();
  if (cmd === 'copy') {
    if (text) await writeClipboard(text);
  } else if (cmd === 'cut') {
    if (text) {
      await writeClipboard(text);
      insertText('');
    }
  } else if (cmd === 'paste') {
    let t = hist[0] ?? '';
    try {
      t = (await navigator.clipboard.readText()) || t;
    } catch {
      /* permission denied — use the last copied text */
    }
    if (t) insertText(t);
  } else if (cmd === 'duplicate') {
    if (text) insertText(text + text);
  } else if (cmd === 'selectAll') {
    const el = last;
    if (el && isField(el)) {
      el.focus();
      el.select();
    } else if (el) {
      el.focus();
      document.execCommand?.('selectAll');
    }
  }
}
