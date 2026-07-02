"use client";

import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/app/lib/constants";

export interface WorkspaceFilters {
  search: string;
  type: string;
  status: string;
  service: string;
  clientId: string;
  year: string;
  month: string;
}

export const EMPTY_FILTERS: WorkspaceFilters = { search: "", type: "", status: "", service: "", clientId: "", year: "", month: "" };

const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function ProjectFilterBar({
  filters,
  onChange,
  serviceOptions,
  clientOptions,
  yearOptions,
}: {
  filters: WorkspaceFilters;
  onChange: (next: WorkspaceFilters) => void;
  serviceOptions: string[];
  clientOptions: { id: string; name: string }[];
  yearOptions: string[];
}) {
  const set = <K extends keyof WorkspaceFilters>(key: K, value: WorkspaceFilters[K]) => onChange({ ...filters, [key]: value });
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
          <Icon name="search" size={17} />
        </span>
        <input
          className="input-field"
          style={{ paddingInlineStart: 42, height: 46, fontSize: 15 }}
          placeholder="ابحث باسم المشروع أو العميل أو رقم المشروع..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select className="input-field" style={{ width: "auto", minWidth: 130 }} value={filters.type} onChange={(e) => set("type", e.target.value)}>
          <option value="">نوع المشروع</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select className="input-field" style={{ width: "auto", minWidth: 130 }} value={filters.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">الحالة</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select className="input-field" style={{ width: "auto", minWidth: 130 }} value={filters.service} onChange={(e) => set("service", e.target.value)}>
          <option value="">الخدمة</option>
          {serviceOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select className="input-field" style={{ width: "auto", minWidth: 130 }} value={filters.clientId} onChange={(e) => set("clientId", e.target.value)}>
          <option value="">العميل</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select className="input-field" style={{ width: "auto", minWidth: 100 }} value={filters.year} onChange={(e) => set("year", e.target.value)}>
          <option value="">السنة</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select className="input-field" style={{ width: "auto", minWidth: 110 }} value={filters.month} onChange={(e) => set("month", e.target.value)}>
          <option value="">الشهر</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>{m}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => onChange(EMPTY_FILTERS)}>
            <Icon name="close" size={13} /> إعادة تعيين
          </button>
        )}
      </div>
    </div>
  );
}
