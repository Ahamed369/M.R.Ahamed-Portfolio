/**
 * v10 — rasterise a DOM element (a window) into a canvas without any library.
 *
 * The element is cloned, every node gets its computed style inlined (only the
 * properties that matter), same-origin images / canvases are inlined as data
 * URLs, and the result is drawn through an SVG <foreignObject>. The Genie then
 * bends ONE bitmap per frame on a single canvas instead of moving dozens of
 * DOM copies — smooth even on modest GPUs.
 *
 * Returns null (caller falls back to the DOM strips) when the element is too
 * large or the browser can't rasterise it.
 */

const INHERITED = new Set([
  'color',
  'cursor',
  'direction',
  'font-family',
  'font-feature-settings',
  'font-kerning',
  'font-size',
  'font-stretch',
  'font-style',
  'font-variant',
  'font-variant-ligatures',
  'font-variant-numeric',
  'font-weight',
  'letter-spacing',
  'line-height',
  'list-style-image',
  'list-style-position',
  'list-style-type',
  'tab-size',
  'text-align',
  'text-indent',
  'text-rendering',
  'text-shadow',
  'text-transform',
  'visibility',
  'white-space',
  'word-break',
  'word-spacing',
  'overflow-wrap',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  '-webkit-text-fill-color',
  '-webkit-font-smoothing',
]);

/** Properties never worth copying (animation/interaction only, or harmful inside an SVG image). */
const SKIP = /^(transition|animation|will-change|cursor|pointer-events|user-select|-webkit-user-select|caret-color|scroll-|overscroll|touch-action|content-visibility|contain|view-transition|backdrop-filter|-webkit-backdrop-filter|resize|outline-offset|counter-|page-|orphans|widows|speak|zoom|-webkit-tap|-webkit-user|-webkit-app-region|anchor|position-anchor|interpolate-size)/;

/**
 * v10.3 — the page's CSS reset (button { border: 0; background: none … }) also applies to the
 * sandbox used for default values, so for form controls those "defaults" are really the reset.
 * Inside the SVG image only the browser's UA styles exist, so always write these out.
 */
const FORM_TAGS = new Set(['button', 'input', 'select', 'textarea', 'fieldset', 'legend', 'progress', 'meter']);
const FORM_PROPS = /^(border|background|padding|margin|appearance|-webkit-appearance|color|font|text-align|outline|box-shadow|border-radius|line-height|letter-spacing)/;
let propList: string[] | null = null;
const defaults = new Map<string, Map<string, string>>();
let sandbox: HTMLElement | ShadowRoot | null = null;

function props(): string[] {
  if (propList) return propList;
  const cs = getComputedStyle(document.documentElement);
  const out: string[] = [];
  for (let i = 0; i < cs.length; i++) {
    const p = cs[i];
    if (p.startsWith('--') || SKIP.test(p)) continue;
    out.push(p);
  }
  propList = out;
  return out;
}

function defaultsFor(tag: string, ns: string | null): Map<string, string> {
  const key = `${ns ?? ''}|${tag}`;
  const hit = defaults.get(key);
  if (hit) return hit;
  if (!sandbox) {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'all:initial;position:absolute;left:-99999px;top:0;width:10px;height:10px;';
    document.body.appendChild(host);
    // v10.3 — a shadow root keeps the page's CSS reset away, so these really are the browser defaults
    try {
      sandbox = host.attachShadow({ mode: 'open' });
    } catch {
      sandbox = host;
    }
  }
  const el = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  sandbox.appendChild(el);
  const cs = getComputedStyle(el);
  const m = new Map<string, string>();
  for (const p of props()) m.set(p, cs.getPropertyValue(p));
  sandbox.removeChild(el);
  defaults.set(key, m);
  return m;
}

const imgCache = new Map<string, string>();

function imageToData(img: HTMLImageElement, w: number, h: number): string | null {
  const src = img.currentSrc || img.src;
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  const key = `${src}|${Math.round(w)}x${Math.round(h)}`;
  const hit = imgCache.get(key);
  if (hit) return hit;
  if (!img.complete || !img.naturalWidth) return null;
  try {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(1, Math.min(img.naturalWidth, Math.round(w * dpr)));
    const ch = Math.max(1, Math.min(img.naturalHeight, Math.round(h * dpr)));
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    c.getContext('2d')?.drawImage(img, 0, 0, cw, ch);
    const url = c.toDataURL(src.endsWith('.png') || src.startsWith('blob:') ? 'image/png' : 'image/jpeg', 0.82);
    imgCache.set(key, url);
    if (imgCache.size > 80) imgCache.delete(imgCache.keys().next().value as string);
    return url;
  } catch {
    return null; // cross-origin
  }
}

export interface Snapshot {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  scale: number;
  at: number;
}

const cache = new WeakMap<HTMLElement, Snapshot>();

/** A recent snapshot of this element (e.g. taken when the pointer hovered the minimise button). */
export function cachedSnapshot(el: HTMLElement, maxAge = 1500): Snapshot | null {
  const s = cache.get(el);
  return s && performance.now() - s.at < maxAge ? s : null;
}

/** The last snapshot of an element, regardless of age (restore uses the image taken at minimise). */
export function lastSnapshot(el: HTMLElement): Snapshot | null {
  return cache.get(el) ?? null;
}

const pending = new WeakMap<HTMLElement, Promise<Snapshot | null>>();

