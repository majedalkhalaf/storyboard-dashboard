'use client';

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Equipment } from '../../lib/types';
import { EQUIPMENT_CATEGORIES } from '../../lib/constants';

export default function EquipmentSection() {
  const { equipment, storyboards, addEquipment, updateEquipment, deleteEquipment } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);
  const [form, setForm] = useState({ name: '', category: 'cameras' as Equipment['category'], quantity: 1, status: 'available' as Equipment['status'], notes: '' });

  const filtered = equipment.filter(eq => {
    const matchSearch = eq.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || eq.category === filterCat;
    return matchSearch && matchCat;
  });

  // Build auto checklist from all storyboard shots
  const allEquipmentUsed = storyboards.flatMap(sb =>
    sb.parts.flatMap(p => p.shots.flatMap(s => s.equipment))
  );
  const equipmentChecklist = allEquipmentUsed.reduce((acc: Record<string, number>, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingEq) {
      updateEquipment(editingEq.id, form);
    } else {
      addEquipment(form);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', category: 'cameras', quantity: 1, status: 'available', notes: '' });
    setShowForm(false);
    setEditingEq(null);
  };

  const openEdit = (eq: Equipment) => {
    setEditingEq(eq);
    setForm({ name: eq.name, category: eq.category, quantity: eq.quantity, status: eq.status, notes: eq.notes || '' });
    setShowForm(true);
  };

  const getCategoryLabel = (cat: string) => EQUIPMENT_CATEGORIES.find(c => c.value === cat)?.labelAr || cat;

  const STATUS_COLORS: Record<string, string> = {
    available: '#22c55e', 'in-use': '#f97316', maintenance: '#ef4444'
  };
  const STATUS_LABELS: Record<string, string> = {
    available: 'متاح', 'in-use': 'مستخدم', maintenance: 'صيانة'
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: 'linear-gradient(180deg, #A07830, #C9A84C)' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>المعدات</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingRight: '16px' }}>
            {equipment.length} قطعة • {equipment.filter(e => e.status === 'available').length} متاحة
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => { setEditingEq(null); setShowForm(true); }}>+ إضافة معدة</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
        {/* Equipment list */}
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input className="input-field" style={{ maxWidth: '260px' }} placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-field" style={{ maxWidth: '180px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">كل الفئات</option>
              {EQUIPMENT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.labelAr}</option>)}
            </select>
          </div>

          {/* Category groups */}
          {EQUIPMENT_CATEGORIES.filter(cat => filterCat === 'all' || cat.value === filterCat).map(cat => {
            const catItems = filtered.filter(e => e.category === cat.value);
            if (catItems.length === 0) return null;
            return (
              <div key={cat.value} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {cat.labelAr}
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>الكمية</th>
                      <th>الحالة</th>
                      <th>مستخدم في</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map(eq => (
                      <tr key={eq.id}>
                        <td>
                          <div style={{ fontWeight: '600' }}>{eq.name}</div>
                          {eq.notes && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{eq.notes}</div>}
                        </td>
                        <td>
                          <span style={{ fontWeight: '700', color: 'var(--gold)' }}>{eq.quantity}</span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '12px',
                            background: `${STATUS_COLORS[eq.status]}20`, color: STATUS_COLORS[eq.status]
                          }}>
                            {STATUS_LABELS[eq.status]}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: equipmentChecklist[eq.name] ? 'var(--gold)' : 'var(--text-muted)' }}>
                            {equipmentChecklist[eq.name] ? `${equipmentChecklist[eq.name]} لقطة` : '-'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => openEdit(eq)}>✏️</button>
                            <button className="btn btn-danger" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => { if (confirm('حذف المعدة؟')) deleteEquipment(eq.id); }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="empty-state">
              <span style={{ fontSize: '48px' }}>◉</span>
              <h3 style={{ marginTop: '12px', fontWeight: '700' }}>لا توجد معدات</h3>
              <button className="btn btn-gold" style={{ marginTop: '16px' }} onClick={() => setShowForm(true)}>+ إضافة معدة</button>
            </div>
          )}
        </div>

        {/* Auto Equipment Checklist */}
        <div>
          <div className="card" style={{ padding: '20px', position: 'sticky', top: '0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
              ✅ قائمة المعدات التلقائية
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              المعدات المطلوبة من جميع اللقطات
            </p>
            {Object.keys(equipmentChecklist).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                لا توجد لقطات تحتوي على معدات بعد
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(equipmentChecklist).sort((a, b) => b[1] - a[1]).map(([item, count]) => {
                  const inInventory = equipment.find(e => e.name === item);
                  const available = inInventory?.status === 'available';
                  return (
                    <div key={item} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: '8px',
                      background: inInventory ? (available ? 'rgba(34,197,94,0.08)' : 'rgba(249,115,22,0.08)') : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${inInventory ? (available ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.2)') : 'rgba(239,68,68,0.2)'}`
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{item}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>مطلوب في {count} لقطة</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: inInventory ? (available ? '#22c55e' : '#f97316') : '#ef4444' }}>
                          {inInventory ? (available ? '✓ متاح' : '⚠ مستخدم') : '✕ غير موجود'}
                        </div>
                        {inInventory && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>الكمية: {inInventory.quantity}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            {Object.keys(equipmentChecklist).length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(201,168,76,0.08)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold)', marginBottom: '4px' }}>ملخص</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  إجمالي المعدات المطلوبة: {Object.keys(equipmentChecklist).length} نوع
                </div>
                <div style={{ fontSize: '12px', color: '#22c55e' }}>
                  متاح في المخزون: {Object.keys(equipmentChecklist).filter(item => equipment.find(e => e.name === item && e.status === 'available')).length}
                </div>
                <div style={{ fontSize: '12px', color: '#ef4444' }}>
                  غير موجود: {Object.keys(equipmentChecklist).filter(item => !equipment.find(e => e.name === item)).length}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && resetForm()}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>{editingEq ? 'تعديل المعدة' : 'إضافة معدة'}</h2>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الاسم *</label>
                <input className="input-field" placeholder="اسم المعدة" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الفئة</label>
                <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Equipment['category'] })}>
                  {EQUIPMENT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.labelAr}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الكمية</label>
                  <input className="input-field" type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>الحالة</label>
                  <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Equipment['status'] })}>
                    <option value="available">متاح</option>
                    <option value="in-use">مستخدم</option>
                    <option value="maintenance">صيانة</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>ملاحظات</label>
                <input className="input-field" placeholder="ملاحظات..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={resetForm}>إلغاء</button>
              <button className="btn btn-gold" onClick={handleSubmit}>{editingEq ? 'حفظ' : 'إضافة'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
