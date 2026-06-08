'use client';

import { useState } from 'react';
import { Shot, ShotStatus, TimeOfDay, Mood } from '../../lib/types';
import { useAppStore } from '../../store/useAppStore';
import {
  CAMERAS, ALL_LENSES, SHOT_TYPES, CAMERA_MOVEMENTS, CAMERA_ANGLES,
  LIGHTING_OPTIONS, LOCATIONS, TIMES_OF_DAY, MOODS, SMART_PRESETS
} from '../../lib/constants';

interface ShotEditorProps {
  shot: Shot;
  partId: string;
  storyboardId: string;
  onClose: () => void;
}

export default function ShotEditor({ shot, partId, storyboardId, onClose }: ShotEditorProps) {
  const { updateShot, equipment } = useAppStore();
  const [form, setForm] = useState({ ...shot });
  const [activeTab, setActiveTab] = useState<'basic' | 'camera' | 'production' | 'notes'>('basic');

  const handleSave = () => {
    updateShot(storyboardId, partId, shot.id, form);
    onClose();
  };

  const applyPreset = (preset: typeof SMART_PRESETS[0]) => {
    setForm(f => ({
      ...f,
      camera: preset.camera,
      lens: preset.lens,
      cameraMovement: preset.movement,
      lighting: preset.lighting,
      equipment: preset.equipment,
      mood: preset.mood as Mood,
      shotType: preset.shotType,
      cameraAngle: preset.angle,
    }));
  };

  const toggleEquipment = (item: string) => {
    setForm(f => ({
      ...f,
      equipment: f.equipment.includes(item)
        ? f.equipment.filter(e => e !== item)
        : [...f.equipment, item]
    }));
  };

  const STATUS_OPTS: { value: ShotStatus; label: string }[] = [
    { value: 'draft', label: 'مسودة' },
    { value: 'ready', label: 'جاهز' },
    { value: 'filmed', label: 'مصوّر' },
    { value: 'completed', label: 'مكتمل' },
  ];

  const TABS = [
    { id: 'basic', label: 'أساسي' },
    { id: 'camera', label: 'الكاميرا' },
    { id: 'production', label: 'الإنتاج' },
    { id: 'notes', label: 'ملاحظات' },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '780px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gold)', color: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
              {form.number}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800' }}>تعديل اللقطة</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select className="input-field" style={{ width: 'auto', fontSize: '12px', padding: '6px 12px' }}
              value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ShotStatus })}>
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </div>
        </div>

        {/* Smart Presets */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>⚡ الإعدادات المسبقة الذكية</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SMART_PRESETS.map(preset => (
              <button key={preset.name} onClick={() => applyPreset(preset)} style={{
                padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.3)',
                background: 'rgba(201,168,76,0.08)', color: 'var(--gold)', cursor: 'pointer',
                fontSize: '11px', fontWeight: '600', transition: 'all 0.15s'
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.08)'}>
                {preset.nameAr}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: activeTab === tab.id ? '700' : '500',
              color: activeTab === tab.id ? 'var(--gold)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s'
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', paddingLeft: '4px' }}>
          {activeTab === 'basic' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>رقم اللقطة</label>
                <input className="input-field" type="number" value={form.number} onChange={e => setForm({ ...form, number: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>مدة اللقطة (ثانية)</label>
                <input className="input-field" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>عنوان اللقطة</label>
                <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>وصف اللقطة</label>
                <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>التعليق الصوتي (Voice Over)</label>
                <textarea className="input-field" rows={2} value={form.voiceOver || ''} onChange={e => setForm({ ...form, voiceOver: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الموقع</label>
                <select className="input-field" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })}>
                  <option value="">اختر الموقع</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>وقت اليوم</label>
                <select className="input-field" value={form.timeOfDay || ''} onChange={e => setForm({ ...form, timeOfDay: e.target.value as TimeOfDay })}>
                  <option value="">اختر الوقت</option>
                  {TIMES_OF_DAY.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>المزاج / الأسلوب</label>
                <select className="input-field" value={form.mood || ''} onChange={e => setForm({ ...form, mood: e.target.value as Mood })}>
                  <option value="">اختر المزاج</option>
                  {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'camera' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الكاميرا</label>
                <select className="input-field" value={form.camera || ''} onChange={e => setForm({ ...form, camera: e.target.value })}>
                  <option value="">اختر الكاميرا</option>
                  {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>العدسة</label>
                <select className="input-field" value={form.lens || ''} onChange={e => setForm({ ...form, lens: e.target.value })}>
                  <option value="">اختر العدسة</option>
                  {ALL_LENSES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>زاوية الكاميرا</label>
                <select className="input-field" value={form.cameraAngle || ''} onChange={e => setForm({ ...form, cameraAngle: e.target.value })}>
                  <option value="">اختر الزاوية</option>
                  {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>حركة الكاميرا</label>
                <select className="input-field" value={form.cameraMovement || ''} onChange={e => setForm({ ...form, cameraMovement: e.target.value })}>
                  <option value="">اختر الحركة</option>
                  {CAMERA_MOVEMENTS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>نوع اللقطة</label>
                <select className="input-field" value={form.shotType || ''} onChange={e => setForm({ ...form, shotType: e.target.value })}>
                  <option value="">اختر النوع</option>
                  {SHOT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الإضاءة</label>
                <select className="input-field" value={form.lighting || ''} onChange={e => setForm({ ...form, lighting: e.target.value })}>
                  <option value="">اختر الإضاءة</option>
                  {LIGHTING_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'production' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600' }}>
                المعدات المطلوبة
              </label>
              {/* Quick select from store equipment */}
              {equipment.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>من مخزون المعدات:</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {equipment.map(eq => (
                      <button key={eq.id} onClick={() => toggleEquipment(eq.name)} style={{
                        padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'all 0.15s',
                        background: form.equipment.includes(eq.name) ? 'rgba(201,168,76,0.2)' : 'var(--bg-hover)',
                        border: form.equipment.includes(eq.name) ? '1px solid rgba(201,168,76,0.5)' : '1px solid var(--border)',
                        color: form.equipment.includes(eq.name) ? 'var(--gold)' : 'var(--text-secondary)',
                      }}>
                        {form.equipment.includes(eq.name) ? '✓ ' : ''}{eq.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual equipment list */}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>معدات شائعة:</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {['Sony FX3', 'Sony A7SIII', 'DJI Drone', 'Gimbal', 'Slider', 'Monitor', 'Tripod', 'LED Panel', 'Softbox', 'Wireless Mic'].map(item => (
                  <button key={item} onClick={() => toggleEquipment(item)} style={{
                    padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'all 0.15s',
                    background: form.equipment.includes(item) ? 'rgba(201,168,76,0.2)' : 'var(--bg-hover)',
                    border: form.equipment.includes(item) ? '1px solid rgba(201,168,76,0.5)' : '1px solid var(--border)',
                    color: form.equipment.includes(item) ? 'var(--gold)' : 'var(--text-secondary)',
                  }}>
                    {form.equipment.includes(item) ? '✓ ' : ''}{item}
                  </button>
                ))}
              </div>

              {form.equipment.length > 0 && (
                <div style={{ padding: '12px', background: 'rgba(201,168,76,0.08)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: '700', marginBottom: '6px' }}>
                    ✓ المعدات المحددة ({form.equipment.length})
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {form.equipment.map(eq => (
                      <span key={eq} className="chip chip-gold" style={{ fontSize: '11px' }}>{eq}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>ملاحظات المخرج</label>
                <textarea className="input-field" rows={4} value={form.directorNotes || ''} onChange={e => setForm({ ...form, directorNotes: e.target.value })} style={{ resize: 'vertical' }} placeholder="توجيهات المخرج للطاقم..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>رابط الصورة المرجعية</label>
                <input className="input-field" placeholder="https://... رابط صورة مرجعية للقطة" value={form.referenceImage || ''}
                  onChange={e => setForm({ ...form, referenceImage: e.target.value })} />
              </div>
              {form.referenceImage && (
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={form.referenceImage} alt="Reference" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
          <button className="btn btn-gold" onClick={handleSave}>💾 حفظ اللقطة</button>
        </div>
      </div>
    </div>
  );
}
