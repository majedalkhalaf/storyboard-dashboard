'use client';

import { Shot } from '../../lib/types';

interface ShotCardProps {
  shot: Shot;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: '#6b728020', color: '#6b7280', label: 'مسودة' },
  ready: { bg: '#eab30820', color: '#eab308', label: 'جاهز' },
  filmed: { bg: '#3b82f620', color: '#3b82f6', label: 'مصوّر' },
  completed: { bg: '#22c55e20', color: '#22c55e', label: 'مكتمل' },
};

export default function ShotCard({ shot, index, onEdit, onDelete }: ShotCardProps) {
  const status = STATUS_STYLES[shot.status] || STATUS_STYLES.draft;

  return (
    <div className="shot-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Shot header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'var(--gold)', color: '#0A0A0B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '900', flexShrink: 0
          }}>
            {shot.number}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{shot.title}</div>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px',
          background: status.bg, color: status.color, whiteSpace: 'nowrap'
        }}>
          {status.label}
        </span>
      </div>

      {/* Reference image placeholder */}
      <div style={{
        height: '90px', borderRadius: '6px',
        background: shot.referenceImage ? `url(${shot.referenceImage}) center/cover` : 'var(--bg-hover)',
        border: '1px solid var(--border)',
        display: shot.referenceImage ? 'block' : 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: '24px'
      }}>
        {!shot.referenceImage && '🎬'}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {shot.duration && (
            <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: '700' }}>⏱ {shot.duration}ث</span>
          )}
          {shot.timeOfDay && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🌤 {shot.timeOfDay}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onEdit} style={{
            padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)',
            background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px',
            fontWeight: '600', transition: 'all 0.15s'
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)'; (e.currentTarget as HTMLElement).style.color = 'var(--gold)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}>
            ✏️ تعديل
          </button>
          <button onClick={onDelete} style={{
            padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer', fontSize: '11px'
          }}>✕</button>
        </div>
      </div>
    </div>
  );
}
