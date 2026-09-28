/**
 * v9 — FaceTime / WhatsApp call interface (demo). Calls are placed inside the
 * portfolio only; the real way to reach M.R. Ahamed (WhatsApp / phone) is
 * offered on every call screen.
 */
export interface CallRequest {
  app: 'facetime' | 'whatsapp';
  video: boolean;
  /** incoming = the portfolio "rings" the visitor (a demo call from the portfolio assistant) */
  incoming?: boolean;
}
export const CALL_EVT = 'mra-call';
export function startCall(r: CallRequest) {
  window.dispatchEvent(new CustomEvent<CallRequest>(CALL_EVT, { detail: r }));
}
