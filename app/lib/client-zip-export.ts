"use client";

import JSZip from "jszip";
import { fetchBlobWithRedirect } from "@/app/lib/download";
import type { BehindScenesMediaItem, Contract, Episode, FileCategory, Invoice, Note, Payment, Project, ProjectFile } from "@/app/lib/types";

// تصدير مشروع العميل كملف ZIP — يعمل بالكامل داخل المتصفح، ويحترم صلاحيات العميل
// فعلياً: كل ملف يُطلب مباشرة عبر /api/client-portal/files/[id]?download=1 (يبثّ
// محتوى الملف نفسه كاستجابة، وليس رابطاً)، وهذا المسار وحده (بصلاحية service_role
// على الخادم) يتحقق من client_visible/client_can_download وصلاحية "download_files"
// قبل إعادة أي بايت — فلا يمكن للعميل تنزيل ما لا يُسمح له به بتزوير الطلب من
// المتصفح مباشرة.

export interface ExportProgress {
  stage: string;
  percent: number;
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned.slice(0, 100) || "بدون_اسم";
}

// حد التزامن عند تنزيل عدة ملفات لبناء أرشيف واحد — تنزيل الملفات بالتتابع
// (ملف كامل ثم التالي) كان يُبطئ التصدير بلا داعٍ حين يكون الاتصال قادراً على
// نقل أكثر من ملف في الوقت نفسه؛ 4 يوازن السرعة دون إغراق الاتصال بطلبات
// متزامنة كثيرة جداً.
const DOWNLOAD_CONCURRENCY = 4;

async function mapWithConcurrency<T>(items: T[], concurrency: number, task: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await task(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker));
}

// يجمع تقدّم تنزيل عدة ملفات متزامنة (بايت لكل ملف) في نسبة واحدة سلسة (0..1)
// بدل نسبة تقفز دفعة واحدة كل ملف يكتمل بالكامل فقط — وهو ما كان يبدو للعميل
// وكأن التحميل "متوقف" طوال مدة تنزيل كل ملف كبير، خصوصاً مع عدد قليل من الملفات.
function createByteProgressTracker(fileCount: number, onUpdate: (fraction: number) => void) {
  const loaded = new Array<number>(fileCount).fill(0);
  const total = new Array<number>(fileCount).fill(0);
  function emit() {
    let sum = 0;
    for (let i = 0; i < fileCount; i++) sum += total[i] > 0 ? Math.min(1, loaded[i] / total[i]) : 0;
    onUpdate(fileCount > 0 ? sum / fileCount : 1);
  }
  return {
    update(index: number, l: number, t: number) {
      loaded[index] = l;
      total[index] = t;
      emit();
    },
    complete(index: number) {
      loaded[index] = total[index] || loaded[index] || 1;
      total[index] = total[index] || loaded[index] || 1;
      emit();
    },
  };
}

async function fetchClientFileBlob(fileId: string, onProgress?: (loaded: number, total: number) => void): Promise<Blob | null> {
  try {
    // هذا المسار يُعيد رابط الملف الفعلي (JSON `{ url }`) بعد التحقق من الصلاحية
    // — وليس بايتات الملف نفسها — لتفادي بثّ فيديوهات كبيرة عبر خادمنا (خطر
    // توقّف الدالة السحابية منتصف النقل وإنتاج ملف مبتور). fetchBlobWithRedirect
    // تتبع هذا الرابط وتجلب المحتوى الفعلي مباشرة من مصدره (R2/Supabase)،
    // بتقدّم بايت حقيقي عبر onProgress بدل نسبة تُعرف فقط بعد اكتمال الملف كاملاً.
    return await fetchBlobWithRedirect(`/api/client-portal/files/${fileId}?download=1`, undefined, onProgress);
  } catch {
    return null;
  }
}

async function fetchBlobFromUrl(url: string, onProgress?: (loaded: number, total: number) => void): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    if (!res.body) {
      const blob = await res.blob();
      onProgress?.(blob.size, blob.size);
      return blob;
    }
    const total = Number(res.headers.get("Content-Length")) || 0;
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value as BlobPart);
      loaded += value?.byteLength ?? 0;
      onProgress?.(loaded, total || loaded);
    }
    return new Blob(chunks);
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

