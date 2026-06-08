'use client';

import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export default function ExportCenter({ storyboardId }: { storyboardId: string | null }) {
  const { storyboards, projects, equipment } = useAppStore();
  const [selectedSbId, setSelectedSbId] = useState(storyboardId || (storyboards[0]?.id || ''));

  const selectedSb = storyboards.find(sb => sb.id === selectedSbId);
  const project = selectedSb ? projects.find(p => p.id === selectedSb.projectId) : null;

  const totalShots = selectedSb ? selectedSb.parts.reduce((a, p) => a + p.shots.length, 0) : 0;
  const totalDuration = selectedSb ? selectedSb.parts.reduce((a, p) => a + p.shots.reduce((b, s) => b + s.duration, 0), 0) : 0;

  const handleExportJSON = () => {
    if (!selectedSb) return;
    const data = JSON.stringify({ storyboard: selectedSb, project }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSb.title}-backup.json`;
    a.click();
  };

  const handleExportCSVEquipment = () => {
    if (!selectedSb) return;
    const allEquip = selectedSb.parts.flatMap(p => p.shots.flatMap(s => s.equipment));
    const counts: Record<string, number> = {};
    allEquip.forEach(e => counts[e] = (counts[e] || 0) + 1);

    const rows = [['المعدة', 'عدد المرات', 'الحالة']];
    Object.entries(counts).forEach(([name, count]) => {
      const eq = equipment.find(e => e.name === name);
      rows.push([name, String(count), eq ? (eq.status === 'available' ? 'متاح' : 'مستخدم') : 'غير موجود في المخزون']);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSb.title}-equipment.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: 'linear-gradient(180deg, #A07830, #C9A84C)' }} />
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>مركز التصدير</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingRight: '16px', marginBottom: '28px' }}>
        تصدير الستوري بورد والملفات بصيغ متعددة
      </p>

      {/* Storyboard selector */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
          اختر الستوري بورد للتصدير
        </label>
        <select className="input-field" style={{ maxWidth: '400px' }} value={selectedSbId} onChange={e => setSelectedSbId(e.target.value)}>
          <option value="">اختر ستوري بورد</option>
          {storyboards.map(sb => (
            <option key={sb.id} value={sb.id}>{sb.title} - {projects.find(p => p.id === sb.projectId)?.name || ''}</option>
          ))}
        </select>
      </div>

      {selectedSb && (
        <>
          {/* Preview info */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
              معلومات الستوري بورد
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { label: 'العنوان', value: selectedSb.title },
                { label: 'المشروع', value: project?.name || '-' },
                { label: 'عدد الأجزاء', value: selectedSb.parts.length.toString() },
                { label: 'عدد اللقطات', value: totalShots.toString() },
                { label: 'رقم الفيديو', value: selectedSb.videoNumber || '-' },
                { label: 'مدة الفيديو', value: `${selectedSb.videoDuration} دقيقة` },
                { label: 'مدة اللقطات', value: `${totalDuration} ثانية` },
                { label: 'العميل', value: project?.clientName || '-' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Export options */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {[
              {
                title: '📄 تصدير PDF',
                desc: 'ستوري بورد احترافي بتنسيق PDF',
                note: 'يتضمن: اللقطات، التفاصيل التقنية، قائمة المعدات',
                action: handlePrintPDF,
                color: '#ef4444',
              },
              {
                title: '💾 نسخ احتياطي JSON',
                desc: 'نسخة كاملة من البيانات',
                note: 'قابل للاستيراد لاحقاً في النظام',
                action: handleExportJSON,
                color: '#3b82f6',
              },
              {
                title: '📊 قائمة المعدات CSV',
                desc: 'قائمة المعدات المطلوبة',
                note: 'مناسب لـ Excel وجداول البيانات',
                action: handleExportCSVEquipment,
                color: '#22c55e',
              },
              {
                title: '🖥️ وضع العرض التقديمي',
                desc: 'عرض الستوري بورد بشاشة كاملة',
                note: 'للعرض على العميل أو الطاقم',
                action: () => alert('قريباً...'),
                color: '#a855f7',
              },
            ].map((opt, i) => (
              <div key={i} className="card" style={{ padding: '20px', cursor: 'pointer' }} onClick={opt.action}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = opt.color}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>{opt.title.split(' ')[0]}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {opt.title.split(' ').slice(1).join(' ')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{opt.desc}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{opt.note}</div>
                <button className="btn btn-outline" style={{ width: '100%', marginTop: '14px', justifyContent: 'center', fontSize: '12px', borderColor: opt.color, color: opt.color }}>
                  تصدير
                </button>
              </div>
            ))}
          </div>

          {/* Printable Storyboard Preview */}
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
              معاينة الستوري بورد
            </h3>
            <div className="card" style={{ padding: '32px' }} id="printable-storyboard">
              {/* Print Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--gold)', paddingBottom: '16px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>{selectedSb.title}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{project?.name} • {project?.clientName}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>رقم الفيديو</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--gold)' }}>{selectedSb.videoNumber}</div>
                </div>
              </div>

              {/* Overview */}
              {selectedSb.objective && (
                <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold)', marginBottom: '4px' }}>هدف الفيديو</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedSb.objective}</div>
                </div>
              )}

              {/* Parts & Shots grid */}
              {selectedSb.parts.map((part, pi) => (
                <div key={part.id} style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                    الجزء {pi + 1}: {part.title}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {part.shots.map(shot => (
                      <div key={shot.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ height: '70px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                          {shot.referenceImage ? (
                            <img src={shot.referenceImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : '🎬'}
                        </div>
                        <div style={{ padding: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            لقطة {shot.number}: {shot.title}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{shot.description?.slice(0, 60)}</div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {shot.camera && <span style={{ fontSize: '9px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px', color: 'var(--text-secondary)' }}>{shot.camera}</span>}
                            {shot.lens && <span style={{ fontSize: '9px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px', color: 'var(--text-secondary)' }}>{shot.lens}</span>}
                            <span style={{ fontSize: '9px', background: 'rgba(201,168,76,0.1)', padding: '1px 5px', borderRadius: '4px', color: 'var(--gold)' }}>{shot.duration}ث</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!selectedSb && storyboards.length === 0 && (
        <div className="empty-state">
          <span style={{ fontSize: '48px' }}>⤴</span>
          <h3 style={{ marginTop: '12px', fontWeight: '700' }}>لا يوجد ستوري بورد للتصدير</h3>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>أنشئ ستوري بورد أولاً ثم عد هنا للتصدير</p>
        </div>
      )}
    </div>
  );
}
