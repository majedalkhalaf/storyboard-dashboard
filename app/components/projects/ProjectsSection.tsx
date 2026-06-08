'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Project, ProjectType, ProjectStatus } from '../../lib/types';
import { PROJECT_TYPES, PROJECT_STATUSES } from '../../lib/constants';
import { ActiveSection } from '../AppShell';

interface ProjectsSectionProps {
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  onNavigate: (section: ActiveSection, projectId?: string, storyboardId?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  idea: '#a855f7', planning: '#3b82f6', ready: '#eab308',
  production: '#f97316', editing: '#06b6d4', completed: '#22c55e',
  archived: '#6b7280', 'on-hold': '#f43f5e'
};

function getProgress(projectId: string, storyboards: ReturnType<typeof useAppStore>['storyboards'], manualProgress?: number) {
  if (manualProgress !== undefined && manualProgress >= 0) return { pct: manualProgress, total: 0, done: 0, manual: true };
  const sbs = storyboards.filter(sb => sb.projectId === projectId);
  let total = 0, done = 0;
  for (const sb of sbs) for (const part of sb.parts) for (const sh of part.shots) {
    total++; if (sh.isCompleted) done++;
  }
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { pct, total, done, manual: false };
}

export default function ProjectsSection({ activeProjectId, setActiveProjectId, onNavigate }: ProjectsSectionProps) {
  const { projects, storyboards, templates, addProject, updateProject, deleteProject, duplicateProject } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showProgressEdit, setShowProgressEdit] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', clientName: '', type: 'real-estate' as ProjectType,
    status: 'planning' as ProjectStatus, shootingDate: '',
    location: '', budget: '', notes: '', templateId: ''
  });

  const filtered = projects.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus === 'all' || p.status === filterStatus;
    const mt = filterType === 'all' || p.type === filterType;
    return ms && mst && mt;
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const data = { ...form, budget: form.budget ? Number(form.budget) : undefined };
    if (editingProject) {
      updateProject(editingProject.id, data);
    } else {
      const newId = addProject({ ...data, storyboardIds: [], equipmentIds: [] });
      // Apply template if selected
      if (form.templateId) {
        const tmpl = templates.find(t => t.id === form.templateId);
        if (tmpl && newId) {
          // template application is handled after project creation
        }
      }
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', clientName: '', type: 'real-estate', status: 'planning', shootingDate: '', location: '', budget: '', notes: '', templateId: '' });
    setShowForm(false);
    setEditingProject(null);
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setForm({ name: p.name, clientName: p.clientName, type: p.type, status: p.status, shootingDate: p.shootingDate || '', location: p.location || '', budget: p.budget?.toString() || '', notes: p.notes || '', templateId: '' });
    setShowForm(true);
  };

  const getTypeLabelAr = (type: string) => PROJECT_TYPES.find(t => t.value === type)?.labelAr || type;
  const getStatusLabelAr = (status: string) => PROJECT_STATUSES.find(s => s.value === status)?.labelAr || status;
  const getProjectStoryboards = (pid: string) => storyboards.filter(sb => sb.projectId === pid).length;

  const activeTemplates = templates.filter(t => t.isActive !== false);

  // Project card component (reusable)
  const ProjectCard = ({ project, compact = false }: { project: Project; compact?: boolean }) => {
    const prog = getProgress(project.id, storyboards, project.manualProgress);
    const statusColor = STATUS_COLORS[project.status] || '#6b7280';
    const [localProg, setLocalProg] = useState(prog.pct);
    const sbCount = getProjectStoryboards(project.id);

    return (
      <div
        className="card"
        style={{ padding: compact ? '14px' : '20px', cursor: 'pointer', transition: 'all 0.2s' }}
        onClick={() => setActiveProjectId(activeProjectId === project.id ? null : project.id)}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: compact ? '13px' : '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{project.clientName}</div>
          </div>
          {/* Quick status dropdown */}
          <select
            value={project.status}
            onClick={e => e.stopPropagation()}
            onChange={e => { e.stopPropagation(); updateProject(project.id, { status: e.target.value as ProjectStatus }); }}
            style={{
              fontSize: '10px', padding: '3px 8px', borderRadius: '12px',
              background: `${statusColor}20`, color: statusColor,
              border: `1px solid ${statusColor}40`, cursor: 'pointer',
              fontWeight: '700', outline: 'none', marginRight: '6px',
            }}
          >
            {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.labelAr}</option>)}
          </select>
        </div>

        {/* Chips */}
        {!compact && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span className="chip" style={{ fontSize: '10px' }}>{getTypeLabelAr(project.type)}</span>
            {project.location && <span className="chip" style={{ fontSize: '10px' }}>📍 {project.location}</span>}
            {project.shootingDate && <span className="chip" style={{ fontSize: '10px' }}>📅 {project.shootingDate}</span>}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ marginBottom: compact ? '10px' : '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {prog.manual ? 'تقدم يدوي' : `${prog.done}/${prog.total} لقطة`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '12px', fontWeight: '900',
                color: prog.pct === 100 ? '#22c55e' : prog.pct > 50 ? '#eab308' : 'var(--gold)'
              }}>
                {prog.pct}%
              </span>
              <button
                onClick={e => { e.stopPropagation(); setShowProgressEdit(showProgressEdit === project.id ? null : project.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', padding: '0' }}
                title="تعديل النسبة يدوياً"
              >
                ✏️
              </button>
            </div>
          </div>
          {showProgressEdit === project.id && (
            <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
              <input
                type="range" min="0" max="100" value={localProg}
                onChange={e => setLocalProg(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: '700', minWidth: '36px' }}>{localProg}%</span>
              <button
                className="btn btn-gold"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={e => {
                  e.stopPropagation();
                  updateProject(project.id, { manualProgress: localProg });
                  setShowProgressEdit(null);
                }}
              >
                حفظ
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={e => {
                  e.stopPropagation();
                  updateProject(project.id, { manualProgress: undefined });
                  setShowProgressEdit(null);
                }}
              >
                تلقائي
              </button>
            </div>
          )}
          <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '3px', transition: 'width 0.5s ease',
              background: prog.pct === 100
                ? 'linear-gradient(90deg,#22c55e88,#22c55e)'
                : prog.pct > 50 ? 'linear-gradient(90deg,#eab30888,#eab308)'
                : 'linear-gradient(90deg,#C9A84C88,#C9A84C)',
              width: `${prog.pct}%`,
            }} />
          </div>
        </div>

        {/* Stats */}
        {!compact && (
          <div style={{ display: 'flex', gap: '16px', padding: '10px 0', borderTop: '1px solid var(--border)', marginBottom: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold)' }}>{sbCount}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ستوري</div>
            </div>
            {project.budget && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#22c55e' }}>{project.budget.toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ريال</div>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: prog.pct === 100 ? '#22c55e' : '#f97316' }}>
                {prog.total - prog.done}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>متبقي</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-gold" style={{ flex: 1, fontSize: '11px', padding: '7px' }}
            onClick={() => onNavigate('storyboards', project.id)}>
            🎬 الستوري بورد
          </button>
          <button className="btn btn-outline" style={{ fontSize: '11px', padding: '7px 10px' }}
            onClick={() => openEdit(project)} title="تعديل">✏️</button>
          <button className="btn btn-outline" style={{ fontSize: '11px', padding: '7px 10px' }}
            onClick={() => duplicateProject(project.id)} title="نسخ">⧉</button>
          <button className="btn btn-danger" style={{ fontSize: '11px', padding: '7px 10px' }}
            onClick={() => { if (confirm('حذف المشروع؟')) deleteProject(project.id); }} title="حذف">✕</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: 'linear-gradient(180deg, #A07830, #C9A84C)' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>المشاريع</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingRight: '16px' }}>
            {projects.length} مشروع &nbsp;•&nbsp; {projects.filter(p => p.status === 'production').length} قيد التصوير
            &nbsp;•&nbsp; {projects.filter(p => p.status === 'completed').length} مكتمل
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border)' }}>
            {(['grid', 'kanban', 'list'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '600', transition: 'all 0.15s',
                background: viewMode === mode ? 'var(--gold)' : 'none',
                color: viewMode === mode ? '#000' : 'var(--text-muted)',
              }}>
                {mode === 'grid' ? '⊞' : mode === 'kanban' ? '▤' : '☰'}
              </button>
            ))}
          </div>
          <button className="btn btn-gold" onClick={() => { setEditingProject(null); setShowForm(true); }}>
            + مشروع جديد
          </button>
        </div>
      </div>

      {/* Status summary row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[{ value: 'all', labelAr: 'الكل', count: projects.length }, ...PROJECT_STATUSES.map(s => ({
          ...s, count: projects.filter(p => p.status === s.value).length
        }))].map(s => (
          <button key={s.value} onClick={() => setFilterStatus(s.value)} style={{
            padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', transition: 'all 0.15s',
            background: filterStatus === s.value ? (STATUS_COLORS[s.value] || 'var(--gold)') : 'var(--bg-secondary)',
            color: filterStatus === s.value ? '#fff' : 'var(--text-secondary)',
            boxShadow: filterStatus === s.value ? `0 2px 8px ${STATUS_COLORS[s.value] || '#C9A84C'}44` : 'none',
          }}>
            {s.labelAr} ({s.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input className="input-field" style={{ maxWidth: '260px' }} placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field" style={{ maxWidth: '160px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">كل الأنواع</option>
          {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
        </select>
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode === 'grid' && (
        filtered.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '48px' }}>◈</span>
            <h3 style={{ marginTop: '12px', fontWeight: '700' }}>لا توجد مشاريع</h3>
            <p style={{ marginTop: '4px', fontSize: '13px' }}>ابدأ بإنشاء مشروع جديد</p>
            <button className="btn btn-gold" style={{ marginTop: '16px' }} onClick={() => setShowForm(true)}>+ مشروع جديد</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '20px' }}>
            {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )
      )}

      {/* ── KANBAN VIEW ── */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', alignItems: 'flex-start' }}>
          {PROJECT_STATUSES.map(status => {
            const col = filtered.filter(p => p.status === status.value);
            const color = STATUS_COLORS[status.value];
            return (
              <div key={status.value} style={{
                minWidth: '260px', maxWidth: '280px', flexShrink: 0,
                background: 'var(--bg-secondary)', borderRadius: '12px',
                border: `1px solid ${color}30`, overflow: 'hidden',
              }}>
                {/* Column header */}
                <div style={{
                  padding: '12px 16px', borderBottom: `2px solid ${color}40`,
                  background: `${color}10`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color }}>
                    {status.labelAr}
                  </span>
                  <span style={{
                    fontSize: '11px', fontWeight: '900',
                    background: `${color}20`, color, padding: '2px 8px', borderRadius: '10px'
                  }}>
                    {col.length}
                  </span>
                </div>
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '80px' }}>
                  {col.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                      لا توجد مشاريع
                    </div>
                  ) : col.map(p => <ProjectCard key={p.id} project={p} compact />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: '36px' }}>◈</span>
              <p>لا توجد مشاريع</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                  {['المشروع', 'العميل', 'النوع', 'الحالة', 'التقدم', 'التصوير', 'إجراءات'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textAlign: 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const prog = getProgress(p.id, storyboards, p.manualProgress);
                  const color = STATUS_COLORS[p.status] || '#6b7280';
                  return (
                    <tr key={p.id} style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>{p.name}</div>
                        {p.location && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 {p.location}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{p.clientName}</td>
                      <td style={{ padding: '12px 14px' }}><span className="chip" style={{ fontSize: '11px' }}>{getTypeLabelAr(p.type)}</span></td>
                      <td style={{ padding: '12px 14px' }}>
                        <select value={p.status} onChange={e => updateProject(p.id, { status: e.target.value as ProjectStatus })}
                          style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '10px', background: `${color}20`, color, border: `1px solid ${color}40`, cursor: 'pointer', outline: 'none', fontWeight: '700' }}>
                          {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.labelAr}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 14px', minWidth: '120px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${prog.pct}%`, borderRadius: '3px', background: prog.pct === 100 ? '#22c55e' : '#C9A84C', transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{prog.pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {p.shootingDate || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn btn-gold" style={{ fontSize: '10px', padding: '5px 8px' }} onClick={() => onNavigate('storyboards', p.id)}>🎬</button>
                          <button className="btn btn-outline" style={{ fontSize: '10px', padding: '5px 8px' }} onClick={() => openEdit(p)}>✏️</button>
                          <button className="btn btn-danger" style={{ fontSize: '10px', padding: '5px 8px' }} onClick={() => { if (confirm('حذف؟')) deleteProject(p.id); }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── PROJECT FORM MODAL ── */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && resetForm()}>
          <div className="modal-content" style={{ maxWidth: 'min(640px, 98vw)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800' }}>
                {editingProject ? '✏️ تعديل المشروع' : '+ مشروع جديد'}
              </h2>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>اسم المشروع *</label>
                <input className="input-field" placeholder="اسم المشروع" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>اسم العميل</label>
                <input className="input-field" placeholder="اسم العميل" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>نوع المشروع</label>
                <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ProjectType })}>
                  {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
                  <option value="custom">🔧 مخصص</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الحالة</label>
                <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                  {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.labelAr}</option>)}
                  <option value="on-hold">⏸️ مؤجل</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>تاريخ التصوير</label>
                <input className="input-field" type="date" value={form.shootingDate} onChange={e => setForm({ ...form, shootingDate: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الميزانية (ريال)</label>
                <input className="input-field" type="number" placeholder="0" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الموقع</label>
                <input className="input-field" placeholder="موقع التصوير" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>

              {/* Template selection (only for new projects) */}
              {!editingProject && activeTemplates.length > 0 && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                    ⊞ تطبيق قالب جاهز (اختياري)
                  </label>
                  <select className="input-field" value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })}>
                    <option value="">بدون قالب</option>
                    {activeTemplates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {PROJECT_TYPES.find(p => p.value === t.type)?.labelAr || t.type} ({t.parts.length} أجزاء)
                      </option>
                    ))}
                  </select>
                  {form.templateId && (
                    <div style={{ marginTop: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', fontSize: '12px', color: 'var(--gold)' }}>
                      ✅ سيتم إنشاء الأجزاء واللقطات تلقائياً من القالب عند إنشاء الستوري بورد
                    </div>
                  )}
                </div>
              )}

              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>ملاحظات</label>
                <textarea className="input-field" rows={3} placeholder="ملاحظات إضافية..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={resetForm}>إلغاء</button>
              <button className="btn btn-gold" onClick={handleSubmit}>
                {editingProject ? '💾 حفظ التعديلات' : '✨ إنشاء المشروع'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
