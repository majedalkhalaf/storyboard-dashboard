"use client";

import { useState } from "react";
import Tabs, { type TabDef } from "@/app/components/ui/Tabs";
import type { ClientProfileSummary } from "@/app/lib/client-profile";
import type { Project } from "@/app/lib/types";
import ClientHero from "./ClientHero";
import ClientSidebarActions from "./ClientSidebarActions";
import ClientFormModal from "../ClientFormModal";
import OverviewTab from "./tabs/OverviewTab";
import SettingsTab from "./tabs/SettingsTab";
import ProjectsTab from "./tabs/ProjectsTab";
import VideosTab from "./tabs/VideosTab";
import InvoicesTab from "./tabs/InvoicesTab";
import PaymentsTab from "./tabs/PaymentsTab";
import ContractsTab from "./tabs/ContractsTab";
import OffersTab from "./tabs/OffersTab";
import FilesTab from "./tabs/FilesTab";
import NotesTab from "./tabs/NotesTab";
import ActivityTab from "./tabs/ActivityTab";
import AnalyticsTab from "./tabs/AnalyticsTab";

type TabKey = "overview" | "projects" | "videos" | "invoices" | "payments" | "contracts" | "offers" | "files" | "notes" | "activity" | "analytics" | "settings";

const TABS: TabDef<TabKey>[] = [
  { key: "overview", label: "نظرة عامة", icon: "info" },
  { key: "projects", label: "المشاريع", icon: "projects" },
  { key: "videos", label: "الفيديوهات", icon: "video" },
  { key: "invoices", label: "الفواتير", icon: "invoices" },
  { key: "payments", label: "الدفعات", icon: "payments" },
  { key: "contracts", label: "العقود", icon: "contracts" },
  { key: "offers", label: "العروض", icon: "proposals" },
  { key: "files", label: "الملفات", icon: "files" },
  { key: "notes", label: "الملاحظات", icon: "message" },
  { key: "activity", label: "سجل النشاط", icon: "clock" },
  { key: "analytics", label: "تحليلات العميل", icon: "barChart" },
  { key: "settings", label: "الإعدادات", icon: "settings" },
];

export default function ClientProfileView({
  summary: initialSummary,
  projects: initialProjects,
  teamMembers,
  companyId,
  userId,
  initialTab,
}: {
  summary: ClientProfileSummary;
  projects: Project[];
  teamMembers: { id: string; full_name: string | null }[];
  companyId: string;
  userId: string;
  initialTab: TabKey;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [projects] = useState(initialProjects);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [showEdit, setShowEdit] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade-in">
      <ClientHero summary={summary} companyId={companyId} onEdit={() => setShowEdit(true)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20, alignItems: "flex-start" }}>
        <div>
          <div className="tabs-scroll-wrap" style={{ marginBottom: 16 }}>
            <Tabs tabs={TABS} active={tab} onChange={setTab} />
          </div>

          <div className="animate-fade-in">
            {tab === "overview" && <OverviewTab summary={summary} onGoTab={(t) => setTab(t as TabKey)} />}
            {tab === "projects" && <ProjectsTab clientId={summary.client.id} />}
            {tab === "videos" && <VideosTab clientId={summary.client.id} />}
            {tab === "invoices" && <InvoicesTab clientId={summary.client.id} />}
            {tab === "payments" && <PaymentsTab clientId={summary.client.id} />}
            {tab === "contracts" && <ContractsTab clientId={summary.client.id} />}
            {tab === "offers" && <OffersTab clientId={summary.client.id} />}
            {tab === "files" && <FilesTab clientId={summary.client.id} />}
            {tab === "notes" && <NotesTab clientId={summary.client.id} />}
            {tab === "activity" && <ActivityTab clientId={summary.client.id} />}
            {tab === "analytics" && <AnalyticsTab clientId={summary.client.id} />}
            {tab === "settings" && <SettingsTab client={summary.client} teamMembers={teamMembers} />}
          </div>
        </div>

        <ClientSidebarActions client={summary.client} projects={projects} />
      </div>

      {showEdit && (
        <ClientFormModal
          companyId={companyId}
          userId={userId}
          teamMembers={teamMembers}
          editing={summary.client}
          onClose={() => setShowEdit(false)}
          onSaved={(client) => setSummary((prev) => ({ ...prev, client }))}
        />
      )}
    </div>
  );
}
