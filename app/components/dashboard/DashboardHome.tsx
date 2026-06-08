'use client';

import { useAppStore } from '../../store/useAppStore';
import { ActiveSection } from '../AppShell';
import { PROJECT_STATUSES } from '../../lib/constants';

interface DashboardProps {
  onNavigate: (section: ActiveSection, projectId?: string, storyboardId?: string) => void;
}

export default function DashboardHome({ onNavigate }: DashboardProps) {
  const { projects, storyboards, equipment, templates } = useAppStore();

  const stats = {
    totalProjects: projects.length,
    totalStoryboards: storyboards.length,
    totalTemplates: templates.length,
    activeProjects: projects.filter(p => p.status === 'production').length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    upcomingProductions: projects.filter(p => p.status === 'ready').length,
    totalShots: storyboards.reduce((acc, sb) => acc + sb.parts.reduce((a, p) => a + p.shots.length, 0), 0),
    totalEquipment: equipment.length,
  };

  const recentProjects = [...projects].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 5);

  const getStatusLabel = (status: string) => {
    const s = PROJECT_STATUSES.find(s => s.value === status);
    return s ? s.labelAr : status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      idea: '#a855f7', planning: '#3b82f6', ready: '#eab308',
      production: '#f97316', editing: '#06b6d4', completed: '#22c55e', archived: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'real-estate': 'عقارات', 'product-commercial': 'إعلان منتج',
      'corporate': 'شركات', 'social-media': 'سوشيال ميديا',
      'youtube': 'يوتيوب', 'interview': 'مقابلة', 'drone': 'درون',
      'documentary': 'وثائقي', 'event': 'فعالية'
    };
    return types[type] || type;
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '4px', height: '32px', borderRadius: '2px',
            background: 'linear-gradient(180deg, #A07830, #C9A84C)'
          }} />
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)' }}>
            لوحة التحكم
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', paddingRight: '16px' }}>
          مرحباً بك في نظام إدارة الإنتاج الاحترافي للستوري بورد
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'إجمالي المشاريع', value: stats.totalProjects, icon: '◈', color: '#C9A84C', sub: 'مشروع' },
          { label: 'الستوري بورد', value: stats.totalStoryboards, icon: '▦', color: '#3b82f6', sub: 'ستوري' },
          { label: 'مشاريع نشطة', value: stats.activeProjects, icon: '⚡', color: '#f97316', sub: 'قيد التصوير' },
          { label: 'مكتملة', value: stats.completedProjects, icon: '✓', color: '#22c55e', sub: 'منجزة' },
          { label: 'القوالب', value: stats.totalTemplates, icon: '⊞', color: '#a855f7', sub: 'قالب' },
          { label: 'جاهزة للتصوير', value: stats.upcomingProductions, icon: '🎬', color: '#eab308', sub: 'مشروع' },
          { label: 'إجمالي اللقطات', value: stats.totalShots, icon: '▣', color: '#06b6d4', sub: 'لقطة' },
          { label: 'المعدات', value: stats.totalEquipment, icon: '◉', color: '#ec4899', sub: 'قطعة' },
        ].map((stat, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: `${stat.color}20`, border: `1px solid ${stat.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', color: stat.color
              }}>
                {stat.icon}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{stat.sub}</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: stat.color, lineHeight: '1' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '600' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
          إجراءات سريعة
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: '+ مشروع جديد', section: 'projects' as ActiveSection, color: '#C9A84C', desc: 'إنشاء مشروع إنتاج جديد' },
            { label: '+ ستوري بورد', section: 'storyboards' as ActiveSection, color: '#3b82f6', desc: 'بناء ستوري بورد احترافي' },
            { label: '+ قالب جديد', section: 'templates' as ActiveSection, color: '#a855f7', desc: 'حفظ قالب قابل للاستخدام' },
            { label: 'مكتبة المعدات', section: 'equipment' as ActiveSection, color: '#22c55e', desc: 'إدارة المعدات والمخزون' },
            { label: 'مركز التصدير', section: 'export' as ActiveSection, color: '#f97316', desc: 'تصدير PDF وملفات الإنتاج' },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => onNavigate(action.section)}
              style={{
                padding: '14px 20px', borderRadius: '10px',
                border: `1px solid ${action.color}40`,
                background: `${action.color}10`,
                cursor: 'pointer', transition: 'all 0.2s',
                textAlign: 'right'
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = `${action.color}20`;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = `${action.color}10`;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '700', color: action.color }}>{action.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{action.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Projects + Status Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recent Projects */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              المشاريع الأخيرة
            </h2>
            <button onClick={() => onNavigate('projects')} style={{
              fontSize: '12px', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600'
            }}>
              عرض الكل ←
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentProjects.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: '32px' }}>◈</span>
                <p style={{ marginTop: '8px' }}>لا توجد مشاريع بعد</p>
              </div>
            ) : recentProjects.map(project => (
              <div
                key={project.id}
                onClick={() => onNavigate('projects', project.id)}
                style={{
                  padding: '14px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold-dark)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{project.name}</div>
                  <span style={{
                    fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px',
                    background: `${getStatusColor(project.status)}20`,
                    color: getStatusColor(project.status),
                    border: `1px solid ${getStatusColor(project.status)}40`
                  }}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{project.clientName}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getTypeLabel(project.type)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status distribution */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>
            توزيع حالة المشاريع
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {PROJECT_STATUSES.map(status => {
              const count = projects.filter(p => p.status === status.value).length;
              const pct = projects.length > 0 ? (count / projects.length) * 100 : 0;
              const color = getStatusColor(status.value);
              return (
                <div key={status.value}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{status.labelAr}</span>
                    <span style={{ fontSize: '13px', color: color, fontWeight: '700' }}>{count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}88, ${color})`
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Production tip */}
          <div style={{
            marginTop: '24px', padding: '16px', borderRadius: '8px',
            background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold)', marginBottom: '4px' }}>
              💡 نصيحة الإنتاج
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              ابدأ بتحديد هدف الفيديو وجمهوره المستهدف قبل بناء الستوري بورد للحصول على نتائج أفضل.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
