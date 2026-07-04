"use client";

import { useEffect, useState } from "react";

// وتيرة تبديل بطيئة ومتأنية (6-11 ثانية) بدل تمرير مستمر — بحسب طلب صريح
// بجعل التغيّر "سينمائياً راقياً" لا سريعاً أو آلياً.
const MIN_SLIDE_INTERVAL_MS = 6000;
const MAX_SLIDE_INTERVAL_MS = 11000;

// كل خانة تحتفظ بفهرس عشوائي خاص بها ضمن مسبح الوسائط، وتُبدّله في فواصل
// زمنية عشوائية غير متزامنة بين الخانات — بلا أي تمرير أفقي، بحسب طلب صريح
// بتثبيت الشريط مكانه بدل تحريكه، مع إبقاء التغيّر التلقائي بين الصور نفسها.
// يُستخدم في شريطي "الكواليس" و"العمل الجاري" معاً بنفس السلوك.
export function useRandomSlideIndex(poolLength: number, seed: number) {
  const [index, setIndex] = useState(() => (poolLength > 0 ? seed % poolLength : 0));

  useEffect(() => {
    if (poolLength <= 1) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = MIN_SLIDE_INTERVAL_MS + Math.random() * (MAX_SLIDE_INTERVAL_MS - MIN_SLIDE_INTERVAL_MS);
      timer = setTimeout(() => {
        if (cancelled) return;
        setIndex((prev) => {
          let next = Math.floor(Math.random() * poolLength);
          if (next === prev) next = (next + 1) % poolLength;
          return next;
        });
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [poolLength]);

  return poolLength > 0 ? index % poolLength : 0;
}

// حجم موحّد لكل خانات الشريطين معاً — بدل أحجام متفاوتة سابقاً، بحسب طلب
// صريح بأن يكون "حجم الصور كله ثابت وموحد".
export const SLOT_SIZE = { width: 190, height: 148 };
export const SLOT_COUNT = 4;
