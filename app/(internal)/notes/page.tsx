import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import NotesClient from "@/app/components/notes/NotesClient";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: notes } = await supabase
    .from("notes")
    .select(
      "id, project_id, episode_id, target_type, author_id, author_role, body, status, created_at, author:profiles!author_id(full_name), project:projects(name), episode:episodes(title)"
    )
    .eq("company_id", companyId)
    .is("parent_note_id", null)
    .order("created_at", { ascending: false });

  const noteIds = (notes ?? []).map((n) => n.id);
  const replyCounts: Record<string, number> = {};
  if (noteIds.length > 0) {
    const { data: replies } = await supabase
      .from("notes")
      .select("parent_note_id")
      .eq("company_id", companyId)
      .in("parent_note_id", noteIds);
    for (const r of replies ?? []) {
      if (r.parent_note_id) replyCounts[r.parent_note_id] = (replyCounts[r.parent_note_id] ?? 0) + 1;
    }
  }

  return <NotesClient initialNotes={(notes ?? []) as never[]} replyCounts={replyCounts} />;
}
