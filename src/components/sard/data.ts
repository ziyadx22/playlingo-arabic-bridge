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
export type Settings = {
  font: number;
  pos: number;
  opacity: number;
  color: string;
  autoHide: boolean;
  live: boolean;
};
