import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { getClientProfileSummary } from "@/app/lib/client-profile-server";
import ClientProfileView from "@/app/components/clients/profile/ClientProfileView";
import type { Project } from "@/app/lib/types";

const VALID_TABS = new Set([
  "overview",
  "projects",
  "videos",
  "invoices",
  "payments",
  "contracts",
  "offers",
  "files",
  "notes",
  "activity",
  "settings",
]);

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const summary = await getClientProfileSummary(companyId, id);
  if (!summary) notFound();

  const [{ data: projects }, { data: teamMembers }] = await Promise.all([
    supabase.from("projects").select("*").eq("client_id", id).order("updated_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("company_id", companyId).neq("role", "client").order("full_name"),
  ]);

  const initialTab = tab && VALID_TABS.has(tab) ? tab : "overview";

  return (
    <ClientProfileView
      summary={summary}
      projects={(projects as Project[]) ?? []}
      teamMembers={teamMembers ?? []}
      companyId={companyId}
      userId={session!.userId}
      initialTab={initialTab as never}
    />
  );
}
