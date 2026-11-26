import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Gamepad2, Monitor, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { consoleAddress, pairingPin } from "@/lib/phone-storage";
import { ConsoleArt } from "./ConsoleArt";

export function PairingWizard({ onClose, onComplete }: { onClose: () => void; onComplete: (ip: string) => void }) {
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState("ps5");
  const [ip, setIp] = useState("");
  const [pin, setPin] = useState("");
  const [hidden, setHidden] = useState(false);
  const titles = ["وش نوع جهازك؟", "اختر جهازك", "اكتب رقم الإقران", "أخفِ رسالة الاتصال", "الحين ادخل بحسابك الأساسي اللي بتلعب فيه"];
  const valid = step === 1 ? device === "ps5" : step === 2 ? consoleAddress.safeParse(ip).success : step === 3 ? pairingPin.safeParse(pin).success : step === 4 ? hidden : true;

  return (
    <div className="flex min-h-[610px] flex-col">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="رجوع" className="text-phone-foreground hover:bg-phone-surface" onClick={() => step === 1 ? onClose() : setStep(step - 1)}><ArrowRight /></Button>
        <span className="text-xs text-phone-muted">ربط البلايستيشن</span>
        <span className="text-xs text-phone-primary" dir="ltr">{step} / 5</span>
      </div>
      <div className="mb-7 flex gap-1.5" aria-label={`الخطوة ${step} من 5`}>
        {[1, 2, 3, 4, 5].map((n) => <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-phone-primary" : "bg-phone-border"}`} />)}
      </div>
      <h2 className="mb-3 text-2xl font-semibold leading-relaxed">{titles[step - 1]}</h2>
      {step === 1 && <>
        <p className="mb-6 text-sm text-phone-muted">خلّنا نجهز جهازك قبل أول جلسة.</p>
        <RadioGroup value={device} onValueChange={setDevice} className="gap-3">
          {[{ id: "ps5", name: "PlayStation PS5", sub: "بلايستيشن 5" }, { id: "xbox", name: "Xbox Series X|S", sub: "إكس بوكس" }].map((item) =>
            <label key={item.id} className={`phone-card flex cursor-pointer items-center justify-between p-4 ${device === item.id ? "border-phone-primary bg-phone-primary/5" : ""}`}>
              <div className="flex items-center gap-3"><RadioGroupItem value={item.id} className="border-phone-primary" /><div><p className="text-sm font-semibold" dir="ltr">{item.name}</p><p className="mt-1 text-xs text-phone-muted">{item.sub}</p></div></div>
              <ConsoleArt xbox={item.id === "xbox"} />
            </label>)}
        </RadioGroup>
        {device === "xbox" && <p role="status" className="mt-4 text-sm text-phone-muted">دليل الربط متاح لـ PS5 حالياً. تقدر تترجم ألعاب Xbox بالكاميرا.</p>}
      </>}
      {step === 2 && <div className="space-y-5">
        <div className="flex justify-center py-3"><ConsoleArt large /></div>
        <div className="flex items-center gap-2 text-sm text-phone-primary"><Wifi className="size-4" /> نفس شبكة Wi-Fi</div>
        <p className="text-sm leading-7 text-phone-muted">المتصفح ما يقدر يبحث عن أجهزة الشبكة. افتح في PS5: الإعدادات ← الشبكة ← حالة الاتصال ← عرض حالة الاتصال، وأدخل عنوان IP.</p>
        <label className="block text-sm">أدخل العنوان<input autoFocus aria-label="عنوان IP" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.0.192" inputMode="decimal" dir="ltr" className="phone-input mt-3" /></label>
        {ip && !valid && <p className="text-xs text-destructive">أدخل عنوان IPv4 صحيحاً.</p>}
        <p className="text-xs text-phone-muted">العنوان يُحفظ على هذا الجهاز فقط؛ ليس اتصالاً بالبلايستيشن.</p>
      </div>}
      {step === 3 && <div className="space-y-5">
        <div className="phone-card p-4 text-sm leading-8"><Monitor className="mb-3 size-6 text-phone-primary" />في البلايستيشن: الإعدادات ← النظام ← اللعب عن بُعد ← إقران الجهاز <span dir="ltr">(Pair Device)</span></div>
        <label className="block text-sm">رقم الإقران (8 أرقام)<input autoFocus aria-label="رقم إقران البلايستيشن" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" inputMode="numeric" autoComplete="off" dir="ltr" className="phone-input mt-3 text-center text-2xl" /></label>
        <p className="text-sm leading-7 text-phone-muted">أدخل الرقم في تطبيق PS Remote Play الرسمي لإتمام الربط. MZGTA لا يتصل بالبلايستيشن ولا يرسل هذا الرقم.</p>
        <Button asChild variant="outline" className="w-full border-phone-border bg-phone-surface text-phone-foreground hover:bg-phone-border"><a href="https://apps.apple.com/app/ps-remote-play/id1436192460" target="_blank" rel="noopener noreferrer"><ExternalLink /> فتح PS Remote Play</a></Button>
      </div>}
      {step === 4 && <div className="space-y-5">
        <div className="flex justify-center py-8"><Monitor className="size-20 text-phone-primary" strokeWidth={1} /></div>
        <p className="text-sm leading-7 text-phone-muted">إذا ظهر الخيار على جهازك، فعّل إخفاء رسالة حالة اتصال اللعب عن بُعد. قد يختلف توفره حسب إصدار النظام.</p>
        <div className="phone-card flex items-center justify-between gap-4 p-4"><label htmlFor="hide-popup" className="text-sm leading-6"><span dir="ltr">Hide Remote Play Connection Status Pop-Up</span><span className="mt-2 block text-xs text-phone-muted">تم الإخفاء، أو الخيار غير متاح عندي</span></label><Switch id="hide-popup" checked={hidden} onCheckedChange={setHidden} className="data-[state=checked]:bg-phone-primary" dir="ltr" /></div>
      </div>}
      {step === 5 && <div className="space-y-6">
        <div className="flex justify-center py-5"><Gamepad2 className="size-20 text-phone-primary" strokeWidth={1} /></div>
        {["اضغط زر PS", "تبديل المستخدم Switch User", "ادخل بحسابك الأساسي"].map((text, i) => <div key={text} className="flex items-center gap-4 border-b border-phone-border pb-5"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-phone-primary/10 text-sm text-phone-primary">{i + 1}</span><span className="text-sm">{text}</span></div>)}
        <p className="text-xs leading-6 text-phone-muted">اتبع هذه الخطوات إذا كان إعداد Remote Play عندك يسمح بتبديل المستخدم؛ وإلا استخدم حساب اللعب نفسه.</p>
      </div>}
      <div className="mt-auto pt-8">
        <Button variant="phone" className="h-12 w-full" disabled={!valid} onClick={() => { if (step === 5) { setPin(""); onComplete(ip.trim()); } else setStep(step + 1); }}>{["التالي", "اتصل", "اربط", "خفيتها", "دخلت"][step - 1]} {step === 5 ? <Check /> : <ArrowLeft />}</Button>
        <p className="mt-3 text-center text-[11px] text-phone-muted">دليل إعداد · الاتصال الفعلي في PS Remote Play</p>
      </div>
    </div>
  );
}