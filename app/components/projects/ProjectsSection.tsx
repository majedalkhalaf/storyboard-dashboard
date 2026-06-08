'use client';

import { useState } from 'react';
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
  production: '#f97316', editing: '#06b6d4', completed: '#22c55e', archived: '#6b7280'
};

export default function ProjectsSection({ activeProjectId, setActiveProjectId, onNavigate }: ProjectsSectionProps) {
  const { projects, storyboards, addProject, updateProject, deleteProject, duplicateProject } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: '', clientName: '', type: 'real-estate' as ProjectType,
    status: 'planning' as ProjectStatus, shootingDate: '',
    location: '', budget: '', notes: ''
  });

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchType = filterType === 'all' || p.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingProject) {
      updateProject(editingProject.id, {
        ...form, budget: form.budget ? Number(form.budget) : undefined
      });
    } else {
      addProject({
        ...form,
        budget: form.budget ? Number(form.budget) : undefined,
        storyboardIds: [], equipmentIds: []
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', clientName: '', type: 'real-estate', status: 'planning', shootingDate: '', location: '', budget: '', notes: '' });
    setShowForm(false);
    setEditingProject(null);
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setForm({
      name: p.name, clientName: p.clientName, type: p.type, status: p.status,
      shootingDate: p.shootingDate || '', location: p.location || '',
      budget: p.budget?.toString() || '', notes: p.notes || ''
    });
    setShowForm(true);
  };

  const getProjectStoryboards = (projectId: string) =>
    storyboards.filter(sb => sb.projectId === projectId).length;

  const getTypeLabelAr = (type: string) =>
    PROJECT_TYPES.find(t => t.value === type)?.labelAr || type;

  const getStatusLabelAr = (status: string) =>
    PROJECT_STATUSES.find(s => s.value === status)?.labelAr || status;

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: 'linear-gradient(180deg, #A07830, #C9A84C)' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>المشاريع</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingRight: '16px' }}>
            {projects.length} مشروع • {projects.filter(p => p.status === 'production').length} قيد التصوير
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => { setEditingProject(null); setShowForm(true); }}>
          + مشروع جديد
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          className="input-field"
          style={{ maxWidth: '280px' }}
          placeholder="بحث في المشاريع..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input-field" style={{ maxWidth: '160px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">كل الحالات</option>
          {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.labelAr}</option>)}
        </select>
        <select className="input-field" style={{ maxWidth: '160px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">كل الأنواع</option>
          {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
        </select>
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '48px' }}>◈</span>
          <h3 style={{ marginTop: '12px', fontWeight: '700' }}>لا توجد مشاريع</h3>
          <p style={{ marginTop: '4px', fontSize: '13px' }}>ابدأ بإنشاء مشروع جديد</p>
          <button className="btn btn-gold" style={{ marginTop: '16px' }} onClick={() => setShowForm(true)}>
            + مشروع جديد
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filtered.map(project => (
            <div key={project.id} className="card" style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => setActiveProjectId(activeProjectId === project.id ? null : project.id)}>

              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '3px' }}>
                    {project.name}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{project.clientName}</div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px',
                  background: `${STATUS_COLORS[project.status]}20`,
                  color: STATUS_COLORS[project.status],
                  border: `1px solid ${STATUS_COLORS[project.status]}40`,
                  whiteSpace: 'nowrap'
                }}>
                  {getStatusLabelAr(project.status)}
                </span>
              </div>

              {/* Info chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span className="chip">{getTypeLabelAr(project.type)}</span>
                {project.location && <span className="chip">📍 {project.location}</span>}
                {project.shootingDate && <span className="chip">📅 {project.shootingDate}</span>}
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '16px', padding: '12px 0', borderTop: '1px solid var(--border)', marginBottom: '14px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold)' }}>
                    {getProjectStoryboards(project.id)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ستوري</div>
                </div>
                {project.budget && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#22c55e' }}>
                      {project.budget.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ريال</div>
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#3b82f6' }}>
                    {project.equipmentIds.length}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>معدة</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-gold" style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                  onClick={() => onNavigate('storyboards', project.id)}>
                  الستوري بورد
                </button>
                <button className="btn btn-outline" style={{ fontSize: '12px', padding: '8px 12px' }}
                  onClick={() => openEdit(project)}>✏️</button>
                <button className="btn btn-outline" style={{ fontSize: '12px', padding: '8px 12px' }}
                  onClick={() => duplicateProject(project.id)}>⧉</button>
                <button className="btn btn-danger" style={{ fontSize: '12px', padding: '8px 12px' }}
                  onClick={() => { if (confirm('حذف المشروع؟')) deleteProject(project.id); }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New/Edit Project Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && resetForm()}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800' }}>
                {editingProject ? 'تعديل المشروع' : 'مشروع جديد'}
              </h2>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                  اسم المشروع *
                </label>
                <input className="input-field" placeholder="اسم المشروع" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>اسم العميل</label>
                <input className="input-field" placeholder="اسم العميل" value={form.clientName}
                  onChange={e => setForm({ ...form, clientName: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>نوع المشروع</label>
                <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ProjectType })}>
                  {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الحالة</label>
                <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                  {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.labelAr}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>تاريخ التصوير</label>
                <input className="input-field" type="date" value={form.shootingDate}
                  onChange={e => setForm({ ...form, shootingDate: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الميزانية (ريال)</label>
                <input className="input-field" type="number" placeholder="0" value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الموقع</label>
                <input className="input-field" placeholder="موقع التصوير" value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>ملاحظات</label>
                <textarea className="input-field" rows={3} placeholder="ملاحظات إضافية..." value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={resetForm}>إلغاء</button>
              <button className="btn btn-gold" onClick={handleSubmit}>
                {editingProject ? 'حفظ التعديلات' : 'إنشاء المشروع'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
