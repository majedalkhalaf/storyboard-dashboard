'use client';

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Template, ProjectType } from '../lib/types';
import { PROJECT_TYPES, CAMERAS, ALL_LENSES, SHOT_TYPES, CAMERA_MOVEMENTS, CAMERA_ANGLES, LIGHTING_OPTIONS } from '../lib/constants';

type ShotBuilderField = 'camera' | 'lens' | 'shotType' | 'cameraAngle' | 'cameraMovement' | 'lighting';

const SHOT_FIELD_SELECTS: { key: ShotBuilderField; label: string; opts: string[] }[] = [
  { key: 'camera', label: 'الكاميرا', opts: CAMERAS },
  { key: 'lens', label: 'العدسة', opts: ALL_LENSES },
  { key: 'shotType', label: 'نوع اللقطة', opts: SHOT_TYPES },
  { key: 'cameraAngle', label: 'الزاوية', opts: CAMERA_ANGLES },
  { key: 'cameraMovement', label: 'الحركة', opts: CAMERA_MOVEMENTS },
  { key: 'lighting', label: 'الإضاءة', opts: LIGHTING_OPTIONS },
];

// Preset templates to seed
const PRESET_TEMPLATES: Omit<Template, 'id' | 'createdAt'>[] = [
  {
    name: 'إعلان عقاري',
    description: 'قالب احترافي لتصوير الفلل والشقق',
    type: 'real-estate', isActive: true,
    parts: [
      { number: 1, title: 'افتتاحية جوية', description: 'تصوير خارجي بالدرون', shots: [
        { id: '', number: 1, title: 'لقطة جوية شاملة', description: 'Establishing shot بالدرون', duration: 8, camera: 'DJI Mavic', lens: 'Wide Angle Lens', shotType: 'Drone Shot', cameraAngle: 'Bird Eye', cameraMovement: 'Drone Pull Away', lighting: 'Golden Hour', equipment: ['DJI Drone', 'Monitor'], status: 'draft', isCompleted: false },
        ]
      },
      { number: 2, title: 'مدخل واستقبال', description: 'تصوير المدخل الرئيسي', shots: [
        { id: '', number: 1, title: 'لقطة المدخل', description: 'Gimbal follow للمدخل', duration: 6, camera: 'Sony FX3', lens: '24-70mm', shotType: 'Tracking Shot', cameraAngle: 'Eye Level', cameraMovement: 'Gimbal Follow', lighting: 'Natural Light', equipment: ['Sony FX3', 'Gimbal'], status: 'draft', isCompleted: false },
      ]},
      { number: 3, title: 'المجلس والصالة', description: 'تصوير المساحات الداخلية', shots: [
        { id: '', number: 1, title: 'لقطة عريضة للمجلس', description: 'Wide shot تصوير المجلس', duration: 5, camera: 'Sony A7SIII', lens: '16-35mm', shotType: 'Wide Shot', cameraAngle: 'Eye Level', cameraMovement: 'Dolly In', lighting: 'Soft Light', equipment: ['Sony A7SIII', 'Gimbal', 'LED Panel'], status: 'draft', isCompleted: false },
      ]},
      { number: 4, title: 'لقطة ختامية', description: 'Closing shot احترافية', shots: [
        { id: '', number: 1, title: 'ختامية درون', description: 'Drone pull away ختامية', duration: 6, camera: 'DJI Mavic', lens: 'Wide Angle Lens', shotType: 'Establishing Shot', cameraAngle: 'High Angle', cameraMovement: 'Drone Pull Away', lighting: 'Golden Hour', equipment: ['DJI Drone'], status: 'draft', isCompleted: false },
      ]},
    ]
  },
  {
    name: 'إعلان منتج',
    description: 'قالب لإعلانات المنتجات التجارية',
    type: 'product-commercial', isActive: true,
    parts: [
      { number: 1, title: 'Hero Shot', description: 'اللقطة الرئيسية للمنتج', shots: [
        { id: '', number: 1, title: 'لقطة المنتج الرئيسية', description: '360 orbit للمنتج', duration: 5, camera: 'Sony A7IV', lens: '85mm', shotType: 'Product Shot', cameraAngle: '45 Degree Angle', cameraMovement: 'Orbit', lighting: 'Key Light', equipment: ['Sony A7IV', 'Tripod', 'Softbox'], status: 'draft', isCompleted: false },
      ]},
      { number: 2, title: 'تفاصيل المنتج', description: 'Close ups للتفاصيل', shots: [
        { id: '', number: 1, title: 'تفاصيل دقيقة', description: 'Extreme close up للتفاصيل', duration: 4, camera: 'Sony A7IV', lens: '100mm', shotType: 'Detail Shot', cameraAngle: 'Overhead', cameraMovement: 'Static', lighting: 'Soft Light', equipment: ['Sony A7IV', 'Slider'], status: 'draft', isCompleted: false },
      ]},
      { number: 3, title: 'Lifestyle', description: 'المنتج في بيئته الطبيعية', shots: [
        { id: '', number: 1, title: 'لقطة لايف ستايل', description: 'Lifestyle shot طبيعي', duration: 6, camera: 'Sony A7SIII', lens: '50mm', shotType: 'Lifestyle Shot', cameraAngle: 'Eye Level', cameraMovement: 'Gimbal Follow', lighting: 'Natural Light', equipment: ['Sony A7SIII', 'Gimbal'], status: 'draft', isCompleted: false },
      ]},
    ]
  },
  {
    name: 'مقابلة / Interview',
    description: 'قالب للمقابلات والمحتوى الحواري',
    type: 'interview', isActive: true,
    parts: [
      { number: 1, title: 'الإطار الرئيسي', shots: [
        { id: '', number: 1, title: 'Medium Shot للمتحدث', description: 'الإطار الأساسي', duration: 0, camera: 'Sony FX3', lens: '85mm', shotType: 'Medium Shot', cameraAngle: 'Eye Level', cameraMovement: 'Static', lighting: 'Key Light', equipment: ['Sony FX3', 'Tripod', 'Softbox'], status: 'draft', isCompleted: false },
        { id: '', number: 2, title: 'Close Up للتعبير', description: 'لقطة قريبة', duration: 0, camera: 'Sony A7SIII', lens: '85mm', shotType: 'Close Up', cameraAngle: 'Eye Level', cameraMovement: 'Static', lighting: 'Key Light', equipment: ['Sony A7SIII', 'Tripod'], status: 'draft', isCompleted: false },
      ]},
      { number: 2, title: 'B-Roll', shots: [
        { id: '', number: 1, title: 'B-Roll أيدي', description: 'تفاصيل يدوية', duration: 4, camera: 'Sony A7IV', lens: '50mm', shotType: 'Detail Shot', cameraAngle: 'Overhead', cameraMovement: 'Static', lighting: 'Soft Light', equipment: ['Sony A7IV'], status: 'draft', isCompleted: false },
      ]},
    ]
  },
  {
    name: 'فيديو يوتيوب',
    description: 'هيكل فيديو يوتيوب احترافي',
    type: 'youtube', isActive: true,
    parts: [
      { number: 1, title: 'Hook / افتتاحية', shots: [
        { id: '', number: 1, title: 'Hook مشوّق', description: 'أول 5 ثواني جاذبة', duration: 5, camera: 'Sony A7SIII', lens: '35mm', shotType: 'Close Up', cameraAngle: 'Low Angle', cameraMovement: 'Push In', lighting: 'Cinematic Contrast', equipment: ['Sony A7SIII', 'Gimbal'], status: 'draft', isCompleted: false },
      ]},
      { number: 2, title: 'المحتوى الرئيسي', shots: [
        { id: '', number: 1, title: 'Medium Shot رئيسي', description: 'الإطار الأساسي للمحتوى', duration: 0, camera: 'Sony FX3', lens: '50mm', shotType: 'Medium Shot', cameraAngle: 'Eye Level', cameraMovement: 'Static', lighting: 'Soft Light', equipment: ['Sony FX3', 'Tripod', 'LED Panel'], status: 'draft', isCompleted: false },
      ]},
      { number: 3, title: 'ختامية + CTA', shots: [
        { id: '', number: 1, title: 'Call to Action', description: 'نهاية الفيديو', duration: 8, camera: 'Sony FX3', lens: '35mm', shotType: 'Medium Shot', cameraAngle: 'Eye Level', cameraMovement: 'Static', lighting: 'Natural Light', equipment: ['Sony FX3', 'Tripod'], status: 'draft', isCompleted: false },
      ]},
    ]
  },
  {
    name: 'تصوير درون',
    description: 'قالب متخصص لمشاريع الدرون',
    type: 'drone', isActive: true,
    parts: [
      { number: 1, title: 'لقطات افتتاحية جوية', shots: [
        { id: '', number: 1, title: 'Establishing Aerial', description: 'لقطة شاملة عالية', duration: 8, camera: 'DJI Mavic', lens: 'Wide Angle Lens', shotType: 'Establishing Shot', cameraAngle: 'Bird Eye', cameraMovement: 'Drone Pull Away', lighting: 'Golden Hour', equipment: ['DJI Drone', 'Monitor'], status: 'draft', isCompleted: false },
        { id: '', number: 2, title: 'Drone Orbit', description: 'دوران حول الهدف', duration: 10, camera: 'DJI Mavic', lens: 'Wide Angle Lens', shotType: 'Drone Shot', cameraAngle: 'High Angle', cameraMovement: 'Drone Orbit', lighting: 'Golden Hour', equipment: ['DJI Drone'], status: 'draft', isCompleted: false },
      ]},
      { number: 2, title: 'لقطات تفصيلية', shots: [
        { id: '', number: 1, title: 'Hyperlapse', description: 'حركة سريعة', duration: 12, camera: 'DJI Mavic', lens: 'Wide Angle Lens', shotType: 'Drone Shot', cameraAngle: 'Bird Eye', cameraMovement: 'Drone Forward', lighting: 'Natural Light', equipment: ['DJI Drone'], status: 'draft', isCompleted: false },
      ]},
    ]
  },
];