// حماية أخيرة: لو فشل تنزيل كل الملفات بصمت (رابط منتهي، مشكلة اتصال...) وانتهى
// الأمر بأرشيف بلا أي ملف حقيقي بداخله، نمنع تنزيل ZIP فارغ يبدو للعميل أن
// التصدير "نجح" بينما لا شيء بداخله — نرفع خطأ واضحاً تظهره نافذة التصدير بدل ذلك.
function assertNonEmpty(zip: JSZip) {
  const hasAnyFile = Object.values(zip.files).some((entry) => !entry.dir);
  if (!hasAnyFile) {
    throw new Error("تعذّر تجميع أي محتوى للتصدير — تحقق من اتصالك بالإنترنت وحاول مرة أخرى.");
  }
}

const CATEGORY_FOLDER_AR: Record<FileCategory, string> = {
  image: "الصور",
  video: "الفيديوهات",
  audio: "ملفات_صوتية",
  document: "مستندات",
  archive: "أرشيف",
  design: "ملفات_تصميم",
  project_file: "ملفات_المشروع",
  link: "روابط",
  other: "مرفقات_أخرى",
};

// يضيف مجموعة ملفات (قد تنتمي لمجلدات مختلفة، مثلاً مجلد كل حلقة) إلى الأرشيف
// دفعة واحدة بتنزيل متزامن (DOWNLOAD_CONCURRENCY) وتقدّم بايت مُجمَّع واحد —
// بدل تنزيل كل مجلد على حدة بالتتابع. كل ملف يُوضع داخل مجلد فرعي حسب تصنيفه
// الفعلي المخزَّن في قاعدة البيانات (category)؛ الروابط الخارجية (لا ملف حقيقي
// لتنزيله) تُدرج كسطر نصي بدل محاولة تنزيلها.
async function addFilesToFolder(entries: { file: ProjectFile; folder: JSZip }[], onProgress: (fraction: number) => void): Promise<void> {
  const linkEntries = entries.filter((e) => e.file.external_url);
  const downloadable = entries.filter((e) => !e.file.external_url);
  const tracker = createByteProgressTracker(downloadable.length, onProgress);

  await mapWithConcurrency(downloadable, DOWNLOAD_CONCURRENCY, async ({ file, folder }, i) => {
    const blob = await fetchClientFileBlob(file.id, (loaded, total) => tracker.update(i, loaded, total));
    const categoryFolder = folder.folder(CATEGORY_FOLDER_AR[file.category] ?? "مرفقات_أخرى")!;
    if (blob) categoryFolder.file(sanitizeName(file.name), blob);
    else categoryFolder.file(`${sanitizeName(file.name)}_تعذّر_التنزيل.txt`, "تعذّر تنزيل هذا الملف أثناء التصدير — قد يكون الرابط منتهياً أو الملف كبيراً جداً.");
    tracker.complete(i);
  });

  const linksByFolder = new Map<JSZip, ProjectFile[]>();
  for (const { file, folder } of linkEntries) {
    const list = linksByFolder.get(folder) ?? [];
    list.push(file);
    linksByFolder.set(folder, list);
  }
  for (const [folder, files] of linksByFolder) {
    const lines = files.map((f) => `${f.name}: ${f.external_url}`);
    folder.folder("روابط")!.file("روابط.txt", lines.join("\n"));
  }
}

export interface ExportExtras {
  finance?: { projectValue: number; paid: number; remaining: number } | null;
  lastPayment?: Payment | null;
  projectNotes?: Note[];
  episodeNotesByEpisode?: Record<string, Note[]>;
  meetingNotes?: Note[];
  invoices?: Invoice[];
  payments?: Payment[];
  contracts?: Contract[];
}

