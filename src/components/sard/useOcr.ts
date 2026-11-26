import { useRef, useState } from "react";

type Worker = { recognize(img: HTMLCanvasElement): Promise<{ data: { text: string; confidence: number } }>; terminate(): Promise<unknown> };

/** Lazy browser-only Tesseract OCR over a cropped region of a video element. */
export function useOcr() {
  const worker = useRef<Promise<Worker> | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const get = () => {
    if (!worker.current) {
      setLoading(true);
      worker.current = import("tesseract.js").then(async (T) => {
        const w = await T.createWorker("eng");
        setLoading(false);
        return w as unknown as Worker;
      });
    }
    return worker.current;
  };

  /** roi in percent of the visible frame. */
  const read = async (v: HTMLVideoElement, roi: { x: number; y: number; w: number; h: number }) => {
    if (!v.videoWidth || busy) return null;
    setBusy(true);
    try {
      const w = await get();
      // video is object-cover in the box; map visible ROI to source pixels
      const box = v.getBoundingClientRect();
      const scale = Math.max(box.width / v.videoWidth, box.height / v.videoHeight);
      const visW = box.width / scale, visH = box.height / scale;
      const offX = (v.videoWidth - visW) / 2, offY = (v.videoHeight - visH) / 2;
      const sx = offX + (roi.x / 100) * visW, sy = offY + (roi.y / 100) * visH;
      const sw = (roi.w / 100) * visW, sh = (roi.h / 100) * visH;
      const c = document.createElement("canvas"); const k = Math.max(1, 1200 / sw);
      c.width = sw * k; c.height = sh * k;
      const ctx = c.getContext("2d")!; ctx.filter = "grayscale(1) contrast(1.6)";
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
      const { data } = await w.recognize(c);
      const text = data.text.replace(/\s+/g, " ").trim();
      return { text, confidence: Math.round(data.confidence) };
    } finally { setBusy(false); }
  };
  return { read, busy, loading };
}
