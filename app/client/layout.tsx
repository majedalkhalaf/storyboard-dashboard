import { createClient } from "@/app/lib/supabase/server";
import SessionProvider from "@/app/providers/SessionProvider";
import ClientShell from "@/app/components/client/ClientShell";
import { requireClient } from "@/app/components/client/guards";

// تخطيط بوابة العميل. لا نفرض تغيير كلمة المرور هنا (كي تبقى صفحة
// change-password قابلة للوصول)، بل تفرضه كل صفحة محمية على حدة عبر requireClient().
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClient({ enforcePassword: false });

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("theme")
    .eq("user_id", session.userId)
    .maybeSingle();

  return (
    <SessionProvider
      userId={session.userId}
      email={session.email}
      profile={session.profile}
      company={null}
      initialTheme={settings?.theme ?? "dark"}
    >
      <ClientShell>{children}</ClientShell>
    </SessionProvider>
  );
}