// تصدير المشروع بالكامل بهيكلة منظَّمة: مجلد مستقل لكل حلقة (مقسّم بدوره حسب
// نوع الملف)، مجلد للملفات المشتركة على مستوى المشروع، وملفات نصية حقيقية —
// مبنية من بيانات فعلية موجودة أصلاً في النظام وليست وهمية — للتقارير وسجل
// طلبات التعديل وطلبات الاجتماعات وملخّص الفواتير، بالإضافة لنسخ العقود
// والفواتير الفعلية (PDF) إن كانت مرفوعة ومتاحة.
export async function exportClientProjectZip(
  project: Project,
  episodes: Episode[],
  projectFiles: ProjectFile[],
  episodeFilesByEpisode: Record<string, ProjectFile[]>,
  extras: ExportExtras,
  onProgress?: (p: ExportProgress) => void
) {
  const zip = new JSZip();
  const root = zip.folder(sanitizeName(project.name))!;

  onProgress?.({ stage: "جاري تجهيز بيانات المشروع...", percent: 2 });
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

  const entries: { file: ProjectFile; folder: JSZip }[] = [];
  for (const ep of episodes) {
    const files = episodeFilesByEpisode[ep.id] ?? [];
    if (files.length === 0) continue;
    const folder = root.folder(`الحلقة_${sanitizeName(ep.title)}`)!;
    for (const f of files) entries.push({ file: f, folder });
  }
  if (projectFiles.length > 0) {
    const folder = root.folder("ملفات_المشروع_المشتركة")!;
    for (const f of projectFiles) entries.push({ file: f, folder });
  }

  if (entries.length > 0) {
    await addFilesToFolder(entries, (fraction) => {
      onProgress?.({
        stage: `جاري تنزيل الملفات (${Math.min(entries.length, Math.round(fraction * entries.length))}/${entries.length})...`,
        percent: 4 + Math.round(fraction * 56),
      });
    });
  }

  onProgress?.({ stage: "جاري تجهيز التقارير والمستندات...", percent: 62 });

  const allEpisodeNotes = Object.entries(extras.episodeNotesByEpisode ?? {}).flatMap(([, notes]) => notes);
  root.folder("التقارير")!.file(
    "تقرير_سريع.txt",
    buildQuickReportText(project, episodes, [...(extras.projectNotes ?? []), ...allEpisodeNotes], extras.finance ?? null, extras.lastPayment ?? null)
  );

  if (extras.meetingNotes && extras.meetingNotes.length > 0) {
    const lines = extras.meetingNotes.map((n) => `- [${n.status}] ${new Date(n.created_at).toLocaleDateString("ar-u-nu-latn")}\n  ${n.body}`);
    root.folder("الاجتماعات")!.file("طلبات_الاجتماعات.txt", lines.join("\n\n"));
  }

  const labeledNotes = [
    ...(extras.projectNotes ?? []).map((n) => ({ note: n, label: "عام" })),
    ...Object.entries(extras.episodeNotesByEpisode ?? {}).flatMap(([epId, notes]) => {
      const ep = episodes.find((e) => e.id === epId);
      return notes.map((n) => ({ note: n, label: ep ? ep.title : "حلقة" }));
    }),
  ].sort((a, b) => a.note.created_at.localeCompare(b.note.created_at));
  if (labeledNotes.length > 0) {
    const lines = labeledNotes.map(
      ({ note: n, label }) => `- [${label}] [${n.status}]${n.request_type ? ` (${n.request_type})` : ""} ${new Date(n.created_at).toLocaleDateString("ar-u-nu-latn")}\n  ${n.body}`
    );
    root.folder("طلبات_التعديل")!.file("سجل_الطلبات.txt", lines.join("\n\n"));
  }

  if (extras.contracts && extras.contracts.length > 0) {
    const folder = root.folder("العقود")!;
    for (const c of extras.contracts) {
      const summary = `العقد: ${c.title}\nالحالة: ${c.status}\nالقيمة: ${c.amount != null ? `${c.amount.toLocaleString("ar-SA-u-nu-latn")} ر.س` : "—"}\nتاريخ آخر تحديث: ${c.updated_at}`;
      if (c.pdf_url) {
        const blob = await fetchBlobFromUrl(c.pdf_url);
        if (blob) folder.file(`${sanitizeName(c.title)}.pdf`, blob);
        else folder.file(`${sanitizeName(c.title)}.txt`, summary);
      } else {
        folder.file(`${sanitizeName(c.title)}.txt`, summary);
      }
    }
  }

  if ((extras.invoices && extras.invoices.length > 0) || (extras.payments && extras.payments.length > 0)) {
    const folder = root.folder("الفواتير")!;
    for (const inv of extras.invoices ?? []) {
      const summary = `فاتورة رقم: ${inv.number}\nتاريخ الإصدار: ${inv.issue_date}\nالمبلغ: ${(inv.amount + inv.tax).toLocaleString("ar-SA-u-nu-latn")} ر.س\nالحالة: ${inv.status}`;
      if (inv.pdf_url) {
        const blob = await fetchBlobFromUrl(inv.pdf_url);
        if (blob) folder.file(`فاتورة_${sanitizeName(inv.number)}.pdf`, blob);
        else folder.file(`فاتورة_${sanitizeName(inv.number)}.txt`, summary);
      } else {
        folder.file(`فاتورة_${sanitizeName(inv.number)}.txt`, summary);
      }
    }
    if (extras.payments && extras.payments.length > 0) {
      const lines = extras.payments.map(
        (p) => `- ${p.paid_date ?? "غير مدفوعة بعد"} — ${p.amount.toLocaleString("ar-SA-u-nu-latn")} ر.س — ${p.status}${p.reference_number ? ` — مرجع: ${p.reference_number}` : ""}`
      );
      folder.file("سجل_الدفعات.txt", lines.join("\n"));
    }
  }

  assertNonEmpty(zip);
  onProgress?.({ stage: "جاري تجميع الأرشيف...", percent: 92 });
  // بلا ضغط (STORE): معظم المحتوى فيديوهات/صور مضغوطة أصلاً، فضغط DEFLATE
  // فوقها يستهلك وقت معالجة طويلاً بلا أي توفير حقيقي في الحجم — تجميع مباشر أسرع بكثير.
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" }, (meta) => {
    onProgress?.({ stage: "جاري تجميع الأرشيف...", percent: 92 + Math.round(meta.percent * 0.08) });
  });
  triggerDownload(blob, `${sanitizeName(project.name)}.zip`);
  onProgress?.({ stage: "اكتمل التنزيل", percent: 100 });
}

