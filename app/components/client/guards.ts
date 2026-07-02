import { redirect } from "next/navigation";
import { getCurrentSession, type CurrentSession } from "@/app/lib/supabase/session";

// حارس مشترك لكل صفحات بوابة العميل (Server Components فقط).
// - يعيد التوجيه إلى /login إن لم توجد جلسة.
// - يعيد التوجيه إلى /dashboard إن كان المستخدم داخلياً (ليس عميلاً).
// - يفرض تغيير كلمة المرور عند أول دخول (إلا إذا مُرِّر enforcePassword:false،
//   وهو ما تستخدمه صفحة تغيير كلمة المرور نفسها كي تبقى قابلة للوصول دائماً).
export async function requireClient(opts?: { enforcePassword?: boolean }): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "client") redirect("/dashboard");
  if (opts?.enforcePassword !== false && session.profile.must_change_password) {
    redirect("/client/change-password");
  }
  return session;
}
