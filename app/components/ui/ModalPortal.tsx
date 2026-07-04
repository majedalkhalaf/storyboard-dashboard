"use client";

import { createPortal } from "react-dom";

// يُركّب أي نافذة منبثقة مباشرة داخل <body> بدل مكانها الطبيعي في شجرة DOM.
// السبب: أي عنصر أب يملك transform (مثل حالة hover على بطاقات .shot-card)
// يُنشئ "containing block" جديداً لعناصر position:fixed داخله، فتنحصر النافذة
// المنبثقة (وتُقصّ إن كان الأب overflow:hidden أيضاً) داخل حدود ذلك الأب
// الصغيرة بدل تغطية الشاشة كاملة — وهذا ما يجعلها تبدو "غير ثابتة ولا يمكن
// التحكم فيها". التركيب المباشر في <body> يمنع هذه المشكلة نهائياً بغضّ النظر
// عن أي تنسيق لأي عنصر أب. آمن بلا أي حارس SSR لأن كل نوافذ هذا التطبيق تُركَّب
// فقط بعد تفاعل من المستخدم (state تبدأ false)، أي بعد اكتمال الترطيب دائماً.
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
