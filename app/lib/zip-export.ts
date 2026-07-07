"use client";

import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveFileUrl } from "@/app/components/projects/FilesPanel";
import { fetchEpisodeDetail, type EpisodeFullDetail } from "@/app/lib/episode-detail";
import { getStoryboardScenes } from "@/app/lib/storyboard";
import type { Contract, Invoice, Payment, ProjectFile, Proposal, Project } from "@/app/lib/types";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";

// تصدير الحلقة/المشروع كملف ZIP يحدث بالكامل في المتصفح (لا توجد بنية طابور مهام/عامل
// خلفي حقيقية في هذا التطبيق تسمح بإنشاء الملف على الخادم وإخطار المستخدم لاحقاً)، لذا
// لملفات كبيرة جداً (فيديوهات ثقيلة) قد يستغرق التوليد وقتاً ويستهلك ذاكرة المتصفح —
// هذا قيد حقيقي مُفصح عنه للمستخدم في واجهة شريط التقدم، وليس نقصاً مخفياً.

export interface ZipProgress {
  stage: string;
  percent: number;
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned.slice(0, 100) || "بدون_اسم";
}

function jsonFile(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function formatDateAr(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG-u-nu-latn");
  } catch {
    return iso;
  }
}

async function fetchBlobSafe(url: string | null): Promise<Blob | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
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

async function addEpisodeFolder(
  parent: JSZip,
  supabase: SupabaseClient,
  episode: EpisodeFullDetail,
  onProgress?: (p: ZipProgress) => void,
  labelPrefix = ""
) {
  const folder = parent.folder(`Episode_${String(episode.number ?? 0).padStart(2, "0")}_${sanitizeName(episode.title)}`)!;

  const info = folder.folder("01_Info")!;
  info.file(
    "episode-info.json",
    jsonFile({
      الرقم: episode.number,
      العنوان: episode.title,
      الوصف: episode.description,
      النوع: episode.type,
      الحالة: episode.status,
      المرحلة_السريعة: episode.pipeline_stage,
      نسبة_الإنجاز: `${episode.progress}%`,
      المسؤول: episode.assigned_to_name,
      مدة_الفيديو_ثانية: episode.duration_seconds,
      تاريخ_التصوير: episode.shooting_date,
      تاريخ_التسليم: episode.delivery_date,
      تاريخ_الإنشاء: episode.created_at,
      آخر_تحديث: episode.updated_at,
    })
  );

  const script = folder.folder("02_Script")!;
  if (episode.script) script.file("السكربت.txt", episode.script);
  if (episode.scenario) script.file("السيناريو.txt", episode.scenario);
  episode.scriptVersions.forEach((v, i) => {
    const label = v.field === "script" ? "سكربت" : "سيناريو";
    script.file(`نسخة_${episode.scriptVersions.length - i}_${label}_${formatDateAr(v.created_at).replace(/[/:,\s]/g, "-")}.txt`, v.content);
  });

  onProgress?.({ stage: `${labelPrefix}جاري تجهيز الستوري بورد...`, percent: 0 });
  const storyboardFolder = folder.folder("03_Storyboard")!;
  try {
    const scenes = await getStoryboardScenes(episode.id);
    storyboardFolder.file(
      "scenes.json",
      jsonFile(
        scenes.map((s) => ({
          الرقم: s.number,
          العنوان: s.title,
          نوع_اللقطة: s.shot_type,
          الموقع: s.location,
          الحالة: s.status,
          المدة_ثانية: s.duration_seconds,
        }))
      )
    );
    const imagesFolder = storyboardFolder.folder("صور_المشاهد");
    for (const scene of scenes) {
      if (!scene.cover_image_url) continue;
      const blob = await fetchBlobSafe(scene.cover_image_url);
      if (blob) imagesFolder?.file(`مشهد_${scene.number ?? "0"}_${sanitizeName(scene.title)}.jpg`, blob);
    }
  } catch {
    storyboardFolder.file("scenes.json", jsonFile([]));
  }

  const videosFolder = folder.folder("04_Videos")!;
  const imagesFolder = folder.folder("05_Images")!;
  const filesFolder = folder.folder("06_Files")!;
  const totalFiles = episode.files.length || 1;
  for (let i = 0; i < episode.files.length; i++) {
    const f = episode.files[i];
    onProgress?.({ stage: `${labelPrefix}جاري تنزيل ملفات الحلقة (${i + 1}/${episode.files.length})...`, percent: Math.round((i / totalFiles) * 100) });
    const target = f.category === "video" ? videosFolder : f.category === "image" ? imagesFolder : filesFolder;
    if (f.external_url && !f.storage_path) {
      target.file(`${sanitizeName(f.name)}.url.txt`, f.external_url);
      continue;
    }
    const url = await resolveFileUrl(supabase, f);
    const blob = await fetchBlobSafe(url);
    if (blob) target.file(sanitizeName(f.name), blob);
  }

  const notesFolder = folder.folder("07_Notes")!;
  const allNotes = [...episode.notes, ...episode.comments];
  const notesText = allNotes.map((n) => `[${formatDateAr(n.created_at)}] ${n.author_name ?? "—"}:\n${n.body}`).join("\n\n---\n\n");
  notesFolder.file("الملاحظات.txt", notesText || "لا توجد ملاحظات");

  const attachmentsFolder = folder.folder("08_Attachments")!;
  const noteAttachments = allNotes.flatMap((n) => n.attachments ?? []);
  for (const att of noteAttachments) {
    const blob = await fetchBlobSafe(att.url);
    if (blob) attachmentsFolder.file(sanitizeName(att.name), blob);
  }

  const activityFolder = folder.folder("09_Activity_Log")!;
  const activityText = episode.activity.map((a) => `[${formatDateAr(a.created_at)}] ${a.actor_name ?? "—"}: ${a.action}`).join("\n");
  activityFolder.file("سجل_النشاط.txt", activityText || "لا يوجد نشاط مسجل");
}

