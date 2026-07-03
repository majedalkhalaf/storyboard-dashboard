import type { SectionProps } from "./EasySections";

export default function LocationsSection({ theme }: SectionProps) {
  return (
    <div style={{ width: "100%", height: "100%", background: theme.bg, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <p style={{ fontSize: 14, color: theme.muted }}>قسم «المواقع» قيد الإنشاء.</p>
    </div>
  );
}
