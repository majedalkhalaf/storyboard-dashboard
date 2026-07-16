import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPresentationData } from "@/app/lib/presentation-data-server";
import type {
  BookletData,
  BookletActivityEntry,
  BookletApprovalEntry,
  BookletExecutionStage,
  BookletNoteEntry,
  BookletStoryboardScene,
  BookletTeamStat,
  BookletVideoEntry,
} from "@/app/lib/booklet-sections";
import type { PresentationGalleryImage } from "@/app/lib/presentation-sections";
import type { CameraSetup, DirectorNotes } from "@/app/lib/types";

// استخراج أول عنصر من نتيجة join في Supabase (قد تُعاد كمصفوفة أو كعنصر مفرد
// حسب نوع العلاقة) — مُستخدَم في كل الاستعلامات أدناه بدل تكرار نفس الفحص.
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

// يحوّل قيمة action الخام من activity_logs (+ تفاصيلها jsonb) إلى جملة عربية
// مفهومة للعميل + تصنيف بصري (لأيقونة سجل النشاط). أي action غير مُغطّى هنا
// يُعاد نصّه كما هو بدل إخفائه أو تلفيقه.
function activityLabel(action: string, details: Record<string, unknown> | null): { label: string; category: BookletActivityEntry["category"] } {
  const d = details ?? {};
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  switch (action) {
    case "episode_stage_updated":
    case "episode_stage_changed":
      return { label: `تحديث مرحلة "${str(d.stage) || "—"}" إلى "${str(d.to) || "—"}"`, category: "stage" };
    case "file_uploaded":
      return { label: `رفع ملف: ${str(d.name) || "—"}`, category: "upload" };
    case "file_deleted":
      return { label: `حذف ملف: ${str(d.name) || "—"}`, category: "upload" };
    case "note_added":
      return { label: "إضافة ملاحظة جديدة", category: "note" };
    case "note_deleted":
      return { label: "حذف ملاحظة", category: "note" };
    case "episode_created":
      return { label: `إنشاء حلقة جديدة: ${str(d.title) || "—"}`, category: "edit" };
    case "episode_title_changed":
      return { label: `تعديل عنوان الحلقة من "${str(d.from) || "—"}" إلى "${str(d.to) || "—"}"`, category: "edit" };
    case "episode_kind_changed":
      return { label: "تعديل نوع الحلقة", category: "edit" };
    case "project_created":
      return { label: "إطلاق المشروع", category: "other" };
    case "project_status_changed":
      return { label: `تحديث حالة المشروع إلى "${str(d.to) || "—"}"`, category: "edit" };
    case "approval_revoked":
      return { label: "سحب اعتماد سابق", category: "approval" };
    case "video_link_added":
      return { label: "إضافة رابط فيديو", category: "upload" };
    case "episode_script_version_saved":
      return { label: "حفظ نسخة جديدة من السكربت", category: "edit" };
    case "video_comment_added":
      return { label: "إضافة تعليق على الفيديو", category: "note" };
    case "payment_added":
      return { label: "تسجيل دفعة جديدة", category: "other" };
    case "payment_updated":
      return { label: "تحديث دفعة", category: "other" };
    case "expense_added":
      return { label: "تسجيل مصروف جديد", category: "other" };
    default:
      return { label: action, category: "other" };
  }
}

