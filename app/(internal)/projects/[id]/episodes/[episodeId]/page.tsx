import { redirect } from "next/navigation";

// صفحة الحلقة المستقلة استُبدلت بتبديل داخل نفس صفحة المشروع (بدون تنقّل) —
// هذا المسار يبقى فقط لإعادة التوجيه للروابط القديمة (إشعارات، بحث، ملاحظات...).
export default async function EpisodeDetailRedirect({ params }: { params: Promise<{ id: string; episodeId: string }> }) {
  const { id, episodeId } = await params;
  redirect(`/projects/${id}?episode=${episodeId}`);
}
