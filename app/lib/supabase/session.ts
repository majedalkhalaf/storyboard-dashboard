import { createClient } from "@/app/lib/supabase/server";
import type { Company, Profile } from "@/app/lib/types";

export interface CurrentSession {
  userId: string;
  email: string | null;
  profile: Profile;
  company: Company | null;
}

// يُستدعى فقط من Server Components / Route Handlers
export async function getCurrentSession(): Promise<CurrentSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;

  let company: Company | null = null;
  if (profile.company_id) {
    const { data } = await supabase.from("companies").select("*").eq("id", profile.company_id).single();
    company = data ?? null;
  }

  return { userId: user.id, email: user.email ?? null, profile, company };
}
