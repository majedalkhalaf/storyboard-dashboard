import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import type { Metadata } from "next";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { fetchBookletData } from "@/app/lib/booklet-data-server";
import { BOOKLET_SECTIONS } from "@/app/lib/booklet-sections";
import { getPresentationTheme } from "@/app/lib/presentation-themes";
import type { ProjectBooklet } from "@/app/lib/types";
import BookletShareViewer from "./BookletShareViewer";

export const dynamic = "force-dynamic";

// عنوان الصفحة باسم المشروع — يُستخدم كاقتراح افتراضي لاسم الملف عند حفظ هذه
// الصفحة كـ PDF من متصفح العميل (Ctrl+P → حفظ كـ PDF).
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: bookletRow } = await admin
    .from("project_booklets")
    .select("project_id, company_id")
    .eq("share_token", token)
    .eq("share_enabled", true)
    .maybeSingle();
  if (!bookletRow) return {};
  const { data: project } = await admin.from("projects").select("name").eq("id", bookletRow.project_id).maybeSingle();
  return { title: project?.name ? `${project.name} — كتيّب المشروع` : "كتيّب المشروع" };
}

// نفس present/[token]/page.tsx تماماً (عميل service_role + مطابقة صريحة لـ
// share_token/share_enabled بدل سياسة RLS عامة) لكن لجدول project_booklets.
export default async function PublicBookletPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: bookletRow } = await admin.from("project_booklets").select("*").eq("share_token", token).eq("share_enabled", true).maybeSingle();

  if (!bookletRow) notFound();
  const booklet = bookletRow as ProjectBooklet;

  const data = await fetchBookletData(admin, booklet.company_id, booklet.project_id);
  if (!data) notFound();

  const theme = getPresentationTheme(booklet.template, data);
  const ordered = booklet.sections.filter((s) => s.enabled && BOOKLET_SECTIONS.some((def) => def.key === s.key)).map((s) => s.key);

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const forwardedProto = headersList.get("x-forwarded-proto");
  const proto = forwardedProto ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const shareUrl = `${proto}://${host}/booklet/${token}`;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 240 });

  return <BookletShareViewer data={data} texts={booklet.texts} theme={theme} ordered={ordered} qrDataUrl={qrDataUrl} />;
}
