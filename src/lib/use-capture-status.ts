import { useEffect, useState } from "react";
import { captureState, getCaptureStatus, nativeCaptureAvailable, type CaptureStatus } from "@/lib/remote-play-capture";

/** Polls the real ReplayKit extension status; in a browser there is no capture at all. */
export function useCaptureStatus() {
  const [native, setNative] = useState(false);
  const [status, setStatus] = useState<CaptureStatus>({});
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const available = nativeCaptureAvailable();
    setNative(available);
    if (!available) return;
    const poll = () => {
      setNow(Date.now() / 1000);
      void getCaptureStatus().then(setStatus).catch(() => {});
    };
    poll();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, []);
  const state: keyof typeof CAPTURE_LABEL = native ? (captureState(status, now) as keyof typeof CAPTURE_LABEL) : "unavailable";
  return { native, status, state };
}

export const CAPTURE_LABEL = {
  live: "يقرأ الترجمة من PS Remote Play",
  waiting: "البث بدأ، بانتظار إطارات الشاشة",
  paused: "التقاط الشاشة متوقف مؤقتاً",
  stopped: "التقاط الشاشة غير مفعّل",
  unavailable: "يحتاج تطبيق MZGTA المثبت على الآيفون",
} as const;