export async function fetchBookletData(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string
): Promise<BookletData | null> {
  const base = await fetchPresentationData(supabase, companyId, projectId);
  if (!base) return null;

  const [{ data: logs }, { data: projectRow }, { data: episodeRows }] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("id, action, details, created_at, episode_id, episodes(title)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("projects").select("client_id, budget").eq("id", projectId).eq("company_id", companyId).single(),
    supabase.from("episodes").select("id, title").eq("project_id", projectId),
  ]);

  const episodeIds = (episodeRows ?? []).map((e) => e.id);
  const episodeTitleById: Record<string, string> = Object.fromEntries((episodeRows ?? []).map((e) => [e.id, e.title]));

  const activityLog: BookletActivityEntry[] = (logs ?? []).map((row) => {
    const episode = one<{ title: string }>(row.episodes as never);
    const { label, category } = activityLabel(row.action, row.details as Record<string, unknown> | null);
    return { id: row.id, label, category, episodeTitle: episode?.title ?? null, createdAt: row.created_at };
  });

  // ── بطاقة العميل (اسم/شركة/بريد/هاتف/مدينة) ──
  const { data: clientRow } = projectRow?.client_id
    ? await supabase.from("clients").select("name, client_company_name, email, phone, city").eq("id", projectRow.client_id).maybeSingle()
    : { data: null };

  // ── الخطة التنفيذية + إحصائيات الفريق: مبنيّتان من نفس استعلام مراحل الحلقات ──
  const { data: stageRows } = episodeIds.length
    ? await supabase
        .from("episode_stages")
        .select("key, status, assigned_to, assigned:profiles!assigned_to(full_name, avatar_url)")
        .in("episode_id", episodeIds)
    : { data: [] };

  const stageResponsibles: Record<string, Set<string>> = {};
  const teamStatsMap: Record<string, { full_name: string | null; avatar_url: string | null; total: number; completed: number }> = {};
  for (const s of stageRows ?? []) {
    const assigned = one<{ full_name: string | null; avatar_url: string | null }>(s.assigned as never);
    if (assigned?.full_name) (stageResponsibles[s.key] ??= new Set()).add(assigned.full_name);
    if (s.assigned_to) {
      const entry = (teamStatsMap[s.assigned_to] ??= { full_name: assigned?.full_name ?? null, avatar_url: assigned?.avatar_url ?? null, total: 0, completed: 0 });
      entry.total += 1;
      if (s.status === "completed") entry.completed += 1;
    }
  }
  const executionPlan: BookletExecutionStage[] = base.stages.map((s) => ({
    ...s,
    responsibleNames: Array.from(stageResponsibles[s.key] ?? []),
  }));
  const teamStats: BookletTeamStat[] = Object.entries(teamStatsMap).map(([id, v]) => ({
    id,
    full_name: v.full_name,
    avatar_url: v.avatar_url,
    stagesAssigned: v.total,
    stagesCompleted: v.completed,
    completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
  }));

  // ── Storyboard تفصيلي: مشاهد + Camera Setup + Director Notes + طاقم + معدات ──
  const { data: storyboardRows } = episodeIds.length
    ? await supabase
        .from("storyboard_scenes")
        .select("id, episode_id, number, title, cover_image_url, shot_type, location, camera_setup, director_notes, sort_order")
        .in("episode_id", episodeIds)
        .order("sort_order")
        .limit(20)
    : { data: [] };

  const storyboardSceneIds = (storyboardRows ?? []).map((s) => s.id);
  const [{ data: castRows }, { data: equipRows }] = storyboardSceneIds.length
    ? await Promise.all([
        supabase.from("storyboard_scene_cast").select("scene_id, name").in("scene_id", storyboardSceneIds),
        supabase.from("storyboard_scene_equipment").select("scene_id, equipment:equipment(name)").in("scene_id", storyboardSceneIds),
      ])
    : [{ data: [] }, { data: [] }];

  const castByScene: Record<string, string[]> = {};
  for (const c of castRows ?? []) (castByScene[c.scene_id] ??= []).push(c.name);
  const equipByScene: Record<string, string[]> = {};
  for (const e of equipRows ?? []) {
    const eq = one<{ name: string }>(e.equipment as never);
    if (eq?.name) (equipByScene[e.scene_id] ??= []).push(eq.name);
  }

  const storyboardDetailed: BookletStoryboardScene[] = (storyboardRows ?? []).map((s) => ({
    id: s.id,
    episodeTitle: episodeTitleById[s.episode_id] ?? "",
    number: s.number,
    title: s.title,
    cover_image_url: s.cover_image_url,
    shot_type: s.shot_type,
    location: s.location,
    cameraSetup: (s.camera_setup ?? {}) as CameraSetup,
    directorNotes: (s.director_notes ?? {}) as DirectorNotes,
    castNames: castByScene[s.id] ?? [],
    equipmentNames: equipByScene[s.id] ?? [],
  }));

  // ── الاعتمادات ──
  const { data: approvalRows } = await supabase
    .from("approvals")
    .select("id, approved_at, revoked_at, episode:episodes(title), approver:profiles!client_id(full_name)")
    .eq("project_id", projectId)
    .order("approved_at", { ascending: false })
    .limit(30);

  const approvalsList: BookletApprovalEntry[] = (approvalRows ?? []).map((a) => {
    const episode = one<{ title: string }>(a.episode as never);
    const approver = one<{ full_name: string | null }>(a.approver as never);
    return { id: a.id, episodeTitle: episode?.title ?? null, approverName: approver?.full_name ?? null, approvedAt: a.approved_at, revoked: Boolean(a.revoked_at) };
  });

  // ── الملاحظات (تغذية راجعة العميل والفريق) ──
  const { data: noteRows } = await supabase
    .from("notes")
    .select("id, body, author_role, status, created_at, episode_id, author:profiles!author_id(full_name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(30);

  const notesList: BookletNoteEntry[] = (noteRows ?? []).map((n) => {
    const author = one<{ full_name: string | null }>(n.author as never);
    return {
      id: n.id,
      body: n.body,
      authorRole: n.author_role,
      authorName: author?.full_name ?? null,
      status: n.status,
      episodeTitle: n.episode_id ? (episodeTitleById[n.episode_id] ?? null) : null,
      createdAt: n.created_at,
    };
  });

  // ── الفيديوهات ──
  const { data: videoRows } = await supabase
    .from("files")
    .select("id, name, thumbnail_url, duration_seconds, episode_id")
    .eq("project_id", projectId)
    .eq("category", "video")
    .order("created_at", { ascending: false })
    .limit(30);

  const videosList: BookletVideoEntry[] = (videoRows ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    thumbnailUrl: v.thumbnail_url,
    durationSeconds: v.duration_seconds,
    episodeId: v.episode_id,
    episodeTitle: v.episode_id ? (episodeTitleById[v.episode_id] ?? null) : null,
  }));

  // ── معرض صور موسّع (سقف أعلى من العرض الفني، لقسم "خلف الكواليس والمعرض") ──
  const { data: imageRows } = await supabase
    .from("files")
    .select("id, name, storage_path, external_url")
    .eq("project_id", projectId)
    .eq("category", "image")
    .order("created_at", { ascending: false })
    .limit(24);

  const galleryImagesExtended: PresentationGalleryImage[] = (
    await Promise.all(
      (imageRows ?? []).map(async (f) => {
        if (f.external_url) return { id: f.id, name: f.name, url: f.external_url };
        if (!f.storage_path) return null;
        const { data } = await supabase.storage.from("project-files").createSignedUrl(f.storage_path, 300);
        return data?.signedUrl ? { id: f.id, name: f.name, url: data.signedUrl } : null;
      })
    )
  ).filter((v): v is PresentationGalleryImage => Boolean(v));

  // ── ملخص مالي (مُحسَّب دائماً؛ إظهاره في الكتيّب اختياري ومعطّل افتراضياً) ──
  const [{ data: invoiceRows }, { data: paymentRows }, { data: contractRows }, { data: proposalRows }, { data: expenseRows }] = await Promise.all([
    supabase.from("invoices").select("amount, status").eq("project_id", projectId),
    supabase.from("payments").select("amount, status").eq("project_id", projectId),
    supabase.from("contracts").select("id").eq("project_id", projectId),
    supabase.from("proposals").select("id").eq("project_id", projectId),
    supabase.from("expenses").select("amount").eq("project_id", projectId),
  ]);

  const finance = {
    invoicesCount: (invoiceRows ?? []).length,
    invoicesPaidTotal: (invoiceRows ?? []).filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.amount || 0), 0),
    invoicesUnpaidTotal: (invoiceRows ?? []).filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((sum, i) => sum + Number(i.amount || 0), 0),
    paymentsReceivedTotal: (paymentRows ?? []).filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0),
    expensesTotal: (expenseRows ?? []).reduce((sum, e) => sum + Number(e.amount || 0), 0),
    contractsCount: (contractRows ?? []).length,
    proposalsCount: (proposalRows ?? []).length,
    budget: projectRow?.budget != null ? Number(projectRow.budget) : null,
  };

  const totalEpisodes = base.episodes.length;
  const completedEpisodes = base.episodes.filter((e) => e.status === "completed").length;
  const totalFiles = Object.values(base.fileCounts).reduce((sum, n) => sum + n, 0);
  const totalDurationSeconds = base.episodes.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  const projectStartDate = base.projectCreatedAt;
  const projectDeliveredDate = base.deliveryDate;
  const daysElapsed = projectStartDate
    ? Math.max(0, Math.round((Date.parse(projectDeliveredDate ?? new Date().toISOString()) - Date.parse(projectStartDate)) / 86400000))
    : null;

  return {
    ...base,
    totalEpisodes,
    completedEpisodes,
    totalFiles,
    totalDurationSeconds,
    projectStartDate,
    projectDeliveredDate,
    daysElapsed,
    activityLog,
    client: {
      name: clientRow?.name ?? base.clientName,
      companyName: clientRow?.client_company_name ?? null,
      email: clientRow?.email ?? null,
      phone: clientRow?.phone ?? null,
      city: clientRow?.city ?? null,
    },
    executionPlan,
    teamStats,
    storyboardDetailed,
    approvalsList,
    notesList,
    videosList,
    galleryImagesExtended,
    finance,
  };
}
