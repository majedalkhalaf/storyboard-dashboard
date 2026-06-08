'use client';

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Storyboard, Part, Shot } from '../../lib/types';
import ShotCard from './ShotCard';
import ShotEditor from './ShotEditor';

interface StoryboardsSectionProps {
  activeStoryboardId: string | null;
  setActiveStoryboardId: (id: string | null) => void;
  projectId: string | null;
}

export default function StoryboardsSection({ activeStoryboardId, setActiveStoryboardId, projectId }: StoryboardsSectionProps) {
  const { projects, storyboards, addStoryboard, updateStoryboard, deleteStoryboard, addPart, updatePart, deletePart } = useAppStore();
  const [showNewSb, setShowNewSb] = useState(false);
  const [editingSb, setEditingSb] = useState<Storyboard | null>(null);
  const [editingShot, setEditingShot] = useState<{ shot: Shot; partId: string; storyboardId: string } | null>(null);
  const [newPartTitle, setNewPartTitle] = useState('');
  const [addingPartTo, setAddingPartTo] = useState<string | null>(null);

  const [sbForm, setSbForm] = useState({
    title: '', projectId: projectId || '', videoNumber: '', videoDuration: 3,
    objective: '', targetAudience: '', script: '', voiceOver: '', directorNotes: ''
  });

  const displayedStoryboards = projectId
    ? storyboards.filter(sb => sb.projectId === projectId)
    : storyboards;

  const activeSb = storyboards.find(sb => sb.id === activeStoryboardId);

  const getProjectName = (pid: string) => projects.find(p => p.id === pid)?.name || 'مشروع غير معروف';

  const handleNewSb = () => {
    if (!sbForm.title.trim()) return;
    const id = addStoryboard({ ...sbForm, videoDuration: Number(sbForm.videoDuration), parts: [] });
    setShowNewSb(false);
    setActiveStoryboardId(id);
    setSbForm({ title: '', projectId: projectId || '', videoNumber: '', videoDuration: 3, objective: '', targetAudience: '', script: '', voiceOver: '', directorNotes: '' });
  };

  const handleAddPart = (sbId: string) => {
    if (!newPartTitle.trim()) return;
    const sb = storyboards.find(s => s.id === sbId);
    if (!sb) return;
    addPart(sbId, {
      number: sb.parts.length + 1,
      title: newPartTitle,
      shots: []
    });
    setNewPartTitle('');
    setAddingPartTo(null);
  };

  const getTotalDuration = (sb: Storyboard) =>
    sb.parts.reduce((acc, p) => acc + p.shots.reduce((a, s) => a + s.duration, 0), 0);

  const getTotalShots = (sb: Storyboard) =>
    sb.parts.reduce((acc, p) => acc + p.shots.length, 0);

  const getCompletedShots = (sb: Storyboard) =>
    sb.parts.reduce((acc, p) => acc + p.shots.filter(s => s.status === 'completed' || s.status === 'filmed').length, 0);

  if (activeSb) {
    const totalShots = getTotalShots(activeSb);
    const completedShots = getCompletedShots(activeSb);
    const pct = totalShots > 0 ? Math.round((completedShots / totalShots) * 100) : 0;

    return (
      <div style={{ padding: '32px' }}>
        {/* Back button */}
        <button onClick={() => setActiveStoryboardId(null)} style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
          color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', marginBottom: '20px',
          fontWeight: '600'
        }}>
          ← العودة إلى الستوري بورد
        </button>

        {/* SB Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: 'linear-gradient(180deg, #A07830, #C9A84C)' }} />
              <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>{activeSb.title}</h1>
              <span className="chip chip-gold">{activeSb.videoNumber}</span>
            </div>
            <div style={{ paddingRight: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {getProjectName(activeSb.projectId)} • {activeSb.videoDuration} دقيقة • {totalShots} لقطة
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" style={{ fontSize: '12px' }} onClick={() => setEditingSb(activeSb)}>
              ✏️ تعديل المعلومات
            </button>
            <button className="btn btn-gold" onClick={() => setAddingPartTo(activeSb.id)}>
              + إضافة جزء
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>تقدم الإنتاج</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{completedShots} من {totalShots} لقطة</div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: pct >= 100 ? '#22c55e' : 'var(--gold)' }}>
              {pct}%
            </div>
          </div>
          <div className="progress-bar" style={{ height: '6px' }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          {/* Quick info */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
            {activeSb.objective && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>الهدف</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '300px' }}>{activeSb.objective}</div>
              </div>
            )}
            {activeSb.targetAudience && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>الجمهور المستهدف</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{activeSb.targetAudience}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>مدة المحتوى</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getTotalDuration(activeSb)} ثانية</div>
            </div>
          </div>
        </div>

        {/* Add part inline */}
        {addingPartTo === activeSb.id && (
          <div className="card" style={{ padding: '16px', marginBottom: '16px', borderColor: 'var(--gold-dark)' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input className="input-field" placeholder="عنوان الجزء الجديد (مثال: الجزء 1 - الافتتاحية)"
                value={newPartTitle} onChange={e => setNewPartTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPart(activeSb.id)}
                autoFocus />
              <button className="btn btn-gold" onClick={() => handleAddPart(activeSb.id)}>إضافة</button>
              <button className="btn btn-outline" onClick={() => setAddingPartTo(null)}>إلغاء</button>
            </div>
          </div>
        )}

        {/* Parts */}
        {activeSb.parts.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '48px' }}>▦</span>
            <h3 style={{ marginTop: '12px', fontWeight: '700' }}>لا توجد أجزاء بعد</h3>
            <p style={{ marginTop: '4px', fontSize: '13px' }}>أضف الجزء الأول من الستوري بورد</p>
            <button className="btn btn-gold" style={{ marginTop: '16px' }} onClick={() => setAddingPartTo(activeSb.id)}>
              + إضافة جزء
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {activeSb.parts.map((part, partIndex) => (
              <PartSection
                key={part.id}
                part={part}
                partIndex={partIndex}
                storyboardId={activeSb.id}
                onEditShot={(shot) => setEditingShot({ shot, partId: part.id, storyboardId: activeSb.id })}
              />
            ))}
          </div>
        )}

        {/* Shot Editor Modal */}
        {editingShot && (
          <ShotEditor
            shot={editingShot.shot}
            partId={editingShot.partId}
            storyboardId={editingShot.storyboardId}
            onClose={() => setEditingShot(null)}
          />
        )}

        {/* Edit SB Modal */}
        {editingSb && (
          <EditStoryboardModal
            sb={editingSb}
            projects={projects}
            onSave={(updates) => { updateStoryboard(editingSb.id, updates); setEditingSb(null); }}
            onClose={() => setEditingSb(null)}
          />
        )}
      </div>
    );
  }

  // Storyboards List View
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: 'linear-gradient(180deg, #A07830, #C9A84C)' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>الستوري بورد</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingRight: '16px' }}>
            {displayedStoryboards.length} ستوري بورد
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowNewSb(true)}>+ ستوري بورد جديد</button>
      </div>

      {displayedStoryboards.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '48px' }}>▦</span>
          <h3 style={{ marginTop: '12px', fontWeight: '700' }}>لا يوجد ستوري بورد</h3>
          <button className="btn btn-gold" style={{ marginTop: '16px' }} onClick={() => setShowNewSb(true)}>
            + إنشاء ستوري بورد
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {displayedStoryboards.map(sb => {
            const total = getTotalShots(sb);
            const completed = getCompletedShots(sb);
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <div key={sb.id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '2px' }}>{sb.title}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getProjectName(sb.projectId)}</div>
                  </div>
                  <span className="chip chip-gold" style={{ fontSize: '11px' }}>{sb.videoNumber}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gold)' }}>{sb.parts.length}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>أجزاء</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#3b82f6' }}>{total}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>لقطات</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#f97316' }}>{sb.videoDuration}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>دقيقة</div>
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>التقدم</span><span>{pct}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-gold" style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                    onClick={() => setActiveStoryboardId(sb.id)}>
                    فتح البناء
                  </button>
                  <button className="btn btn-danger" style={{ fontSize: '12px', padding: '8px 12px' }}
                    onClick={() => { if (confirm('حذف الستوري بورد؟')) deleteStoryboard(sb.id); }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Storyboard Modal */}
      {showNewSb && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewSb(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800' }}>ستوري بورد جديد</h2>
              <button onClick={() => setShowNewSb(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>عنوان الستوري بورد *</label>
                <input className="input-field" placeholder="عنوان الستوري بورد" value={sbForm.title}
                  onChange={e => setSbForm({ ...sbForm, title: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>المشروع</label>
                <select className="input-field" value={sbForm.projectId} onChange={e => setSbForm({ ...sbForm, projectId: e.target.value })}>
                  <option value="">اختر مشروعاً</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>رقم الفيديو</label>
                <input className="input-field" placeholder="VID-001" value={sbForm.videoNumber}
                  onChange={e => setSbForm({ ...sbForm, videoNumber: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>مدة الفيديو (دقيقة)</label>
                <input className="input-field" type="number" value={sbForm.videoDuration}
                  onChange={e => setSbForm({ ...sbForm, videoDuration: Number(e.target.value) })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>هدف الفيديو</label>
                <input className="input-field" placeholder="ما هو الهدف الرئيسي من هذا الفيديو؟" value={sbForm.objective}
                  onChange={e => setSbForm({ ...sbForm, objective: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الجمهور المستهدف</label>
                <input className="input-field" placeholder="من هو الجمهور المستهدف؟" value={sbForm.targetAudience}
                  onChange={e => setSbForm({ ...sbForm, targetAudience: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>ملاحظات المخرج</label>
                <input className="input-field" placeholder="ملاحظات المخرج" value={sbForm.directorNotes}
                  onChange={e => setSbForm({ ...sbForm, directorNotes: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>السكريبت / التعليق الصوتي</label>
                <textarea className="input-field" rows={3} placeholder="نص الفيديو والسكريبت..." value={sbForm.script}
                  onChange={e => setSbForm({ ...sbForm, script: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowNewSb(false)}>إلغاء</button>
              <button className="btn btn-gold" onClick={handleNewSb}>إنشاء الستوري بورد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Part Section Component
function PartSection({ part, partIndex, storyboardId, onEditShot }: {
  part: Part; partIndex: number; storyboardId: string;
  onEditShot: (shot: Shot) => void;
}) {
  const { addShot, deleteShot, deletePart, updatePart } = useAppStore();
  const [showAddShot, setShowAddShot] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(part.title);

  const handleAddShot = () => {
    addShot(storyboardId, part.id, {
      number: part.shots.length + 1,
      title: `لقطة ${part.shots.length + 1}`,
      description: '', duration: 5, equipment: [], status: 'draft', isCompleted: false
    });
  };

  const PART_COLORS = ['#C9A84C', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#06b6d4'];
  const color = PART_COLORS[partIndex % PART_COLORS.length];

  return (
    <div style={{ border: `1px solid ${color}30`, borderRadius: '12px', overflow: 'hidden' }}>
      {/* Part Header */}
      <div style={{ padding: '16px 20px', background: `${color}10`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: color, color: '#0A0A0B', fontWeight: '900',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0
          }}>
            {partIndex + 1}
          </div>
          {editingTitle ? (
            <input
              className="input-field" style={{ padding: '4px 10px', fontSize: '14px', fontWeight: '700', width: 'auto' }}
              value={titleInput} autoFocus
              onChange={e => setTitleInput(e.target.value)}
              onBlur={() => { updatePart(storyboardId, part.id, { title: titleInput }); setEditingTitle(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { updatePart(storyboardId, part.id, { title: titleInput }); setEditingTitle(false); } }}
            />
          ) : (
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', cursor: 'pointer' }}
              onDoubleClick={() => setEditingTitle(true)}>
              {part.title}
            </h3>
          )}
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
            background: `${color}20`, color, fontWeight: '600'
          }}>
            {part.shots.length} لقطة
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '6px 10px' }} onClick={handleAddShot}>+ لقطة</button>
          <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 8px' }} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '▼' : '▲'}
          </button>
          <button className="btn btn-danger" style={{ fontSize: '11px', padding: '6px 8px' }}
            onClick={() => { if (confirm('حذف هذا الجزء وكل لقطاته؟')) deletePart(storyboardId, part.id); }}>
            ✕
          </button>
        </div>
      </div>

      {/* Shots */}
      {!collapsed && (
        <div style={{ padding: '20px', background: 'var(--bg-primary)' }}>
          {part.shots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>▣</div>
              <div style={{ fontSize: '13px' }}>لا توجد لقطات • انقر "+ لقطة" للبدء</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {part.shots.map((shot, idx) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  index={idx}
                  storyboardId={storyboardId}
                  partId={part.id}
                  onEdit={() => onEditShot(shot)}
                  onDelete={() => { if (confirm('حذف اللقطة؟')) deleteShot(storyboardId, part.id, shot.id); }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Edit Storyboard Modal
function EditStoryboardModal({ sb, projects, onSave, onClose }: {
  sb: Storyboard; projects: any[]; onSave: (u: any) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: sb.title, projectId: sb.projectId, videoNumber: sb.videoNumber,
    videoDuration: sb.videoDuration, objective: sb.objective || '',
    targetAudience: sb.targetAudience || '', script: sb.script || '',
    voiceOver: sb.voiceOver || '', directorNotes: sb.directorNotes || ''
  });
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>تعديل الستوري بورد</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>العنوان</label>
            <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>رقم الفيديو</label>
            <input className="input-field" value={form.videoNumber} onChange={e => setForm({ ...form, videoNumber: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>مدة الفيديو (دقيقة)</label>
            <input className="input-field" type="number" value={form.videoDuration} onChange={e => setForm({ ...form, videoDuration: Number(e.target.value) })} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الهدف</label>
            <input className="input-field" value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الجمهور</label>
            <input className="input-field" value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>ملاحظات المخرج</label>
            <input className="input-field" value={form.directorNotes} onChange={e => setForm({ ...form, directorNotes: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>السكريبت</label>
            <textarea className="input-field" rows={4} value={form.script} onChange={e => setForm({ ...form, script: e.target.value })} style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
          <button className="btn btn-gold" onClick={() => onSave(form)}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
