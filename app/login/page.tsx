'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase/client';
import { AuthShell, Field } from '../components/auth/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnconfirmed(false);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      if (signInError.code === 'email_not_confirmed' || signInError.message.includes('Email not confirmed')) {
        setUnconfirmed(true);
      } else if (signInError.message.includes('Invalid login credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else {
        setError(signInError.message);
      }
      return;
    }

    router.push('/');
    router.refresh();
  };

  const handleResend = async () => {
    const supabase = createClient();
    await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setResent(true);
  };

  return (
    <AuthShell>
      <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px', textAlign: 'center' }}>
        تسجيل الدخول
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>
        مرحباً بعودتك إلى منصة الإنتاج
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Field label="البريد الإلكتروني">
          <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" required />
        </Field>
        <Field label="كلمة المرور">
          <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" dir="ltr" required />
        </Field>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '12px' }}>
            {error}
          </div>
        )}

        {unconfirmed && (
          <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308', fontSize: '12px', lineHeight: '1.7' }}>
            بريدك الإلكتروني غير مُفعّل بعد. تحقق من صندوق الوارد لتفعيل حسابك.
            <button
              type="button"
              onClick={handleResend}
              disabled={resent}
              style={{ display: 'block', marginTop: '8px', background: 'none', border: 'none', color: '#eab308', fontWeight: '700', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}
            >
              {resent ? '✓ تم إعادة إرسال رابط التفعيل' : 'إعادة إرسال رابط التفعيل'}
            </button>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}>
          {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
        </button>
      </form>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
        ليس لديك حساب؟{' '}
        <Link href="/signup" style={{ color: 'var(--gold)', fontWeight: '700' }}>إنشاء حساب جديد</Link>
      </p>
    </AuthShell>
  );
}
