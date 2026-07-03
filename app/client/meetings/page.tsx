import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import MeetingRequestForm from "@/app/components/client/MeetingRequestForm";
import { relativeTime } from "@/app/components/client/utils";
import Icon from "@/app/components/ui/Icon";
import type { ClientPermissions, Project } from "@/app/lib/types";

interface ProjectClientRow {
  permissions: ClientPermissions;
  project: Project | null;
}

// صفحة "الاجتماعات" — لا يوجد جدول اجتماعات/تقويم فعلي في قاعدة البيانات
// حالياً، فهذه الصفحة توفر قناة طلب اجتماع حقيقية (تُسجَّل كملاحظة يراها
// فريق العمل مباشرة) بدل عرض بيانات جدولة وهمية لا وجود لها.
export default async function ClientMeetingsPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[])
    .filter((r) => r.project && !r.project.archived)
    .sort((a, b) => (b.project!.updated_at || "").localeCompare(a.project!.updated_at || ""));

  const requestableProjects = rows.filter((r) => canClient(r.permissions, "request_meeting")).map((r) => ({ id: r.project!.id, company_id: r.project!.company_id, name: r.project!.name }));

  const projectIds = rows.map((r) => r.project!.id);
  const { data: meetingNotes } = projectIds.length
    ? await supabase
        .from("notes")
        .select("id, project_id, body, status, created_at")
        .in("project_id", projectIds)
        .eq("target_type", "meeting")
        .order("created_at", { ascending: false })
    : { data: [] };
  const projectsById = new Map(rows.map((r) => [r.project!.id, r.project!.name]));

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
        الاجتماعات
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13.5, marginBottom: 20 }}>
        أرسل طلب اجتماع وسيتواصل معك فريق العمل لتحديد الموعد المناسب.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <MeetingRequestForm projects={requestableProjects} userId={session.userId} />

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14 }}>طلباتك السابقة</div>
          {(meetingNotes ?? []).length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <Icon name="calendar" size={30} className="nav-icon" />
              <p style={{ marginTop: 10 }}>لا توجد طلبات اجتماع سابقة.</p>
            </div>
          ) : (
            (meetingNotes ?? []).map((n) => (
              <div key={n.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 4 }}>
                  {projectsById.get(n.project_id) ?? ""} · {relativeTime(n.created_at)}
                </div>
                <div style={{ fontSize: 13.5 }}>{n.body}</div>
                <span className="chip" style={{ marginTop: 8, fontSize: 10.5 }}>
                  {n.status === "done" || n.status === "closed" ? "تم الرد" : "بانتظار الرد"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
