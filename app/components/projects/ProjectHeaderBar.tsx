"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import ZipExportButton from "@/app/components/ui/ZipExportButton";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { useIsMobile } from "@/app/lib/useIsMobile";
import { logActivity } from "@/app/lib/activity";
import { downloadCsv } from "@/app/lib/csv";
import { exportProjectZip } from "@/app/lib/zip-export";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/app/lib/constants";
import type { ItemNoun } from "@/app/lib/item-noun";
import type { Project } from "@/app/lib/types";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";
import { relativeTime } from "./utils";

export default function ProjectHeaderBar({
  project,
  clientName,
  gallery,
  itemNoun,
  onNewEpisode,
  onOpenSettings,
  onOpenPresentation,
  onProjectChanged,
}: {
  project: Project;
  clientName: string | null;
  gallery: EpisodeGalleryItem[];
  itemNoun: ItemNoun;
  onNewEpisode: () => void;
  onOpenSettings: (tab: "info" | "clients") => void;
  onOpenPresentation: () => void;
  onProjectChanged: (patch: Partial<Project>) => void;
}) {
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;
  const isMobile = useIsMobile();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(project.name);
  const [copied, setCopied] = useState(false);

  const avgProgress = gallery.length ? Math.round(gallery.reduce((s, e) => s + e.progress, 0) / gallery.length) : 0;
  const lastUpdate = gallery.reduce<string | null>((latest, e) => (!latest || e.updated_at > latest ? e.updated_at : latest), project.updated_at);
  const typeLabel = project.type === "other" ? project.custom_type || "أخرى" : PROJECT_TYPES.find((t) => t.value === project.type)?.label || "—";
  const statusInfo = PROJECT_STATUSES.find((s) => s.value === project.status);

  async function saveName() {
    setEditingName(false);
    if (name.trim() && name.trim() !== project.name) {
      await supabase.from("projects").update({ name: name.trim() }).eq("id", project.id);
      await logActivity(supabase, { companyId, projectId: project.id, action: "project_updated", details: { field: "name" } });
      onProjectChanged({ name: name.trim() });
    }
  }

  async function changeStatus(next: string) {
    const prev = project.status;
    onProjectChanged({ status: next as Project["status"] });
    await supabase.from("projects").update({ status: next }).eq("id", project.id);
    await logActivity(supabase, { companyId, projectId: project.id, action: "project_status_changed", details: { from: prev, to: next } });
  }

  function exportEpisodes() {
    downloadCsv(
      `${project.name}-${itemNoun.plural}`,
      gallery.map((e) => ({
        number: e.number ?? "",
        title: e.title,
        type: e.type ?? "",
        status: e.status,
        progress: e.progress,
        assigned_to: e.assigned_to_name ?? "",
        updated_at: e.updated_at,
      })),
      [
        { key: "number", label: "الرقم" },
        { key: "title", label: "العنوان" },
        { key: "type", label: "النوع" },
        { key: "status", label: "الحالة" },
        { key: "progress", label: "نسبة الإنجاز" },
        { key: "assigned_to", label: "المسؤول" },
        { key: "updated_at", label: "آخر تحديث" },
      ]
    );
  }

  function share() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div
      className="card"
      style={
        isMobile
          ? { padding: "12px 14px" }
          : { padding: "16px 20px", position: "sticky", top: 0, zIndex: 5, backdropFilter: "blur(6px)" }
      }
    >
      <Link href="/projects" style={{ fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Icon name="arrowRight" size={13} /> كل المشاريع
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            flexShrink: 0,
            background: project.cover_image_url
              ? `center/cover no-repeat url(${project.cover_image_url})`
              : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--border)",
          }}
        >
          {!project.cover_image_url && <Icon name="image" size={22} className="text-muted" />}
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {editingName ? (
              <input
                className="input-field"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                style={{ fontSize: 18, fontWeight: 800, maxWidth: 380 }}
              />
            ) : (
              <h1 style={{ fontSize: 19, fontWeight: 800, cursor: "text", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setEditingName(true)}>
                {name}
                <Icon name="edit" size={13} className="text-muted" />
              </h1>
            )}
            <span className="chip chip-gold" style={{ fontSize: 11 }}>
              {typeLabel}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, fontSize: 12, color: "var(--text-secondary)", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="clients" size={12} /> {clientName || "بدون عميل"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="video" size={12} /> {gallery.length} {itemNoun.singular}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="clock" size={12} /> آخر تحديث {relativeTime(lastUpdate)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 140 }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 11, color: "var(--text-muted)" }}>
            <span>الإنجاز الكلي</span>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{avgProgress}%</span>
          </div>
          <div className="progress-bar" style={{ height: 6, width: "100%" }}>
            <div className="progress-fill" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>

        <select
          className="input-field"
          value={project.status}
          onChange={(e) => changeStatus(e.target.value)}
          style={{ width: "auto", color: statusInfo?.color, fontWeight: 700, fontSize: 12 }}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="btn btn-gold" style={isMobile ? { padding: 9 } : { padding: "9px 14px", fontSize: 12 }} title={`إضافة ${itemNoun.singular}`} onClick={onNewEpisode}>
            <Icon name="plus" size={14} /> {!isMobile && `إضافة ${itemNoun.singular}`}
          </button>
          <button className="btn btn-outline" style={isMobile ? { padding: 9 } : { padding: "9px 14px", fontSize: 12 }} title="العرض الفني" onClick={onOpenPresentation}>
            <Icon name="proposals" size={14} /> {!isMobile && "العرض الفني"}
          </button>
          <button className="btn btn-outline" style={{ padding: "9px 12px" }} title={`تصدير قائمة ${itemNoun.plural} (CSV)`} onClick={exportEpisodes}>
            <Icon name="export" size={14} />
          </button>
          <ZipExportButton
            label="تصدير المشروع ZIP"
            icon="archive"
            size={isMobile ? "sm" : "md"}
            run={(onProgress) => exportProjectZip(supabase, companyId, project, gallery, onProgress)}
          />
          <button className="btn btn-outline" style={{ padding: "9px 12px" }} title="نسخ رابط المشروع" onClick={share}>
            <Icon name={copied ? "check" : "share"} size={14} />
          </button>
          <button className="btn btn-outline" style={{ padding: "9px 12px" }} title="دعوة عميل" onClick={() => onOpenSettings("clients")}>
            <Icon name="userPlus" size={14} />
          </button>
          <button className="btn btn-outline" style={{ padding: "9px 12px" }} title="إعدادات المشروع" onClick={() => onOpenSettings("info")}>
            <Icon name="settings" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
