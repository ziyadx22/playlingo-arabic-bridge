import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrScanner({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    (async () => {
      try {
        const jsQR = (await import("jsqr")).default;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const v = video.current;
        if (!alive || !v) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        v.srcObject = stream;
        await v.play();
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        const tick = () => {
          if (!alive) return;
          if (v.videoWidth && !document.hidden) {
            const scale = Math.min(1, 640 / v.videoWidth);
            c.width = Math.round(v.videoWidth * scale);
            c.height = Math.round(v.videoHeight * scale);
            ctx.drawImage(v, 0, 0, c.width, c.height);
            const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
            if (code?.data) {
              onResult(code.data);
              return;
            }
          }
          timer = setTimeout(tick, 200);
        };
        tick();
      } catch {
        if (alive) setErr("تعذّر فتح الكاميرا — اسمح بالوصول أو أدخل الرمز يدوياً");
      }
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-[2.3rem] bg-obsidian/95 p-6">
      <Button
        variant="ghost"
        onClick={onClose}
        aria-label="إغلاق"
        className="absolute left-5 top-5 rounded-full glass p-2"
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-neon glow-neon">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {err ?? "وجّه الكاميرا نحو رمز QR على شاشة التلفاز"}
      </p>
    </div>
  );
}
