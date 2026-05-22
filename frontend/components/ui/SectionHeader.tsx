interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--tx)", marginBottom: subtitle ? 3 : 0 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 11, color: "var(--tx3)" }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
