"use client";

import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { CLIENT_CRM_STATUSES, CLIENT_TYPE_LABELS } from "@/app/lib/constants";
import type { ClientProfileSummary } from "@/app/lib/client-profile";
import { relativeTime } from "@/app/components/projects/utils";

export default function ClientHero({ summary, onEdit }: { summary: ClientProfileSummary; onEdit: () => void }) {
  const { client } = summary;
  const status = CLIENT_CRM_STATUSES.find((s) => s.value === client.status);

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1, minWidth: 260 }}>
          <span
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              flexShrink: 0,
              background: client.logo_url ? `center/cover no-repeat url(${client.logo_url})` : "var(--bg-hover)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              color: "var(--gold)",
            }}
          >
            {!client.logo_url && client.name.slice(0, 2)}
          </span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>{client.name}</h1>
              <span className="chip chip-gold">{CLIENT_TYPE_LABELS[client.client_type]}</span>
              {status && (
                <span className="chip" style={{ color: status.color, borderColor: status.color }}>
                  {status.label}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
              {client.city && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="location" size={13} /> {client.city}
                </span>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} style={{ display: "flex", alignItems: "center", gap: 5, color: "inherit" }}>
                  <Icon name="phone" size={13} /> {client.phone}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} dir="ltr" style={{ display: "flex", alignItems: "center", gap: 5, color: "inherit" }}>
                  <Icon name="mail" size={13} /> {client.email}
                </a>
              )}
              {summary.assignedToName && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="user" size={13} /> {summary.assignedToName}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="clock" size={13} /> آخر نشاط {relativeTime(summary.lastActivity)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/clients" className="btn btn-outline" style={{ padding: "9px 14px", fontSize: 12 }}>
            <Icon name="arrowRight" size={14} /> كل العملاء
          </Link>
          <button className="btn btn-gold" style={{ padding: "9px 14px", fontSize: 12 }} onClick={onEdit}>
            <Icon name="edit" size={14} /> تعديل البيانات
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
        <Mini label="المشاريع" value={String(summary.projectsCount)} icon="projects" />
        <Mini label="نشطة الآن" value={String(summary.activeProjects)} icon="clock" />
        <Mini label="الحلقات" value={String(summary.episodesCount)} icon="episodes" />
        <Mini label="قيمة العقود" value={`${summary.contractsValue.toLocaleString("en-US")} ر.س`} icon="contracts" />
        <Mini label="إجمالي الفواتير" value={`${summary.invoicesTotal.toLocaleString("en-US")} ر.س`} icon="invoices" />
        <Mini label="المدفوع" value={`${summary.paidTotal.toLocaleString("en-US")} ر.س`} icon="payments" />
      </div>
    </div>
  );
}

function Mini({ label, value, icon }: { label: string; value: string; icon: Parameters<typeof Icon>[0]["name"] }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
        <Icon name={icon} size={12} /> {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
