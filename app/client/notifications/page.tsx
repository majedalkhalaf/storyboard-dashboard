import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import NotificationsListFull from "@/app/components/client/NotificationsListFull";
import type { Project } from "@/app/lib/types";

export default async function ClientNotificationsPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("project:projects(id, name)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  type Row = { project: Pick<Project, "id" | "name"> | Pick<Project, "id" | "name">[] | null };
  const projects = ((data ?? []) as unknown as Row[])
    .map((r) => (Array.isArray(r.project) ? r.project[0] : r.project))
    .filter((p): p is Pick<Project, "id" | "name"> => Boolean(p));

  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
        التنبيهات
      </h1>
      <NotificationsListFull userId={session.userId} projects={projects} />
    </div>
  );
}
