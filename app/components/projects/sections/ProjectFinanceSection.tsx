"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { fmtMoney } from "@/app/components/finance/format";
import { INVOICE_STATUSES } from "@/app/lib/constants";
import { formatDate } from "../utils";
import type { Invoice, Payment, Expense } from "@/app/lib/types";

// يُحمَّل هذا المكوّن فقط عند فتح القسم لأول مرة (CollapsibleSection لا يركّب
// الأبناء إلا بعد أول فتح) — لذا الجلب هنا في useEffect عند التركيب هو Lazy فعلياً.
export default function ProjectFinanceSection({ projectId }: { projectId: string }) {
  const [data, setData] = useState<{ invoices: Invoice[]; payments: Payment[]; expenses: Expense[] } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("invoices").select("*").eq("project_id", projectId).order("issue_date", { ascending: false }),
      supabase.from("payments").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("project_id", projectId).order("expense_date", { ascending: false }),
    ]).then(([inv, pay, exp]) => {
      setData({
        invoices: (inv.data as Invoice[]) ?? [],
        payments: (pay.data as Payment[]) ?? [],
        expenses: (exp.data as Expense[]) ?? [],
      });
    });
  }, [projectId]);

  if (!data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 70, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
      </div>
    );
  }

  const totalInvoiced = data.invoices.reduce((s, i) => s + Number(i.amount) + Number(i.tax ?? 0), 0);
  const totalPaid = data.payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const net = totalPaid - totalExpenses;

  const stats = [
    { label: "إجمالي الفواتير", value: totalInvoiced, icon: "invoices" as const, color: "var(--gold)" },
    { label: "إجمالي المدفوع", value: totalPaid, icon: "checkCircle" as const, color: "#1DB954" },
    { label: "إجمالي المصروفات", value: totalExpenses, icon: "trendDown" as const, color: "#EF4444" },
    { label: "الصافي", value: net, icon: "trendUp" as const, color: net >= 0 ? "#10B981" : "#EF4444" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span style={{ color: s.color, display: "inline-flex" }}>
              <Icon name={s.icon} size={16} />
            </span>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8, color: s.color }}>{fmtMoney(s.value)}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <FinanceList
        title="الفواتير"
        empty="لا توجد فواتير لهذا المشروع"
        items={data.invoices.map((i) => ({
          id: i.id,
          title: `فاتورة ${i.number}`,
          amount: Number(i.amount) + Number(i.tax ?? 0),
          date: i.issue_date,
          statusLabel: INVOICE_STATUSES.find((s) => s.value === i.status)?.label ?? i.status,
          statusColor: INVOICE_STATUSES.find((s) => s.value === i.status)?.color,
          href: `/invoices/${i.id}`,
        }))}
      />

      <FinanceList
        title="الدفعات"
        empty="لا توجد دفعات لهذا المشروع"
        items={data.payments.map((p) => ({
          id: p.id,
          title: p.method ? `دفعة (${p.method})` : "دفعة",
          amount: Number(p.amount),
          date: p.paid_date ?? p.due_date,
          statusLabel: p.status,
        }))}
      />

      <FinanceList
        title="المصروفات"
        empty="لا توجد مصروفات مسجّلة لهذا المشروع"
        items={data.expenses.map((e) => ({
          id: e.id,
          title: e.title,
          amount: Number(e.amount),
          date: e.expense_date,
          statusLabel: e.category ?? undefined,
        }))}
      />
    </div>
  );
}

function FinanceList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; amount: number; date: string | null; statusLabel?: string; statusColor?: string; href?: string }[];
}) {
  return (
    <div>
      <h4 style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>{title}</h4>
      {items.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.slice(0, 6).map((it) => (
            <Row key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ item }: { item: { id: string; title: string; amount: number; date: string | null; statusLabel?: string; statusColor?: string; href?: string } }) {
  const content = (
    <>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{formatDate(item.date)}</div>
      </div>
      {item.statusLabel && (
        <span className="chip" style={{ fontSize: 10.5, color: item.statusColor, borderColor: item.statusColor, flexShrink: 0 }}>
          {item.statusLabel}
        </span>
      )}
      <span style={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>{fmtMoney(item.amount)}</span>
    </>
  );
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 0",
    borderBottom: "1px solid var(--border)",
    textDecoration: "none",
    color: "inherit",
  };
  if (item.href) {
    return (
      <Link href={item.href} style={style}>
        {content}
      </Link>
    );
  }
  return <div style={style}>{content}</div>;
}
