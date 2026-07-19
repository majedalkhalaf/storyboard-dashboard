'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function LogoutButton({ style }: { style?: React.CSSProperties }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
        background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer',
        fontSize: '12px', fontWeight: '600', fontFamily: 'inherit',
        ...style,
      }}
    >
      ⏻ تسجيل الخروج
    </button>
  );
}
