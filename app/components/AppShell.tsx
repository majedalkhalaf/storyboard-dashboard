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
import SettingsSection from './settings/SettingsSection';

export type ActiveSection = 'dashboard' | 'projects' | 'storyboards' | 'equipment' | 'templates' | 'export' | 'settings';

const BOTTOM_NAV: { id: ActiveSection; icon: string; label: string }[] = [
  { id: 'dashboard',   icon: '⬡', label: 'الرئيسية' },
  { id: 'projects',    icon: '◈', label: 'المشاريع' },
  { id: 'storyboards', icon: '▦', label: 'الستوري' },
  { id: 'templates',   icon: '⊞', label: 'القوالب' },
  { id: 'settings',    icon: '⚙️', label: 'إعدادات' },
];

export default function AppShell() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeStoryboardId, setActiveStoryboardId] = useState<string | null>(null);
  const { theme } = useAppStore();

  const handleNavigate = (section: ActiveSection, projectId?: string, storyboardId?: string) => {
    setActiveSection(section);
    if (projectId) setActiveProjectId(projectId);
    if (storyboardId) setActiveStoryboardId(storyboardId);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'light' ? 'light' : ''}`}
      style={{ background: 'var(--bg-primary)' }}>

      {/* Desktop sidebar — hidden on mobile via CSS */}
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

      {/* Main content */}
      <main className="main-content flex-1 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
        {activeSection === 'dashboard'   && <DashboardHome onNavigate={handleNavigate} />}
        {activeSection === 'projects'    && <ProjectsSection activeProjectId={activeProjectId} setActiveProjectId={setActiveProjectId} onNavigate={handleNavigate} />}
        {activeSection === 'storyboards' && <StoryboardsSection activeStoryboardId={activeStoryboardId} setActiveStoryboardId={setActiveStoryboardId} projectId={activeProjectId} />}
        {activeSection === 'equipment'   && <EquipmentSection />}
        {activeSection === 'templates'   && <TemplatesSection />}
        {activeSection === 'export'      && <ExportCenter storyboardId={activeStoryboardId} />}
        {activeSection === 'settings'    && <SettingsSection />}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav no-print">
        {BOTTOM_NAV.map(item => (
          <button
            key={item.id}
            className={`bottom-nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => handleNavigate(item.id)}
          >
            <span className="nav-icon-large">{item.icon}</span>
            <span className="nav-label-small">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
