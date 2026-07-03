import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import Icon from "@/app/components/ui/Icon";
import type { Company, Project } from "@/app/lib/types";

// صفحة "الدعم الفني" — معلومات تواصل حقيقية لكل شركة إنتاج يتابع العميل
// مشاريعها حالياً (وليس شركة واحدة مفترضة)، بلا بيانات وهمية.
export default async function ClientSupportPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("project:projects(company_id)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  type Row = { project: { company_id: string } | { company_id: string }[] | null };
  const companyIds = Array.from(
    new Set(
      ((data ?? []) as unknown as Row[])
        .map((r) => (Array.isArray(r.project) ? r.project[0]?.company_id : r.project?.company_id))
        .filter((id): id is string => Boolean(id))
    )
  );

  const companies: Company[] = companyIds.length
    ? ((await supabase.from("companies").select("*").in("id", companyIds)).data as Company[] | null) ?? []
    : [];
  const projects = (((await supabase.from("projects").select("*").in("company_id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"])).data as Project[] | null) ?? []);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
        الدعم الفني
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13.5, marginBottom: 20 }}>هل تحتاج إلى مساعدة؟ فريق العمل جاهز للتواصل معك مباشرة.</p>

      {companies.length === 0 ? (
        <div className="card empty-state">
          <Icon name="phone" size={36} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 14 }}>لا توجد معلومات تواصل متاحة حالياً.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {companies.map((company) => {
            const projectCount = projects.filter((p) => p.company_id === company.id).length;
            return (
              <div key={company.id} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {company.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo_url} alt={company.name} style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg, var(--gold-dark), var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0A0A0B", flexShrink: 0 }}>
                      {company.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{company.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{projectCount} مشروع نشط</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {company.phone && (
                    <a href={`tel:${company.phone}`} className="btn btn-outline" style={{ fontSize: 13 }}>
                      <Icon name="phone" size={14} /> اتصال
                    </a>
                  )}
                  {company.phone && (
                    <a
                      href={`https://wa.me/${company.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn"
                      style={{ fontSize: 13, background: "#25D366", color: "#fff", fontWeight: 700 }}
                    >
                      <Icon name="phone" size={14} /> واتساب
                    </a>
                  )}
                  {company.email && (
                    <a href={`mailto:${company.email}`} className="btn btn-outline" style={{ fontSize: 13 }}>
                      <Icon name="mail" size={14} /> بريد إلكتروني
                    </a>
                  )}
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: 13 }}>
                      <Icon name="link" size={14} /> الموقع الإلكتروني
                    </a>
                  )}
                </div>
                {company.address && (
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="location" size={13} /> {company.address}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
