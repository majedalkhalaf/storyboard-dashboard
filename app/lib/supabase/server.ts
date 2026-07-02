import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ملاحظة: Next.js 16 يتطلب await على cookies() دائماً (Async Request APIs)
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // يُستدعى من Server Component أحياناً حيث لا يمكن تعديل الكوكيز —
            // آمن التجاهل إذا كان middleware/proxy يحدّث الجلسة بالفعل
          }
        },
      },
    }
  );
}
