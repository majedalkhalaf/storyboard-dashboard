"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { fmtMoney } from "@/app/components/finance/format";
import { FINANCIAL_HEALTH_META, type FinancialHealth } from "@/app/lib/chart-colors";
import type { FinanceProjectRow } from "@/app/lib/finance-dashboard";
import { triggerBlobDownload } from "@/app/lib/report-export";

type SortKey = "invoiced" | "paid" | "profit" | "collectionRate";

const HEALTH_FILTERS: { value: FinancialHealth | "all"; label: string }[] = [
  { value: "all", label: "كل الحالات" },
  { value: "good", label: FINANCIAL_HEALTH_META.good.label },
  { value: "watch", label: FINANCIAL_HEALTH_META.watch.label },
  { value: "overdue", label: FINANCIAL_HEALTH_META.overdue.label },
  { value: "completed", label: FINANCIAL_HEALTH_META.completed.label },
];

export default function FinancialProjectsClient({ projects }: { projects: FinanceProjectRow[] }) {
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<FinancialHealth | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("invoiced");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = projects;
    if (q) {
      rows = rows.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.code ?? "").toLowerCase().includes(q) || (p.clientName ?? "").toLowerCase().includes(q)
      );
    }
    if (healthFilter !== "all") rows = rows.filter((p) => p.health === healthFilter);
    const sorted = [...rows].sort((a, b) => (sortDir === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
    return sorted;
  }, [projects, search, healthFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      <span style={{ display: "inline-flex", transform: sortDir === "asc" ? "rotate(180deg)" : undefined }}>
        <Icon name="chevronDown" size={12} />
      </span>
    ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            المشاريع المالية
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            كل مشاريع الشركة مع أرقامها المالية الكاملة: مفوتر، محصّل، مصروفات وربح
          </p>
        </div>
        <button className="btn btn-outline" onClick={handleExportProjects}>
          <Icon name="export" size={16} /> تصدير Excel
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <Icon name="search" size={15} />
          </span>
          <input
            className="input-field"
            style={{ paddingInlineStart: 36 }}
            placeholder="بحث بالاسم أو الكود أو العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field" style={{ width: 180 }} value={healthFilter} onChange={(e) => setHealthFilter(e.target.value as FinancialHealth | "all")}>
          {HEALTH_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="finance" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد مشاريع مطابقة</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>المشروع</th>
                <th>العميل</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("invoiced")}>
                  مفوتر {sortIcon("invoiced")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("paid")}>
                  محصّل {sortIcon("paid")}
                </th>
                <th>المتبقي</th>
                <th>مصروفات</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("profit")}>
                  الربح {sortIcon("profit")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("collectionRate")}>
                  نسبة التحصيل {sortIcon("collectionRate")}
                </th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const health = FINANCIAL_HEALTH_META[r.health];
                return (
                  <tr key={r.id}>
                    <td style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{r.code ?? "—"}</td>
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/projects/${r.id}`}>{r.name}</Link>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{r.clientName ?? "—"}</td>
                    <td>{fmtMoney(r.invoiced)}</td>
                    <td style={{ color: "#1DB954" }}>{fmtMoney(r.paid)}</td>
                    <td style={{ color: "#F59E0B" }}>{fmtMoney(r.remaining)}</td>
                    <td style={{ color: "#EF4444" }}>{fmtMoney(r.expenses)}</td>
                    <td style={{ color: r.profit >= 0 ? "#10B981" : "#EF4444", fontWeight: 700 }}>{fmtMoney(r.profit)}</td>
                    <td>{Math.round(r.collectionRate)}%</td>
                    <td>
                      <span className="chip" style={{ color: health.color, borderColor: health.color, fontSize: 11 }}>
                        {health.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  function handleExportProjects() {
    void exportProjectsExcel(filtered);
  }
}

async function exportProjectsExcel(rows: FinanceProjectRow[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("المشاريع المالية");
  const header = ws.addRow(["الكود", "المشروع", "العميل", "قيمة العقد", "مفوتر", "محصّل", "المتبقي", "مصروفات", "الربح", "نسبة التحصيل", "الحالة"]);
  header.font = { bold: true };
  rows.forEach((r) =>
    ws.addRow([
      r.code ?? "—",
      r.name,
      r.clientName ?? "—",
      r.contractValue,
      r.invoiced,
      r.paid,
      r.remaining,
      r.expenses,
      r.profit,
      `${Math.round(r.collectionRate)}%`,
      FINANCIAL_HEALTH_META[r.health].label,
    ])
  );
  ws.columns.forEach((c) => {
    c.width = 20;
  });
  const buffer = await wb.xlsx.writeBuffer();
  triggerBlobDownload(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "المشاريع_المالية.xlsx");
}
