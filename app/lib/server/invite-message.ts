// بناء نص رسالة الدعوة الموحّد — يُستخدم من مسار الإرسال الأول ومسار إعادة
// الإرسال معاً، بدل تكرار نفس المنطق في مكانين قد ينحرفان عن بعض بمرور الوقت.
export function buildInviteMessage(params: {
  clientName: string;
  projectName: string;
  loginUrl: string;
  email: string;
  tempPassword: string | null;
  hasExistingAccount: boolean;
  customMessage?: string | null;
  companyName?: string | null;
}): string {
  const { clientName, projectName, loginUrl, email, tempPassword, hasExistingAccount, customMessage, companyName } = params;
  const via = companyName ? `فريق ${companyName}` : "نظام إدارة الإنتاج";
  if (hasExistingAccount || !tempPassword) {
    return [
      `مرحباً ${clientName}،`,
      `تمت إضافتك لمتابعة مشروع "${projectName}" عبر ${via}.`,
      ...(customMessage ? [``, customMessage] : []),
      ``,
      `رابط الدخول: ${loginUrl}`,
      `البريد الإلكتروني: ${email}`,
      ...(hasExistingAccount ? [`استخدم كلمة المرور الحالية لحسابك لديك.`] : []),
    ].join("\n");
  }
  return [
    `مرحباً ${clientName}،`,
    `تمت دعوتك لمتابعة مشروع "${projectName}" عبر ${via}.`,
    ...(customMessage ? [``, customMessage] : []),
    ``,
    `رابط الدخول: ${loginUrl}`,
    `البريد الإلكتروني: ${email}`,
    `كلمة المرور المؤقتة: ${tempPassword}`,
    ``,
    `سيُطلب منك تعيين كلمة مرور جديدة عند أول تسجيل دخول.`,
  ].join("\n");
}
