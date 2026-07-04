"use client";

import { useEffect, useState } from "react";

// نفس نقطة التحوّل المعتمدة في globals.css لكل تنسيقات الجوال (@media max-width: 767px)
// — تُستخدم هنا حين يحتاج مكوّن قراراً حقيقياً في JS (مثل اتجاه التبويبات) لا يمكن
// حسمه بـCSS وحده.
const MOBILE_BREAKPOINT = 767;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- قراءة أولى فورية من matchMedia بعد التركيب على العميل
    setIsMobile(mq.matches);
    const update = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}
