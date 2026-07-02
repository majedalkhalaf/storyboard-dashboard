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

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
}

export function formatCurrency(n: number | null | undefined): string {
  const value = typeof n === "number" ? n : 0;
  return value.toLocaleString("ar-SA", { maximumFractionDigits: 2 }) + " ر.س";
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
