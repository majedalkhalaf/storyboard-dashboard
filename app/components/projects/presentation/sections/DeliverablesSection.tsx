import type { SectionProps } from "./EasySections";

export default function DeliverablesSection({ theme }: SectionProps) {
  return (
    <div style={{ width: "100%", height: "100%", background: theme.bg, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <p style={{ fontSize: 14, color: theme.muted }}>قسم «المخرجات النهائية» قيد الإنشاء.</p>
    </div>
  );
}
