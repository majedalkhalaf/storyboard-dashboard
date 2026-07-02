import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import EpisodeDetailView from "@/app/components/client/EpisodeDetailView";
import BrandingInjector from "@/app/components/client/BrandingInjector";
import Icon from "@/app/components/ui/Icon";
import { canClient } from "@/app/lib/permissions";
import type { Episode, EpisodeStage, Note, Project, ProjectClient, ProjectFile } from "@/app/lib/types";

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

  const { data: companyData } = await supabase.from("companies").select("*").eq("id", proj.company_id).maybeSingle();

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
  if (canClient(permissions, "execution_phases")) {
    const { data } = await supabase.from("episode_stages").select("*").eq("episode_id", episodeId).order("sort_order");
    stages = (data ?? []) as EpisodeStage[];
  }

  const { data: noteRows } = await supabase
    .from("notes")
    .select("*")
    .eq("episode_id", episodeId)
    .order("created_at", { ascending: true });
  const notes = (noteRows ?? []) as Note[];

  const { data: approvalRow } = await supabase
    .from("approvals")
    .select("id")
    .eq("episode_id", episodeId)
    .is("revoked_at", null)
    .maybeSingle();

  return (
    <>
      <BrandingInjector color={companyData?.primary_color} />
      <EpisodeDetailView
        episode={episode}
        projectId={id}
        companyId={proj.company_id}
        permissions={permissions}
        files={files}
        stages={stages}
        notes={notes}
        alreadyApproved={Boolean(approvalRow)}
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
