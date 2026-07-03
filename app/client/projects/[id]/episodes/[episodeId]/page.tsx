import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireClient } from "@/app/components/client/guards";
import EpisodeDetailView from "@/app/components/client/EpisodeDetailView";
import BrandingInjector from "@/app/components/client/BrandingInjector";
import { daysUntil } from "@/app/components/client/utils";
import Icon from "@/app/components/ui/Icon";
import { canClient } from "@/app/lib/permissions";
import type { Episode, EpisodeStage, Note, Project, ProjectClient, ProjectFile, StoryboardScene } from "@/app/lib/types";

export default async function ClientEpisodePage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>;
}) {
  const { id, episodeId } = await params;
  const session = await requireClient();
  const supabase = await createClient();

  const { data: pc } = await supabase
    .from("project_clients")
    .select("*")
    .eq("project_id", id)
    .eq("client_user_id", session.userId)
    .eq("status", "active")
    .maybeSingle();

  if (!pc) return <Unauthorized />;

  const projectClient = pc as ProjectClient;
  const permissions = projectClient.permissions;

  if (!canClient(permissions, "episodes")) return <Unauthorized />;

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) return <Unauthorized />;
  const proj = project as Project;

  const [{ data: companyData }, { data: clientRow }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", proj.company_id).maybeSingle(),
    proj.client_id ? supabase.from("clients").select("name").eq("id", proj.client_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const clientName = clientRow?.name ?? null;

  const { data: episodeRow } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", episodeId)
    .eq("project_id", id)
    .maybeSingle();
  if (!episodeRow) return <Unauthorized />;
  const episode = episodeRow as Episode;

  let files: ProjectFile[] = [];
  if (canClient(permissions, "files")) {
    const { data } = await supabase
      .from("files")
      .select("*")
      .eq("episode_id", episodeId)
      .eq("client_visible", true)
      .order("created_at", { ascending: false });
    files = (data ?? []) as ProjectFile[];
  }

  let stages: EpisodeStage[] = [];
  let stageAssigneeNames: Record<string, string> = {};
  if (canClient(permissions, "execution_phases")) {
    const { data } = await supabase.from("episode_stages").select("*").eq("episode_id", episodeId).order("sort_order");
    stages = (data ?? []) as EpisodeStage[];

    // اسم المسؤول عن كل مرحلة (عضو فريق داخلي) — سياسة profiles الحالية تسمح
    // لزملاء الشركة فقط برؤية بعضهم، فلا يصل العميل له مباشرة عبر جلسته، لذا
    // يُجلب هنا فقط بمفتاح الخادم service_role (اسم فقط، بلا أي بيانات حساسة).
    const assigneeIds = [...new Set(stages.map((s) => s.assigned_to).filter((v): v is string => Boolean(v)))];
    if (assigneeIds.length > 0) {
      const admin = createAdminClient();
      const { data: assignees } = await admin.from("profiles").select("id, full_name").in("id", assigneeIds);
      stageAssigneeNames = Object.fromEntries((assignees ?? []).map((a) => [a.id, a.full_name || "عضو الفريق"]));
    }
  }

  let storyboardScenes: StoryboardScene[] = [];
  if (canClient(permissions, "storyboard")) {
    const { data } = await supabase.from("storyboard_scenes").select("*").eq("episode_id", episodeId).order("sort_order");
    storyboardScenes = (data ?? []) as StoryboardScene[];
  }

  const { data: noteRows } = await supabase
    .from("notes")
    .select("*")
    .eq("episode_id", episodeId)
    .order("created_at", { ascending: true });
  const notes = (noteRows ?? []) as Note[];

  const { data: approvalRow } = await supabase
    .from("approvals")
    .select("approved_at, note")
    .eq("episode_id", episodeId)
    .is("revoked_at", null)
    .maybeSingle();

  const daysToDelivery = daysUntil(episode.delivery_date);

  return (
    <>
      <BrandingInjector color={companyData?.primary_color} />
      <EpisodeDetailView
        episode={episode}
        projectName={proj.name}
        clientName={clientName}
        projectId={id}
        companyId={proj.company_id}
        permissions={permissions}
        files={files}
        stages={stages}
        stageAssigneeNames={stageAssigneeNames}
        storyboardScenes={storyboardScenes}
        notes={notes}
        alreadyApproved={Boolean(approvalRow)}
        approvedAt={approvalRow?.approved_at ?? null}
        approvalNote={approvalRow?.note ?? null}
        daysToDelivery={daysToDelivery}
        userId={session.userId}
        userName={session.profile.full_name}
      />
    </>
  );
}

function Unauthorized() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="card empty-state">
        <Icon name="shield" size={40} className="nav-icon" />
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>غير مصرّح بالوصول</h2>
        <p style={{ fontSize: 14, marginTop: 6 }}>لا تملك صلاحية عرض هذه الحلقة.</p>
        <Link href="/client" className="btn btn-outline" style={{ marginTop: 16 }}>
          العودة لمشاريعي
        </Link>
      </div>
    </div>
  );
}