type TabType = 'list' | 'create' | 'edit';

interface PartFormItem {
  title: string;
  description: string;
  shots: { title: string; description: string; duration: number; camera: string; lens: string; shotType: string; cameraAngle: string; cameraMovement: string; lighting: string; }[];
}

export default function TemplatesSection() {
  const [tab, setTab] = useState<TabType>('list');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Form state
  const [tName, setTName] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tType, setTType] = useState<ProjectType>('real-estate');
  const [parts, setParts] = useState<PartFormItem[]>([{ title: '', description: '', shots: [] }]);

  const { templates: tList, addTemplate: add, deleteTemplate: del } = useAppStore();

  const filtered = tList.filter(t => {
    const ms = t.name.toLowerCase().includes(search.toLowerCase());
    const mt = filterType === 'all' || t.type === filterType;
    return ms && mt;
  });

  const toggleActive = (id: string) => {
    const tmpl = tList.find(t => t.id === id);
    if (!tmpl) return;
    del(id);
    add({ ...tmpl, isActive: !tmpl.isActive });
  };

  const duplicateTemplate = (tmpl: Template) => {
    add({ ...tmpl, name: tmpl.name + ' (نسخة)', isActive: true });
  };

  const seedPresets = () => {
    if (!confirm('هذا سيضيف 5 قوالب جاهزة. هل تريد المتابعة؟')) return;
    PRESET_TEMPLATES.forEach(t => add(t));
  };

  const resetForm = () => {
    setTName(''); setTDesc(''); setTType('real-estate');
    setParts([{ title: '', description: '', shots: [] }]);
    setEditingTemplate(null);
    setTab('list');
  };

  const addPart = () => setParts(p => [...p, { title: '', description: '', shots: [] }]);
  const removePart = (i: number) => setParts(p => p.filter((_, idx) => idx !== i));
  const updatePart = (i: number, key: 'title' | 'description', val: string) =>
    setParts(p => p.map((pt, idx) => idx === i ? { ...pt, [key]: val } : pt));

  const addShotToPart = (pi: number) =>
    setParts(p => p.map((pt, idx) => idx === pi ? { ...pt, shots: [...pt.shots, { title: '', description: '', duration: 5, camera: '', lens: '', shotType: '', cameraAngle: '', cameraMovement: '', lighting: '' }] } : pt));

  const removeShotFromPart = (pi: number, si: number) =>
    setParts(p => p.map((pt, idx) => idx === pi ? { ...pt, shots: pt.shots.filter((_, i) => i !== si) } : pt));

  const updateShot = (pi: number, si: number, key: string, val: string | number) =>
    setParts(p => p.map((pt, idx) => idx === pi ? {
      ...pt, shots: pt.shots.map((sh, i) => i === si ? { ...sh, [key]: val } : sh)
    } : pt));

  const handleSave = () => {
    if (!tName.trim()) return;
    const templateData = {
      name: tName, description: tDesc, type: tType, isActive: true,
      parts: parts.filter(p => p.title.trim()).map((p, i) => ({
        number: i + 1, title: p.title, description: p.description,
        shots: p.shots.filter(s => s.title.trim()).map((s, j) => ({
          id: '', number: j + 1, title: s.title, description: s.description,
          duration: s.duration, camera: s.camera, lens: s.lens,
          shotType: s.shotType, cameraAngle: s.cameraAngle, cameraMovement: s.cameraMovement,
          lighting: s.lighting, equipment: [], status: 'draft' as const, isCompleted: false,
        }))
      }))
    };
    if (editingTemplate) {
      del(editingTemplate.id);
      add(templateData);
    } else {
      add(templateData);
    }
    resetForm();
  };

  const openEdit = (tmpl: Template) => {
    setEditingTemplate(tmpl);
    setTName(tmpl.name); setTDesc(tmpl.description || ''); setTType(tmpl.type);
    setParts(tmpl.parts.map(p => ({
      title: p.title, description: p.description || '',
      shots: p.shots.map(s => ({ title: s.title, description: s.description, duration: s.duration, camera: s.camera || '', lens: s.lens || '', shotType: s.shotType || '', cameraAngle: s.cameraAngle || '', cameraMovement: s.cameraMovement || '', lighting: s.lighting || '' }))
    })));
    setTab('create');
  };

  const getTypeLabel = (type: string) => PROJECT_TYPES.find(t => t.value === type)?.labelAr || type;

  const TYPE_ICONS: Record<string, string> = {
    'real-estate': '🏠', 'product-commercial': '📦', 'corporate': '🏢',
    'social-media': '📱', 'youtube': '▶️', 'interview': '🎤',
    'drone': '🚁', 'documentary': '🎞️', 'event': '🎉', 'custom': '🔧'
  };

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: 'linear-gradient(180deg, #A07830, #C9A84C)' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>القوالب</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingRight: '16px' }}>
            {tList.length} قالب • {tList.filter(t => t.isActive !== false).length} مفعّل
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {tList.length === 0 && (
            <button className="btn btn-outline" onClick={seedPresets} style={{ fontSize: '13px' }}>
              ✨ إضافة قوالب جاهزة
            </button>
          )}
          <button className="btn btn-gold" onClick={() => { setEditingTemplate(null); resetForm(); setTab('create'); }}>
            + قالب جديد
          </button>
        </div>
      </div>

      {/* Tabs */}
      {tab === 'create' ? (
        /* ── CREATE / EDIT FORM ── */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
              ← العودة للقائمة
            </button>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {editingTemplate ? 'تعديل القالب' : 'إنشاء قالب جديد'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>اسم القالب *</label>
              <input className="input-field" placeholder="مثال: إعلان فيلا فاخرة" value={tName} onChange={e => setTName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>نوع المشروع</label>
              <select className="input-field" value={tType} onChange={e => setTType(e.target.value as ProjectType)}>
                {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
                <option value="custom">🔧 مخصص</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>وصف القالب</label>
              <input className="input-field" placeholder="وصف مختصر..." value={tDesc} onChange={e => setTDesc(e.target.value)} />
            </div>
          </div>

          {/* Parts builder */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                أجزاء القالب ({parts.length})
              </h3>
              <button className="btn btn-outline" onClick={addPart} style={{ fontSize: '12px' }}>+ إضافة جزء</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {parts.map((part, pi) => (
                <div key={pi} className="card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'var(--gold)', color: '#000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '900', fontSize: '13px', flexShrink: 0
                    }}>{pi + 1}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1 }}>
                      <input className="input-field" placeholder="عنوان الجزء *" value={part.title} onChange={e => updatePart(pi, 'title', e.target.value)} />
                      <input className="input-field" placeholder="وصف الجزء (اختياري)" value={part.description} onChange={e => updatePart(pi, 'description', e.target.value)} />
                    </div>
                    <button onClick={() => removePart(pi)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '4px' }}>✕</button>
                  </div>

                  {/* Shots in this part */}
                  {part.shots.length > 0 && (
                    <div style={{ marginBottom: '12px', paddingRight: '38px' }}>
                      {part.shots.map((shot, si) => (
                        <div key={si} style={{
                          padding: '12px', borderRadius: '8px', marginBottom: '8px',
                          background: 'var(--bg-hover)', border: '1px solid var(--border)'
                        }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                            <span style={{
                              width: '20px', height: '20px', borderRadius: '50%',
                              background: 'rgba(201,168,76,0.3)', color: 'var(--gold)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '10px', fontWeight: '900', flexShrink: 0
                            }}>{si + 1}</span>
                            <input className="input-field" style={{ flex: 1 }} placeholder="عنوان اللقطة *" value={shot.title} onChange={e => updateShot(pi, si, 'title', e.target.value)} />
                            <input className="input-field" style={{ flex: 1 }} placeholder="وصف اللقطة" value={shot.description} onChange={e => updateShot(pi, si, 'description', e.target.value)} />
                            <input className="input-field" style={{ width: '70px' }} type="number" placeholder="ث" value={shot.duration} onChange={e => updateShot(pi, si, 'duration', Number(e.target.value))} />
                            <button onClick={() => removeShotFromPart(pi, si)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px', paddingRight: '28px' }}>
                            {(SHOT_FIELD_SELECTS).map(f => (
                              <div key={f.key}>
                                <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px', fontWeight: '600' }}>{f.label}</label>
                                <select className="input-field" style={{ fontSize: '11px', padding: '5px 8px' }} value={shot[f.key]} onChange={e => updateShot(pi, si, f.key, e.target.value)}>
                                  <option value="">—</option>
                                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => addShotToPart(pi)}
                    style={{
                      marginRight: '38px', padding: '6px 14px', borderRadius: '8px',
                      border: '1px dashed var(--border)', background: 'none',
                      color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLElement).style.color = 'var(--gold)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                  >
                    + إضافة لقطة لهذا الجزء
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={resetForm}>إلغاء</button>
            <button className="btn btn-gold" onClick={handleSave}>
              {editingTemplate ? '💾 حفظ التعديلات' : '✨ إنشاء القالب'}
            </button>
          </div>
        </div>
      ) : (
        /* ── TEMPLATES LIST ── */
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input className="input-field" style={{ maxWidth: '240px' }} placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-field" style={{ maxWidth: '160px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">كل الأنواع</option>
              {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: '48px' }}>⊞</span>
              <h3 style={{ marginTop: '12px', fontWeight: '700' }}>لا توجد قوالب</h3>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={seedPresets}>✨ إضافة قوالب جاهزة</button>
                <button className="btn btn-gold" onClick={() => setTab('create')}>+ إنشاء قالب</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '20px' }}>
              {filtered.map(tmpl => {
                const isActive = tmpl.isActive !== false;
                const totalShots = tmpl.parts.reduce((a, p) => a + p.shots.length, 0);
                return (
                  <div key={tmpl.id} className="card" style={{
                    padding: '20px', opacity: isActive ? 1 : 0.6,
                    border: isActive ? '1px solid var(--border)' : '1px solid rgba(107,114,128,0.2)',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '24px' }}>{TYPE_ICONS[tmpl.type] || '📋'}</span>
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '2px' }}>{tmpl.name}</h3>
                          <span className="chip chip-gold" style={{ fontSize: '10px' }}>{getTypeLabel(tmpl.type)}</span>
                        </div>
                      </div>
                      {/* Active toggle */}
                      <button
                        onClick={() => toggleActive(tmpl.id)}
                        style={{
                          padding: '4px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                          fontSize: '11px', fontWeight: '700', transition: 'all 0.2s',
                          background: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.1)',
                          color: isActive ? '#22c55e' : '#6b7280',
                        }}
                      >
                        {isActive ? '✅ مفعّل' : '○ معطّل'}
                      </button>
                    </div>

                    {tmpl.description && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
                        {tmpl.description}
                      </p>
                    )}

                    {/* Parts summary */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>
                        {tmpl.parts.length} أجزاء • {totalShots} لقطة
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {tmpl.parts.slice(0, 3).map((part, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '5px 8px', borderRadius: '6px', background: 'var(--bg-hover)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: 'var(--gold)', color: '#0A0A0B',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '9px', fontWeight: '900', flexShrink: 0
                              }}>{i + 1}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{part.title}</span>
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{part.shots.length} لقطة</span>
                          </div>
                        ))}
                        {tmpl.parts.length > 3 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', paddingTop: '2px' }}>
                            +{tmpl.parts.length - 3} أجزاء أخرى
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      <button className="btn btn-gold" style={{ flex: 1, fontSize: '11px', padding: '7px' }} onClick={() => openEdit(tmpl)}>
                        ✏️ تعديل
                      </button>
                      <button className="btn btn-outline" style={{ fontSize: '11px', padding: '7px 10px' }} onClick={() => duplicateTemplate(tmpl)} title="نسخ">
                        ⧉
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: '11px', padding: '7px 10px' }}
                        onClick={() => { if (confirm('حذف القالب؟')) del(tmpl.id); }} title="حذف">
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
