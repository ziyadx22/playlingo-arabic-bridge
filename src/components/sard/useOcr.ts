import { useCallback, useEffect, useRef, useState } from "react";

type Worker = {
  recognize(img: HTMLCanvasElement): Promise<{ data: { text: string; confidence: number } }>;
  terminate(): Promise<unknown>;
};

/** Lazy browser-only Tesseract OCR over a cropped region of a video element. */
export function useOcr() {
  const worker = useRef<Promise<Worker> | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const reading = useRef(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(
    () => () => {
      const pending = worker.current;
      worker.current = null;
      void pending?.then((w) => w.terminate()).catch(() => {});
    },
    [],
  );

  const get = useCallback(() => {
    if (!worker.current) {
      setLoading(true);
      worker.current = import("tesseract.js")
        .then(async (T) => {
          const w = await T.createWorker("eng");
          await w.setParameters({ tessedit_pageseg_mode: T.PSM.SINGLE_BLOCK });
          return w as unknown as Worker;
        })
        .catch((e: unknown) => {
          worker.current = null;
          throw e;
        })
        .finally(() => setLoading(false));
    }
    return worker.current;
  }, []);

  /** roi in percent of the visible frame. */
  const read = useCallback(
    async (v: HTMLVideoElement, roi: { x: number; y: number; w: number; h: number }) => {
      if (!v.videoWidth || reading.current) return null;
      reading.current = true;
      setBusy(true);
      try {
        const w = await get();
        // video is object-cover in the box; map visible ROI to source pixels
        const box = v.getBoundingClientRect();
        if (!box.width || !box.height) return null;
        const scale = Math.max(box.width / v.videoWidth, box.height / v.videoHeight);
        const visW = box.width / scale,
          visH = box.height / scale;
        const offX = (v.videoWidth - visW) / 2,
          offY = (v.videoHeight - visH) / 2;
        const sx = offX + (roi.x / 100) * visW,
          sy = offY + (roi.y / 100) * visH;
        const sw = (roi.w / 100) * visW,
          sh = (roi.h / 100) * visH;
        if (sw <= 0 || sh <= 0) return null;
        const c = canvas.current ?? document.createElement("canvas");
        canvas.current = c;
        const k = Math.min(2, 1000 / sw, 300 / sh);
        c.width = Math.max(1, Math.round(sw * k));
        c.height = Math.max(1, Math.round(sh * k));
        const ctx = c.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
        const { data } = await w.recognize(c);
        const text = data.text.replace(/\s+/g, " ").trim();
        return { text, confidence: Math.round(data.confidence) };
      } finally {
        reading.current = false;
        setBusy(false);
      }
    },
    [get],
  );
  return { read, busy, loading };
}
