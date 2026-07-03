"use client";

import Icon from "@/app/components/ui/Icon";
import { CLIENT_CRM_STATUSES, CLIENT_TYPE_LABELS } from "@/app/lib/constants";
import type { ClientCrmStatus, ClientType } from "@/app/lib/types";

export type ClientsSort = "recent" | "most_projects" | "highest_revenue" | "name";

export interface ClientsFilters {
  city: string;
  status: ClientCrmStatus | "";
  clientType: ClientType | "";
  assignedTo: string;
}

export default function ClientsToolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  cities,
  teamMembers,
  sort,
  onSortChange,
  onNew,
  onImport,
  onExport,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  filters: ClientsFilters;
  onFiltersChange: (f: ClientsFilters) => void;
  cities: string[];
  teamMembers: { id: string; full_name: string | null }[];
  sort: ClientsSort;
  onSortChange: (s: ClientsSort) => void;
  onNew: () => void;
  onImport: () => void;
  onExport: () => void;
}) {
  return (
    <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
          <span style={{ position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            className="input-field"
            style={{ paddingRight: 38 }}
            placeholder="ابحث في العملاء..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-outline" style={{ padding: "9px 14px", fontSize: 12 }} onClick={onImport}>
            <Icon name="fileUp" size={14} /> استيراد
          </button>
          <button className="btn btn-outline" style={{ padding: "9px 14px", fontSize: 12 }} onClick={onExport}>
            <Icon name="export" size={14} /> تصدير
          </button>
          <button className="btn btn-gold" style={{ padding: "9px 16px", fontSize: 12 }} onClick={onNew}>
            <Icon name="plus" size={14} /> عميل جديد
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          className="input-field"
          style={{ width: "auto", fontSize: 12 }}
          value={filters.city}
          onChange={(e) => onFiltersChange({ ...filters, city: e.target.value })}
        >
          <option value="">كل المدن</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="input-field"
          style={{ width: "auto", fontSize: 12 }}
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as ClientCrmStatus | "" })}
        >
          <option value="">كل الحالات</option>
          {CLIENT_CRM_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          className="input-field"
          style={{ width: "auto", fontSize: 12 }}
          value={filters.clientType}
          onChange={(e) => onFiltersChange({ ...filters, clientType: e.target.value as ClientType | "" })}
        >
          <option value="">كل الأنواع</option>
          {(Object.keys(CLIENT_TYPE_LABELS) as ClientType[]).map((t) => (
            <option key={t} value={t}>
              {CLIENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <select
          className="input-field"
          style={{ width: "auto", fontSize: 12 }}
          value={filters.assignedTo}
          onChange={(e) => onFiltersChange({ ...filters, assignedTo: e.target.value })}
        >
          <option value="">كل المسؤولين</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name || "بدون اسم"}
            </option>
          ))}
        </select>

        <span style={{ marginRight: "auto", fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="sliders" size={13} /> ترتيب حسب
        </span>
        <select className="input-field" style={{ width: "auto", fontSize: 12 }} value={sort} onChange={(e) => onSortChange(e.target.value as ClientsSort)}>
          <option value="recent">الأحدث</option>
          <option value="most_projects">الأكثر مشاريع</option>
          <option value="highest_revenue">الأعلى دخلاً</option>
          <option value="name">الاسم</option>
        </select>
      </div>
    </div>
  );
}
