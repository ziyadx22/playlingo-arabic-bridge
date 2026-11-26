export type Line = { en: string; ar: string; speaker: string };
export const LINES: Line[] = [
  { speaker: "كراتوس", en: "The Boss waits beyond the gate. Reach the checkpoint first.", ar: "الزعيم ينتظر خلف البوابة. اوصل لنقطة الحفظ أولاً." },
  { speaker: "أتريوس", en: "This quest was never about revenge, father.", ar: "هذه المهمة لم تكن عن الانتقام أبداً يا أبي." },
  { speaker: "ميمير", en: "The lore says the giants hid their names in stone.", ar: "تقول الأساطير إن العمالقة أخفوا أسماءهم في الحجر." },
  { speaker: "كراتوس", en: "Stay close. Do not let your guard down.", ar: "ابقَ قريباً. لا تُخفض حذرك." },
  { speaker: "فريا", en: "You cannot outrun fate, but you can face it.", ar: "لا يمكنك الهروب من القدر، لكن يمكنك مواجهته." },
];
export const GLOSSARY = [
  { en: "Quest", ar: "مهمة" },
  { en: "Boss", ar: "زعيم" },
  { en: "Checkpoint", ar: "نقطة حفظ" },
  { en: "Lore", ar: "أساطير العالم" },
];
export const COLORS = [
  { name: "سماوي", v: "var(--neon)" },
  { name: "بنفسجي", v: "var(--violet)" },
  { name: "أبيض", v: "var(--foreground)" },
  { name: "أخضر", v: "var(--success)" },
];
export type Settings = { font: number; pos: number; opacity: number; color: string; autoHide: boolean; live: boolean };
