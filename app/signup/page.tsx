'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../lib/supabase/client';
import { UserRole } from '../lib/types';
import { AuthShell, Field } from '../components/auth/AuthShell';

function translateError(message: string): string {
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'هذا البريد الإلكتروني مسجل مسبقاً. جرّب تسجيل الدخول بدلاً من ذلك.';
  }
  if (message.includes('Password should be at least')) {
    return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
  }
  if (message.includes('Unable to validate email') || message.includes('invalid')) {
    return 'صيغة البريد الإلكتروني غير صحيحة.';
  }
  return message;
}

export default function SignupPage() {
  const [role, setRole] = useState<UserRole>('company');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (role === 'company' && !companyName.trim()) {
      setError('يرجى إدخال اسم الشركة.');
      return;
    }
    if (!fullName.trim()) {
      setError(role === 'company' ? 'يرجى إدخال اسم المسؤول.' : 'يرجى إدخال الاسم الكامل.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          role,
          full_name: fullName.trim(),
          company_name: role === 'company' ? companyName.trim() : null,
          cr_number: role === 'company' ? crNumber.trim() || null : null,
          phone: phone.trim() || null,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(translateError(signUpError.message));
      return;
    }
    setSentTo(email.trim());
  };

  const handleResend = async () => {
    const supabase = createClient();
    await supabase.auth.resend({ type: 'signup', email: sentTo });
    setResent(true);
  };

  if (sentTo) {
    return (
      <AuthShell>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>📧</div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px' }}>
            تحقق من بريدك الإلكتروني
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '6px' }}>
            أرسلنا رابط تفعيل إلى
          </p>
          <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--gold)', marginBottom: '18px' }}>{sentTo}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '20px' }}>
            افتح الرابط لتفعيل حسابك وتسجيل الدخول. لن تتمكن من الدخول قبل تأكيد البريد.
          </p>
          <button
            onClick={handleResend}
            disabled={resent}
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
          >
            {resent ? '✓ تم إعادة الإرسال' : 'إعادة إرسال رابط التفعيل'}
          </button>
          <Link href="/login" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            العودة لتسجيل الدخول
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px', textAlign: 'center' }}>
        إنشاء حساب جديد
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '22px' }}>
        اختر نوع الحساب للبدء
      </p>

      {/* Role segmented toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
        <RoleCard
          icon="🏢"
          title="شركة / مكتب إنتاج"
          desc="لإدارة مشاريعك وفريقك بالكامل"
          selected={role === 'company'}
          onClick={() => setRole('company')}
        />
        <RoleCard
          icon="👤"
          title="عميل"
          desc="لمتابعة مشاريعك الخاصة فقط"
          selected={role === 'client'}
          onClick={() => setRole('client')}
        />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {role === 'company' ? (
          <>
            <Field label="اسم الشركة *">
              <input className="input-field" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="مثال: استوديو الإبداع للإنتاج" />
            </Field>
            <Field label="اسم المسؤول *">
              <input className="input-field" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="اسمك الكامل" />
            </Field>
            <Field label="رقم السجل التجاري (اختياري)">
              <input className="input-field" value={crNumber} onChange={e => setCrNumber(e.target.value)} placeholder="1234567890" />
            </Field>
          </>
        ) : (
          <Field label="الاسم الكامل *">
            <input className="input-field" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="اسمك الكامل" />
          </Field>
        )}

        <Field label="رقم الهاتف">
          <input className="input-field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" />
        </Field>
        <Field label="البريد الإلكتروني *">
          <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" required />
        </Field>
        <Field label="كلمة المرور *">
          <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" dir="ltr" required />
        </Field>
        <Field label="تأكيد كلمة المرور *">
          <input className="input-field" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="أعد كتابة كلمة المرور" dir="ltr" required />
        </Field>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '12px' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}>
          {loading ? 'جارٍ الإنشاء...' : `إنشاء حساب ${role === 'company' ? 'الشركة' : 'العميل'}`}
        </button>
      </form>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
        لديك حساب بالفعل؟{' '}
        <Link href="/login" style={{ color: 'var(--gold)', fontWeight: '700' }}>تسجيل الدخول</Link>
      </p>
    </AuthShell>
  );
}

function RoleCard({ icon, title, desc, selected, onClick }: {
  icon: string; title: string; desc: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '16px 12px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
        border: selected ? '2px solid var(--gold)' : '2px solid var(--border)',
        background: selected ? 'rgba(201,168,76,0.1)' : 'var(--bg-secondary)',
        transition: 'all 0.15s', fontFamily: 'inherit',
      }}
    >
      <div style={{ fontSize: '26px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '13px', fontWeight: '800', color: selected ? 'var(--gold)' : 'var(--text-primary)', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{desc}</div>
    </button>
  );
}

