'use client';

import { useRef } from 'react';
import { Shot } from '../../lib/types';
import { useAppStore } from '../../store/useAppStore';

interface ShotCardProps {
  shot: Shot;
  index: number;
  storyboardId: string;
  partId: string;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: '#6b728020', color: '#6b7280', label: 'مسودة' },
  ready:     { bg: '#eab30820', color: '#eab308', label: 'جاهز' },
  filmed:    { bg: '#3b82f620', color: '#3b82f6', label: 'مصوّر' },
  completed: { bg: '#22c55e20', color: '#22c55e', label: 'مكتمل' },
};

export default function ShotCard({ shot, storyboardId, partId, onEdit, onDelete }: ShotCardProps) {
  const { updateShot } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const status = STATUS_STYLES[shot.status] || STATUS_STYLES.draft;

  // Toggle completion
  const toggleCompleted = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateShot(storyboardId, partId, shot.id, { isCompleted: !shot.isCompleted });
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateShot(storyboardId, partId, shot.id, { referenceImage: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  // Remove image
  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('حذف الصورة المرجعية؟')) {
      updateShot(storyboardId, partId, shot.id, { referenceImage: undefined });
    }
  };

  const isCompleted = !!shot.isCompleted;

  return (
    <div
      className="shot-card"
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        opacity: isCompleted ? 0.85 : 1,
        border: isCompleted ? '1px solid rgba(34,197,94,0.4)' : undefined,
        background: isCompleted ? 'rgba(34,197,94,0.04)' : undefined,
        transition: 'all 0.2s',
      }}
    >
      {/* Shot header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Completion checkbox */}
          <button
            onClick={toggleCompleted}
            title={isCompleted ? 'إلغاء الإنجاز' : 'تم التصوير ✓'}
            style={{
              width: '22px', height: '22px', borderRadius: '50%',
              border: isCompleted ? '2px solid #22c55e' : '2px solid var(--border)',
              background: isCompleted ? '#22c55e' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
              color: '#fff', fontSize: '12px', fontWeight: '900',
            }}
          >
            {isCompleted ? '✓' : ''}
          </button>

          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: isCompleted ? '#22c55e' : 'var(--gold)',
            color: '#0A0A0B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '900', flexShrink: 0
          }}>
            {shot.number}
          </div>
          <div style={{
            fontSize: '13px', fontWeight: '700',
            color: isCompleted ? '#22c55e' : 'var(--text-primary)',
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}>
            {shot.title}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {shot.voiceNote && (
            <span title="يوجد ملاحظة صوتية" style={{ fontSize: '14px' }}>🎙️</span>
          )}
          <span style={{
            fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px',
            background: status.bg, color: status.color, whiteSpace: 'nowrap'
          }}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Reference image area */}
      <div style={{ position: 'relative' }}>
        {shot.referenceImage ? (
          <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <img
              src={shot.referenceImage}
              alt="Reference"
              style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
            />
            {/* Overlay buttons on hover */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', opacity: 0, transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
            >
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  background: 'var(--gold)', color: '#000',
                  border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700'
                }}
              >
                🔄 تغيير
              </button>
              <button
                onClick={removeImage}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  background: 'rgba(239,68,68,0.9)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700'
                }}
              >
                🗑️ حذف
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            style={{
              width: '100%', height: '90px', borderRadius: '8px',
              background: 'var(--bg-hover)',
              border: '2px dashed var(--border)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer', transition: 'all 0.2s',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold-dark)';
              (e.currentTarget as HTMLElement).style.color = 'var(--gold)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
            }}
          >
            <span style={{ fontSize: '22px' }}>🖼️</span>
            <span style={{ fontSize: '10px', fontWeight: '600' }}>اضغط لرفع صورة مرجعية</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
      </div>

      {/* Description */}
      {shot.description && (
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
          {shot.description.slice(0, 80)}{shot.description.length > 80 ? '...' : ''}
        </p>
      )}

      {/* Technical chips */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {shot.camera && <span className="chip" style={{ fontSize: '10px', padding: '2px 6px' }}>📷 {shot.camera}</span>}
        {shot.lens && <span className="chip" style={{ fontSize: '10px', padding: '2px 6px' }}>🔭 {shot.lens}</span>}
        {shot.shotType && <span className="chip" style={{ fontSize: '10px', padding: '2px 6px' }}>{shot.shotType}</span>}
        {shot.cameraMovement && <span className="chip" style={{ fontSize: '10px', padding: '2px 6px' }}>↗ {shot.cameraMovement}</span>}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: '8px', borderTop: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {shot.duration > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: '700' }}>⏱ {shot.duration}ث</span>
          )}
          {isCompleted && (
            <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: '700' }}>✅ تم التصوير</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onEdit}
            style={{
              padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '11px', fontWeight: '600', transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)';
              (e.currentTarget as HTMLElement).style.color = 'var(--gold)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            ✏️ تعديل
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: '4px 8px', borderRadius: '6px',
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.05)',
              color: '#ef4444', cursor: 'pointer', fontSize: '11px'
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
