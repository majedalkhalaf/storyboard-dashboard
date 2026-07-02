// شارة حالة ملوّنة — مكوّن تقديمي بسيط يعمل في Server وClient Components.
export default function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="chip"
      style={{
        background: `${color}1A`,
        borderColor: `${color}55`,
        color,
      }}
    >
      {label}
    </span>
  );
}
