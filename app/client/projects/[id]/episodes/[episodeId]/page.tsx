import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireClient } from "@/app/components/client/guards";
import EpisodeDetailView from "@/app/components/client/EpisodeDetailView";
import BrandingInjector from "@/app/components/client/BrandingInjector";
import Icon from "@/app/components/ui/Icon";
import { canClient } from "@/app/lib/permissions";
import type { Episode, EpisodeStage, Project, ProjectClient, StoryboardScene } from "@/app/lib/types";

// هذه الصفحة صفحة "مراجعة وتسليم" مختصرة للعميل، وليست لوحة إدارة تشغيلية —
// لذلك تُجلب هنا فقط الحقول والأعداد التي تظهر فعلياً (بلا select('*') على
// جداول ثقيلة)، وتُترَك القوائم الكبيرة (الملاحظات/الملفات) لتُجلب بأسلوب Lazy
// من مكوّنات العميل نفسها بعد الرسم الأول (راجع EpisodeNotesSection/EpisodeFilesSection).
export default async function ClientEpisodePage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>;
}) {
  const { id, episodeId } = await params;
  const session = await requireClient();
  const supabase = await createClient();

  const [{ data: pc }, { data: project }] = await Promise.all([
    supabase.from("project_clients").select("id, permissions, status").eq("project_id", id).eq("client_user_id", session.userId).eq("status", "active").maybeSingle(),
    supabase.from("projects").select("id, company_id, name, client_id, type").eq("id", id).maybeSingle(),
  ]);

  if (!pc) return <Unauthorized />;
  if (!project) return <Unauthorized />;

  const projectClient = pc as Pick<ProjectClient, "id" | "permissions" | "status">;
  const permissions = projectClient.permissions;
  if (!canClient(permissions, "episodes")) return <Unauthorized />;
  const proj = project as Pick<Project, "id" | "company_id" | "name" | "client_id" | "type">;

  const showFiles = canClient(permissions, "files");
  const showStages = canClient(permissions, "execution_phases");
  const showStoryboard = canClient(permissions, "storyboard");

  const [
    { data: companyData },
    { data: clientRow },
    { data: episodeRow },
    { data: approvalRow },
    { count: openNotesCount },
    { count: filesCount },
    { data: videoRows },
    { data: stageRows },
    { data: sceneRows },
  ] = await Promise.all([
    supabase.from("companies").select("primary_color, button_color, alert_color").eq("id", proj.company_id).maybeSingle(),
    proj.client_id ? supabase.from("clients").select("name").eq("id", proj.client_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("episodes")
      .select("id, number, title, description, cover_image_url, status, progress, duration_seconds, kind, script, scenario, meta, created_at, updated_at")
      .eq("id", episodeId)
      .eq("project_id", id)
      .maybeSingle(),
    supabase.from("approvals").select("approved_at, note").eq("episode_id", episodeId).is("revoked_at", null).maybeSingle(),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("episode_id", episodeId)
      .is("parent_note_id", null)
      .not("status", "in", "(done,closed,rejected)"),
    showFiles ? supabase.from("files").select("id", { count: "exact", head: true }).eq("episode_id", episodeId).eq("client_visible", true) : Promise.resolve({ count: 0 }),
    showFiles
      ? supabase
          .from("files")
          .select("id, name, thumbnail_url, duration_seconds, client_can_download, external_url")
          .eq("episode_id", episodeId)
          .eq("client_visible", true)
          .eq("category", "video")
          .not("storage_path", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({
          data: [] as { id: string; name: string; thumbnail_url: string | null; duration_seconds: number | null; client_can_download: boolean; external_url: string | null }[],
        }),
    showStages
      ? supabase
          .from("episode_stages")
          .select("id, key, label, status, progress, started_at, completed_at, due_date, assigned_to, sort_order")
          .eq("episode_id", episodeId)
          .order("sort_order")
      : Promise.resolve({ data: [] as EpisodeStage[] }),
    showStoryboard
      ? supabase.from("storyboard_scenes").select("id, number, title, cover_image_url, status").eq("episode_id", episodeId).order("sort_order")
      : Promise.resolve({ data: [] as StoryboardScene[] }),
  ]);

  if (!episodeRow) return <Unauthorized />;
  const episode = episodeRow as Pick<
    Episode,
    | "id"
    | "number"
    | "title"
    | "description"
    | "cover_image_url"
    | "status"
    | "progress"
    | "duration_seconds"
    | "kind"
    | "script"
    | "scenario"
    | "meta"
    | "created_at"
    | "updated_at"
  >;
  const clientName = clientRow?.name ?? null;
  const stages = (stageRows ?? []) as EpisodeStage[];
  const storyboardScenes = (sceneRows ?? []) as StoryboardScene[];
  const latestVideoFile = (videoRows ?? [])[0] ?? null;

  let stageAssigneeNames: Record<string, string> = {};
  const assigneeIds = [...new Set(stages.map((s) => s.assigned_to).filter((v): v is string => Boolean(v)))];
  if (assigneeIds.length > 0) {
    const admin = createAdminClient();
    const { data: assignees } = await admin.from("profiles").select("id, full_name").in("id", assigneeIds);
    stageAssigneeNames = Object.fromEntries((assignees ?? []).map((a) => [a.id, a.full_name || "عضو الفريق"]));
  }

  return (
    <>
      <BrandingInjector color={companyData?.primary_color} buttonColor={companyData?.button_color} alertColor={companyData?.alert_color} />
      <EpisodeDetailView
        episode={episode}
        projectName={proj.name}
        clientName={clientName}
        projectId={id}
        companyId={proj.company_id}
        permissions={permissions}
        openNotesCount={openNotesCount ?? 0}
        filesCount={filesCount ?? 0}
        latestVideoFile={latestVideoFile}
        stages={stages}
        stageAssigneeNames={stageAssigneeNames}
        storyboardScenes={storyboardScenes}
        alreadyApproved={Boolean(approvalRow)}
        approvedAt={approvalRow?.approved_at ?? null}
        approvalNote={approvalRow?.note ?? null}
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
