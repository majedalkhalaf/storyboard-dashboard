// شارة شعار الشركة فوق أغلفة المشاريع/الحلقات — بحجم واضح لكنها لا تحجب
// الصورة، بخلفية شبه شفافة داكنة تضمن وضوح الشعار على أي صورة غلاف.
export default function CoverLogoBadge({ logoUrl, name, position = "bottom-start" }: { logoUrl: string | null | undefined; name: string; position?: "bottom-start" | "top-end" }) {
  if (!logoUrl) return null;
  const posStyle = position === "top-end" ? { top: 10, insetInlineEnd: 10 } : { bottom: 10, insetInlineStart: 10 };
  return (
    <span
      style={{
        position: "absolute",
        ...posStyle,
        background: "rgba(0,0,0,0.55)",
        borderRadius: 10,
        padding: "6px 10px",
        display: "flex",
        alignItems: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={name} style={{ height: 26, maxWidth: 110, width: "auto", objectFit: "contain" }} />
    </span>
  );
}
