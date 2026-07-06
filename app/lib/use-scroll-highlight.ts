"use client";

import { useEffect, useState } from "react";

// يُستخدم للانتقال المباشر من إشعار إلى مكان ملاحظة/طلب تعديل بعينه داخل قائمة
// طويلة — يمرّر الصفحة للعنصر صاحب المعرّف `${prefix}-${targetId}` ويُبقيه
// "مميَّزاً" لثوانٍ قليلة (المستدعي يستخدم القيمة المُعادة لتلوين ذلك العنصر فقط).
export function useScrollHighlight(targetId: string | null | undefined, prefix: string): string | null {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId) return;
    const el = document.getElementById(`${prefix}-${targetId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تمييز مؤقت رد فعل على عنصر DOM خارجي (scrollIntoView)، لا يمكن اشتقاقه أثناء العرض
    setHighlightedId(targetId);
    const timer = setTimeout(() => setHighlightedId(null), 2500);
    return () => clearTimeout(timer);
  }, [targetId, prefix]);

  return highlightedId;
}
