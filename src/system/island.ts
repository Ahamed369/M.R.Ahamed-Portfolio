/**
 * v10 — Dynamic Island events (Mac notch and iPhone). Anything can show a
 * short "live activity"; long-running ones (timer, call, music, recording,
 * torch, charging) are kept as state by the island itself.
 */
export interface IslandPing {
  icon?: string;
  title: string;
  sub?: string;
  /** colour accent of the leading glyph */
  tint?: string;
  ms?: number;
  /** v10.3 — what a tap on this alert does (open the app / content it is about) */
  onTap?: () => void;
}
export const ISLAND_EVT = 'mra-island';
export const ISLAND_TIMER = 'mra-island-timer';
export const ISLAND_REC = 'mra-island-rec';
export const ISLAND_TORCH = 'mra-island-torch';

export function islandPing(p: IslandPing) {
  window.dispatchEvent(new CustomEvent<IslandPing>(ISLAND_EVT, { detail: p }));
}
let timerEnd: number | null = null;
export const getTimerEnd = () => timerEnd;
export function islandTimer(end: number | null) {
  timerEnd = end;
  window.dispatchEvent(new CustomEvent(ISLAND_TIMER, { detail: end }));
}
let rec = false;
export const isRecording = () => rec;
export function islandRecording(on: boolean) {
  rec = on;
  window.dispatchEvent(new CustomEvent(ISLAND_REC, { detail: on }));
}
let torch = false;
export const isTorch = () => torch;
export function islandTorch(on: boolean) {
  torch = on;
  window.dispatchEvent(new CustomEvent(ISLAND_TORCH, { detail: on }));
}

/** v10.2 — the portfolio assistant's live state (listening / speaking) for the Dynamic Island */
export type AssistState = 'idle' | 'listening' | 'thinking' | 'speaking';
export const ISLAND_ASSIST = 'mra-assistant';
let assist: AssistState = 'idle';
export const getAssist = () => assist;
export function islandAssistant(s: AssistState) {
  assist = s;
  window.dispatchEvent(new CustomEvent<AssistState>(ISLAND_ASSIST, { detail: s }));
}
