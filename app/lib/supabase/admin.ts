import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// عميل بصلاحية service_role — يتجاوز RLS بالكامل. استخدام على السيرفر فقط
// (Route Handlers / Server Actions)، ولا يُستورد أبداً في أي ملف "use client".
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY غير مضبوط في متغيرات البيئة");
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
