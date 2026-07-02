import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { getWorkspaceProjects } from "@/app/lib/workspace-projects";
import ProjectsWorkspace from "@/app/components/projects/workspace/ProjectsWorkspace";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ projects, serviceOptions, recentActivity }, { data: clients }, { data: templates }] = await Promise.all([
    getWorkspaceProjects(companyId, session!.userId),
    supabase.from("clients").select("id, name, email, phone").eq("company_id", companyId).order("name"),
    supabase.from("project_templates").select("*").eq("company_id", companyId).eq("is_active", true).order("name"),
  ]);

  return (
    <ProjectsWorkspace
      companyId={companyId}
      projects={projects}
      serviceOptions={serviceOptions}
      recentActivity={recentActivity}
      clients={clients ?? []}
      templates={templates ?? []}
    />
  );
}
