// علامة مائية اختيارية (شعار الشركة) فوق الفيديو/الصورة المعروضة في بوابة
// العميل — طبقة عرض فقط (overlay) غير قابلة للنقر أو التحديد، لا تُغيّر بايتات
// الملف نفسه. تفعيلها/إلغاؤها من إعدادات هوية الشركة (client_portal_watermark_enabled).
export default function MediaWatermark({ logoUrl }: { logoUrl: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        padding: "3%",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 2,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt=""
        draggable={false}
        style={{
          maxWidth: "22%",
          maxHeight: "20%",
          opacity: 0.55,
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
        }}
      />
    </div>
  );
}