export function snapshot(el: HTMLElement, w: number, h: number): Promise<Snapshot | null> {
  const p = pending.get(el);
  if (p) return p;
  const run = doSnapshot(el, w, h).finally(() => pending.delete(el));
  pending.set(el, run);
  return run;
}

async function doSnapshot(el: HTMLElement, w: number, h: number): Promise<Snapshot | null> {
  try {
    const all = [el, ...Array.from(el.querySelectorAll<HTMLElement>('*'))];
    if (all.length > 5000 || w < 20 || h < 20) return null;
    const clone = el.cloneNode(true) as HTMLElement;
    const cAll = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
    if (cAll.length !== all.length) return null;
    const P = props();
    const computed: CSSStyleDeclaration[] = new Array(all.length);
    const parentIndex = new Map<Element, number>();
    all.forEach((n, i) => parentIndex.set(n, i));

    for (let i = 0; i < all.length; i++) {
      const o = all[i];
      const c = cAll[i];
      const cs = getComputedStyle(o);
      computed[i] = cs;
      if (cs.display === 'none') {
        c.setAttribute('style', 'display:none');
        continue;
      }
      const pIdx = o.parentElement ? parentIndex.get(o.parentElement) : undefined;
      const pcs = pIdx !== undefined ? computed[pIdx] : null;
      const def = defaultsFor(o.localName, o.namespaceURI === 'http://www.w3.org/1999/xhtml' ? null : o.namespaceURI);
      let css = '';
      for (const prop of P) {
        let v = cs.getPropertyValue(prop);
        if (!v) continue;
        if (INHERITED.has(prop) && pcs) {
          if (pcs.getPropertyValue(prop) === v && i !== 0) continue;
        } else if (def.get(prop) === v && !(FORM_TAGS.has(o.localName) && FORM_PROPS.test(prop))) continue;
        if (v.includes('url(')) {
          if (prop.startsWith('background') || prop === 'mask-image' || prop === '-webkit-mask-image' || prop === 'list-style-image' || prop === 'border-image-source') {
            if (!/gradient\(/.test(v)) continue;
            v = v.replace(/url\([^)]*\)\s*,?/g, '');
          } else continue;
        }
        css += `${prop}:${v};`;
      }
      // v10.3 — the page hides most scrollbars with ::-webkit-scrollbar rules, which a clone can't carry
      if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY) && o.offsetWidth - o.clientWidth <= 1 && o.offsetHeight - o.clientHeight <= 1) css += 'scrollbar-width:none;';
      // scroll position of scrollable boxes
      if (o.scrollTop || o.scrollLeft) {
        css += 'overflow:hidden;';
        Array.from(c.children).forEach((ch) => {
          const s = (ch as HTMLElement).getAttribute('style') ?? '';
          (ch as HTMLElement).setAttribute('style', `${s}translate:${-o.scrollLeft}px ${-o.scrollTop}px;`);
        });
      }
      c.setAttribute('style', css + (c.getAttribute('style')?.startsWith('translate') ? c.getAttribute('style') : ''));
      c.removeAttribute('class');
      c.removeAttribute('id');

      const tag = o.localName;
      if (tag === 'img') {
        const r = o.getBoundingClientRect();
        const data = imageToData(o as HTMLImageElement, r.width, r.height);
        c.removeAttribute('srcset');
        c.removeAttribute('loading');
        if (data) c.setAttribute('src', data);
        else c.removeAttribute('src');
      } else if (tag === 'canvas') {
        try {
          const img = document.createElement('img');
          img.setAttribute('src', (o as HTMLCanvasElement).toDataURL());
          img.setAttribute('style', css);
          c.replaceWith(img);
        } catch {
          /* tainted canvas */
        }
      } else if (tag === 'video' || tag === 'iframe' || tag === 'audio') {
        const box = document.createElement('div');
        box.setAttribute('style', `${css}background:#111;`);
        c.replaceWith(box);
      } else if (tag === 'input') {
        c.setAttribute('value', (o as HTMLInputElement).value);
        if ((o as HTMLInputElement).checked) c.setAttribute('checked', '');
      } else if (tag === 'textarea') {
        c.textContent = (o as HTMLTextAreaElement).value;
      } else if (tag === 'select') {
        const sel = o as HTMLSelectElement;
        Array.from(c.querySelectorAll('option')).forEach((op, k) => (k === sel.selectedIndex ? op.setAttribute('selected', '') : op.removeAttribute('selected')));
      }
      // no scripts / event handlers survive serialisation anyway
    }

    // the window root: fully visible, no transform, opaque background
    const solid = getComputedStyle(document.documentElement).getPropertyValue('--win-solid').trim() || '#f6f6f8';
    const rootCss = clone.getAttribute('style') ?? '';
    clone.setAttribute(
      'style',
      `${rootCss}position:relative;left:0;top:0;margin:0;transform:none;translate:none;scale:none;opacity:1;visibility:visible;width:${w}px;height:${h}px;box-sizing:border-box;background-color:${solid};`,
    );

    const xml = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image();
      img.decoding = 'async';
      const ok = await new Promise<boolean>((res) => {
        img.onload = () => res(true);
        img.onerror = () => res(false);
        img.src = url;
      });
      if (!ok) return null;
      try {
        await img.decode();
      } catch {
        /* ignore */
      }
      const scale = Math.min(2, window.devicePixelRatio || 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const snap: Snapshot = { canvas, w, h, scale, at: performance.now() };
      cache.set(el, snap);
      return snap;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}
