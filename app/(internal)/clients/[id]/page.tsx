import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ClientDetailClient from "@/app/components/clients/ClientDetailClient";
import type { ClientRecord, ProjectClient } from "@/app/lib/types";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (!client) notFound();

  const record = client as ClientRecord;

  // روابط المشاريع المطابقة لهذا العميل عبر client_id أو البريد الإلكتروني
  const orFilters = [`client_id.eq.${id}`];
  if (record.email) orFilters.push(`invited_email.eq.${record.email}`);

  const { data: links } = await supabase
    .from("project_clients")
    .select("*, project:projects(id, name, status)")
    .eq("company_id", companyId)
    .or(orFilters.join(","))
    .order("invited_at", { ascending: false });

  type LinkRow = ProjectClient & { project: { id: string; name: string; status: string } | null };

  return <ClientDetailClient client={record} links={(links as LinkRow[]) ?? []} />;
}
