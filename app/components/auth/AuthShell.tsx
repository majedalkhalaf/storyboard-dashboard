export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '24px',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #A07830, #C9A84C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: '900', color: '#0A0A0B'
          }}>S</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.2' }}>Storyboard</div>
            <div style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: '600', letterSpacing: '0.1em' }}>PRODUCTION</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
