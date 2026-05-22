"use client";

interface KpiCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: string;
  color?: "brand" | "blue" | "green" | "purple" | "amber";
  loading?: boolean;
  delay?: number;
}

const COLORS = {
  brand:  { accent: "var(--brand)",  bg: "var(--brand-muted)", border: "var(--brand-border)", icon: "#fff" },
  blue:   { accent: "var(--bl)",     bg: "var(--bl-bg)",       border: "var(--bl-bor)",       icon: "#fff" },
  green:  { accent: "var(--gr)",     bg: "var(--gr-bg)",       border: "var(--gr-bor)",       icon: "#fff" },
  purple: { accent: "var(--pu)",     bg: "var(--pu-bg)",       border: "var(--pu-bor)",       icon: "#fff" },
  amber:  { accent: "var(--am)",     bg: "var(--am-bg)",       border: "var(--am-bor)",       icon: "#fff" },
};

export default function KpiCard({ title, value, sub, icon, color = "brand", loading, delay = 0 }: KpiCardProps) {
  const c = COLORS[color];

  if (loading) {
    return (
      <div className="card" style={{ padding: 20, animationDelay: `${delay}ms` }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "var(--r)", marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 28, width: "70%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 11, width: "50%" }} />
      </div>
    );
  }

  return (
    <div className="card card-hover" style={{
      padding: 20, position: "relative", overflow: "hidden",
      animationDelay: `${delay}ms`, animation: "fadeUp .45s ease both",
    }}>
      {/* Left accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
        background: c.accent, borderRadius: "var(--r2) 0 0 var(--r2)",
      }} />

      <div style={{ paddingLeft: 8 }}>
        {/* Icon */}
        <div style={{
          width: 38, height: 38,
          background: c.bg, border: `1px solid ${c.border}`,
          borderRadius: "var(--r)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, marginBottom: 14,
        }}>
          {icon}
        </div>

        {/* Value */}
        <div style={{
          fontSize: 26, fontWeight: 800, color: "var(--tx)",
          letterSpacing: "-0.04em", marginBottom: 3, lineHeight: 1,
        }}>
          {value}
        </div>

        {/* Label */}
        <div style={{ fontSize: 12, color: "var(--tx3)", fontWeight: 500 }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--tx4)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}
