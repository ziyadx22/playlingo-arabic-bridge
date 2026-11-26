import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Settings } from "@/components/sard/data";

export type SubMsg = { en: string; ar: string; speaker: string; id: number };
export type Msg =
  | { t: "hello" }
  | { t: "sub"; sub: SubMsg }
  | { t: "settings"; s: Settings }
  | { t: "ack" };

/** Live room shared by TV and phone over Lovable Cloud realtime broadcast (works across devices). */
export function useRoom(room: string | null, onMsg: (m: Msg) => void) {
  const [status, setStatus] = useState<"idle" | "connecting" | "live">("idle");
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const cb = useRef(onMsg);
  cb.current = onMsg;

  useEffect(() => {
    if (!room) return;
    setStatus("connecting");
    const ch = supabase.channel(`sard-room-${room}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "m" }, ({ payload }) => cb.current(payload as Msg)).subscribe((st) => {
      if (st === "SUBSCRIBED") setStatus("live");
    });
    chRef.current = ch;
    return () => { supabase.removeChannel(ch); chRef.current = null; setStatus("idle"); };
  }, [room]);

  const send = (m: Msg) => { void chRef.current?.send({ type: "broadcast", event: "m", payload: m }); };
  return { status, send };
}
