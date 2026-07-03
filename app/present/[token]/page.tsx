import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { fetchPresentationData } from "@/app/lib/presentation-data-server";
import { PRESENTATION_SECTIONS } from "@/app/lib/presentation-sections";
import { PRESENTATION_THEMES } from "@/app/lib/presentation-themes";
import type { ProjectPresentation } from "@/app/lib/types";
import PresentationShareViewer from "./PresentationShareViewer";

export const dynamic = "force-dynamic";

// صفحة مشاركة عامة بالكامل — بلا تسجيل دخول وبلا أي علاقة بـ(internal)/AppShell. المطابقة
// تتم صراحةً في الكود (share_token + share_enabled=true) عبر عميل service_role، وليس عبر
// سياسة RLS عامة (راجع التعليق في supabase/migrations/0014_project_presentations.sql — سياسة
// عامة كهذه كانت ستسمح بقراءة كل عروض كل الشركات عبر مفتاح anon بلا تصفية توكن حقيقية).
export default async function PublicPresentationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: presentationRow } = await admin
    .from("project_presentations")
    .select("*")
    .eq("share_token", token)
    .eq("share_enabled", true)
    .maybeSingle();

  if (!presentationRow) notFound();
  const presentation = presentationRow as ProjectPresentation;

  const data = await fetchPresentationData(admin, presentation.company_id, presentation.project_id);
  if (!data) notFound();

  const theme = PRESENTATION_THEMES[presentation.template];
  const ordered = presentation.sections
    .filter((s) => s.enabled && PRESENTATION_SECTIONS.some((def) => def.key === s.key))
    .map((s) => s.key);

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const forwardedProto = headersList.get("x-forwarded-proto");
  const proto = forwardedProto ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const shareUrl = `${proto}://${host}/present/${token}`;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 240 });

  return <PresentationShareViewer data={data} texts={presentation.texts} theme={theme} ordered={ordered} qrDataUrl={qrDataUrl} />;
}
