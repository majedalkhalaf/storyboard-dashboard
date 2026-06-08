'use client';

import { useAppStore } from '../store/useAppStore';
import { ActiveSection } from './AppShell';

interface SidebarProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard',   icon: '⬡',  label: 'لوحة التحكم',  labelEn: 'Dashboard' },
  { id: 'projects',    icon: '◈',  label: 'المشاريع',      labelEn: 'Projects' },
  { id: 'storyboards', icon: '▦',  label: 'الستوري بورد',  labelEn: 'Storyboards' },
  { id: 'equipment',   icon: '◉',  label: 'المعدات',       labelEn: 'Equipment' },
  { id: 'templates',   icon: '⊞',  label: 'القوالب',       labelEn: 'Templates' },
  { id: 'export',      icon: '⤴',  label: 'التصدير',       labelEn: 'Export' },
];
const BOTTOM_ITEMS = [
  { id: 'settings', icon: '⚙️', label: 'الإعدادات', labelEn: 'Settings' },
];

export default function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  const { theme, setTheme, language, setLanguage, projects, storyboards } = useAppStore();

  const activeProjects = projects.filter(p => p.status === 'production').length;
  const totalShots = storyboards.reduce((acc, sb) => acc + sb.parts.reduce((a, p) => a + p.shots.length, 0), 0);
  const completedShots = storyboards.reduce((acc, sb) => acc + sb.parts.reduce((a, p) => a + p.shots.filter(s => s.isCompleted).length, 0), 0);
  const overallPct = totalShots > 0 ? Math.round((completedShots / totalShots) * 100) : 0;

  return (
    <aside
      className="desktop-sidebar"
      style={{
        width: '240px', minWidth: '240px',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', height: '100vh',
        transition: 'width 0.2s',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="logo-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            background: 'linear-gradient(135deg, #A07830, #C9A84C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: '900', color: '#0A0A0B'
          }}>S</div>
          <div className="sidebar-text">
            <div className="logo-title" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.2' }}>Storyboard</div>
            <div className="logo-sub" style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: '600', letterSpacing: '0.1em' }}>PRODUCTION</div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="sidebar-stats" style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
          <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '6px', padding: '6px 8px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold)' }}>{projects.length}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>مشروع</div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '6px', padding: '6px 8px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold)' }}>{storyboards.length}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ستوري</div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '6px', padding: '6px 8px', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#22c55e' }}>{activeProjects}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>نشط</div>
          </div>
        </div>

        {/* Overall progress */}
        {totalShots > 0 && (
          <div className="sidebar-progress" style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>إجمالي الإنجاز</span>
              <span style={{ fontSize: '10px', fontWeight: '800', color: overallPct === 100 ? '#22c55e' : 'var(--gold)' }}>{overallPct}%</span>
            </div>
            <div style={{ height: '4px', background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '2px', width: `${overallPct}%`,
                background: overallPct === 100 ? '#22c55e' : 'var(--gold)',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        <div className="sidebar-text" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.1em', padding: '4px 8px 8px', textTransform: 'uppercase' }}>
          القائمة الرئيسية
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'right' }}
            onClick={() => onNavigate(item.id as ActiveSection)}
          >
            <span className="nav-icon" style={{ fontSize: '18px', width: '22px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
            <span className="sidebar-text" style={{ fontSize: '14px', fontWeight: activeSection === item.id ? '700' : '500' }}>
              {language === 'ar' ? item.label : item.labelEn}
            </span>
          </button>
        ))}

        <div className="sidebar-text" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.1em', padding: '16px 8px 8px', textTransform: 'uppercase' }}>
          الإعدادات
        </div>
        {BOTTOM_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'right' }}
            onClick={() => onNavigate(item.id as ActiveSection)}
          >
            <span className="nav-icon" style={{ fontSize: '18px', width: '22px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
            <span className="sidebar-text" style={{ fontSize: '14px', fontWeight: activeSection === item.id ? '700' : '500' }}>
              {language === 'ar' ? item.label : item.labelEn}
            </span>
          </button>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="sidebar-text" style={{ padding: '14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
          >
            {theme === 'dark' ? '☀️ فاتح' : '🌙 داكن'}
          </button>
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
          >
            {language === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Storyboard Dashboard v5.0
        </div>
      </div>
    </aside>
  );
}
