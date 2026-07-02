"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { CONTRACT_STATUSES } from "@/app/lib/constants";
import { fmtDate } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import type { ContractStatus } from "@/app/lib/types";

interface ContractRow {
  id: string;
  title: string;
  status: ContractStatus;
  version: number;
  created_at: string;
  project_id: string;
  client_id: string | null;
  projects: { name: string } | null;
  clients: { name: string } | null;
}

interface ProjectRow {
  id: string;
  name: string;
  client_id: string | null;
}

function StatusChip({ status }: { status: ContractStatus }) {
  const info = CONTRACT_STATUSES.find((s) => s.value === status);
  return (
    <span className="chip" style={{ color: info?.color, borderColor: info?.color }}>
      {info?.label ?? status}
    </span>
  );
}

export default function ContractsClient({
  companyId,
  contracts,
  projects,
}: {
  companyId: string;
  contracts: ContractRow[];
  projects: ProjectRow[];
}) {
  const { profile, userId } = useSession();
  const router = useRouter();
  const admin = isInternalAdmin(profile.role);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");

  const create = async () => {
    if (!title.trim() || !projectId) {
      setError("العنوان والمشروع مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const project = projects.find((p) => p.id === projectId);
    const { data, error: err } = await supabase
      .from("contracts")
      .insert({
        company_id: companyId,
        project_id: projectId,
        client_id: project?.client_id ?? null,
        title: title.trim(),
        content: { intro: "", clauses: [], pricing: [], terms: "" },
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
    if (data?.id) router.push(`/contracts/${data.id}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            العقود
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{contracts.length} عقد</p>
        </div>
        {admin && (
          <button className="btn btn-gold" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} /> عقد جديد
          </button>
        )}
      </div>

      {contracts.length === 0 ? (
        <div className="empty-state card">
          <Icon name="contracts" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد عقود بعد</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>المشروع</th>
                <th>العميل</th>
                <th>الإصدار</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>
                    <Link href={`/contracts/${c.id}`} style={{ color: "var(--gold)" }}>
                      {c.title}
                    </Link>
                  </td>
                  <td>{c.projects?.name ?? "—"}</td>
                  <td>{c.clients?.name ?? "—"}</td>
                  <td>v{c.version}</td>
                  <td>
                    <StatusChip status={c.status} />
                  </td>
                  <td>{fmtDate(c.created_at)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/contracts/${c.id}`} className="btn btn-ghost" style={{ padding: 6 }} title="تعديل">
                        <Icon name="edit" size={16} />
                      </Link>
                      <Link href={`/contracts/${c.id}/print`} className="btn btn-ghost" style={{ padding: 6 }} title="طباعة / PDF">
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
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>عقد جديد</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                عنوان العقد
                <input className="input-field" style={{ marginTop: 6 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عقد تصوير وإنتاج..." />
              </label>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                المشروع
                <select className="input-field" style={{ marginTop: 6 }} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">— اختر مشروعاً —</option>
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
