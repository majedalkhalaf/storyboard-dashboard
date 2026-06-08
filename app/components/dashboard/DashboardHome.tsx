'use client';

import { useAppStore } from '../../store/useAppStore';
import { ActiveSection } from '../AppShell';
import { PROJECT_STATUSES } from '../../lib/constants';

interface DashboardProps {
  onNavigate: (section: ActiveSection, projectId?: string, storyboardId?: string) => void;
}

function getProjectProgress(projectId: string, storyboards: any[], manualProgress?: number) {
  if (manualProgress !== undefined && manualProgress >= 0) return { pct: manualProgress, total: 0, done: 0, manual: true };
  const sbs = storyboards.filter(sb => sb.projectId === projectId);
  let total = 0, done = 0;
  for (const sb of sbs) {
    for (const part of sb.parts) {
      for (const shot of part.shots) {
        total++;
        if (shot.isCompleted) done++;
      }
    }
  }
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { pct, total, done, manual: false };
}

export default function DashboardHome({ onNavigate }: DashboardProps) {
  const { projects, storyboards, equipment, templates, updateProject } = useAppStore();

  const stats = {
    totalProjects: projects.length,
    totalStoryboards: storyboards.length,
    totalTemplates: templates.length,
    activeProjects: projects.filter(p => p.status === 'production').length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    upcomingProductions: projects.filter(p => p.status === 'ready').length,
    totalShots: storyboards.reduce((acc, sb) => acc + sb.parts.reduce((a, p) => a + p.shots.length, 0), 0),
    completedShots: storyboards.reduce((acc, sb) => acc + sb.parts.reduce((a, p) => a + p.shots.filter(s => s.isCompleted).length, 0), 0),
    totalEquipment: equipment.length,
  };

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getStatusLabel = (status: string) => {
    const s = PROJECT_STATUSES.find(s => s.value === status);
    return s ? s.labelAr : status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      idea: '#a855f7', planning: '#3b82f6', ready: '#eab308',
      production: '#f97316', editing: '#06b6d4', completed: '#22c55e',
      archived: '#6b7280', 'on-hold': '#f43f5e'
    };
    return colors[status] || '#6b7280';
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'real-estate': 'عقارات', 'product-commercial': 'إعلان منتج',
      'corporate': 'شركات', 'social-media': 'سوشيال ميديا',
      'youtube': 'يوتيوب', 'interview': 'مقابلة', 'drone': 'درون',
      'documentary': 'وثائقي', 'event': 'فعالية', 'custom': 'مخصص'
    };
    return types[type] || type;
  };

  // Status groups for the kanban-style overview
  const statusGroups = [
    { value: 'ready', label: '🎬 جاهز للتصوير', color: '#eab308' },
    { value: 'production', label: '📹 قيد التصوير', color: '#f97316' },
    { value: 'planning', label: '📋 تخطيط', color: '#3b82f6' },
    { value: 'editing', label: '🎞️ مونتاج', color: '#06b6d4' },
    { value: 'completed', label: '✅ مكتمل', color: '#22c55e' },
    { value: 'on-hold', label: '⏸️ مؤجل', color: '#f43f5e' },
  ];

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", maxWidth: '1400px', margin: '0 auto' }}>

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'إجمالي المشاريع', value: stats.totalProjects, icon: '◈', color: '#C9A84C', sub: 'مشروع' },
          { label: 'الستوري بورد', value: stats.totalStoryboards, icon: '▦', color: '#3b82f6', sub: 'ستوري' },
          { label: 'مشاريع نشطة', value: stats.activeProjects, icon: '⚡', color: '#f97316', sub: 'قيد التصوير' },
          { label: 'مكتملة', value: stats.completedProjects, icon: '✓', color: '#22c55e', sub: 'منجزة' },
          { label: 'القوالب', value: stats.totalTemplates, icon: '⊞', color: '#a855f7', sub: 'قالب' },
          { label: 'جاهزة للتصوير', value: stats.upcomingProductions, icon: '🎬', color: '#eab308', sub: 'مشروع' },
          {
            label: 'اللقطات المنجزة',
            value: `${stats.completedShots}/${stats.totalShots}`,
            icon: '✅', color: '#06b6d4', sub: 'لقطة'
          },
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
            <div style={{ fontSize: '28px', fontWeight: '900', color: stat.color, lineHeight: '1' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '600' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Overall shots progress bar */}
      {stats.totalShots > 0 && (
        <div style={{
          marginBottom: '28px', padding: '16px 20px', borderRadius: '12px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              📊 إجمالي إنجاز اللقطات
            </span>
            <span style={{ fontSize: '14px', fontWeight: '900', color: '#22c55e' }}>
              {Math.round((stats.completedShots / stats.totalShots) * 100)}%
            </span>
          </div>
          <div style={{ height: '10px', background: 'var(--bg-hover)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '5px',
              background: 'linear-gradient(90deg, #22c55e88, #22c55e)',
              width: `${Math.round((stats.completedShots / stats.totalShots) * 100)}%`,
              transition: 'width 0.6s ease'
            }} />
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>✅ منجز: {stats.completedShots}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>⏳ متبقي: {stats.totalShots - stats.completedShots}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>📌 الكل: {stats.totalShots}</span>
          </div>
        </div>
      )}

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
            <button key={i} onClick={() => onNavigate(action.section)} style={{
              padding: '14px 20px', borderRadius: '10px',
              border: `1px solid ${action.color}40`,
              background: `${action.color}10`,
              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'right'
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

      {/* Main Grid: Recent Projects + Status groups */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>

        {/* Recent Projects with progress bars */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {recentProjects.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: '32px' }}>◈</span>
                <p style={{ marginTop: '8px' }}>لا توجد مشاريع بعد</p>
              </div>
            ) : recentProjects.map(project => {
              const prog = getProjectProgress(project.id, storyboards, project.manualProgress);
              const statusColor = getStatusColor(project.status);
              return (
                <div key={project.id}
                  onClick={() => onNavigate('projects', project.id)}
                  style={{
                    padding: '14px', borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold-dark)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{project.name}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* Quick status change */}
                      <select
                        value={project.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation();
                          updateProject(project.id, { status: e.target.value as any });
                        }}
                        style={{
                          fontSize: '10px', padding: '2px 8px', borderRadius: '12px',
                          background: `${statusColor}20`,
                          color: statusColor,
                          border: `1px solid ${statusColor}40`,
                          cursor: 'pointer', fontWeight: '600',
                          outline: 'none',
                        }}
                      >
                        {PROJECT_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.labelAr}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{project.clientName}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getTypeLabel(project.type)}</span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {prog.manual ? 'تقدم يدوي' : `${prog.done} / ${prog.total} لقطة`}
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: '800',
                        color: prog.pct === 100 ? '#22c55e' : prog.pct > 50 ? '#eab308' : 'var(--text-secondary)'
                      }}>
                        {prog.pct}%
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        background: prog.pct === 100
                          ? 'linear-gradient(90deg, #22c55e88, #22c55e)'
                          : prog.pct > 50
                          ? 'linear-gradient(90deg, #eab30888, #eab308)'
                          : 'linear-gradient(90deg, #C9A84C88, #C9A84C)',
                        width: `${prog.pct}%`,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* Projects by status — mini kanban */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
            📋 نظرة عامة على المشاريع
          </h2>
          <button onClick={() => onNavigate('projects')} style={{
            fontSize: '12px', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600'
          }}>
            إدارة المشاريع ←
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {statusGroups.map(group => {
            const groupProjects = projects.filter(p => p.status === group.value);
            return (
              <div key={group.value} style={{
                padding: '14px', borderRadius: '10px',
                background: `${group.color}08`,
                border: `1px solid ${group.color}25`,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '10px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: group.color }}>{group.label}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: '900', color: group.color,
                    background: `${group.color}20`, padding: '2px 8px', borderRadius: '10px'
                  }}>
                    {groupProjects.length}
                  </span>
                </div>
                {groupProjects.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                    لا توجد مشاريع
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {groupProjects.slice(0, 3).map(p => {
                      const prog = getProjectProgress(p.id, storyboards, p.manualProgress);
                      return (
                        <div
                          key={p.id}
                          onClick={() => onNavigate('projects', p.id)}
                          style={{
                            padding: '8px 10px', borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer', transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = group.color}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                        >
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {p.name}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ height: '3px', flex: 1, background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden', marginLeft: '8px' }}>
                              <div style={{
                                height: '100%', borderRadius: '2px',
                                background: group.color,
                                width: `${prog.pct}%`,
                              }} />
                            </div>
                            <span style={{ fontSize: '10px', color: group.color, fontWeight: '700', flexShrink: 0 }}>
                              {prog.pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {groupProjects.length > 3 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', paddingTop: '4px' }}>
                        +{groupProjects.length - 3} مشروع آخر
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
