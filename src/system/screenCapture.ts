import { useEffect, useState } from 'react';
import { notify } from './notify';
import { playShutter } from './sounds';

/**
 * Real screenshots and screen recordings using the browser's screen-capture
 * API (getDisplayMedia). The browser always asks the visitor which screen,
 * window or tab to share — nothing is captured without that choice, and the
 * files are saved straight to the visitor's device (never uploaded).
 */

const EVT = 'mra-screen-rec';
let recorder: MediaRecorder | null = null;
let recStart = 0;

export function captureSupported(): boolean {
  return !!(navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) && window.isSecureContext;
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} at ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function explain(err: unknown, what: string) {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') notify({ app: what, icon: 'camera', title: `${what} cancelled`, body: 'No screen was chosen.' });
  else notify({ app: what, icon: 'camera', title: `${what} isn’t available`, body: 'Your browser doesn’t allow screen capture here (it needs a desktop browser over HTTPS or localhost).' });
}

/** Take one screenshot of the screen/window/tab the visitor picks → PNG download. */
export async function takeScreenshot(): Promise<void> {
  if (!captureSupported()) return explain(new Error('unsupported'), 'Screenshot');
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => window.setTimeout(r, 250));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (blob) {
      playShutter(0.6);
      download(blob, `Screenshot ${stamp()}.png`);
      notify({ app: 'Screenshot', icon: 'camera', title: 'Screenshot saved', body: 'Saved to your Downloads folder.' });
    }
  } catch (e) {
    explain(e, 'Screenshot');
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

/** Start/stop a screen recording of what the visitor picks → WebM download. */
export async function toggleScreenRecording(): Promise<void> {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
    return;
  }
  if (!captureSupported() || typeof MediaRecorder === 'undefined') return explain(new Error('unsupported'), 'Screen Recording');
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = rec.mimeType || 'video/webm';
      download(new Blob(chunks, { type }), `Screen Recording ${stamp()}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
      notify({ app: 'Screen Recording', icon: 'camera', title: 'Screen recording saved', body: 'Saved to your Downloads folder.' });
      recorder = null;
      window.dispatchEvent(new Event(EVT));
    };
    // the browser's own "Stop sharing" button also ends the recording
    stream.getVideoTracks()[0]?.addEventListener('ended', () => rec.state !== 'inactive' && rec.stop());
    rec.start(1000);
    recorder = rec;
    recStart = Date.now();
    window.dispatchEvent(new Event(EVT));
  } catch (e) {
    explain(e, 'Screen Recording');
  }
}

/** Live recording state for the UI: null when not recording, else start time. */
export function useScreenRecording(): number | null {
  const [since, setSince] = useState<number | null>(recorder ? recStart : null);
  useEffect(() => {
    const on = () => setSince(recorder ? recStart : null);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return since;
}
