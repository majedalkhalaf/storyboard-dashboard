import { EPISODE_STATUSES, PROJECT_STATUSES } from "@/app/lib/constants";
import type { EpisodeStatus, ProjectStatus } from "@/app/lib/types";

export function episodeStatusMeta(status: EpisodeStatus) {
  return EPISODE_STATUSES.find((s) => s.value === status) ?? EPISODE_STATUSES[0];
}

export function projectStatusMeta(status: ProjectStatus) {
  return PROJECT_STATUSES.find((s) => s.value === status) ?? PROJECT_STATUSES[0];
}

// وقت نسبي بالعربية (مثال: "قبل 3 ساعات")
export function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return "الآن";
  if (min < 60) return `قبل ${min} دقيقة`;
  if (hr < 24) return `قبل ${hr} ساعة`;
  if (day < 30) return `قبل ${day} يوم`;
  const month = Math.round(day / 30);
  if (month < 12) return `قبل ${month} شهر`;
  return `قبل ${Math.round(month / 12)} سنة`;
}

// عدد الأيام المتبقية حتى تاريخ معيّن (سالب إن مضى) — null إن لم يوجد تاريخ
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86400000);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar-u-nu-latn", { year: "numeric", month: "long", day: "numeric" });
}

// تاريخ ووقت دقيقان معاً — لعرض متى حدث إجراء بالضبط لا "منذ ساعة" فقط،
// بحسب طلب صريح بتتبّع دقيق للعمليات في بوابة العميل أيضاً.
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-u-nu-latn", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// وقت قصير فقط (مثل تطبيقات المحادثة) — يُستخدم بجانب كل رسالة/طلب تعديل.
export function formatTimeShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ar-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
}

export function formatCurrency(n: number | null | undefined): string {
  const value = typeof n === "number" ? n : 0;
  return value.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 }) + " ر.س";
}

// أيقونة مناسبة لفئة الملف
export function fileIconName(category: string): "image" | "video" | "archive" | "link" | "attachment" {
  switch (category) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "archive":
      return "archive";
    case "link":
      return "link";
    default:
      return "attachment";
  }
}

// وسم (Hashtag) باسم المشروع لعرضه أمام كل نشاط/إشعار — يميّز مباشرة إلى أي
// مشروع ينتمي التحديث عندما يتابع العميل أكثر من مشروع في آن واحد.
export function projectHashtag(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, "_");
  return cleaned ? `#${cleaned}` : "";
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
