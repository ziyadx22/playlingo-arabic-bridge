import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stream: MediaStream | null = null; let raf = 0; let alive = true;
    (async () => {
      try {
        const jsQR = (await import("jsqr")).default;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = video.current!; v.srcObject = stream; await v.play();
        const c = document.createElement("canvas"); const ctx = c.getContext("2d", { willReadFrequently: true })!;
        const tick = () => {
          if (!alive) return;
          if (v.videoWidth) {
            c.width = v.videoWidth; c.height = v.videoHeight; ctx.drawImage(v, 0, 0);
            const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
            if (code?.data) { onResult(code.data); return; }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch { setErr("تعذّر فتح الكاميرا — اسمح بالوصول أو أدخل الرمز يدوياً"); }
    })();
    return () => { alive = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onResult]);
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-[2.3rem] bg-obsidian/95 p-6">
      <button onClick={onClose} aria-label="إغلاق" className="absolute left-5 top-5 rounded-full glass p-2"><X className="h-4 w-4" /></button>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-neon glow-neon">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-neon/40 to-transparent animate-scan" />
      </div>
      <p className="text-center text-sm text-muted-foreground">{err ?? "وجّه الكاميرا نحو رمز QR على شاشة التلفاز"}</p>
    </div>
  );
}
