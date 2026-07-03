"use client";

import { useMemo, useState } from "react";
import { EXPENSE_CATEGORIES } from "@/app/lib/constants";
import { fmtMoney, fmtDate } from "@/app/components/finance/format";
import AddExpenseButton from "@/app/components/finance/AddExpenseButton";
import Icon from "@/app/components/ui/Icon";

interface ExpenseRow {
  id: string;
  company_id: string;
  project_id: string | null;
  title: string;
  amount: number;
  category: string | null;
  expense_date: string;
  created_by: string | null;
  created_at: string;
  project: { name: string } | null;
}

interface ProjectRow {
  id: string;
  name: string;
}

interface VendorRow {
  id: string;
  name: string;
}

interface CategoryRow {
  id: string;
  name: string;
  type: "income" | "expense";
}

const GENERAL_VALUE = "__general__";

function CategoryChip({ category }: { category: string | null }) {
  if (!category) return <span>—</span>;
  return <span className="chip">{category}</span>;
}

export default function ExpensesClient({
  companyId,
  initialExpenses,
  projects,
  vendors = [],
  categories = [],
}: {
  companyId: string;
  initialExpenses: ExpenseRow[];
  projects: ProjectRow[];
  vendors?: VendorRow[];
  categories?: CategoryRow[];
}) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const total = useMemo(
    () => initialExpenses.reduce((s, e) => s + Number(e.amount), 0),
    [initialExpenses]
  );

  const filtered = useMemo(() => {
    return initialExpenses
      .filter((e) => {
        if (categoryFilter && e.category !== categoryFilter) return false;
        if (projectFilter === GENERAL_VALUE && e.project_id !== null) return false;
        if (projectFilter && projectFilter !== GENERAL_VALUE && e.project_id !== projectFilter) return false;
        return true;
      })
      .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1));
  }, [initialExpenses, categoryFilter, projectFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            المصروفات
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {initialExpenses.length} مصروف
          </p>
        </div>
        <AddExpenseButton companyId={companyId} projects={projects} vendors={vendors} categories={categories} />
      </div>

      <div
        className="stats-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}
      >
        <div className="stat-card">
          <span style={{ color: "#EF4444", display: "inline-flex" }}>
            <Icon name="expenses" size={20} />
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10, color: "#EF4444" }}>{fmtMoney(total)}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>إجمالي المصروفات</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select
          className="input-field"
          style={{ width: "auto" }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">كل الفئات</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          style={{ width: "auto" }}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">كل المشاريع</option>
          <option value={GENERAL_VALUE}>مصروفات عامة</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="expenses" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد مصروفات مطابقة</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البند</th>
                <th>الفئة</th>
                <th>المشروع</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.expense_date)}</td>
                  <td style={{ fontWeight: 600 }}>{e.title}</td>
                  <td>
                    <CategoryChip category={e.category} />
                  </td>
                  <td>{e.project?.name ?? "مصروف عام"}</td>
                  <td>{fmtMoney(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
