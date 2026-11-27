import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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
  looksLikeOnlineId,
  normalizeAccountId,
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
const NO_AUTO_DISCOVERY =
  "البحث التلقائي يحتاج صلاحية Multicast من Apple وهي غير مفعّلة في هذه النسخة. اكتب عنوان IP الخاص بالبلايستيشن يدوياً.";

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
  const [accountId, setAccountId] = useState("");
  const [paired, setPaired] = useState<{ ip: string; nickname: string } | null>(null);
  useEffect(() => {
    const available = nativePS5Available();
    setNative(available);
    setInApp(runningInIOSApp());
    setBridge(nativeBridgeStatus());
    if (available)
      getCapabilities()
        .then((caps) => setAutoDiscovery(caps.autoDiscovery))
        .catch(() => setAutoDiscovery(true));
  }, []);
  useEffect(() => {
    if (step === 3 && native && autoDiscovery && !consoles.length) void scan();
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
          : `ما فيه PS5 يرد على ${parsed.data}. تأكد إن الجهاز شغّال، واللعب عن بُعد مفعّل، والعنوان صحيح. إذا كانت شاشة «إقران الجهاز» ظاهرة على PS5 اضغط «اتصل» وأدخل الرقم المكوّن من 8 أرقام.`,
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
      if (!found.length) setError("ما لقينا PS5 تلقائياً. اكتب عنوان IP الخاص بالجهاز كبديل بالأسفل.");
    } catch (e) {
      if (nativeErrorCode(e) === "MULTICAST_UNAVAILABLE") {
        setAutoDiscovery(false);
        setError(NO_AUTO_DISCOVERY);
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
        step === 2
          ? native && looksLikeOnlineId(accountId)
            ? `«${accountId.trim()}» هو اسم المستخدم، والبلايستيشن يحتاج رقم الحساب (أرقام فقط).`
            : native
              ? "أدخل رقم الإقران المكوّن من 8 أرقام ورقم الحساب (أرقام فقط)."
              : "أدخل رقم الإقران المكوّن من 8 أرقام."
          : step === 3
            ? "ما تعرّفنا على PS5 تلقائياً. اكتب عنوان IP الخاص به كبديل."
            : "اختر PlayStation PS5 للمتابعة.",
      );
      return;
    }
    if (step === 2 && !native) {
      setError(
        inApp
          ? PLUGIN_MISSING
          : "المتصفح لا يستطيع الاتصال بـ PS5. الربط بالرقم يعمل فقط في تطبيق MZGTA المثبت على الآيفون، والترجمة تتم بقراءة شاشة PS Remote Play.",
      );
      return;
    }
    if (step === 3 && native) {
      setBusy(true);
      setError("");
      try {
        // The PS5 itself verifies the PIN and account during Chiaki registration;
        // success is shown only when it accepts them.
        const result = await registerConsole({ ip, pin, accountId: normalizeAccountId(accountId) ?? "" });
        if (!result.registered) throw new Error("registration-failed");
        setPin("");
        setAccountId("");
        setPaired({ ip: result.ip, nickname: result.nickname ?? "PS5" });
      } catch (e) {
        const code = nativeErrorCode(e);
        setError(
          code === "LOCAL_NETWORK_DENIED"
            ? "اسمح لتطبيق MZGTA بالوصول للشبكة المحلية من إعدادات الآيفون ← الخصوصية ← الشبكة المحلية."
            : code === "NO_WIFI"
              ? "وصّل الآيفون بنفس شبكة Wi-Fi اللي عليها PS5."
              : code === "KEYCHAIN_FAILED"
                ? "قبل PS5 الربط، لكن تعذّر حفظ المفاتيح على الآيفون. أعد المحاولة."
                : `رفض PS5 الربط على ${ip}. تأكد إن شاشة «إقران الجهاز» ما زالت ظاهرة والرقم لم تنتهِ مدته، وإن رقم الحساب لنفس الحساب المسجّل على الجهاز.`,
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    setError("");
    setStep(step + 1);
  };
  const titles = ["وش نوع جهازك؟", "اكتب رقم الإقران", "ربط الجهاز"];
  const valid =
    step === 1
      ? device === "ps5"
      : step === 2
        ? pairingPin.safeParse(pin).success && (!native || normalizeAccountId(accountId) !== null)
        : step === 3
          ? consoleAddress.safeParse(ip).success
          : false;

  if (paired)
    return (
      <div className="flex min-h-[610px] flex-col">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <CheckCircle2 className="mb-5 size-14 text-phone-primary" />
          <h2 className="text-2xl font-semibold">تم إقران البلايستيشن ✅</h2>
          <p className="mt-3 text-sm leading-7 text-phone-muted">
            قبل جهاز <span dir="ltr">{paired.nickname}</span> رقم الإقران، وحُفظ الربط على هذا الآيفون.
          </p>
          <p dir="ltr" className="mt-1 text-xs text-phone-muted">
            {paired.ip}
          </p>
          <div className="phone-card mt-6 w-full p-4 text-start text-xs leading-6 text-phone-muted">
            الخطوة الجاية: اضغط «ابدأ التقاط الشاشة» في صفحة أجهزتي، اختر «MZGTA Subtitles»، ثم افتح PS Remote Play
            والعب. الترجمة تنقرأ من الشاشة وتطلع على التلفزيون.
          </div>
        </div>
        <Button variant="phone" className="mt-8 h-12 w-full" onClick={() => onComplete(paired.ip, true)}>
          التالي: التقاط الشاشة <ArrowLeft />
        </Button>
      </div>
    );

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
              رقم الحساب (مطلوب من البلايستيشن)
              <input
                aria-label="رقم الحساب"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                className="phone-input mt-3"
              />
              <span className="mt-2 block text-xs leading-6 text-phone-muted">
                أرقام فقط، وليس اسم المستخدم مثل AMMAR67M ولا كلمة المرور. ما فيه تسجيل دخول،
                لكن البلايستيشن يرفض الإقران بدون هذا الرقم. لا يُحفظ في التطبيق.{" "}
                <a
                  href="https://psn.flipscreen.games/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-phone-primary underline"
                >
                  اعرف رقم حسابك من اسم المستخدم
                </a>
              </span>
            </label>
          )}
          <p className="text-sm leading-7 text-phone-muted">
            {native
              ? "يُرسل الرقم ورقم الحساب إلى PS5 داخل الشبكة المحلية عبر محرك Chiaki. تُحفظ مفاتيح التسجيل في Keychain فقط. لا يبدأ بث الفيديو بعد التسجيل."
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
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex justify-center py-3">
            <ConsoleArt large />
          </div>
          <p role="status" dir="ltr" className="phone-card px-4 py-2 text-xs text-phone-muted">
            {bridge === "active" && "Native Bridge: Active ✅"}
            {bridge === "native-no-plugin" && "Native Bridge: PS5RemotePlay plugin missing ⚠️"}
            {bridge === "browser" && "Native Bridge: Not available (web browser)"}
          </p>
          {bridge === "native-no-plugin" && (
            <p role="status" className="phone-card p-4 text-sm leading-7">
              {PLUGIN_MISSING}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-phone-primary">
            <Wifi className="size-4" /> نفس شبكة Wi-Fi
          </div>
          {native && (
            <>
              {autoDiscovery ? (
                <Button
                  variant="phone"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void scan()}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} البحث عن أجهزة PS5
                </Button>
              ) : (
                <p role="status" className="phone-card p-4 text-xs leading-6 text-phone-muted">
                  {NO_AUTO_DISCOVERY}
                </p>
              )}
              <label className="block text-sm">
                {autoDiscovery ? "بديل: عنوان IP للبلايستيشن" : "عنوان IP للبلايستيشن"}
                <div className="mt-2 flex gap-2">
                  <input
                    aria-label="عنوان IP للبلايستيشن"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value.replace(/[^0-9.]/g, "").slice(0, 15))}
                    onKeyDown={(e) => e.key === "Enter" && void findByAddress()}
                    placeholder="192.168.1.20"
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
                  شغّل PS5 وفعّل اللعب عن بُعد، ثم ابحث أو اكتب عنوان IP.
                </p>
              )}
            </>
          )}
          <p className="text-xs leading-6 text-phone-muted">
            {native
              ? "يتعرّف التطبيق على PS5 تلقائياً، وإذا ما ضبط اكتب عنوانه. الربط ينجح فقط إذا قبل PS5 رقم الإقران فعلاً."
              : inApp
                ? "تطبيق الآيفون يعمل، لكن الاتصال بـ PS5 يحتاج نسخة فيها إضافة PS5."
                : "المتصفح ما يقدر يبحث عن أجهزة الشبكة ولا يتصل بـ PS5. الربط بالرقم يعمل فقط في تطبيق MZGTA المثبت على الآيفون."}
          </p>
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
          {["التالي", "التالي", "اربط"][step - 1]}{" "}
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
