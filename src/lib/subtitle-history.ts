import type { SubMsg } from "./sync";

/** Reconnect handshakes replay the current subtitle; do not count it as a new line. */
export function appendSubtitle(history: SubMsg[], message: SubMsg): SubMsg[] {
  if (history.some((line) => line.id === message.id)) return history;
  return [...history.slice(-49), message];
}
