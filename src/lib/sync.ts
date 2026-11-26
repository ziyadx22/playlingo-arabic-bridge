import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Settings } from "@/components/sard/data";

export type SubMsg = { en: string; ar: string; speaker: string; id: number };
export type Msg =
  { t: "hello" } | { t: "sub"; sub: SubMsg } | { t: "settings"; s: Settings } | { t: "ack" };

/** Live room shared by TV and phone over Lovable Cloud realtime broadcast (works across devices). */
export function useRoom(room: string | null, onMsg: (m: Msg) => void) {
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "disconnected">("idle");
  const [peers, setPeers] = useState(0);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ready = useRef(false);
  const pending = useRef(new Map<Msg["t"], Msg>());
  const cb = useRef(onMsg);
  cb.current = onMsg;

  useEffect(() => {
    if (!room) return;
    setStatus("connecting");
    const queue = pending.current;
    const ch = supabase.channel(`sard-room-${room}`, {
      config: { broadcast: { self: false, ack: true }, presence: { key: crypto.randomUUID() } },
    });
    let active = true;
    const flush = () => {
      if (!ready.current) return;
      for (const [key, msg] of pending.current) {
        pending.current.delete(key);
        void ch.send({ type: "broadcast", event: "m", payload: msg }).then((result) => {
          if (active && result !== "ok" && !pending.current.has(key)) pending.current.set(key, msg);
        });
      }
    };
    ch.on("presence", { event: "sync" }, () =>
      setPeers(Math.max(0, Object.keys(ch.presenceState()).length - 1)),
    );
    ch.on("broadcast", { event: "m" }, ({ payload }) => {
      if (payload && ["hello", "ack", "sub", "settings"].includes(payload.t))
        cb.current(payload as Msg);
    }).subscribe((st) => {
      if (!active) return;
      ready.current = st === "SUBSCRIBED";
      if (ready.current) {
        setStatus("live");
        void ch.track({ online: true });
        flush();
      } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") {
        setStatus("disconnected");
        setPeers(0);
      }
    });
    chRef.current = ch;
    const retry = setInterval(flush, 2000);
    return () => {
      active = false;
      ready.current = false;
      clearInterval(retry);
      queue.clear();
      void supabase.removeChannel(ch);
      chRef.current = null;
      setStatus("idle");
      setPeers(0);
    };
  }, [room]);

  const send = useCallback((m: Msg) => {
    const ch = chRef.current;
    if (!ch || !ready.current) {
      pending.current.set(m.t, m);
      return;
    }
    void ch.send({ type: "broadcast", event: "m", payload: m }).then((result) => {
      if (chRef.current === ch && result !== "ok") pending.current.set(m.t, m);
    });
  }, []);
  return { status, send, peers };
}
