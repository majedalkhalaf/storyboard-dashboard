import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ExportCenter from "@/app/components/export/ExportCenter";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name");

  return <ExportCenter companyId={companyId} projects={projects ?? []} />;
}
