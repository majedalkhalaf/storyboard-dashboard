import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import Icon from "@/app/components/ui/Icon";
import ClientDashboard, { type ClientProjectCard } from "@/app/components/client/ClientDashboard";
import type { BehindScenesFeedPost } from "@/app/components/client/BehindScenesFeed";
import type { ClientProgressUpdate } from "@/app/components/client/ProgressUpdateCard";
import type { BehindScenesComment, BehindScenesPost, ClientPermissions, Invoice, Payment, Project, ProgressUpdate } from "@/app/lib/types";

interface ProjectClientRow {
  id: string;
  permissions: ClientPermissions;
  project: Project | null;
}

// الصفحة الرئيسية لبوابة العميل — تعرض كل مشاريعه النشطة معاً (وليس آخر
// مشروع فقط، وهي المشكلة التي أبلغ عنها العميل: إضافة مشروع جديد كانت تُخفي
// كل المشاريع السابقة لأن الصفحة كانت تختار "المشروع الأساسي" فقط وتَرمي الباقي).
export default async function ClientDashboardPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("id, permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[])
    .filter((r) => r.project && !r.project.archived)
    .sort((a, b) => (b.project!.updated_at || "").localeCompare(a.project!.updated_at || ""));

  const firstName = (session.profile.full_name || "").split(" ")[0] || session.profile.full_name || "";

  if (rows.length === 0) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title-size" style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
            مرحباً {firstName} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            نعمل على مشاريعك بكل اهتمام — هدفنا أن تحصل على أفضل نتيجة ممكنة.
          </p>
        </div>
        <div className="card empty-state">
          <Icon name="projects" size={40} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 15 }}>لا توجد مشاريع مرتبطة بحسابك حالياً.</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            سيظهر مشروعك هنا فور ربطه بحسابك من قبل فريق الإنتاج.
          </p>
        </div>
      </div>
    );
  }

  const projects = rows.map((r) => r.project!);
  const projectIds = projects.map((p) => p.id);
  const episodeProjectIds = rows.filter((r) => canClient(r.permissions, "episodes")).map((r) => r.project!.id);
  const financeProjectIds = rows.filter((r) => canClient(r.permissions, "finance")).map((r) => r.project!.id);
  const fileProjectIds = rows.filter((r) => canClient(r.permissions, "files")).map((r) => r.project!.id);
  const invoiceProjectIds = rows.filter((r) => canClient(r.permissions, "invoices")).map((r) => r.project!.id);
  const btsProjectIds = rows.filter((r) => canClient(r.permissions, "bts_view")).map((r) => r.project!.id);
  const progressProjectIds = rows.filter((r) => canClient(r.permissions, "progress_view")).map((r) => r.project!.id);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { data: episodeRows },
    { data: invoiceRows },
    { data: paymentRows },
    { data: allNotesRows },
    { data: filesThisMonthRows },
    { data: openMeetingRows },
    { data: btsRows },
    { data: progressRowsHome },
  ] = await Promise.all([
    episodeProjectIds.length
      ? supabase.from("episodes").select("id, project_id, status").in("project_id", episodeProjectIds)
      : Promise.resolve({ data: [] as { id: string; project_id: string; status: string }[] }),
    financeProjectIds.length
      ? supabase.from("invoices").select("project_id, amount, tax, status, due_date").in("project_id", financeProjectIds)
      : Promise.resolve({ data: [] as Pick<Invoice, "project_id" | "amount" | "tax" | "status" | "due_date">[] }),
    financeProjectIds.length
      ? supabase.from("payments").select("project_id, amount, status").in("project_id", financeProjectIds)
      : Promise.resolve({ data: [] as Pick<Payment, "project_id" | "amount" | "status">[] }),
    supabase.from("notes").select("id, project_id, status").in("project_id", projectIds),
    fileProjectIds.length
      ? supabase.from("files").select("id").in("project_id", fileProjectIds).eq("client_visible", true).gte("created_at", startOfMonth.toISOString())
      : Promise.resolve({ data: [] as { id: string }[] }),
    supabase.from("notes").select("id").in("project_id", projectIds).eq("target_type", "meeting").eq("status", "new"),
    btsProjectIds.length
      ? supabase
          .from("behind_scenes_posts")
          .select("*, comments:behind_scenes_comments(*), likes:behind_scenes_likes(user_id)")
          .in("project_id", btsProjectIds)
          .eq("shared_with_client", true)
          .order("created_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as (BehindScenesPost & { comments: BehindScenesComment[]; likes: { user_id: string }[] })[] }),
    progressProjectIds.length
      ? supabase.from("progress_updates").select("*").in("project_id", progressProjectIds).eq("shared_with_client", true).order("created_at", { ascending: false }).limit(4)
      : Promise.resolve({ data: [] as ProgressUpdate[] }),
  ]);

  const episodesByProject = new Map<string, { total: number; completed: number }>();
  for (const e of episodeRows ?? []) {
    const entry = episodesByProject.get(e.project_id) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (e.status === "delivered" || e.status === "approved") entry.completed += 1;
    episodesByProject.set(e.project_id, entry);
  }

  const invoicesByProject = new Map<string, Pick<Invoice, "project_id" | "amount" | "tax" | "status" | "due_date">[]>();
  for (const inv of invoiceRows ?? []) {
    if (!invoicesByProject.has(inv.project_id)) invoicesByProject.set(inv.project_id, []);
    invoicesByProject.get(inv.project_id)!.push(inv);
  }
  const paymentsByProject = new Map<string, Pick<Payment, "project_id" | "amount" | "status">[]>();
  for (const p of paymentRows ?? []) {
    if (!paymentsByProject.has(p.project_id)) paymentsByProject.set(p.project_id, []);
    paymentsByProject.get(p.project_id)!.push(p);
  }

  // "مدير المشروع" لكل بطاقة — أقرب بيانات حقيقية موثوقة هي مُنشئ المشروع في
  // النظام (لا يوجد حقل "مسؤول معيّن" فعلي بعد)، تُجلب دفعة واحدة عبر عميل
  // الخدمة لأن العميل لا يملك صلاحية RLS لقراءة ملفات الفريق الداخلي.
  const creatorIds = Array.from(new Set(projects.map((p) => p.created_by).filter((id): id is string => Boolean(id))));
  const managerById = new Map<string, { name: string; avatarUrl: string | null }>();
  if (creatorIds.length > 0) {
    const admin = createAdminClient();
    const { data: profiles } = await admin.from("profiles").select("id, full_name, avatar_url").in("id", creatorIds);
    for (const p of profiles ?? []) {
      if (p.full_name) managerById.set(p.id, { name: p.full_name, avatarUrl: p.avatar_url });
    }
  }

  // شعار كل شركة — قد تنتمي مشاريع العميل لأكثر من شركة إنتاج، فيُجلب شعار كل
  // شركة على حدة (بدفعة واحدة) ليظهر على غلاف بطاقة مشروعها تحديداً.
  const companyIds = Array.from(new Set(projects.map((p) => p.company_id)));
  const companyLogoById = new Map<string, string | null>();
  if (companyIds.length > 0) {
    const { data: companyRows } = await supabase.from("companies").select("id, logo_url").in("id", companyIds);
    for (const c of companyRows ?? []) companyLogoById.set(c.id, c.logo_url);
  }

  const cards: ClientProjectCard[] = rows.map((r) => {
    const project = r.project!;
    const eps = episodesByProject.get(project.id) ?? { total: 0, completed: 0 };
    let finance: ClientProjectCard["finance"] = null;
    if (canClient(r.permissions, "finance")) {
      const invoices = invoicesByProject.get(project.id) ?? [];
      const totalInvoiced = invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + (i.amount || 0) + (i.tax || 0), 0);
      const paid = (paymentsByProject.get(project.id) ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);
      const projectValue = project.budget ?? totalInvoiced;
      finance = { projectValue, paid, remaining: Math.max(projectValue - paid, 0) };
    }
    const manager = project.created_by ? managerById.get(project.created_by) ?? null : null;
    return {
      id: project.id,
      name: project.name,
      code: project.code,
      type: project.custom_type || project.type,
      status: project.status,
      cover_image_url: project.cover_image_url,
      progress: project.progress ?? 0,
      delivery_date: project.delivery_date,
      updated_at: project.updated_at,
      created_at: project.created_at,
      episodesTotal: eps.total,
      episodesCompleted: eps.completed,
      finance,
      managerName: manager?.name ?? null,
      managerAvatarUrl: manager?.avatarUrl ?? null,
      companyLogoUrl: companyLogoById.get(project.company_id) ?? null,
      showProjectValue: canClient(r.permissions, "show_project_value"),
      showDeliveryDate: canClient(r.permissions, "show_delivery_date"),
    };
  });

  const allNotes = allNotesRows ?? [];
  const openNotesTotal = allNotes.filter((n) => n.status !== "done" && n.status !== "closed" && n.status !== "rejected").length;
  const activeProjectsCount = projects.filter((p) => p.status === "in_progress" || p.status === "planning" || p.status === "review").length;
  const episodesCompletedTotal = cards.reduce((s, c) => s + c.episodesCompleted, 0);
  const overallProgress = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress ?? 0), 0) / projects.length) : 0;

  let nextInvoice: { amount: number; due_date: string | null; projectName: string } | null = null;
  if (invoiceProjectIds.length > 0) {
    const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
    const due = (invoiceRows ?? [])
      .filter((i) => invoiceProjectIds.includes(i.project_id) && (i.status === "unpaid" || i.status === "overdue"))
      .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))[0];
    if (due) nextInvoice = { amount: (due.amount || 0) + (due.tax || 0), due_date: due.due_date, projectName: projectNameById.get(due.project_id) ?? "" };
  }

  const financeTotals = financeProjectIds.length
    ? cards.filter((c) => c.finance).reduce(
        (acc, c) => ({ value: acc.value + c.finance!.projectValue, paid: acc.paid + c.finance!.paid, remaining: acc.remaining + c.finance!.remaining }),
        { value: 0, paid: 0, remaining: 0 }
      )
    : null;

  // "الكواليس" المشتركة — عبر كل المشاريع النشطة معاً، ليشاهد العميل آخر
  // التحديثات بمجرد دخوله دون الحاجة لفتح كل مشروع. اسم الناشر يُجلب عبر
  // عميل الخدمة (نفس سبب جلب اسم مدير المشروع أعلاه: لا صلاحية RLS للعميل
  // على ملفات فريق العمل الداخلي).
  const btsProjectRows = (btsRows ?? []) as unknown as (BehindScenesPost & { comments: BehindScenesComment[]; likes: { user_id: string }[] })[];
  const btsAuthorIds = Array.from(new Set(btsProjectRows.map((p) => p.author_id)));
  const btsAuthorNameById = new Map<string, string>();
  if (btsAuthorIds.length > 0) {
    const admin = createAdminClient();
    const { data: authors } = await admin.from("profiles").select("id, full_name").in("id", btsAuthorIds);
    for (const a of authors ?? []) {
      if (a.full_name) btsAuthorNameById.set(a.id, a.full_name);
    }
  }
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const behindScenesPosts: BehindScenesFeedPost[] = btsProjectRows.map((p) => {
    const project = projectById.get(p.project_id);
    return {
      id: p.id,
      companyId: p.company_id,
      projectId: p.project_id,
      projectName: project?.name ?? "",
      authorName: btsAuthorNameById.get(p.author_id) ?? null,
      title: p.title,
      body: p.body,
      media: p.media,
      createdAt: p.created_at,
      likesCount: p.likes.length,
      hasLiked: p.likes.some((l) => l.user_id === session.userId),
      allowLikes: project?.bts_allow_likes ?? true,
      allowComments: project?.bts_allow_comments ?? true,
      comments: p.comments,
    };
  });

  // ملخّص "العمل الجاري" — آخر 4 تحديثات مشتركة عبر كل المشاريع، مع اسم الناشر
  // الحقيقي (بناءً على طلب صريح بعرضه هنا خلافاً لبقية أقسام التواصل).
  const progressRowsTyped = (progressRowsHome ?? []) as unknown as ProgressUpdate[];
  const progressAuthorIds = Array.from(new Set(progressRowsTyped.map((u) => u.author_id)));
  const progressAuthorNameById = new Map<string, string>();
  if (progressAuthorIds.length > 0) {
    const admin = createAdminClient();
    const { data: authors } = await admin.from("profiles").select("id, full_name").in("id", progressAuthorIds);
    for (const a of authors ?? []) {
      if (a.full_name) progressAuthorNameById.set(a.id, a.full_name);
    }
  }
  const progressUpdates: ClientProgressUpdate[] = progressRowsTyped.map((u) => ({
    id: u.id,
    projectId: u.project_id,
    projectName: projectById.get(u.project_id)?.name ?? "",
    episodeTitle: null,
    authorName: progressAuthorNameById.get(u.author_id) ?? null,
    title: u.title,
    description: u.description,
    stage: u.stage,
    contentType: u.content_type,
    media: u.media,
    createdAt: u.created_at,
  }));

  return (
    <ClientDashboard
      firstName={firstName}
      userId={session.userId}
      userName={session.profile.full_name}
      cards={cards}
      overallProgress={overallProgress}
      activeProjectsCount={activeProjectsCount}
      episodesCompletedTotal={episodesCompletedTotal}
      openNotesTotal={openNotesTotal}
      filesThisMonthCount={(filesThisMonthRows ?? []).length}
      openMeetingRequestsCount={(openMeetingRows ?? []).length}
      nextInvoice={nextInvoice}
      financeTotals={financeTotals}
      behindScenesPosts={behindScenesPosts}
      progressUpdates={progressUpdates}
    />
  );
}
