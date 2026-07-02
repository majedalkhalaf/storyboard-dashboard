"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { downloadCsv } from "@/app/lib/csv";
import Icon, { type IconName } from "@/app/components/ui/Icon";

interface ExportAction {
  key: string;
  title: string;
  description: string;
  icon: IconName;
  run: (companyId: string) => Promise<void>;
}

export default function ExportCenter({
  companyId,
  projects,
}: {
  companyId: string;
  projects: { id: string; name: string }[];
}) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const router = useRouter();

  const actions: ExportAction[] = [
    {
      key: "projects",
      title: "تصدير قائمة المشاريع",
      description: "ملف CSV يحتوي كل المشاريع وحالاتها ونسب إنجازها",
      icon: "projects",
      run: async (cid) => {
        const supabase = createClient();
        const { data } = await supabase
          .from("projects")
          .select("name, type, status, progress, budget, created_at")
          .eq("company_id", cid);
        downloadCsv(
          "المشاريع",
          data ?? [],
          [
            { key: "name", label: "الاسم" },
            { key: "type", label: "النوع" },
            { key: "status", label: "الحالة" },
            { key: "progress", label: "نسبة الإنجاز" },
            { key: "budget", label: "الميزانية" },
            { key: "created_at", label: "تاريخ الإنشاء" },
          ]
        );
      },
    },
    {
      key: "invoices",
      title: "تصدير قائمة الفواتير",
      description: "ملف CSV بكل الفواتير ومبالغها وحالتها",
      icon: "invoices",
      run: async (cid) => {
        const supabase = createClient();
        const { data } = await supabase
          .from("invoices")
          .select("number, amount, tax, status, issue_date, due_date")
          .eq("company_id", cid);
        downloadCsv(
          "الفواتير",
          data ?? [],
          [
            { key: "number", label: "رقم الفاتورة" },
            { key: "amount", label: "المبلغ" },
            { key: "tax", label: "الضريبة" },
            { key: "status", label: "الحالة" },
            { key: "issue_date", label: "تاريخ الإصدار" },
            { key: "due_date", label: "تاريخ الاستحقاق" },
          ]
        );
      },
    },
    {
      key: "clients",
      title: "تصدير قائمة العملاء",
      description: "ملف CSV بسجل عملاء الشركة",
      icon: "clients",
      run: async (cid) => {
        const supabase = createClient();
        const { data } = await supabase.from("clients").select("name, email, phone, created_at").eq("company_id", cid);
        downloadCsv(
          "العملاء",
          data ?? [],
          [
            { key: "name", label: "الاسم" },
            { key: "email", label: "البريد الإلكتروني" },
            { key: "phone", label: "الهاتف" },
            { key: "created_at", label: "تاريخ الإضافة" },
          ]
        );
      },
    },
  ];

  async function handleRun(action: ExportAction) {
    setLoadingKey(action.key);
    try {
      await action.run(companyId);
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          مركز التصدير
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          صدّر بيانات شركتك بصيغة CSV أو كتقرير مشروع شامل قابل للطباعة/PDF
        </p>
      </div>

      <div className="export-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {actions.map((a) => (
          <div key={a.key} className="card" style={{ padding: 20 }}>
            <Icon name={a.icon} size={22} />
            <div style={{ fontWeight: 700, marginTop: 12 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, marginBottom: 14 }}>{a.description}</div>
            <button className="btn btn-outline" onClick={() => handleRun(a)} disabled={loadingKey === a.key} style={{ width: "100%", justifyContent: "center" }}>
              {loadingKey === a.key ? "جارٍ التصدير..." : "تصدير CSV"}
            </button>
          </div>
        ))}

        <div className="card" style={{ padding: 20 }}>
          <Icon name="export" size={22} />
          <div style={{ fontWeight: 700, marginTop: 12 }}>تقرير مشروع شامل</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, marginBottom: 14 }}>
            تقرير قابل للطباعة/PDF يجمع معلومات المشروع، الحلقات، الملفات، الفواتير والنشاط
          </div>
          <select className="input-field" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={{ marginBottom: 10 }}>
            <option value="">— اختر مشروعاً —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-gold"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={!selectedProject}
            onClick={() => router.push(`/export/project/${selectedProject}`)}
          >
            فتح التقرير
          </button>
        </div>
      </div>
    </div>
  );
}
