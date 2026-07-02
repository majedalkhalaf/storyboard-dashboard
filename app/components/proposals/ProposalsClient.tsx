"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { PROPOSAL_STATUSES, PROPOSAL_TYPES } from "@/app/lib/constants";
import { fmtDate } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import type { ProposalStatus, ProposalType } from "@/app/lib/types";

interface ProposalRow {
  id: string;
  title: string;
  type: ProposalType;
  status: ProposalStatus;
  created_at: string;
  project_id: string | null;
  client_id: string | null;
  projects: { name: string } | null;
  clients: { name: string } | null;
}

interface ProjectRow {
  id: string;
  name: string;
  client_id: string | null;
}

function StatusChip({ status }: { status: ProposalStatus }) {
  const info = PROPOSAL_STATUSES.find((s) => s.value === status);
  return (
    <span className="chip" style={{ color: info?.color, borderColor: info?.color }}>
      {info?.label ?? status}
    </span>
  );
}

export default function ProposalsClient({
  companyId,
  proposals,
  projects,
}: {
  companyId: string;
  proposals: ProposalRow[];
  projects: ProjectRow[];
}) {
  const { profile, userId } = useSession();
  const router = useRouter();
  const admin = isInternalAdmin(profile.role);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProposalType>("general");
  const [projectId, setProjectId] = useState("");

  const create = async () => {
    if (!title.trim()) {
      setError("العنوان مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const project = projects.find((p) => p.id === projectId);
    const { data, error: err } = await supabase
      .from("proposals")
      .insert({
        company_id: companyId,
        project_id: projectId || null,
        client_id: project?.client_id ?? null,
        title: title.trim(),
        type,
        content: { sections: [] },
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setOpen(false);
    if (data?.id) router.push(`/proposals/${data.id}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            العروض
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{proposals.length} عرض</p>
        </div>
        {admin && (
          <button className="btn btn-gold" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} /> عرض جديد
          </button>
        )}
      </div>

      {proposals.length === 0 ? (
        <div className="empty-state card">
          <Icon name="proposals" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد عروض بعد</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>النوع</th>
                <th>المشروع</th>
                <th>العميل</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>
                    <Link href={`/proposals/${p.id}`} style={{ color: "var(--gold)" }}>
                      {p.title}
                    </Link>
                  </td>
                  <td>{PROPOSAL_TYPES.find((t) => t.value === p.type)?.label ?? p.type}</td>
                  <td>{p.projects?.name ?? "—"}</td>
                  <td>{p.clients?.name ?? "—"}</td>
                  <td>
                    <StatusChip status={p.status} />
                  </td>
                  <td>{fmtDate(p.created_at)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/proposals/${p.id}`} className="btn btn-ghost" style={{ padding: 6 }} title="تعديل">
                        <Icon name="edit" size={16} />
                      </Link>
                      <Link href={`/proposals/${p.id}/print`} className="btn btn-ghost" style={{ padding: 6 }} title="طباعة / PDF">
                        <Icon name="export" size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="modal-overlay no-print" onClick={() => !saving && setOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>عرض جديد</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                عنوان العرض
                <input className="input-field" style={{ marginTop: 6 }} value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                نوع العرض
                <select className="input-field" style={{ marginTop: 6 }} value={type} onChange={(e) => setType(e.target.value as ProposalType)}>
                  {PROPOSAL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                المشروع (اختياري)
                <select className="input-field" style={{ marginTop: 6 }} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">— بدون —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {error && <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-gold" onClick={create} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "جارٍ الإنشاء..." : "إنشاء ومتابعة"}
                </button>
                <button className="btn btn-outline" onClick={() => setOpen(false)} disabled={saving}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
