// فتح/تنزيل رابط عبر عنصر <a> ديناميكي بدل window.open — نافذة منبثقة عبر
// window.open تُحجب بصمت في أغلب المتصفحات (خصوصاً Safari على الجوال) إن استُدعيت
// بعد أي عملية غير متزامنة (await) سابقة، حتى لو كانت استجابة مباشرة لضغطة
// المستخدم، فيبدو للمستخدم أن التحميل "لا يحدث" بلا أي رسالة خطأ. النقر الوهمي
// على <a> ليس نافذة منبثقة فلا يخضع لهذا الحجب، ويعمل بشكل موثوق للتحميل (السيرفر
// يفرض Content-Disposition: attachment) والفتح في تبويب جديد على حد سواء.
export function openUrl(url: string, newTab = true) {
  const a = document.createElement("a");
  a.href = url;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}
