'use client';

import { useAppStore } from '../../store/useAppStore';
import LogoutButton from '../auth/LogoutButton';
import { Profile } from '../../lib/types';

export default function ClientHome({ profile }: { profile: Profile | null }) {
  const { theme } = useAppStore();

  return (
    <div className={theme === 'light' ? 'light' : ''} style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px clamp(16px, 4vw, 32px)', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #A07830, #C9A84C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '17px', fontWeight: '900', color: '#0A0A0B'
          }}>S</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.2' }}>Storyboard</div>
            <div style={{ fontSize: '9px', color: 'var(--gold)', fontWeight: '600', letterSpacing: '0.1em' }}>PRODUCTION</div>
          </div>
        </div>
        <LogoutButton />
      </header>

      <main style={{ padding: 'clamp(16px, 4vw, 32px)', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>
            مرحباً {profile?.full_name || ''} 👋
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>تابع حالة مشاريعك هنا</p>
        </div>

        <div className="card empty-state">
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
            لا توجد مشاريع مرتبطة بحسابك بعد
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '380px' }}>
            بمجرد أن تربط الشركة مشروعك بحسابك، ستظهر هنا تفاصيله وحالة الإنجاز أولاً بأول.
          </div>
        </div>
      </main>
    </div>
  );
}
