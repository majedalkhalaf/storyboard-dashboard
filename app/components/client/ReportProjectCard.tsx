"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { exportClientProjectZip, downloadClientQuickReport, type ExportProgress } from "@/app/lib/client-zip-export";
import { projectStatusMeta } from "@/app/components/client/utils";
import type { Episode, Invoice, Note, Payment, Project, ProjectFile } from "@/app/lib/types";

// بطاقة مشروع واحد في صفحة "التقارير" — تجلب بيانات المشروع (حلقات/ملفات/ملاحظات
// ومالية إن سُمح) عند الضغط فقط، ثم تصدّر تقريراً كاملاً (ZIP) أو سريعاً (نصي).
export default function ReportProjectCard({
  project,
  canDownloadZip,
  canFinance,
  canPayments,
}: {
  project: Project;
  canDownloadZip: boolean;
  canFinance: boolean;
  canPayments: boolean;
}) {
  const [busyKind, setBusyKind] = useState<"zip" | "quick" | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const status = projectStatusMeta(project.status);

  async function loadEpisodesAndFiles() {
    const supabase = createClient();
    const [{ data: episodeRows }, { data: fileRows }] = await Promise.all([
      supabase.from("episodes").select("*").eq("project_id", project.id).order("sort_order", { ascending: true }),
      supabase.from("files").select("*").eq("project_id", project.id).eq("client_visible", true),
    ]);
    return { episodes: (episodeRows ?? []) as Episode[], files: (fileRows ?? []) as ProjectFile[] };
  }

  async function handleZip() {
    if (busyKind) return;
    setBusyKind("zip");
    try {
      const { episodes, files } = await loadEpisodesAndFiles();
      const projectFiles = files.filter((f) => !f.episode_id);
      const episodeFilesByEpisode: Record<string, ProjectFile[]> = {};
      for (const f of files) {
        if (f.episode_id) (episodeFilesByEpisode[f.episode_id] ??= []).push(f);
      }
      await exportClientProjectZip(project, episodes, projectFiles, episodeFilesByEpisode, {}, setProgress);
    } finally {
      setBusyKind(null);
      setProgress(null);
    }
  }

  async function handleQuick() {
    if (busyKind) return;
    setBusyKind("quick");
    try {
      const supabase = createClient();
      const { episodes } = await loadEpisodesAndFiles();
      const { data: noteRows } = await supabase.from("notes").select("*").eq("project_id", project.id);
      const notes = (noteRows ?? []) as Note[];

      let finance: { projectValue: number; paid: number; remaining: number } | null = null;
      let lastPayment: Payment | null = null;
      if (canFinance) {
        const [{ data: invoiceRows }, { data: paymentRows }] = await Promise.all([
          supabase.from("invoices").select("amount, tax, status").eq("project_id", project.id),
          supabase.from("payments").select("amount, status").eq("project_id", project.id),
        ]);
        const invoices = (invoiceRows ?? []) as Pick<Invoice, "amount" | "tax" | "status">[];
        const totalInvoiced = invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + (i.amount || 0) + (i.tax || 0), 0);
        const paymentsList = (paymentRows ?? []) as Pick<Payment, "amount" | "status">[];
        const paid = paymentsList.filter((p) => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);
        const projectValue = project.budget ?? totalInvoiced;
        finance = { projectValue, paid, remaining: Math.max(projectValue - paid, 0) };
      }
      if (canPayments) {
        const { data } = await supabase
          .from("payments")
          .select("*")
          .eq("project_id", project.id)
          .eq("status", "paid")
          .order("paid_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        lastPayment = (data ?? null) as Payment | null;
      }

      downloadClientQuickReport(project, episodes, notes, finance, lastPayment);
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <div className="card card-hover-lift" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <Link href={`/client/projects/${project.id}`} style={{ fontSize: 15, fontWeight: 700, color: "inherit", textDecoration: "none" }}>
            {project.name}
          </Link>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>نسبة الإنجاز: {Math.round(project.progress ?? 0)}%</div>
        </div>
        <span className="chip" style={{ color: status.color, borderColor: status.color, background: `${status.color}1a`, flexShrink: 0 }}>
          {status.label}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canDownloadZip && (
          <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={handleZip} disabled={Boolean(busyKind)}>
            <Icon name="archive" size={14} />
            {busyKind === "zip" ? `${progress?.stage ?? "جارٍ التحميل..."} ${progress?.percent ?? 0}%` : "تقرير كامل (ZIP)"}
          </button>
        )}
        <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={handleQuick} disabled={Boolean(busyKind)}>
          <Icon name="fileCheck" size={14} />
          {busyKind === "quick" ? "جارٍ التجهيز..." : "تقرير سريع"}
        </button>
      </div>
    </div>
  );
}
