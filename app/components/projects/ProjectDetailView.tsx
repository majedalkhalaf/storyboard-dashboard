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
