import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Download,
  Gamepad2,
  Home,
  Loader2,
  Monitor,
  Play,
  QrCode,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { ConsoleArt } from "./ConsoleArt";
import { PairingWizard } from "./PairingWizard";
import { lastSessionSchema, readLocal, saveLocal, type LastSession } from "@/lib/phone-storage";
import {
  downloadGamingDictionary,
  loadDictionarySummary,
  type DictionarySummary,
  type DictionaryProgress,
} from "@/lib/gaming-dictionary-storage";
import { getConsoleRegistration, nativePS5Available } from "@/lib/ps5-remote-play";
import type { SubMsg } from "@/lib/sync";

type Tab = "home" | "summary" | "devices" | "account";
type Screen = "tabs" | "wizard" | "live" | "style";

export function PhoneFlow({
  paired,
  connection,
  room,
  history,
  onJoin,
  onLeave,
  onRefresh,
  onScan,
  onTest,
  onPack,
  onConsoleRegistration,
  onLiveChange,
  liveView,
  styleView,
}: {
  paired: boolean;
  connection: string;
  room: string | null;
  history: SubMsg[];
  onJoin: (pin: string) => void;
  onLeave: () => void;
  onRefresh: () => void;
  onScan: () => void;
  onTest: () => void;
  onPack: () => void;
  onConsoleRegistration: (registered: boolean) => void;
  onLiveChange: (active: boolean) => void;
  liveView: (onStyle: () => void) => ReactNode;
  styleView: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("devices");
  const [screen, setScreen] = useState<Screen>("tabs");
  const [returnScreen, setReturnScreen] = useState<"tabs" | "live">("tabs");
  const [joinOpen, setJoinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [setupIp, setSetupIp] = useState("");
  const [pack, setPack] = useState<DictionarySummary | null>(null);
  const [progress, setProgress] = useState<DictionaryProgress | null>(null);
  const [consoleRegistered, setConsoleRegistered] = useState(false);
  const [packError, setPackError] = useState("");
  const [lastSession, setLastSession] = useState<LastSession | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [notice, setNotice] = useState("");
  const download = useRef<AbortController | null>(null);
  const packCallback = useRef(onPack);
  packCallback.current = onPack;
  const registrationCallback = useRef(onConsoleRegistration);
  registrationCallback.current = onConsoleRegistration;

  useEffect(() => {
    let active = true;
    void loadDictionarySummary()
      .then((saved) => {
        if (active && saved) {
          setPack(saved);
          packCallback.current();
        }
      })
      .catch(() => {});
    void readLocal("console-setup")
      .then((saved) => {
        if (active && typeof saved === "string") {
          setSetupIp(saved);
          if (nativePS5Available())
            void getConsoleRegistration(saved)
              .then((result) => {
                if (active) {
                  setConsoleRegistered(result.registered);
                  registrationCallback.current(result.registered);
                }
              })
              .catch(() => {});
        }
      })
      .catch(() => {});
    void readLocal("last-session")
      .then((saved) => {
        const result = lastSessionSchema.safeParse(saved);
        if (active && result.success) setLastSession(result.data);
      })
      .catch(() => {});
    return () => {
      active = false;
      download.current?.abort();
    };
  }, []);
  useEffect(() => {
    const latest = history.at(-1);
    if (!latest) return;
    const session = { endedAt: latest.id, lines: history.length, lastArabic: latest.ar };
    setLastSession(session);
    void saveLocal("last-session", session).catch(() => {});
  }, [history]);
  useEffect(() => {
    onLiveChange(screen === "live");
  }, [screen, onLiveChange]);
  useEffect(() => {
    if (paired) setJoinOpen(false);
  }, [paired]);

  const getPack = async () => {
    if (download.current) return;
    const controller = new AbortController();
    download.current = controller;
    setPackError("");
    try {
      const saved = await downloadGamingDictionary(setProgress, controller.signal);
      setPack(saved);
      onPack();
    } catch {
      if (!controller.signal.aborted) {
        setPackError("تعذّر التنزيل أو الحفظ. تحقق من الإنترنت ومساحة الجهاز وحاول مجدداً.");
        setProgress(null);
      }
    } finally {
      download.current = null;
    }
  };
  const openStyle = () => {
    setReturnScreen(screen === "live" ? "live" : "tabs");
    setScreen("style");
  };
  const tabs = [
    { id: "home", label: "الرئيسية", icon: Home },
    { id: "summary", label: "الملخص", icon: BookOpen },
    { id: "devices", label: "أجهزتي", icon: Monitor },
    { id: "account", label: "حسابي", icon: User },
  ] as const;
  const title =
    tab === "home"
      ? "جاهز تلعب بالعربي؟"
      : tab === "devices"
        ? "أجهزتي"
        : tab === "summary"
          ? "ملخص جلساتك"
          : "حسابي";
  const tvStatus = paired ? "مربوط" : room ? "بانتظار التلفزيون" : "غير مربوط";

  return (
    <div
      className="phone-app relative mx-auto flex min-h-[760px] w-full max-w-[440px] flex-col bg-phone-background text-phone-foreground lg:border lg:border-phone-border lg:rounded-lg"
      dir="rtl"
    >
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-phone-border/60 px-6">
        <div className="flex items-center gap-2">
          <Logo size={30} />
          <span className="font-display text-lg font-semibold" dir="ltr">
            MZGTA<span className="text-phone-primary">.</span>
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-phone-muted">
          <span
            className={`size-1.5 rounded-full ${paired ? "bg-phone-primary" : "bg-phone-muted"}`}
          />{" "}
          {paired ? "متصل بالتلفزيون" : "رفيق اللعب"}
        </span>
      </header>
      <div className="flex-1 px-5 pb-8 pt-7 sm:px-6">
        {screen === "wizard" ? (
          <PairingWizard
            onClose={() => setScreen("tabs")}
            onComplete={(ip, registered) => {
              setSetupIp(ip);
              setConsoleRegistered(registered);
              onConsoleRegistration(registered);
              void saveLocal("console-setup", ip).catch(() => setNotice("تعذّر حفظ إعداد الجهاز."));
              setScreen("tabs");
              setTab("home");
            }}
          />
        ) : screen === "style" ? (
          <>
            <div className="mb-7 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="رجوع"
                onClick={() => setScreen(returnScreen)}
              >
                <ArrowRight />
              </Button>
              <h2 className="text-xl font-semibold">إعدادات التلفزيون</h2>
            </div>
            {styleView}
          </>
        ) : screen === "live" ? (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="رجوع للرئيسية"
                  onClick={() => {
                    setScreen("tabs");
                    setTab("home");
                  }}
                >
                  <ArrowRight />
                </Button>
                <h2 className="text-xl font-semibold">الترجمة المباشرة</h2>
              </div>
              <span className="text-[10px] text-phone-primary" dir="ltr">
                LIVE / OCR
              </span>
            </div>
            {liveView(openStyle)}
          </>
        ) : (
          <>
            <p className="mb-2 text-xs text-phone-muted">
              {tab === "devices"
                ? "كل شاشاتك، في مكان واحد"
                : tab === "home"
                  ? "حيّاك في MZGTA"
                  : "MZGTA • رفيق اللعب"}
            </p>
            <h2 className="mb-7 text-2xl font-semibold leading-relaxed">{title}</h2>
            {tab === "devices" && (
              <div className="space-y-4">
                <article className="phone-card overflow-hidden">
                  <div className="flex items-center justify-between px-5 pb-3 pt-5">
                    <div>
                      <p className="mb-2 text-[10px] text-phone-muted" dir="ltr">
                        CONSOLE / 01
                      </p>
                      <h3 className="text-lg font-semibold">البلايستيشن</h3>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-phone-muted">
                        <span
                          className={`size-1.5 rounded-full ${consoleRegistered ? "bg-phone-primary" : "bg-phone-muted"}`}
                        />{" "}
                        {consoleRegistered ? "مسجّل على الآيفون" : "غير مربوط"}
                      </p>
                    </div>
                    <ConsoleArt />
                  </div>
                  {setupIp && (
                    <p className="px-5 pb-3 text-[11px] text-phone-muted">
                      {consoleRegistered ? "تم التسجيل وحفظ المفاتيح بأمان" : "دليل الإعداد مكتمل"}{" "}
                      · <span dir="ltr">{setupIp}</span>
                      <br />
                      {consoleRegistered
                        ? "لا يوجد بث PS5 نشط؛ الترجمة بالكاميرا."
                        : "البث والربط الفعلي في PS Remote Play."}
                    </p>
                  )}
                  <div className="px-5 pb-5">
                    <Button
                      variant="phone"
                      className="h-12 w-full"
                      onClick={() => setScreen("wizard")}
                    >
                      {setupIp ? "راجع ربط البلايستيشن" : "اربط البلايستيشن"}
                      <ArrowLeft />
                    </Button>
                  </div>
                </article>
                <article className="phone-card p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="mb-2 text-[10px] text-phone-muted" dir="ltr">
                        TV OVERLAY / 02
                      </p>
                      <h3 className="text-lg font-semibold">التلفزيون</h3>
                      <p
                        role="status"
                        className={`mt-2 flex items-center gap-1.5 text-xs ${paired ? "text-phone-primary" : "text-phone-muted"}`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${paired ? "bg-phone-primary" : "bg-phone-muted"}`}
                        />
                        {tvStatus}
                        {paired && room && <span dir="ltr">· {room}</span>}
                      </p>
                    </div>
                    <Monitor className="size-16 text-phone-hardware" strokeWidth={1} />
                  </div>
                  {paired ? (
                    <>
                      <Button
                        variant="phone"
                        className="h-11 w-full"
                        onClick={() => {
                          onTest();
                          setNotice("أُرسلت رسالة اختبار للتلفزيون.");
                        }}
                      >
                        <Play /> جرب التلفزيون
                      </Button>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="border-phone-border bg-phone-background text-xs"
                          onClick={() => setJoinOpen(!joinOpen)}
                        >
                          <RefreshCw /> إعادة الربط
                        </Button>
                        <Button
                          variant="outline"
                          className="border-phone-border bg-phone-background text-xs"
                          onClick={() => setConfirmRemove(true)}
                        >
                          <Trash2 /> إزالة
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      variant="phone"
                      className="h-11 w-full"
                      onClick={() => setJoinOpen(!joinOpen)}
                    >
                      <QrCode /> اربط التلفزيون <ArrowLeft />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="mt-4 h-10 w-full justify-between border-t border-phone-border pt-4 text-xs text-phone-muted"
                    onClick={openStyle}
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 /> إعدادات التلفزيون
                    </span>
                    <ChevronLeft />
                  </Button>
                </article>
                {joinOpen && (
                  <section className="space-y-3 border-y border-phone-border py-5">
                    <h3 className="text-sm font-semibold">رمز التلفزيون</h3>
                    <Button
                      variant="outline"
                      onClick={onScan}
                      className="h-11 w-full border-phone-border bg-phone-surface"
                    >
                      <QrCode /> امسح QR
                    </Button>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (/^\d{6}$/.test(pin)) onJoin(pin);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        aria-label="رمز التلفاز"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric"
                        placeholder="رمز التلفاز (6 أرقام)"
                        dir="ltr"
                        className="phone-input text-center text-sm"
                      />
                      <Button
                        variant="phone"
                        type="submit"
                        className="h-11"
                        disabled={!/^\d{6}$/.test(pin)}
                      >
                        اتصال
                      </Button>
                    </form>
                    <p className="text-xs leading-6 text-phone-muted">
                      افتح MZGTA في متصفح التلفزيون لعرض الرمز.
                    </p>
                    {room && !paired && (
                      <p role="status" className="text-xs text-phone-primary">
                        {connection === "disconnected"
                          ? "انقطع الاتصال — جارٍ إعادة المحاولة…"
                          : "بانتظار التلفاز — افتح شاشة الرمز على التلفاز"}
                      </p>
                    )}
                  </section>
                )}
                {confirmRemove && (
                  <div
                    role="alertdialog"
                    aria-label="إزالة التلفزيون"
                    className="border-y border-phone-border py-4"
                  >
                    <p className="mb-3 text-sm">تفصل هذا الآيفون عن التلفزيون؟</p>
                    <div className="flex gap-2">
                      <Button
                        variant="phone"
                        onClick={() => {
                          onLeave();
                          setConfirmRemove(false);
                          setNotice("تم فصل التلفزيون.");
                        }}
                      >
                        إزالة
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmRemove(false)}>
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 px-1 pt-4 text-xs leading-6 text-phone-muted">
                  <ShieldCheck className="mt-1 size-4 shrink-0 text-phone-primary" />
                  <p>
                    رمز الربط يجمع شاشاتك في جلسة واحدة.
                    <br />
                    لا نحفظ الفيديو أو الصوت.
                  </p>
                </div>
              </div>
            )}
            {tab === "home" && (
              <div className="space-y-6">
                <section className="border-y border-phone-border py-5">
                  <div className="flex items-center gap-3">
                    <Download className="size-5 text-phone-primary" />
                    <h3 className="text-sm font-semibold">ترجمات إضافية لجلساتك</h3>
                  </div>
                  <p className="mt-3 text-xs leading-7 text-phone-muted">
                    أكثر من 30,000 مدخل عربي–إنجليزي، مع مصطلحات ألعاب وعبارات مختارة. المطابقة
                    المحلية فورية؛ تحليل العبارات تقريبي وتتحسن الحوارات عبر الإنترنت. ليست حزمة
                    حوارات رسمية لألعاب GTA أو غيرها.
                  </p>
                  {progress !== null && (
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-[11px]">
                        <span>
                          {progress.phase === "ready"
                            ? "تم التنزيل والحفظ"
                            : progress.phase === "index"
                              ? "جارٍ فهرسة الكلمات…"
                              : "جارٍ التنزيل…"}
                        </span>
                        <span dir="ltr" className="text-phone-primary">
                          {progress.percent}%
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label="تنزيل قاموس الألعاب"
                        aria-valuenow={progress.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-1.5 overflow-hidden rounded-full bg-phone-border"
                      >
                        <div
                          className="h-full bg-phone-primary"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <p role="status" className="mt-2 text-xs text-phone-primary">
                        {progress.indexed.toLocaleString("en-US")} كلمة وعبارة مفهرسة
                        {progress.total ? ` / ${progress.total.toLocaleString("en-US")}` : ""}
                      </p>
                    </div>
                  )}
                  <Button
                    variant={pack ? "ghost" : "phone"}
                    className={`mt-4 h-10 w-full ${pack ? "text-phone-primary" : ""}`}
                    disabled={pack !== null || (progress !== null && progress.percent < 100)}
                    onClick={() => void getPack()}
                  >
                    {pack ? (
                      <Check />
                    ) : progress !== null ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Download />
                    )}
                    {pack
                      ? `${pack.count.toLocaleString("en-US")} كلمة وعبارة جاهزة ✅`
                      : "تحميل حزم الترجمة"}
                  </Button>
                  <p className="mt-3 text-[11px] leading-6 text-phone-muted">
                    المفردات العامة: FreeDict / Arabeyes ·{" "}
                    <a
                      className="underline"
                      href="/packs/dictionary-COPYING.txt"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GPL-2.0+
                    </a>{" "}
                    ·{" "}
                    <a className="underline" href="/packs/dictionary-source.tar.xz" download>
                      مصدر القاموس
                    </a>
                  </p>
                  {packError && (
                    <p role="alert" className="mt-3 text-xs text-destructive">
                      {packError}
                    </p>
                  )}
                </section>
                <article className="phone-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">آخر جلسة لعب</h3>
                    <Gamepad2 className="size-5 text-phone-primary" />
                  </div>
                  {lastSession ? (
                    <>
                      <p className="text-sm leading-7">{lastSession.lastArabic}</p>
                      <div className="mt-4 flex justify-between text-[11px] text-phone-muted">
                        <span>{lastSession.lines} سطر مترجم</span>
                        <time>{new Date(lastSession.endedAt).toLocaleDateString("ar")}</time>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-phone-muted">أول قصة تبدأ من هنا.</p>
                      <p className="mt-2 text-xs text-phone-muted">ما عندك جلسات سابقة بعد.</p>
                    </>
                  )}
                </article>
                <Button
                  variant="phone"
                  className="h-14 w-full text-base"
                  onClick={() => setScreen("live")}
                >
                  ابدأ الترجمة <ArrowLeft />
                </Button>
                <p className="text-center text-[11px] text-phone-muted">
                  كاميرا الآيفون · ترجمة عربية · شاشة التلفزيون
                </p>
              </div>
            )}
            {tab === "summary" && (
              <div>
                <div className="mb-6 flex items-center justify-between border-b border-phone-border pb-4">
                  <span className="text-sm">سجل الجلسة الحالية</span>
                  <span className="text-xs text-phone-primary">{history.length} سطر</span>
                </div>
                {history.length ? (
                  history
                    .slice()
                    .reverse()
                    .map((line) => (
                      <article key={line.id} className="mb-5 border-b border-phone-border pb-5">
                        <p className="text-xs leading-6 text-phone-muted" dir="ltr">
                          {line.en}
                        </p>
                        <p className="mt-2 text-sm leading-7">{line.ar}</p>
                      </article>
                    ))
                ) : (
                  <div className="py-10 text-center">
                    <BookOpen className="mx-auto mb-5 size-12 text-phone-primary" strokeWidth={1} />
                    <p className="text-sm text-phone-muted">لسه ما بدأت قصة اليوم.</p>
                    <Button
                      variant="phone"
                      className="mt-6"
                      onClick={() => {
                        setTab("home");
                      }}
                    >
                      ارجع للرئيسية <ArrowLeft />
                    </Button>
                  </div>
                )}
              </div>
            )}
            {tab === "account" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-phone-border pb-6">
                  <div className="flex size-14 items-center justify-center rounded-full bg-phone-primary/10">
                    <User className="size-6 text-phone-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">لاعب زائر</h3>
                    <p className="mt-1 text-xs text-phone-muted">بدون تسجيل دخول</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>اللغة</span>
                  <span className="text-phone-primary">العربية</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>القاموس المحلي</span>
                  <span className="text-phone-muted">
                    {pack ? `${pack.count.toLocaleString("en-US")} مدخل` : "غير منزّل"}
                  </span>
                </div>
                <div className="border-y border-phone-border py-5">
                  <p className="mb-3 flex items-center gap-2 text-sm">
                    <ShieldCheck className="size-4 text-phone-primary" /> بياناتك على جهازك
                  </p>
                  <p className="text-xs leading-7 text-phone-muted">
                    إعداد الجهاز والقاموس وآخر جلسة محفوظة محلياً. تُرسل نصوص الحوار فقط إلى
                    MyMemory للترجمة بحد يومي، وليس الفيديو أو الصوت.
                  </p>
                </div>
                <p className="text-xs leading-7 text-phone-muted">
                  MZGTA مستقل عن PlayStation. الترجمة تظهر في متصفح التلفزيون، ولا توضع فوق مدخل
                  HDMI.
                </p>
                <p className="text-xs leading-7 text-phone-muted">
                  محرك التسجيل الأصلي: Chiaki · AGPL-3.0.{" "}
                  <a className="underline" href="/licenses/mzgta-source.zip" download>
                    المصدر والتراخيص
                  </a>
                </p>
              </div>
            )}
          </>
        )}
        {notice && (
          <div
            role="status"
            className="mt-5 flex items-center justify-between gap-3 border-t border-phone-border pt-4 text-xs text-phone-primary"
          >
            <p>{notice}</p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="إغلاق التنبيه"
              onClick={() => setNotice("")}
            >
              <Check />
            </Button>
          </div>
        )}
      </div>
      {screen === "tabs" && (
        <nav
          aria-label="تنقل الآيفون"
          className="sticky bottom-0 z-20 grid h-20 shrink-0 grid-cols-4 border-t border-phone-border bg-phone-background px-2 pb-[env(safe-area-inset-bottom)]"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="ghost"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => {
                setTab(id);
                setNotice("");
              }}
              className={`h-full flex-col gap-1 rounded-none px-1 text-[11px] hover:bg-phone-surface ${tab === id ? "text-phone-primary" : "text-phone-muted"}`}
            >
              <Icon className="size-5" strokeWidth={tab === id ? 2 : 1.5} />
              <span>{label}</span>
              {tab === id && (
                <span className="absolute bottom-2 h-0.5 w-4 rounded-full bg-phone-primary" />
              )}
            </Button>
          ))}
        </nav>
      )}
    </div>
  );
}
