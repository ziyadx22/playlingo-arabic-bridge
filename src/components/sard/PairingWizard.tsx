import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Gamepad2,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { consoleAddress, pairingPin } from "@/lib/phone-storage";
import { ConsoleArt } from "./ConsoleArt";
import {
  discoverConsoles,
  nativePS5Available,
  getCapabilities,
  nativeBridgeStatus,
  nativeErrorCode,
  privateIPv4,
  probeConsole,
  runningInIOSApp,
  type NativeBridgeStatus,
  registerConsole,
  type DiscoveredConsole,
} from "@/lib/ps5-remote-play";

const PLUGIN_MISSING =
  "أنت داخل تطبيق MZGTA على الآيفون، لكن إضافة PS5 غير محمّلة في هذه النسخة. ثبّت آخر نسخة من التطبيق ثم أعد المحاولة.";

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
  const [manualIp, setManualIp] = useState("");
  const typedIp = privateIPv4.safeParse(manualIp.trim()).success ? manualIp.trim() : "";
  const ip = selected?.ip ?? typedIp;
  const [pin, setPin] = useState("");
  const [native, setNative] = useState(false);
  const [bridge, setBridge] = useState<NativeBridgeStatus>("browser");
  const [inApp, setInApp] = useState(false);
  const [autoDiscovery, setAutoDiscovery] = useState(true);
  const [consoles, setConsoles] = useState<DiscoveredConsole[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [paired, setPaired] = useState<{ ip: string; nickname: string } | null>(null);
  useEffect(() => {
    const available = nativePS5Available();
    setNative(available);
    setInApp(runningInIOSApp());
    setBridge(nativeBridgeStatus());
    if (available)
      getCapabilities()
        .then((caps) => {
          setAutoDiscovery(caps.autoDiscovery);
          if (!caps.autoDiscovery) setShowManual(true);
        })
        .catch(() => setAutoDiscovery(true));
  }, []);
  useEffect(() => {
    if (step === 2 && native && autoDiscovery && !consoles.length) void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, native]);
  const findByAddress = async () => {
    const parsed = privateIPv4.safeParse(manualIp.trim());
    if (!parsed.success) {
      setError("اكتب عنوان IP محلي صحيح للبلايستيشن، مثل 192.168.1.20.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const found = (await probeConsole(parsed.data)).consoles.filter((c) => c.type === "PS5");
      if (!found[0]) throw new Error("not-ps5");
      setConsoles((list) => [...found, ...list.filter((c) => c.hostId !== found[0]?.hostId)]);
      setSelected(found[0]);
    } catch (e) {
      setError(
        nativeErrorCode(e) === "LOCAL_NETWORK_DENIED"
          ? "اسمح لتطبيق MZGTA بالوصول للشبكة المحلية من إعدادات الآيفون ← الخصوصية ← الشبكة المحلية."
          : `ما فيه PS5 يرد على ${parsed.data}. تأكد إن الجهاز شغّال، واللعب عن بُعد مفعّل، والعنوان صحيح. إذا كانت شاشة «إقران الجهاز» ظاهرة على PS5 اضغط «اتصل» وأدخل رقم الإقران.`,
      );
    } finally {
      setBusy(false);
    }
  };
  const scan = async () => {
    setBusy(true);
    setError("");
    try {
      const found = (await discoverConsoles()).consoles.filter((item) => item.type === "PS5");
      setConsoles(found);
      if (found.length === 1) setSelected(found[0] ?? null);
      if (!found.length) {
        setShowManual(true);
        setError("ما لقينا PS5 تلقائياً. اكتب عنوان البلايستيشن.");
      }
    } catch (e) {
      if (nativeErrorCode(e) === "MULTICAST_UNAVAILABLE") {
        setAutoDiscovery(false);
        setShowManual(true);
      } else {
        setError(
          "تعذّر البحث التلقائي. اسمح بالشبكة المحلية وتأكد من Wi-Fi، أو اكتب عنوان IP الخاص بالبلايستيشن يدوياً.",
        );
      }
    } finally {
      setBusy(false);
    }
  };
  const advance = async () => {
    if (!valid) {
      setError(
        step === 3
          ? "أدخل رقم الإقران المكوّن من 8 أرقام."
          : step === 2
            ? "ما تعرّفنا على PS5 تلقائياً. اكتب عنوان IP الخاص به كبديل."
            : "اختر PlayStation PS5 للمتابعة.",
      );
      return;
    }
    if (step >= 2 && !native) {
      setError(
        inApp
          ? PLUGIN_MISSING
          : "المتصفح لا يستطيع الاتصال بـ PS5. الربط بالرقم يعمل فقط في تطبيق MZGTA المثبت على الآيفون.",
      );
      return;
    }
    if (step === 3) {
      setBusy(true);
      setError("");
      try {
        // The PS5 itself verifies the PIN during Chiaki registration;
        // success is shown only when it accepts it. No account ID is sent.
        const result = await registerConsole({ ip, pin });
        if (!result.registered) throw new Error("registration-failed");
        setPin("");
        setPaired({ ip: result.ip, nickname: result.nickname ?? "PS5" });
        setGuide(0);
      } catch (e) {
        const code = nativeErrorCode(e);
        setError(
          code === "LOCAL_NETWORK_DENIED"
            ? "اسمح لتطبيق MZGTA بالوصول للشبكة المحلية من إعدادات الآيفون ← الخصوصية ← الشبكة المحلية."
            : code === "NO_WIFI"
              ? "وصّل الآيفون بنفس شبكة Wi-Fi اللي عليها PS5."
              : code === "KEYCHAIN_FAILED"
                ? "قبل PS5 الربط، لكن تعذّر حفظ المفاتيح على الآيفون. أعد المحاولة."
                : `رفض PS5 الربط على ${ip}. تأكد إن شاشة «إقران الجهاز» ما زالت ظاهرة والرقم لم تنتهِ مدته.`,
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    setError("");
    setStep(step + 1);
  };
  const titles = ["وش نوع جهازك؟", "اختر جهازك", "اكتب رقم الإقران"];
  const valid =
    step === 1
      ? device === "ps5"
      : step === 2
        ? consoleAddress.safeParse(ip).success
        : step === 3
          ? pairingPin.safeParse(pin).success
          : false;

  if (paired) {
    const guides = [
      {
        title: "أخفِ رسالة الاتصال",
        body: (
          <>
            <p className="mb-3">
              عشان ما تغطي رسالة الاتصال على الترجمة، أخفها من البلايستيشن:
            </p>
            <p>
              الإعدادات ← النظام ← اللعب عن بُعد ← فعّل «إخفاء حالة اتصال اللعب عن بُعد»
            </p>
          </>
        ),
      },
      {
        title: "الحين ادخل بحسابك الأساسي اللي بتلعب فيه",
        body: (
          <ol className="space-y-3">
            <li>1- اضغط زر PS على يد التحكم.</li>
            <li>
              2- اختر صورة حسابك ← تبديل المستخدم <span dir="ltr">(Switch User)</span>.
            </li>
            <li>3- ادخل بحسابك الأساسي اللي بتلعب فيه.</li>
          </ol>
        ),
      },
    ];
    const current = guides[guide];
    return (
      <div className="flex min-h-[610px] flex-col">
        {guide === 0 && (
          <div className="mb-6 flex items-center gap-3 text-sm text-phone-primary">
            <CheckCircle2 className="size-5" />
            <span>
              تم إقران <span dir="ltr">{paired.nickname}</span> ✅ <span dir="ltr">· {paired.ip}</span>
            </span>
          </div>
        )}
        <div className="mb-7 flex gap-1.5" aria-label={`إرشاد ${guide + 1} من ${guides.length}`}>
          {guides.map((_, n) => (
            <div key={n} className={`h-1 flex-1 rounded-full ${n <= guide ? "bg-phone-primary" : "bg-phone-border"}`} />
          ))}
        </div>
        <h2 className="mb-5 text-2xl font-semibold leading-relaxed">{current?.title}</h2>
        <div className="flex justify-center py-3">
          <ConsoleArt large />
        </div>
        <div className="phone-card mt-4 p-4 text-sm leading-8">{current?.body}</div>
        <div className="mt-auto pt-8">
          <Button
            variant="phone"
            className="h-12 w-full"
            onClick={() =>
              guide < guides.length - 1 ? setGuide(guide + 1) : onComplete(paired.ip, true)
            }
          >
            {guide < guides.length - 1 ? "التالي" : "متابعة: التقاط الشاشة وبدء الترجمة"} <ArrowLeft />
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="space-y-4">
          <p className="text-sm text-phone-muted">البلايستيشن اللي على نفس الشبكة.</p>
          {bridge !== "active" && (
            <p role="status" className="phone-card p-4 text-xs leading-6 text-phone-muted">
              {bridge === "native-no-plugin"
                ? PLUGIN_MISSING
                : "المتصفح ما يقدر يبحث عن أجهزة الشبكة ولا يتصل بـ PS5. الربط يعمل فقط في تطبيق MZGTA المثبت على الآيفون."}
            </p>
          )}
          {native && (
            <>
              {consoles.map((console) => {
                const active = selected?.hostId === console.hostId;
                return (
                  <button
                    key={console.hostId}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelected(console);
                      setError("");
                    }}
                    className={`flex w-full items-center gap-4 rounded-3xl border-2 bg-phone-surface p-4 text-start transition-colors ${active ? "border-phone-primary" : "border-phone-border"}`}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-phone-primary/80 text-phone-foreground">
                      <Gamepad2 className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold" dir="ltr">
                        {console.hostName}
                      </span>
                      <span className="mt-1 block text-sm text-phone-muted" dir="ltr">
                        {console.ip}
                        {console.status === "standby" ? " · وضع الراحة" : ""}
                      </span>
                    </span>
                    {active ? (
                      <CheckCircle2 className="size-7 shrink-0 fill-phone-primary text-phone-surface" />
                    ) : (
                      <span className="size-7 shrink-0 rounded-full border-2 border-phone-border" />
                    )}
                  </button>
                );
              })}
              {busy && !consoles.length && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-phone-muted">
                  <Loader2 className="size-4 animate-spin" /> ندوّر على البلايستيشن…
                </div>
              )}
              {autoDiscovery && !busy && (
                <button
                  type="button"
                  onClick={() => void scan()}
                  className="mx-auto flex items-center gap-2 text-sm text-phone-primary underline underline-offset-4"
                >
                  <RefreshCw className="size-4" /> ابحث مرة ثانية
                </button>
              )}
              {!autoDiscovery && !consoles.length && (
                <p role="status" className="text-xs leading-6 text-phone-muted">
                  البحث التلقائي غير متاح في هذه النسخة، اكتب عنوان البلايستيشن.
                </p>
              )}
              {showManual && (
                <label className="block text-sm">
                  عنوان البلايستيشن
                  <div className="mt-2 flex gap-2">
                    <input
                      aria-label="عنوان IP للبلايستيشن"
                      value={manualIp}
                      onChange={(e) => {
                        setManualIp(e.target.value.replace(/[^0-9.]/g, "").slice(0, 15));
                        setSelected(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && void findByAddress()}
                      placeholder="192.168.0.192"
                      inputMode="decimal"
                      autoComplete="off"
                      dir="ltr"
                      className="phone-input flex-1"
                    />
                    <Button
                      variant="outline"
                      className="h-auto border-phone-border bg-phone-surface text-phone-foreground hover:bg-phone-border"
                      disabled={busy || !manualIp}
                      onClick={() => void findByAddress()}
                    >
                      تحقّق
                    </Button>
                  </div>
                  <span className="mt-2 block text-xs leading-6 text-phone-muted">
                    تلقاه في PS5: الإعدادات ← الشبكة ← حالة الاتصال ← عرض حالة الاتصال.
                  </span>
                </label>
              )}
            </>
          )}
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
          <p className="text-sm leading-7 text-phone-muted">
            {native
              ? "يُرسل رقم الإقران إلى PS5 داخل الشبكة المحلية عبر محرك Chiaki. تُحفظ مفاتيح التسجيل في Keychain فقط. لا يبدأ بث الفيديو بعد التسجيل."
              : inApp
                ? "إضافة PS5 غير محمّلة في هذه النسخة، لذلك لا يُرسل هذا الرقم. أدخله في تطبيق PS Remote Play الرسمي."
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
        {step === 2 && native && !showManual && (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="mx-auto mb-4 block text-sm text-phone-primary underline underline-offset-4"
          >
            ما لقيت جهازي؟ أدخل العنوان
          </button>
        )}
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
            : inApp
              ? "تطبيق الآيفون · إضافة PS5 غير محمّلة في هذه النسخة"
              : "الاتصال بـ PS5 غير ممكن من المتصفح"}
        </p>
      </div>
    </div>
  );
}
