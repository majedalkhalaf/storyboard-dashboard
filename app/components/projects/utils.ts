import type { FileCategory } from "@/app/lib/types";

// وقت نسبي بالعربية (منذ ...)
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "الآن";
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `منذ ${day} يوم`;
  const month = Math.floor(day / 30);
  if (month < 12) return `منذ ${month} شهر`;
  const year = Math.floor(month / 12);
  return `منذ ${year} سنة`;
}

// تنسيق تاريخ ميلادي بسيط
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

// استنتاج تصنيف الملف من نوع MIME أو الامتداد
export function inferCategory(mime: string | null | undefined, name: string): FileCategory {
  const m = (mime ?? "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(ext)) return "image";
  if (m.startsWith("video/") || ["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "video";
  if (m.startsWith("audio/") || ["mp3", "wav", "aac", "m4a", "ogg"].includes(ext)) return "audio";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (
    m === "application/pdf" ||
    m.includes("word") ||
    m.includes("document") ||
    m.includes("sheet") ||
    m.includes("presentation") ||
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)
  )
    return "document";
  return "other";
}

export const FILE_CATEGORY_ICON: Record<FileCategory, "image" | "video" | "attachment" | "archive" | "link" | "info"> = {
  image: "image",
  video: "video",
  document: "attachment",
  audio: "info",
  archive: "archive",
  link: "link",
  other: "attachment",
};

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function humanFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
