'use client';

import { useAppStore } from '../store/useAppStore';
import { ActiveSection } from './AppShell';

interface SidebarProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: '⬡', label: 'لوحة التحكم', labelEn: 'Dashboard' },
  { id: 'projects', icon: '◈', label: 'المشاريع', labelEn: 'Projects' },
  { id: 'storyboards', icon: '▦', label: 'الستوري بورد', labelEn: 'Storyboards' },
  { id: 'equipment', icon: '◉', label: 'المعدات', labelEn: 'Equipment' },
  { id: 'templates', icon: '⊞', label: 'القوالب', labelEn: 'Templates' },
  { id: 'export', icon: '⤴', label: 'التصدير', labelEn: 'Export' },
];

export default function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  const { theme, setTheme, language, setLanguage, projects, storyboards } = useAppStore();

  const activeProjects = projects.filter(p => p.status === 'production').length;
  const totalSb = storyboards.length;

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #A07830, #C9A84C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: '900', color: '#0A0A0B'
          }}>S</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.2' }}>
              Storyboard
            </div>
            <div style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: '600', letterSpacing: '0.1em' }}>
              PRODUCTION
            </div>
          </div>
        </div>
        {/* Quick stats */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <div style={{
            flex: 1, background: 'var(--bg-card)', borderRadius: '6px', padding: '6px 8px',
            border: '1px solid var(--border)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold)' }}>{projects.length}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>مشروع</div>
          </div>
          <div style={{
            flex: 1, background: 'var(--bg-card)', borderRadius: '6px', padding: '6px 8px',
            border: '1px solid var(--border)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold)' }}>{totalSb}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ستوري</div>
          </div>
          <div style={{
            flex: 1, background: 'var(--bg-card)', borderRadius: '6px', padding: '6px 8px',
            border: '1px solid rgba(201,168,76,0.3)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#22c55e' }}>{activeProjects}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>نشط</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.1em', padding: '4px 8px 8px', textTransform: 'uppercase' }}>
          القائمة الرئيسية
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'right' }}
            onClick={() => onNavigate(item.id as ActiveSection)}
          >
            <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
            <span style={{ fontSize: '14px', fontWeight: activeSection === item.id ? '700' : '500' }}>
              {language === 'ar' ? item.label : item.labelEn}
            </span>
          </button>
        ))}
      </nav>

      {/* Bottom controls */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '12px', fontWeight: '600'
            }}
          >
            {theme === 'dark' ? '☀️ فاتح' : '🌙 داكن'}
          </button>
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            style={{
              flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '12px', fontWeight: '600'
            }}
          >
            {language === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Storyboard Dashboard v1.0
        </div>
      </div>
    </aside>
  );
}