// تحميل كل ملفات حلقة واحدة (فيديوهات/صور/صوت/تصميم/مستندات/أي مرفق آخر
// مرتبط بها) في ملف ZIP واحد مسطّح — يُستخدم من بطاقة الحلقة وصفحة الحلقة
// وتبويب "الملفات" داخلها، بنفس آلية التحقق من الصلاحيات المستخدمة في تصدير
// المشروع الكامل (كل ملف عبر مسار موقّع من الخادم يتحقق من صلاحية العميل).
export async function exportEpisodeFilesZip(episodeTitle: string, files: ProjectFile[], onProgress?: (p: ExportProgress) => void) {
  if (files.length === 0) {
    onProgress?.({ stage: "لا توجد ملفات لهذه الحلقة", percent: 100 });
    return;
  }
  const zip = new JSZip();
  const linkFiles = files.filter((f) => f.external_url);
  const downloadable = files.filter((f) => !f.external_url);

  if (downloadable.length > 0) {
    const tracker = createByteProgressTracker(downloadable.length, (fraction) => {
      onProgress?.({
        stage: `جاري تنزيل الملفات (${Math.min(downloadable.length, Math.round(fraction * downloadable.length))}/${downloadable.length})...`,
        percent: Math.round(fraction * 88),
      });
    });
    await mapWithConcurrency(downloadable, DOWNLOAD_CONCURRENCY, async (file, i) => {
      const blob = await fetchClientFileBlob(file.id, (loaded, total) => tracker.update(i, loaded, total));
      if (blob) zip.file(sanitizeName(file.name), blob);
      else zip.file(`${sanitizeName(file.name)}_تعذّر_التنزيل.txt`, "تعذّر تنزيل هذا الملف أثناء التصدير — قد يكون الرابط منتهياً أو الملف كبيراً جداً.");
      tracker.complete(i);
    });
  }
  if (linkFiles.length > 0) {
    const lines = linkFiles.map((f) => `${f.name}: ${f.external_url}`);
    zip.folder("روابط")!.file("روابط.txt", lines.join("\n"));
  }

  assertNonEmpty(zip);
  onProgress?.({ stage: "جاري تجميع الأرشيف...", percent: 90 });
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" }, (meta) => {
    onProgress?.({ stage: "جاري تجميع الأرشيف...", percent: 90 + Math.round(meta.percent * 0.1) });
  });
  triggerDownload(blob, `${sanitizeName(episodeTitle)}.zip`);
  onProgress?.({ stage: "اكتمل التنزيل", percent: 100 });
}

