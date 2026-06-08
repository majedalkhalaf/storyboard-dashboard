'use client';

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import Sidebar from './Sidebar';
import DashboardHome from './dashboard/DashboardHome';
import ProjectsSection from './projects/ProjectsSection';
import StoryboardsSection from './storyboard/StoryboardsSection';
import EquipmentSection from './equipment/EquipmentSection';
import TemplatesSection from './TemplatesSection';
import ExportCenter from './export/ExportCenter';

export type ActiveSection = 'dashboard' | 'projects' | 'storyboards' | 'equipment' | 'templates' | 'export';

export default function AppShell() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeStoryboardId, setActiveStoryboardId] = useState<string | null>(null);
  const { theme } = useAppStore();

  const handleNavigate = (section: ActiveSection, projectId?: string, storyboardId?: string) => {
    setActiveSection(section);
    if (projectId) setActiveProjectId(projectId);
    if (storyboardId) setActiveStoryboardId(storyboardId);
  };

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'light' ? 'light' : ''}`}
      style={{ background: 'var(--bg-primary)' }}>
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
        {activeSection === 'dashboard' && (
          <DashboardHome onNavigate={handleNavigate} />
        )}
        {activeSection === 'projects' && (
          <ProjectsSection
            activeProjectId={activeProjectId}
            setActiveProjectId={setActiveProjectId}
            onNavigate={handleNavigate}
          />
        )}
        {activeSection === 'storyboards' && (
          <StoryboardsSection
            activeStoryboardId={activeStoryboardId}
            setActiveStoryboardId={setActiveStoryboardId}
            projectId={activeProjectId}
          />
        )}
        {activeSection === 'equipment' && <EquipmentSection />}
        {activeSection === 'templates' && <TemplatesSection />}
        {activeSection === 'export' && (
          <ExportCenter storyboardId={activeStoryboardId} />
        )}
      </main>
    </div>
  );
}
