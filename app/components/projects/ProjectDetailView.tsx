"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientRecord, Project, ProjectServiceItem } from "@/app/lib/types";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";
import type { ProjectClientRow } from "./ClientsTab";
import ProjectHeaderBar from "./ProjectHeaderBar";
import ProjectSettingsDrawer from "./ProjectSettingsDrawer";
import EpisodeWorkspace from "./EpisodeWorkspace";
import EpisodeFormModal from "@/app/components/episodes/EpisodeFormModal";
import PresentationBuilderModal from "./presentation/PresentationBuilderModal";
import Icon from "@/app/components/ui/Icon";
import CollapsibleSection, { ExpandCollapseAllButton } from "@/app/components/ui/CollapsibleSection";
import { PROJECT_TYPES } from "@/app/lib/constants";
import { formatDate } from "./utils";
import ProjectFinanceSection from "./sections/ProjectFinanceSection";
import ProjectContractsSection from "./sections/ProjectContractsSection";
import ProjectProposalsSection from "./sections/ProjectProposalsSection";
import ProjectNotesSection from "./sections/ProjectNotesSection";
import ProjectActivitySection from "./sections/ProjectActivitySection";
import ProjectBehindScenesSection from "./sections/ProjectBehindScenesSection";

const PROJECT_SECTION_IDS = ["info", "stats", "finance", "contracts", "proposals", "notes", "behind_scenes", "activity"];

interface Props {
  project: Project;
  clientName: string | null;
  services: ProjectServiceItem[];
  gallery: EpisodeGalleryItem[];
  projectClients: ProjectClientRow[];
  companyClients: Pick<ClientRecord, "id" | "name" | "email" | "phone">[];
  initialEpisodeId: string | null;
}

export default function ProjectDetailView(props: Props) {
  const { project: initialProject, clientName, services, gallery, projectClients, companyClients, initialEpisodeId } = props;
  const router = useRouter();

  const [project, setProject] = useState(initialProject);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"info" | "clients" | null>(null);
  const [showPresentation, setShowPresentation] = useState(false);

  function patchProject(patch: Partial<Project>) {
    setProject((p) => ({ ...p, ...patch }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ProjectHeaderBar
        project={project}
        clientName={clientName}
        gallery={gallery}
        onNewEpisode={() => setShowEpisodeModal(true)}
        onOpenSettings={(t) => setSettingsTab(t)}
        onOpenPresentation={() => setShowPresentation(true)}
        onProjectChanged={patchProject}
      />

      <EpisodeWorkspace clientName={clientName} gallery={gallery} initialEpisodeId={initialEpisodeId} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>تفاصيل إضافية</h2>
          <ExpandCollapseAllButton groupKey={`project:${project.id}`} sectionIds={PROJECT_SECTION_IDS} />
        </div>

        <CollapsibleSection groupKey={`project:${project.id}`} id="info" title="معلومات المشروع" icon="info" defaultOpen>
          <ProjectInfoBlock project={project} clientName={clientName} />
        </CollapsibleSection>

        <CollapsibleSection groupKey={`project:${project.id}`} id="stats" title="الإحصائيات" icon="barChart" defaultOpen>
          <ProjectStatsBlock gallery={gallery} />
        </CollapsibleSection>

        <CollapsibleSection groupKey={`project:${project.id}`} id="finance" title="المالية" icon="money" defaultOpen={false}>
          <ProjectFinanceSection projectId={project.id} />
        </CollapsibleSection>

        <CollapsibleSection groupKey={`project:${project.id}`} id="contracts" title="العقود" icon="contracts" defaultOpen={false}>
          <ProjectContractsSection projectId={project.id} />
        </CollapsibleSection>

        <CollapsibleSection groupKey={`project:${project.id}`} id="proposals" title="العروض" icon="proposals" defaultOpen={false}>
          <ProjectProposalsSection projectId={project.id} />
        </CollapsibleSection>

        <CollapsibleSection groupKey={`project:${project.id}`} id="notes" title="الملاحظات" icon="message" defaultOpen={false}>
          <ProjectNotesSection projectId={project.id} />
        </CollapsibleSection>

        <CollapsibleSection groupKey={`project:${project.id}`} id="behind_scenes" title="الكواليس" icon="sparkles" defaultOpen={false}>
          <ProjectBehindScenesSection project={project} onProjectChanged={patchProject} />
        </CollapsibleSection>

        <CollapsibleSection groupKey={`project:${project.id}`} id="activity" title="سجل النشاط" icon="clock" defaultOpen={false}>
          <ProjectActivitySection projectId={project.id} />
        </CollapsibleSection>
      </div>

      {showEpisodeModal && (
        <EpisodeFormModal
          projectId={project.id}
          nextNumber={gallery.length + 1}
          nextSortOrder={gallery.length}
          onClose={() => setShowEpisodeModal(false)}
          onCreated={() => router.refresh()}
        />
      )}

      {settingsTab && (
        <ProjectSettingsDrawer
          project={project}
          services={services}
          projectClients={projectClients}
          companyClients={companyClients}
          initialTab={settingsTab}
          onClose={() => setSettingsTab(null)}
          onProjectChanged={patchProject}
          onClientsChanged={() => router.refresh()}
          onSaved={() => router.refresh()}
        />
      )}

      {showPresentation && <PresentationBuilderModal projectId={project.id} onClose={() => setShowPresentation(false)} />}
    </div>
  );
}

function ProjectInfoBlock({ project, clientName }: { project: Project; clientName: string | null }) {
  const typeLabel = project.type === "other" ? project.custom_type || "أخرى" : PROJECT_TYPES.find((t) => t.value === project.type)?.label || "—";
  const rows: { icon: "palette" | "clients" | "location" | "money" | "calendar"; label: string; value: string }[] = [
    { icon: "palette", label: "نوع المشروع", value: typeLabel },
    { icon: "clients", label: "العميل", value: clientName ?? "بدون عميل" },
    { icon: "location", label: "الموقع", value: project.location || "—" },
    { icon: "money", label: "الميزانية", value: project.budget != null ? `${project.budget.toLocaleString("en-US")} ر.س` : "—" },
    { icon: "calendar", label: "تاريخ التصوير", value: formatDate(project.shooting_date) },
    { icon: "calendar", label: "تاريخ التسليم", value: formatDate(project.delivery_date) },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name={r.icon} size={12} /> {r.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function ProjectStatsBlock({ gallery }: { gallery: EpisodeGalleryItem[] }) {
  const episodeCount = gallery.length;
  const avgProgress = episodeCount ? Math.round(gallery.reduce((s, e) => s + e.progress, 0) / episodeCount) : 0;
  const approvedCount = gallery.filter((e) => e.hasActiveApproval).length;
  const filesCount = gallery.reduce((s, e) => s + e.filesCount, 0);
  const notesCount = gallery.reduce((s, e) => s + e.notesCount + e.commentsCount, 0);

  const stats = [
    { label: "الحلقات", value: episodeCount, icon: "video" as const },
    { label: "متوسط الإنجاز", value: `${avgProgress}%`, icon: "barChart" as const },
    { label: "حلقات معتمدة", value: approvedCount, icon: "badgeCheck" as const },
    { label: "الملفات", value: filesCount, icon: "attachment" as const },
    { label: "الملاحظات", value: notesCount, icon: "message" as const },
  ];

  return (
    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <Icon name={s.icon} size={16} className="text-muted" />
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>{s.value}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
