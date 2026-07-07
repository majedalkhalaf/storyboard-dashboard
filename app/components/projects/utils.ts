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
    return new Date(iso).toLocaleDateString("ar-EG-u-nu-latn", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

// تاريخ ووقت دقيقان معاً (بخلاف formatDate التي تعرض اليوم فقط) — لعرض متى
// حدث إجراء بالضبط لا "منذ ساعة" فقط، بحسب طلب صريح بتتبّع دقيق للعمليات.
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG-u-nu-latn", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// وقت قصير فقط (مثل تطبيقات المحادثة) — يُستخدم بجانب كل رسالة/ملاحظة.
export function formatTimeShort(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// استنتاج تصنيف الملف من نوع MIME أو الامتداد — لا يُرفض أي امتداد هنا؛ كل ما هو
// غير معروف يُصنَّف "أخرى" بدل رفض الرفع (لا يوجد سبب أمني لرفض نوع ملف بحد ذاته).
export function inferCategory(mime: string | null | undefined, name: string): FileCategory {
  const m = (mime ?? "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic", "heif", "bmp", "tiff"].includes(ext)) return "image";
  if (m.startsWith("video/") || ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v", "mxf", "mts", "m2ts", "ts"].includes(ext)) return "video";
  if (m.startsWith("audio/") || ["mp3", "wav", "aac", "m4a", "ogg", "flac"].includes(ext)) return "audio";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (["psd", "ai", "xd", "fig", "sketch"].includes(ext)) return "design";
  if (["prproj", "aep", "aet", "fcpxml", "drp", "veg"].includes(ext)) return "project_file";
  if (
    m === "application/pdf" ||
    m.includes("word") ||
    m.includes("document") ||
    m.includes("sheet") ||
    m.includes("presentation") ||
    m === "application/json" ||
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "json", "csv", "rtf"].includes(ext)
  )
    return "document";
  return "other";
}

export const FILE_CATEGORY_ICON: Record<FileCategory, "image" | "video" | "attachment" | "archive" | "link" | "info" | "palette" | "fileCheck"> = {
  image: "image",
  video: "video",
  document: "attachment",
  audio: "info",
  archive: "archive",
  design: "palette",
  project_file: "fileCheck",
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

export function humanSpeed(bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return "—";
  return `${humanFileSize(bytesPerSecond)}/ث`;
}

export function humanEta(remainingBytes: number, bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return "—";
  const seconds = Math.ceil(remainingBytes / bytesPerSecond);
  if (seconds < 60) return `${seconds}ث`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}د ${seconds % 60}ث`;
  const hours = Math.floor(minutes / 60);
  return `${hours}س ${minutes % 60}د`;
}
