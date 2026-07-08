"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { CLIENT_CRM_STATUSES, CLIENT_TYPE_LABELS } from "@/app/lib/constants";
import type { ClientDirectoryRow } from "@/app/lib/clients-directory";
import { relativeTime } from "../projects/utils";
import PerformanceRing from "../dashboard/PerformanceRing";
import ClientStatusBadge from "@/app/components/ui/ClientStatusBadge";

function whatsappLink(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "").replace(/^0/, "966").replace(/^\+/, "");
  return `https://wa.me/${digits}`;
}

export default function ClientsTable({
  rows,
  onEdit,
  onDeleted,
}: {
  rows: ClientDirectoryRow[];
  onEdit: (row: ClientDirectoryRow) => void;
  onDeleted: (id: string) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  async function remove(row: ClientDirectoryRow) {
    setOpenMenuId(null);
    if (!confirm(`حذف العميل "${row.name}"؟ لن يؤثر هذا على مشاريعه الحالية.`)) return;
    await supabase.from("clients").delete().eq("id", row.id);
    onDeleted(row.id);
  }

  if (rows.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="clients" size={32} className="text-muted" />
        <p style={{ marginTop: 12 }}>لا توجد نتائج مطابقة</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="table-scroll" style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ minWidth: 1400 }}>
          <thead>
            <tr>
              <th>العميل</th>
              <th>جهة التواصل</th>
              <th>المسؤول</th>
              <th>المشاريع</th>
              <th>نشطة</th>
              <th>مكتملة</th>
              <th>متأخرة</th>
              <th>قيمة العقود</th>
              <th>الفواتير</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>الإنجاز</th>
              <th>آخر نشاط</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const status = CLIENT_CRM_STATUSES.find((s) => s.value === r.status);
              const wa = whatsappLink(r.phone);
              return (
                <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/clients/${r.id}`)}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          flexShrink: 0,
                          background: r.logo_url ? `center/cover no-repeat url(${r.logo_url})` : "var(--bg-hover)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 800,
                          color: "var(--gold)",
                        }}
                      >
                        {!r.logo_url && r.name.slice(0, 2)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>{r.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                          <span className="chip chip-gold" style={{ fontSize: 10, display: "inline-block" }}>
                            {CLIENT_TYPE_LABELS[r.client_type]}
                          </span>
                          {r.lastPortalSeenAt !== undefined && r.lastPortalSeenAt !== null && <ClientStatusBadge lastSeenAt={r.lastPortalSeenAt} compact />}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: 12 }}>{r.contact_name || r.name}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      {r.phone && (
                        <a href={`tel:${r.phone}`} className="btn-ghost" style={{ padding: 5, borderRadius: 6 }} title={r.phone}>
                          <Icon name="phone" size={12} />
                        </a>
                      )}
                      {r.email && (
                        <a href={`mailto:${r.email}`} className="btn-ghost" style={{ padding: 5, borderRadius: 6 }} title={r.email}>
                          <Icon name="mail" size={12} />
                        </a>
                      )}
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: 5, borderRadius: 6, color: "#22C55E" }} title="واتساب">
                          <Icon name="message" size={12} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    {r.assigned_to_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: r.assigned_to_avatar ? `center/cover no-repeat url(${r.assigned_to_avatar})` : "var(--bg-hover)",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12 }}>{r.assigned_to_name}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>غير مسند</span>
                    )}
                  </td>
                  <td>{r.projectsCount}</td>
                  <td style={{ color: "#3B82F6" }}>{r.activeProjects}</td>
                  <td style={{ color: "#22C55E" }}>{r.completedProjects}</td>
                  <td style={{ color: r.lateProjects ? "#EF4444" : "var(--text-muted)" }}>{r.lateProjects}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.contractsValue.toLocaleString("en-US")} ر.س</td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.invoicesTotal.toLocaleString("en-US")} ر.س</td>
                  <td style={{ whiteSpace: "nowrap", color: "#22C55E" }}>{r.paidTotal.toLocaleString("en-US")} ر.س</td>
                  <td style={{ whiteSpace: "nowrap", color: r.remaining ? "#EF4444" : "var(--text-muted)" }}>{r.remaining.toLocaleString("en-US")} ر.س</td>
                  <td>
                    <PerformanceRing percent={r.completionPct} label="" size={40} />
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--text-muted)" }}>{relativeTime(r.lastActivity)}</td>
                  <td>
                    {status && (
                      <span className="chip" style={{ color: status.color, borderColor: status.color }}>
                        {status.label}
                      </span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ position: "relative" }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: 6, borderRadius: 8 }}
                        onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                      >
                        <Icon name="more" size={16} />
                      </button>
                      {openMenuId === r.id && (
                        <div
                          className="card"
                          style={{ position: "absolute", left: 0, top: "100%", zIndex: 20, minWidth: 160, padding: 6, display: "flex", flexDirection: "column", gap: 2 }}
                        >
                          <MenuItem icon="eye" label="عرض" onClick={() => router.push(`/clients/${r.id}`)} />
                          <MenuItem icon="edit" label="تعديل" onClick={() => (onEdit(r), setOpenMenuId(null))} />
                          <MenuItem icon="projects" label="المشاريع" onClick={() => router.push(`/clients/${r.id}?tab=projects`)} />
                          <MenuItem icon="invoices" label="الفواتير" onClick={() => router.push(`/clients/${r.id}?tab=invoices`)} />
                          <MenuItem icon="contracts" label="العقود" onClick={() => router.push(`/clients/${r.id}?tab=contracts`)} />
                          <MenuItem icon="payments" label="الدفعات" onClick={() => router.push(`/clients/${r.id}?tab=payments`)} />
                          <MenuItem icon="trash" label="حذف" danger onClick={() => remove(r)} />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          عرض {(page - 1) * pageSize + 1} إلى {Math.min(page * pageSize, rows.length)} من {rows.length} عميل
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            className="input-field"
            style={{ width: "auto", fontSize: 12, padding: "6px 10px" }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[8, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <Icon name="chevronRight" size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 8)
              .map((p) => (
                <button
                  key={p}
                  className="btn-ghost"
                  style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, background: p === page ? "var(--gold)" : "transparent", color: p === page ? "#000" : "var(--text-secondary)", fontWeight: p === page ? 700 : 500 }}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <Icon name="chevronLeft" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className="btn-ghost"
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, fontSize: 12, color: danger ? "#EF4444" : "var(--text-primary)", justifyContent: "flex-start" }}
      onClick={onClick}
    >
      <Icon name={icon} size={14} /> {label}
    </button>
  );
}