// نص التقرير السريع — مستخرج في دالة مستقلة كي يُستخدم في التنزيل المباشر
// وأيضاً كملف داخل تصدير المشروع الكامل بلا تكرار للمنطق.
function buildQuickReportText(
  project: Project,
  episodes: Episode[],
  notes: Note[],
  finance: { projectValue: number; paid: number; remaining: number } | null,
  lastPayment: Payment | null
): string {
  const completed = episodes.filter((e) => e.status === "delivered" || e.status === "approved");
  const remaining = episodes.filter((e) => e.status !== "delivered" && e.status !== "approved");
  const openNotes = notes.filter((n) => n.status !== "done" && n.status !== "closed" && n.status !== "rejected");

  const lines: string[] = [
    `تقرير سريع — ${project.name}`,
    `تاريخ التقرير: ${new Date().toLocaleDateString("ar-u-nu-latn")}`,
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
    `— طلبات التعديل —`,
    `مفتوحة: ${openNotes.length} من أصل ${notes.length}`
  );

  if (finance) {
    lines.push(
      "",
      "— الملخص المالي —",
      `قيمة المشروع: ${finance.projectValue.toLocaleString("ar-SA-u-nu-latn")} ر.س`,
      `المدفوع: ${finance.paid.toLocaleString("ar-SA-u-nu-latn")} ر.س`,
      `المتبقي: ${finance.remaining.toLocaleString("ar-SA-u-nu-latn")} ر.س`
    );
    if (lastPayment?.paid_date) lines.push(`آخر دفعة: ${lastPayment.paid_date} — ${lastPayment.amount.toLocaleString("ar-SA-u-nu-latn")} ر.س`);
  }

  return lines.join("\n");
}

// تقرير سريع نصّي مستقل — بلا حاجة لأي مكتبة PDF جديدة، يعرض نسبة الإنجاز،
// الحلقات المكتملة/المتبقية، والملخّص المالي إن كان العميل يملك صلاحية الاطلاع عليه.
export function downloadClientQuickReport(
  project: Project,
  episodes: Episode[],
  notes: Note[],
  finance: { projectValue: number; paid: number; remaining: number } | null,
  lastPayment: Payment | null
) {
  const text = buildQuickReportText(project, episodes, notes, finance, lastPayment);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${sanitizeName(project.name)}_تقرير_سريع.txt`);
}

// تحميل عنصر واحد من إعلان المشروع — الوسائط مرفوعة أصلاً إلى مساحة عامة
// (نفس نموذج ثقة الكواليس)، فتُجلب مباشرة بالرابط العام بلا حاجة لمسار خادم
// موقّع؛ التنزيل الفعلي (بدل مجرد فتح الرابط) يتطلب جلبها كـ blob أولاً لأن
// الرابط من نطاق مختلف (Supabase Storage).
export async function downloadAnnouncementMediaItem(item: BehindScenesMediaItem) {
  const blob = await fetchBlobFromUrl(item.url);
  if (blob) triggerDownload(blob, sanitizeName(item.name));
}

export async function exportAnnouncementMediaZip(title: string, media: BehindScenesMediaItem[], onProgress?: (p: ExportProgress) => void) {
  if (media.length === 0) {
    onProgress?.({ stage: "لا توجد وسائط لهذا الإعلان", percent: 100 });
    return;
  }
  const zip = new JSZip();
  const tracker = createByteProgressTracker(media.length, (fraction) => {
    onProgress?.({
      stage: `جاري تنزيل الملفات (${Math.min(media.length, Math.round(fraction * media.length))}/${media.length})...`,
      percent: Math.round(fraction * 88),
    });
  });
  await mapWithConcurrency(media, DOWNLOAD_CONCURRENCY, async (item, i) => {
    const blob = await fetchBlobFromUrl(item.url, (loaded, total) => tracker.update(i, loaded, total));
    if (blob) zip.file(sanitizeName(item.name), blob);
    else zip.file(`${sanitizeName(item.name)}_تعذّر_التنزيل.txt`, "تعذّر تنزيل هذا الملف أثناء التصدير.");
    tracker.complete(i);
  });
  assertNonEmpty(zip);
  onProgress?.({ stage: "جاري تجميع الأرشيف...", percent: 90 });
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" }, (meta) => {
    onProgress?.({ stage: "جاري تجميع الأرشيف...", percent: 90 + Math.round(meta.percent * 0.1) });
  });
  triggerDownload(blob, `${sanitizeName(title)}.zip`);
  onProgress?.({ stage: "اكتمل التنزيل", percent: 100 });
}
