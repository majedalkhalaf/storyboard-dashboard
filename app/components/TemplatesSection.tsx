'use client';

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { PROJECT_TYPES } from '../lib/constants';

export default function TemplatesSection() {
  const { templates, addTemplate, deleteTemplate } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'real-estate' as any });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    addTemplate({ ...form, parts: [] });
    setForm({ name: '', description: '', type: 'real-estate' });
    setShowForm(false);
  };

  const getTypeLabel = (type: string) => PROJECT_TYPES.find(t => t.value === type)?.labelAr || type;

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: 'linear-gradient(180deg, #A07830, #C9A84C)' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>القوالب</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingRight: '16px' }}>
            {templates.length} قالب جاهز للاستخدام
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowForm(true)}>+ قالب جديد</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {templates.map(tmpl => (
          <div key={tmpl.id} className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{tmpl.name}</h3>
                <span className="chip chip-gold" style={{ fontSize: '11px' }}>{getTypeLabel(tmpl.type)}</span>
              </div>
              <button className="btn btn-danger" style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => { if (confirm('حذف القالب؟')) deleteTemplate(tmpl.id); }}>✕</button>
            </div>
            {tmpl.description && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.5' }}>
                {tmpl.description}
              </p>
            )}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>الأجزاء:</div>
              {tmpl.parts.map((part, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--gold)', color: '#0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{part.title}</span>
                </div>
              ))}
              {tmpl.parts.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>لا توجد أجزاء محددة</div>}
            </div>
            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}>
              استخدام هذا القالب
            </button>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <span style={{ fontSize: '48px' }}>⊞</span>
            <h3 style={{ marginTop: '12px', fontWeight: '700' }}>لا توجد قوالب</h3>
            <button className="btn btn-gold" style={{ marginTop: '16px' }} onClick={() => setShowForm(true)}>
              + إنشاء قالب
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>قالب جديد</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>اسم القالب *</label>
                <input className="input-field" placeholder="اسم القالب" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>نوع المشروع</label>
                <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الوصف</label>
                <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>إلغاء</button>
              <button className="btn btn-gold" onClick={handleCreate}>إنشاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
