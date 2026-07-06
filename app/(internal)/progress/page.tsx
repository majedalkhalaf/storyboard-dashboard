import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ProgressGlobalView from "@/app/components/progress/ProgressGlobalView";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: projects }, { data: episodes }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("company_id", companyId).eq("archived", false).order("name"),
    supabase.from("episodes").select("id, project_id, title").eq("company_id", companyId).order("title"),
  ]);

  return <ProgressGlobalView companyId={companyId} projects={projects ?? []} episodes={episodes ?? []} />;
}