export async function exportEpisodeZip(supabase: SupabaseClient, companyId: string, episodeId: string, onProgress?: (p: ZipProgress) => void) {
  onProgress?.({ stage: "جاري تجميع بيانات الحلقة...", percent: 2 });
  const detail = await fetchEpisodeDetail(episodeId, companyId);
  const zip = new JSZip();
  await addEpisodeFolder(zip, supabase, detail, (p) => onProgress?.({ stage: p.stage, percent: 5 + Math.round(p.percent * 0.8) }));
  onProgress?.({ stage: "جاري ضغط الملف...", percent: 88 });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (meta) => {
    onProgress?.({ stage: "جاري ضغط الملف...", percent: 88 + Math.round(meta.percent * 0.12) });
  });
  triggerDownload(blob, `${sanitizeName(detail.title)}.zip`);
  onProgress?.({ stage: "اكتمل التصدير", percent: 100 });
}

export async function exportProjectZip(
  supabase: SupabaseClient,
  companyId: string,
  project: Project,
  gallery: EpisodeGalleryItem[],
  onProgress?: (p: ZipProgress) => void
) {
  const zip = new JSZip();
  const root = zip.folder(sanitizeName(project.name))!;

  onProgress?.({ stage: "جاري تجهيز بيانات المشروع...", percent: 2 });
  root.folder("01_Project_Info")!.file(
    "project-info.json",
    jsonFile({
      الاسم: project.name,
      النوع: project.type,
      الحالة: project.status,
      تاريخ_التصوير: project.shooting_date,
      تاريخ_التسليم: project.delivery_date,
      الموقع: project.location,
      الميزانية: project.budget,
      تاريخ_الإنشاء: project.created_at,
      آخر_تحديث: project.updated_at,
    })
  );

  const episodesFolder = root.folder("02_Episodes")!;
  for (let i = 0; i < gallery.length; i++) {
    onProgress?.({ stage: `جاري تجهيز الحلقة ${i + 1} من ${gallery.length}...`, percent: 4 + Math.round((i / Math.max(gallery.length, 1)) * 55) });
    const detail = await fetchEpisodeDetail(gallery[i].id, companyId);
    await addEpisodeFolder(episodesFolder, supabase, detail, () => {}, `الحلقة ${i + 1}: `);
  }

  onProgress?.({ stage: "جاري تجهيز ملفات المشروع العامة...", percent: 62 });
  const { data: projectFileRows } = await supabase.from("files").select("*").eq("project_id", project.id).is("episode_id", null);
  const projectFilesFolder = root.folder("03_Project_Files")!;
  for (const f of (projectFileRows ?? []) as ProjectFile[]) {
    const url = f.external_url && !f.storage_path ? f.external_url : await resolveFileUrl(supabase, f);
    const blob = await fetchBlobSafe(url);
    if (blob) projectFilesFolder.file(sanitizeName(f.name), blob);
  }

  onProgress?.({ stage: "جاري تجهيز العقود والعروض والفواتير...", percent: 70 });
  const [{ data: contracts }, { data: proposals }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase.from("contracts").select("*").eq("project_id", project.id),
    supabase.from("proposals").select("*").eq("project_id", project.id),
    supabase.from("invoices").select("*").eq("project_id", project.id),
    supabase.from("payments").select("*").eq("project_id", project.id),
  ]);

  const contractsFolder = root.folder("04_Contracts")!;
  ((contracts ?? []) as Contract[]).forEach((c) => contractsFolder.file(`${sanitizeName(c.title)}.json`, jsonFile(c)));

  const proposalsFolder = root.folder("05_Proposals")!;
  ((proposals ?? []) as Proposal[]).forEach((p) => proposalsFolder.file(`${sanitizeName(p.title)}.json`, jsonFile(p)));

  const invoicesFolder = root.folder("06_Invoices")!;
  ((invoices ?? []) as Invoice[]).forEach((inv) => invoicesFolder.file(`فاتورة_${sanitizeName(inv.number)}.json`, jsonFile(inv)));

  const paymentsFolder = root.folder("07_Payments")!;
  ((payments ?? []) as Payment[]).forEach((p, i) => paymentsFolder.file(`دفعة_${i + 1}.json`, jsonFile(p)));

  onProgress?.({ stage: "جاري إنشاء ملخص التقرير...", percent: 82 });
  const avgProgress = gallery.length ? Math.round(gallery.reduce((s, e) => s + e.progress, 0) / gallery.length) : 0;
  root.folder("08_Reports")!.file(
    "ملخص.txt",
    [
      `المشروع: ${project.name}`,
      `عدد الحلقات: ${gallery.length}`,
      `متوسط الإنجاز: ${avgProgress}%`,
      `عدد العقود: ${(contracts ?? []).length}`,
      `عدد العروض: ${(proposals ?? []).length}`,
      `عدد الفواتير: ${(invoices ?? []).length}`,
      `عدد الدفعات: ${(payments ?? []).length}`,
    ].join("\n")
  );

  root
    .folder("09_Exports")!
    .file(
      "ملاحظة.txt",
      "لا يوجد ملف عرض فني مُصدَّر ومحفوظ مسبقاً على الخادم لتضمينه هنا تلقائياً.\n" +
        "يمكنك تصدير العرض الفني كملف PDF أو PPTX أو HTML من داخل صفحة المشروع (زر «العرض الفني») ثم إضافته يدوياً لهذا الأرشيف إن أردت."
    );

  onProgress?.({ stage: "جاري تجهيز سجل النشاط...", percent: 90 });
  const { data: activityRows } = await supabase
    .from("activity_logs")
    .select("*, actor:profiles!actor_id(full_name)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1000);
  const activityText = (activityRows ?? [])
    .map((a) => `[${formatDateAr(a.created_at)}] ${(a.actor as { full_name: string | null } | null)?.full_name ?? "—"}: ${a.action}`)
    .join("\n");
  root.folder("10_Activity_Log")!.file("سجل_النشاط.txt", activityText || "لا يوجد نشاط مسجل");

  onProgress?.({ stage: "جاري ضغط الملف (قد يستغرق وقتاً في المشاريع الكبيرة)...", percent: 92 });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (meta) => {
    onProgress?.({ stage: "جاري ضغط الملف...", percent: 92 + Math.round(meta.percent * 0.08) });
  });
  triggerDownload(blob, `${sanitizeName(project.name)}.zip`);
  onProgress?.({ stage: "اكتمل التصدير", percent: 100 });
}
