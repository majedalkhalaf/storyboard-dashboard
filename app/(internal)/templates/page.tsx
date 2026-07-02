import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import TemplatesClient from "@/app/components/templates/TemplatesClient";
import type { ProjectTemplate } from "@/app/lib/types";

export default async function TemplatesPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data } = await supabase
    .from("project_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return (
    <TemplatesClient
      initialTemplates={(data as ProjectTemplate[]) ?? []}
      companyId={companyId}
      userId={session!.userId}
    />
  );
}
