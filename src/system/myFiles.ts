import { useEffect, useState } from 'react';
import { idbGet, idbSet } from './idb';
import { notify } from './notify';

/**
 * v10.1 — "My Files": real files the visitor drags in (or picks) are kept
 * in this browser's IndexedDB. They never leave the device and can be
 * removed at any time from Finder → My Files or Photos → Imports.
 */
export interface MyFile {
  id: string;
  name: string;
  type: string;
  size: number;
  added: number;
  tags: string[];
}
const INDEX = 'my-files-index';
const EVT = 'mra-my-files';
const MAX_FILE = 15 * 1024 * 1024;
const MAX_TOTAL = 80 * 1024 * 1024;

let cache: MyFile[] | null = null;
const urls = new Map<string, string>();

async function load(): Promise<MyFile[]> {
  if (cache) return cache;
  cache = (await idbGet<MyFile[]>(INDEX)) ?? [];
  return cache;
}
async function save(list: MyFile[]) {
  cache = list;
  await idbSet(INDEX, list);
  window.dispatchEvent(new Event(EVT));
}

export async function addFiles(files: FileList | File[], only?: 'image'): Promise<MyFile[]> {
  const list = [...(await load())];
  let total = list.reduce((a, f) => a + f.size, 0);
  const added: MyFile[] = [];
  const skipped: string[] = [];
  for (const f of Array.from(files)) {
    if (only === 'image' && !/^image\//.test(f.type)) {
      skipped.push(`${f.name} (not a photo)`);
      continue;
    }
    if (f.size > MAX_FILE || total + f.size > MAX_TOTAL) {
      skipped.push(`${f.name} (too large)`);
      continue;
    }
    const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await idbSet(`my-file:${id}`, f);
    const m: MyFile = { id, name: f.name, type: f.type || 'application/octet-stream', size: f.size, added: Date.now(), tags: [] };
    list.unshift(m);
    added.push(m);
    total += f.size;
  }
  if (added.length) await save(list);
  if (added.length) notify({ app: only === 'image' ? 'Photos' : 'Finder', icon: only === 'image' ? 'photos' : 'finder', title: `${added.length} item${added.length === 1 ? '' : 's'} added`, body: 'Kept only in this browser.', silent: true });
  if (skipped.length) notify({ app: only === 'image' ? 'Photos' : 'Finder', icon: only === 'image' ? 'photos' : 'finder', title: `${skipped.length} item${skipped.length === 1 ? '' : 's'} skipped`, body: `${skipped.slice(0, 3).join(', ')} — files up to 15 MB, 80 MB in total.` });
  return added;
}

export async function removeFile(id: string) {
  await idbSet(`my-file:${id}`, undefined);
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
  await save((await load()).filter((f) => f.id !== id));
}

export async function renameFile(id: string, name: string) {
  await save((await load()).map((f) => (f.id === id ? { ...f, name } : f)));
}
export async function setFileTags(id: string, tags: string[]) {
  await save((await load()).map((f) => (f.id === id ? { ...f, tags } : f)));
}
export async function duplicateFile(id: string) {
  const list = await load();
  const f = list.find((x) => x.id === id);
  const blob = await idbGet<Blob>(`my-file:${id}`);
  if (!f || !blob) return;
  const dot = f.name.lastIndexOf('.');
  const name = dot > 0 ? `${f.name.slice(0, dot)} copy${f.name.slice(dot)}` : `${f.name} copy`;
  await addFiles([new File([blob], name, { type: f.type })]);
}

/** an object URL for showing / downloading a stored file */
export async function fileUrl(id: string): Promise<string | null> {
  const u = urls.get(id);
  if (u) return u;
  const blob = await idbGet<Blob>(`my-file:${id}`);
  if (!blob) return null;
  const n = URL.createObjectURL(blob);
  urls.set(id, n);
  return n;
}

export function useMyFiles(): MyFile[] {
  const [list, setList] = useState<MyFile[]>(cache ?? []);
  useEffect(() => {
    let live = true;
    const on = () => void load().then((l) => live && setList([...l]));
    on();
    window.addEventListener(EVT, on);
    return () => {
      live = false;
      window.removeEventListener(EVT, on);
    };
  }, []);
  return list;
}

/** object URLs for a set of files (loaded lazily) */
export function useFileUrls(ids: string[]): Record<string, string> {
  const [m, setM] = useState<Record<string, string>>({});
  const key = ids.join(',');
  useEffect(() => {
    let live = true;
    void Promise.all(ids.map(async (id) => [id, await fileUrl(id)] as const)).then((pairs) => {
      if (!live) return;
      const o: Record<string, string> = {};
      pairs.forEach(([id, u]) => u && (o[id] = u));
      setM(o);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return m;
}

export const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
export const kindOf = (t: string) => (t.startsWith('image/') ? 'Image' : t.startsWith('video/') ? 'Movie' : t.startsWith('audio/') ? 'Audio' : t === 'application/pdf' ? 'PDF Document' : t.startsWith('text/') ? 'Text Document' : 'Document');

export const TAGS: { id: string; label: string; color: string }[] = [
  { id: 'red', label: 'Red', color: '#ff453a' },
  { id: 'orange', label: 'Orange', color: '#ff9f0a' },
  { id: 'yellow', label: 'Yellow', color: '#ffd60a' },
  { id: 'green', label: 'Green', color: '#30d158' },
  { id: 'blue', label: 'Blue', color: '#0a84ff' },
  { id: 'purple', label: 'Purple', color: '#bf5af2' },
  { id: 'grey', label: 'Grey', color: '#8e8e93' },
];
