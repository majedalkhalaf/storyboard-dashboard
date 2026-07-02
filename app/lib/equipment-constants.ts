// فئات المعدات — محلية لهذه الميزة (لا نعدّل app/lib/constants.ts المشترك)
import type { EquipmentStatus } from "./types";

export const EQUIPMENT_CATEGORIES: { value: string; label: string }[] = [
  { value: "cameras", label: "كاميرات" },
  { value: "lenses", label: "عدسات" },
  { value: "gimbals", label: "جيمبال" },
  { value: "drones", label: "طائرات درون" },
  { value: "monitors", label: "شاشات" },
  { value: "tripods", label: "حوامل ثلاثية" },
  { value: "sliders", label: "سلايدر" },
  { value: "audio", label: "صوت" },
  { value: "lighting", label: "إضاءة" },
  { value: "batteries", label: "بطاريات" },
  { value: "memory_cards", label: "بطاقات ذاكرة" },
  { value: "filters", label: "فلاتر" },
  { value: "accessories", label: "ملحقات" },
];

export const EQUIPMENT_STATUSES: { value: EquipmentStatus; label: string; color: string }[] = [
  { value: "available", label: "متاحة", color: "#1DB954" },
  { value: "in_use", label: "قيد الاستخدام", color: "#F59E0B" },
  { value: "maintenance", label: "صيانة", color: "#EF4444" },
];

export function equipmentCategoryLabel(value: string): string {
  return EQUIPMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function equipmentStatusInfo(value: string) {
  return EQUIPMENT_STATUSES.find((s) => s.value === value) ?? EQUIPMENT_STATUSES[0];
}
