"use client";

import JSZip from "jszip";
import type { Episode, Note, Payment, Project, ProjectFile } from "@/app/lib/types";

// تصدير مشروع العميل كملف ZIP — يعمل بالكامل داخل المتصفح، ويحترم صلاحيات العميل
// فعلياً: كل ملف يُطلب رابط تحميله عبر /api/client-portal/files/[id]?download=1، وهذا
// المسار وحده (بصلاحية service_role على الخادم) يتحقق من client_visible/client_can_download
// وصلاحية "download_files" قبل إصدار أي رابط — فلا يمكن للعميل تنزيل ما لا يُسمح له به
// بتزوير الطلب من المتصفح مباشرة.

export interface ExportProgress {
  stage: string;
  percent: number;
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned.slice(0, 100) || "بدون_اسم";
}

async function fetchClientFileBlob(fileId: string): Promise<Blob | null> {
  try {
    const res = await fetch(`/api/client-portal/files/${fileId}?download=1`);
    if (!res.ok) return null;
    const { url } = (await res.json()) as { url?: string };
    if (!url) return null;
    const fileRes = await fetch(url);
    if (!fileRes.ok) return null;
    return await fileRes.blob();
  } catch {
    return null;
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function exportClientProjectZip(
  project: Project,
  episodes: Episode[],
  projectFiles: ProjectFile[],
  episodeFilesByEpisode: Record<string, ProjectFile[]>,
  onProgress?: (p: ExportProgress) => void
) {
  const zip = new JSZip();
  const root = zip.folder(sanitizeName(project.name))!;

  onProgress?.({ stage: "جاري تجهيز بيانات المشروع...", percent: 3 });
  root.file(
    "ملخص_المشروع.txt",
    [
      `المشروع: ${project.name}`,
      `الحالة: ${project.status}`,
      `نسبة الإنجاز: ${project.progress ?? 0}%`,
      project.delivery_date ? `تاريخ التسليم المتوقع: ${project.delivery_date}` : null,
      `عدد الحلقات: ${episodes.length}`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  const allFiles = [...projectFiles.map((f) => ({ file: f, folder: "ملفات_المشروع" })), ...Object.entries(episodeFilesByEpisode).flatMap(([epId, files]) => {
    const ep = episodes.find((e) => e.id === epId);
    const label = ep ? `الحلقة_${sanitizeName(ep.title)}` : `حلقة_${epId}`;
    return files.map((f) => ({ file: f, folder: label }));
  })];

  for (let i = 0; i < allFiles.length; i++) {
    const { file, folder } = allFiles[i];
    onProgress?.({ stage: `جاري تنزيل الملف ${i + 1} من ${allFiles.length}...`, percent: 5 + Math.round((i / Math.max(allFiles.length, 1)) * 85) });
    const blob = await fetchClientFileBlob(file.id);
    if (blob) root.folder(folder)!.file(sanitizeName(file.name), blob);
  }

  onProgress?.({ stage: "جاري ضغط الملف...", percent: 92 });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (meta) => {
    onProgress?.({ stage: "جاري ضغط الملف...", percent: 92 + Math.round(meta.percent * 0.08) });
  });
  triggerDownload(blob, `${sanitizeName(project.name)}.zip`);
  onProgress?.({ stage: "اكتمل التنزيل", percent: 100 });
}

// تقرير سريع نصّي — بلا حاجة لأي مكتبة PDF جديدة، يعرض نسبة الإنجاز، الحلقات
// المكتملة/المتبقية، والملخّص المالي إن كان العميل يملك صلاحية الاطلاع عليه.
export function downloadClientQuickReport(
  project: Project,
  episodes: Episode[],
  notes: Note[],
  finance: { projectValue: number; paid: number; remaining: number } | null,
  lastPayment: Payment | null
) {
  const completed = episodes.filter((e) => e.status === "delivered" || e.status === "approved");
  const remaining = episodes.filter((e) => e.status !== "delivered" && e.status !== "approved");
  const openNotes = notes.filter((n) => n.status !== "done" && n.status !== "closed" && n.status !== "rejected");

  const lines: string[] = [
    `تقرير سريع — ${project.name}`,
    `تاريخ التقرير: ${new Date().toLocaleDateString("ar")}`,
    "",
    `نسبة الإنجاز الكلية: ${project.progress ?? 0}%`,
    `الحالة: ${project.status}`,
  ];
  if (project.delivery_date) lines.push(`تاريخ التسليم المتوقع: ${project.delivery_date}`);
  lines.push(
    "",
    `— الحلقات (${episodes.length}) —`,
    `مكتملة: ${completed.length}`,
    `متبقية: ${remaining.length}`,
    ...remaining.map((e) => `  • ${e.title} — ${e.progress ?? 0}%`),
    "",
    `— الملاحظات —`,
    `مفتوحة: ${openNotes.length} من أصل ${notes.length}`
  );

  if (finance) {
    lines.push(
      "",
      "— الملخص المالي —",
      `قيمة المشروع: ${finance.projectValue.toLocaleString("ar-SA")} ر.س`,
      `المدفوع: ${finance.paid.toLocaleString("ar-SA")} ر.س`,
      `المتبقي: ${finance.remaining.toLocaleString("ar-SA")} ر.س`
    );
    if (lastPayment?.paid_date) lines.push(`آخر دفعة: ${lastPayment.paid_date} — ${lastPayment.amount.toLocaleString("ar-SA")} ر.س`);
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${sanitizeName(project.name)}_تقرير_سريع.txt`);
}
