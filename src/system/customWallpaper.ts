import { notify } from './notify';

/**
 * v9 — turn any image (a Photos item or a file the visitor picks) into the
 * desktop wallpaper. Uploads are resized to at most 2560 px and stored as a
 * compressed JPEG in this browser only.
 */
export interface CustomWall {
  src: string;
  tone: 'light' | 'dark';
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('image'));
    im.src = src;
  });
}

/** brightness of the top strip (menu bar area) decides light/dark menu-bar text */
function toneOf(im: HTMLImageElement): 'light' | 'dark' {
  try {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 8;
    const g = c.getContext('2d');
    if (!g) return 'dark';
    g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * 0.08, 0, 0, 64, 8);
    const d = g.getImageData(0, 0, 64, 8).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return sum / (d.length / 4) > 150 ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export async function wallFromUrl(src: string): Promise<CustomWall> {
  const im = await load(src);
  return { src, tone: toneOf(im) };
}

export async function wallFromFile(file: File): Promise<CustomWall> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const url = URL.createObjectURL(file);
  try {
    const im = await load(url);
    const scale = Math.min(1, 2560 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * scale);
    c.height = Math.round(im.naturalHeight * scale);
    c.getContext('2d')?.drawImage(im, 0, 0, c.width, c.height);
    let q = 0.86;
    let data = c.toDataURL('image/jpeg', q);
    while (data.length > 1_800_000 && q > 0.5) {
      q -= 0.12;
      data = c.toDataURL('image/jpeg', q);
    }
    return { src: data, tone: toneOf(im) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function wallNotice(name: string) {
  notify({ app: 'Wallpaper', icon: 'photos', title: 'Wallpaper updated', body: `${name} is now your desktop picture.` });
}
