import { type NextRequest } from "next/server";
import { updateSession } from "@/app/lib/supabase/middleware";

// اسم middleware.ts أصبح proxy.ts في Next.js 16 (الدالة المُصدَّرة أيضاً proxy)
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
