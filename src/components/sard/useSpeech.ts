import { useCallback, useEffect, useRef, useState } from "react";

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

/** Browser speech-to-text (Safari/Chrome Web Speech API). */
export function useSpeech(onFinal: (text: string) => void) {
  const [on, setOn] = useState(false);
  const [interim, setInterim] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const want = useRef(false);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;
  useEffect(
    () => () => {
      want.current = false;
      rec.current?.stop();
    },
    [],
  );

  const start = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => Rec;
      webkitSpeechRecognition?: new () => Rec;
    };
    const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!C) {
      setErr("المتصفح لا يدعم تحويل الكلام لنص — استخدم Safari أو Chrome");
      return;
    }
    const r = new C();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let tmp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (!res) continue;
        const t = res[0].transcript.trim();
        if (res.isFinal) {
          if (t) finalRef.current(t);
        } else tmp += t + " ";
      }
      setInterim(tmp);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") {
        setErr("لم يُسمح باستخدام الميكروفون");
        want.current = false;
      }
    };
    r.onend = () => {
      if (want.current) {
        try {
          r.start();
        } catch {
          /* restarting */
        }
      } else {
        setOn(false);
        setInterim("");
      }
    };
    try {
      want.current = true;
      rec.current = r;
      setErr(null);
      r.start();
      setOn(true);
    } catch {
      want.current = false;
      setOn(false);
      setErr("تعذّر تشغيل الميكروفون، حاول مجدداً");
    }
  };
  const stop = useCallback(() => {
    want.current = false;
    rec.current?.stop();
    setOn(false);
  }, []);
  return { on, interim, err, stop, toggle: () => (on ? stop() : start()) };
}
