import { useState } from "react";
import { ExternalLink, Loader2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startScreenCapture, type RegionPreset } from "@/lib/remote-play-capture";
import { useInIOSApp } from "@/lib/use-in-ios-app";
import { CAPTURE_LABEL, useCaptureStatus } from "@/lib/use-capture-status";

const STEPS = [
  { id: "remote", title: "فعّل التشغيل عن بُعد", body: "الإعدادات ← النظام ← التشغيل عن بُعد ← تمكين. وفي توفير الطاقة: ابقَ متصلاً بالإنترنت + تمكين تشغيل PS5 من الشبكة." },
  { id: "app", title: "افتح تطبيق PS Remote Play", body: "على نفس الآيفون، واختر جهازك PS5 داخل تطبيق سوني الرسمي.", link: "https://apps.apple.com/app/ps-remote-play/id1436192460" },
] as const;

export function RemotePlayCapture({ room, paired }: { room: string | null; paired: boolean }) {
  const [preset, setPreset] = useState<RegionPreset>("bottom");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { native, status, state } = useCaptureStatus();
  const inApp = useInIOSApp();
  const start = async () => {
    setError("");
    if (!room || !paired) return setError("اربط التلفزيون أولاً حتى تصله الترجمة.");
    setBusy(true);
    try {
      await startScreenCapture(room, preset);
    } catch {
      setError("تعذّر فتح نافذة بث الشاشة. تأكد أن التطبيق مثبت بإضافة MZGTA Subtitles.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="phone-card p-5">
      <p className="mb-2 text-[10px] text-phone-muted" dir="ltr">REMOTE PLAY CAPTURE / 03</p>
      <h3 className="text-lg font-semibold">ترجمة PS Remote Play</h3>
      <p className="mt-2 text-xs leading-relaxed text-phone-muted">
        العب في تطبيق سوني الرسمي، وMZGTA يقرأ الترجمة الإنجليزية من شاشة الآيفون ويرسل العربي للتلفزيون.
      </p>
      <ol className="mt-4 space-y-2">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex gap-3 rounded-xl border border-phone-border p-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-phone-border text-[10px] text-phone-muted">
              {i + 1}
            </span>
            <div className="min-w-0 text-xs leading-relaxed">
              <p className="font-semibold">{s.title}</p>
              <p className="text-phone-muted">{s.body}</p>
              {"link" in s && (
                <a href={s.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-phone-primary">
                  افتح <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
      {native ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="مكان الترجمة على الشاشة">
            {([["bottom", "أسفل"], ["lower", "النصف السفلي"], ["full", "كامل"]] as const).map(([id, label]) => (
              <Button key={id} type="button" role="radio" aria-checked={preset === id} variant="outline" className={`h-9 text-xs ${preset === id ? "border-phone-primary text-phone-primary" : ""}`} onClick={() => setPreset(id)}>
                {label}
              </Button>
            ))}
          </div>
          <Button variant="phone" className="h-12 w-full" disabled={busy} onClick={() => void start()}>
            {busy ? <Loader2 className="animate-spin" /> : <Radio />} ابدأ التقاط الشاشة
          </Button>
          <p role="status" className="text-xs text-phone-muted">
            <span className={state === "live" ? "text-phone-primary" : ""}>{CAPTURE_LABEL[state]}</span>
            {status.lastRead && <><br />آخر نص مقروء: <span dir="ltr">{status.lastRead}</span></>}
            {status.lastArabic && <><br />آخر ترجمة أُرسلت للتلفزيون: {status.lastArabic}</>}
            {state !== "stopped" && <><br />أُرسل للتلفزيون: {status.sentCount ?? 0} سطر</>}
            {status.error === "translation" && <><br />تعذّرت ترجمة آخر سطر.</>}
            {status.error === "tv" && <><br />تعذّر إرسال آخر سطر للتلفزيون.</>}
          </p>
          <p className="text-[11px] leading-relaxed text-phone-muted">
            بعد الضغط اختر «MZGTA Subtitles» ثم «بدء البث»، وافتح PS Remote Play. MZGTA لا يرى جلسة سوني نفسها؛ الحالة هنا حالة الالتقاط فقط.
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-phone-border p-3 text-[11px] leading-relaxed text-phone-muted">
          {inApp
            ? "أنت داخل تطبيق MZGTA على الآيفون، لكن إضافة التقاط الشاشة غير محمّلة في هذه النسخة. ثبّت آخر نسخة، وحتى ذلك استخدم الكاميرا على التلفزيون."
            : "قراءة شاشة تطبيق آخر تحتاج تطبيق MZGTA المثبت على الآيفون. المتصفح لا يقدر يشوف شاشة PS Remote Play؛ هنا استخدم الكاميرا على التلفزيون."}
        </p>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </article>
  );
}
