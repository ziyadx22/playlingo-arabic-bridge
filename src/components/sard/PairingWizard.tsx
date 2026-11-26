import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { consoleAddress, pairingPin } from "@/lib/phone-storage";
import { ConsoleArt } from "./ConsoleArt";
import {
  accountIdSchema,
  discoverConsoles,
  nativePS5Available,
  registerConsole,
  type DiscoveredConsole,
} from "@/lib/ps5-remote-play";

export function PairingWizard({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (ip: string, registered: boolean) => void;
}) {
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState("ps5");
  const [selected, setSelected] = useState<DiscoveredConsole | null>(null);
  const ip = selected?.ip ?? "";
  const [pin, setPin] = useState("");
  const [native, setNative] = useState(false);
  const [consoles, setConsoles] = useState<DiscoveredConsole[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accountId, setAccountId] = useState("");
  useEffect(() => {
    setNative(nativePS5Available());
  }, []);
  const scan = async () => {
    setBusy(true);
    setError("");
    try {
      setConsoles((await discoverConsoles()).consoles.filter((item) => item.type === "PS5"));
    } catch {
      setError(
        "تعذّر البحث. اسمح بالشبكة المحلية، وتأكد من Wi-Fi وصلاحية البث المحلي في النسخة المثبتة.",
      );
    } finally {
      setBusy(false);
    }
  };
  const advance = async () => {
    if (!valid) {
      setError(
        step === 2
          ? "ابحث عن أجهزة PS5 واختر جهازك من القائمة."
          : step === 3
            ? native
              ? "أدخل رقم الإقران المكوّن من 8 أرقام ومعرّف حساب PSN الصحيح."
              : "أدخل رقم الإقران المكوّن من 8 أرقام."
            : "اختر PlayStation PS5 للمتابعة.",
      );
      return;
    }
    if (step === 2 && !native) {
      setError(
        "المتصفح لا يستطيع الاتصال بـ PS5. الربط بالرقم يعمل فقط في تطبيق MZGTA المثبت على الآيفون، والترجمة تتم بقراءة شاشة PS Remote Play.",
      );
      return;
    }
    if (step === 2 && native) {
      setBusy(true);
      setError("");
      try {
        // Re-run discovery so the chosen console is confirmed present right now.
        // Discovery only identifies the console; pairing always needs the PIN.
        const found = (await discoverConsoles()).consoles.filter((c) => c.type === "PS5");
        setConsoles(found);
        const match = found.find((c) => c.hostId === selected?.hostId);
        if (!match) {
          setSelected(null);
          throw new Error("الجهاز المختار ما عاد يستجيب. شغّل PS5، فعّل اللعب عن بُعد، وتأكد إن الآيفون على نفس شبكة Wi-Fi، ثم ابحث مرة ثانية.");
        }
        setSelected(match);
        setStep(3);
      } catch (e) {
        setError(e instanceof Error && /[\u0600-\u06FF]/.test(e.message) ? e.message : "تعذّر الاتصال بالبلايستيشن. تحقق من الشبكة وصلاحية الشبكة المحلية.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === 3 && native) {
      setBusy(true);
      setError("");
      try {
        const result = await registerConsole({ ip, pin, accountId: accountId.trim() });
        if (!result.registered) throw new Error("registration-failed");
        setPin("");
        setAccountId("");
        onComplete(result.ip, true);
      } catch {
        setError(
          "لم ينجح تسجيل البلايستيشن. تحقق من رقم الإقران الحالي ومعرّف الحساب وإعدادات اللعب عن بُعد والشبكة.",
        );
      } finally {
        setBusy(false);
      }
    } else {
      setError("");
      setStep(step + 1);
    }
  };
  const titles = [
    "وش نوع جهازك؟",
    "اختر جهازك",
    "اكتب رقم الإقران",
  ];
  const valid =
    step === 1
      ? device === "ps5"
      : step === 2
        ? selected !== null && consoleAddress.safeParse(ip).success
        : step === 3
          ? pairingPin.safeParse(pin).success &&
            (!native || accountIdSchema.safeParse(accountId).success)
          : false;

  return (
    <div className="flex min-h-[610px] flex-col">
      <div className="mb-8 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="رجوع"
          className="text-phone-foreground hover:bg-phone-surface"
          onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
        >
          <ArrowRight />
        </Button>
        <span className="text-xs text-phone-muted">ربط البلايستيشن</span>
        <span className="text-xs text-phone-primary" dir="ltr">
          {step} / 3
        </span>
      </div>
      <div className="mb-7 flex gap-1.5" aria-label={`الخطوة ${step} من 3`}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${n <= step ? "bg-phone-primary" : "bg-phone-border"}`}
          />
        ))}
      </div>
      <h2 className="mb-3 text-2xl font-semibold leading-relaxed">{titles[step - 1]}</h2>
      {step === 1 && (
        <>
          <p className="mb-6 text-sm text-phone-muted">خلّنا نجهز جهازك قبل أول جلسة.</p>
          <RadioGroup value={device} onValueChange={setDevice} className="gap-3">
            {[
              { id: "ps5", name: "PlayStation PS5", sub: "بلايستيشن 5" },
              { id: "xbox", name: "Xbox Series X|S", sub: "إكس بوكس" },
            ].map((item) => (
              <label
                key={item.id}
                className={`phone-card flex cursor-pointer items-center justify-between p-4 ${device === item.id ? "border-phone-primary bg-phone-primary/5" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={item.id} className="border-phone-primary" />
                  <div>
                    <p className="text-sm font-semibold" dir="ltr">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-phone-muted">{item.sub}</p>
                  </div>
                </div>
                <ConsoleArt xbox={item.id === "xbox"} />
              </label>
            ))}
          </RadioGroup>
          {device === "xbox" && (
            <p role="status" className="mt-4 text-sm text-phone-muted">
              دليل الربط متاح لـ PS5 حالياً. تقدر تترجم ألعاب Xbox بالكاميرا.
            </p>
          )}
        </>
      )}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex justify-center py-3">
            <ConsoleArt large />
          </div>
          <div className="flex items-center gap-2 text-sm text-phone-primary">
            <Wifi className="size-4" /> نفس شبكة Wi-Fi
          </div>
          {native && (
            <>
              <Button
                variant="phone"
                className="w-full"
                disabled={busy}
                onClick={() => void scan()}
              >
                {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} البحث عن أجهزة PS5
              </Button>
              {consoles.map((console) => (
                <Button
                  key={console.hostId}
                  variant="outline"
                  className={`h-auto w-full justify-between py-3 ${selected?.hostId === console.hostId ? "border-phone-primary" : "border-phone-border"}`}
                  aria-pressed={selected?.hostId === console.hostId}
                  onClick={() => {
                    setSelected(console);
                    setError("");
                  }}
                >
                  <span dir="ltr">
                    {console.hostName}
                    <br />
                    <span className="text-xs text-phone-muted">{console.ip}</span>
                  </span>
                  <span className="text-xs text-phone-primary">
                    {console.status === "standby" ? "وضع الراحة" : "جاهز"}
                  </span>
                </Button>
              ))}
              {!busy && !consoles.length && (
                <p className="text-xs text-phone-muted">
                  شغّل PS5 وفعّل اللعب عن بُعد، ثم اضغط البحث.
                </p>
              )}
            </>
          )}
          <p className="text-xs leading-6 text-phone-muted">
            {native
              ? "البحث يحدد أجهزة PS5 في شبكتك فقط. الربط يحتاج رقم الإقران الرسمي من الجهاز في الخطوة التالية."
              : "المتصفح ما يقدر يبحث عن أجهزة الشبكة ولا يتصل بـ PS5. الربط بالرقم يعمل فقط في تطبيق MZGTA المثبت على الآيفون."}
          </p>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-5">
          <div className="phone-card p-4 text-sm leading-8">
            <Monitor className="mb-3 size-6 text-phone-primary" />
            في البلايستيشن: الإعدادات ← النظام ← اللعب عن بُعد ← إقران الجهاز{" "}
            <span dir="ltr">(Pair Device)</span>
          </div>
          <label className="block text-sm">
            رقم الإقران (8 أرقام)
            <input
              autoFocus
              aria-label="رقم إقران البلايستيشن"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="00000000"
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              className="phone-input mt-3 text-center text-2xl"
            />
          </label>
          {native && (
            <label className="block text-sm">
              معرّف حساب PSN (Base64)
              <input
                aria-label="معرّف حساب PSN"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                className="phone-input mt-3"
              />
              <span className="mt-2 block text-xs leading-6 text-phone-muted">
                معرّف الحساب الرقمي المرمّز إلى Base64 (8 بايت)، وليس اسم المستخدم أو كلمة المرور.
                لا يُحفظ في المتصفح.
              </span>
            </label>
          )}
          <p className="text-sm leading-7 text-phone-muted">
            {native
              ? "يُرسل الرقم ومعرّف الحساب إلى PS5 داخل الشبكة المحلية عبر محرك Chiaki. تُحفظ مفاتيح التسجيل في Keychain فقط. لا يبدأ بث الفيديو بعد التسجيل."
              : "أدخل الرقم في تطبيق PS Remote Play الرسمي لإتمام الربط. نسخة المتصفح لا تتصل بالبلايستيشن ولا ترسل هذا الرقم."}
          </p>
          <Button
            asChild
            variant="outline"
            className="w-full border-phone-border bg-phone-surface text-phone-foreground hover:bg-phone-border"
          >
            <a
              href="https://apps.apple.com/app/ps-remote-play/id1436192460"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink /> فتح PS Remote Play
            </a>
          </Button>
        </div>
      )}
      <div className="mt-auto pt-8">
        {error && (
          <p role="alert" className="mb-3 text-xs leading-6 text-destructive">
            {error}
          </p>
        )}
        <Button
          variant="phone"
          className="h-12 w-full"
          disabled={busy || (step >= 2 && !native)}
          onClick={() => void advance()}
        >
          {["التالي", "اتصل", "اربط"][step - 1]}{" "}
          {busy ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
        </Button>
        <p className="mt-3 text-center text-[11px] text-phone-muted">
          {native
            ? "إقران PS5 بالرقم · الترجمة تُقرأ من شاشة PS Remote Play"
            : "الاتصال بـ PS5 غير ممكن من المتصفح"}
        </p>
      </div>
    </div>
  );
}
