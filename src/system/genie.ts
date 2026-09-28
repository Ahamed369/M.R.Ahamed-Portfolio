/**
 * v9 — authentic macOS Genie effect for minimize / restore.
 *
 * How the real effect works (and what this reproduces):
 *   The window image is mapped onto a shape whose two side edges are S-curves
 *   running from the window's corners down to the Dock icon's edges
 *   ("superview → animated view → destination rect").
 *   Phase 1 (≈ first 40 %): the edge nearest the Dock is pulled onto the icon —
 *     the sides bend into the S-curves while the far edge stays where it is.
 *   Phase 2: the far edge slides along the curves into the icon, so the whole
 *     image is squeezed through the funnel ("poured" into the Dock).
 *   Restore plays the same timeline backwards.
 *
 * Implementation: the window is copied into thin slices perpendicular to the
 * travel direction (static DOM clones; canvases copied as pixels). Every frame
 * each slice gets one affine transform (translate · skew · scale) so its two
 * ends sit exactly on the curves — slice edges stay joined, the image looks
 * continuous, and everything runs on the GPU. Works for a Dock at the bottom,
 * left or right of the screen.
 */

export interface GenieRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t: number) => t * t * (1.6 - 0.6 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type DockSide = 'bottom' | 'left' | 'right';

function copyCanvases(src: HTMLElement, dst: HTMLElement) {
  const a = src.querySelectorAll('canvas');
  if (!a.length) return;
  const b = dst.querySelectorAll('canvas');
  a.forEach((c, i) => {
    const d = b[i];
    if (!d) return;
    try {
      d.width = c.width;
      d.height = c.height;
      d.getContext('2d')?.drawImage(c, 0, 0);
    } catch {
      /* tainted / webgl canvas — leave blank */
    }
  });
}

function copyMedia(src: HTMLElement, dst: HTMLElement) {
  // Freeze <video>/<iframe> in clones (no double audio, no network)
  dst.querySelectorAll('video, audio').forEach((m) => {
    (m as HTMLMediaElement).muted = true;
    m.removeAttribute('autoplay');
    m.removeAttribute('src');
  });
  dst.querySelectorAll('iframe').forEach((f) => f.removeAttribute('src'));
  copyCanvases(src, dst);
}

/**
 * Runs the genie animation.
 * @param el      the window element (its current on-screen look is copied)
 * @param from    window rect on screen
 * @param target  dock tile rect on screen
 * @param dir     'min' (window → dock) or 'restore' (dock → window)
 * @param side    which screen edge the Dock sits on
 */
export function genie(el: HTMLElement, from: GenieRect, target: GenieRect, dir: 'min' | 'restore', duration = 640, side: DockSide = 'bottom'): Promise<void> {
  return new Promise((resolve) => {
    const layer = document.createElement('div');
    layer.className = 'genie-layer';
    layer.setAttribute('aria-hidden', 'true');
    const vertical = side === 'bottom';
    // extent of the window along the travel direction, and across it
    const alongLen = vertical ? from.h : from.w;
    const N = Math.max(18, Math.min(34, Math.round(alongLen / 16)));
    const sl = alongLen / N;
    const bg = getComputedStyle(el).backgroundColor;
    const strips: HTMLElement[] = [];
    for (let i = 0; i < N; i++) {
      // slice i: i = 0 is the edge FARTHEST from the Dock
      const strip = document.createElement('div');
      strip.className = 'genie-strip';
      const clone = el.cloneNode(true) as HTMLElement;
      clone.classList.add('genie-clone');
      clone.removeAttribute('id');
      Object.assign(clone.style, { width: `${from.w}px`, height: `${from.h}px`, opacity: '1', visibility: 'visible' });
      if (bg && bg !== 'rgba(0, 0, 0, 0)') clone.style.background = bg;
      let sx = from.x;
      let sy = from.y;
      let w = from.w;
      let h = from.h;
      if (vertical) {
        sy = from.y + i * sl;
        h = sl;
        clone.style.top = `${-i * sl}px`;
      } else if (side === 'right') {
        sx = from.x + i * sl;
        w = sl;
        clone.style.left = `${-i * sl}px`;
      } else {
        sx = from.x + from.w - (i + 1) * sl;
        w = sl;
        clone.style.left = `${-(from.w - (i + 1) * sl)}px`;
      }
      Object.assign(strip.style, { left: `${sx}px`, top: `${sy}px`, width: `${Math.ceil(w) + (vertical ? 0 : 1)}px`, height: `${Math.ceil(h) + (vertical ? 1 : 0)}px`, transformOrigin: '0 0' });
      copyMedia(el, clone);
      strip.appendChild(clone);
      layer.appendChild(strip);
      strips.push(strip);
    }
    document.body.appendChild(layer);

    /* Work in "along / across" coordinates: along grows toward the Dock. */
    const A = (x: number, y: number) => (side === 'bottom' ? y : side === 'right' ? x : -x);
    const winFar = side === 'bottom' ? A(0, from.y) : side === 'right' ? A(from.x, 0) : A(from.x + from.w, 0);
    const winNear = winFar + alongLen;
    const winC0 = vertical ? from.x : from.y;
    const winC1 = vertical ? from.x + from.w : from.y + from.h;
    // the Dock tile: its near-to-window edge along, and its across extent
    const tNear = side === 'bottom' ? A(0, target.y + target.h * 0.12) : side === 'right' ? A(target.x + target.w * 0.12, 0) : A(target.x + target.w * 0.88, 0);
    const pad = (vertical ? target.w : target.h) * 0.12;
    const tC0 = (vertical ? target.x : target.y) + pad;
    const tC1 = (vertical ? target.x + target.w : target.y + target.h) - pad;
    const span = Math.max(1, tNear - winFar);

    // S-curve edges between the window's far edge and the Dock tile
    const curve = (a: number) => {
      const f = smooth(clamp01((a - winFar) / span));
      return [lerp(winC0, tC0, f), lerp(winC1, tC1, f)] as const;
    };

    const frame = (p: number) => {
      const p1 = easeInOut(clamp01(p / 0.42)); // near edge pulled to the icon + bend
      const p2 = easeIn(clamp01((p - 0.3) / 0.7)); // far edge slides into the icon
      const far = lerp(winFar, tNear, p2);
      const near = lerp(winNear, tNear, p1);
      const len = Math.max(0.0001, near - far);
      const edges = (a: number) => {
        const [c0, c1] = curve(a);
        return [lerp(winC0, c0, p1), lerp(winC1, c1, p1)] as const;
      };
      for (let i = 0; i < N; i++) {
        const a0 = far + (i / N) * len;
        const a1 = far + ((i + 1) / N) * len;
        const [s0, e0] = edges(a0);
        const [s1, e1] = edges(a1);
        const wid = Math.max(0.5, (e0 - s0 + (e1 - s1)) / 2);
        const la = Math.max(0.01, a1 - a0);
        const st = strips[i].style;
        const k = (s1 - s0) / la; // shear of the leading edge along the slice
        if (vertical) {
          const tx = s0 - from.x;
          const ty = a0 - (from.y + i * sl);
          st.transform = `translate3d(${tx}px, ${ty}px, 0) skewX(${Math.atan(k)}rad) scale(${wid / from.w}, ${la / sl})`;
        } else if (side === 'right') {
          const tx = a0 - (from.x + i * sl);
          const ty = s0 - from.y;
          st.transform = `translate3d(${tx}px, ${ty}px, 0) skewY(${Math.atan(k)}rad) scale(${la / sl}, ${wid / from.h})`;
        } else {
          // left Dock: screen x = -along; the slice's left side is its near end
          const xLeft = -a1;
          const tx = xLeft - (from.x + from.w - (i + 1) * sl);
          const ty = s1 - from.y;
          st.transform = `translate3d(${tx}px, ${ty}px, 0) skewY(${Math.atan(-k)}rad) scale(${la / sl}, ${wid / from.h})`;
        }
        st.opacity = p > 0.94 ? String((1 - p) / 0.06) : '1';
      }
    };

    frame(dir === 'min' ? 0 : 1);
    // the clock starts on the first painted frame, so cloning/layout time never eats into the motion
    let start = -1;
    const step = (now: number) => {
      if (start < 0) start = now;
      const t = clamp01((now - start) / (duration * ((window as unknown as { __genieSlow?: number }).__genieSlow ?? 1)));
      frame(dir === 'min' ? t : 1 - t);
      if (t < 1) requestAnimationFrame(step);
      else {
        layer.remove();
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}
