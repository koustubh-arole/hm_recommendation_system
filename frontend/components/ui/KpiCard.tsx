"use client";

interface KpiCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: string;
  change?: number;
  color?: "gold" | "blue" | "green" | "purple" | "red";
  loading?: boolean;
  delay?: number;
  topColor?: string;
}

const colors = {
  gold: { top: "linear-gradient(90deg,var(--gold),transparent)", ic: "var(--gold-bg)", icBor: "var(--gold-border)", icTx: "var(--gold)" },
  blue: { top: "linear-gradient(90deg,var(--bl),transparent)", ic: "var(--bl-bg)", icBor: "var(--bl-bor)", icTx: "var(--bl)" },
  green: { top: "linear-gradient(90deg,var(--gr),transparent)", ic: "var(--gr-bg)", icBor: "var(--gr-bor)", icTx: "var(--gr)" },
  purple: { top: "linear-gradient(90deg,var(--pu),transparent)", ic: "var(--pu-bg)", icBor: "var(--pu-bor)", icTx: "var(--pu)" },
  red: { top: "linear-gradient(90deg,var(--rd),transparent)", ic: "var(--rd-bg)", icBor: "var(--rd-bor)", icTx: "var(--rd)" },
};

export default function KpiCard({ title, value, sub, icon, change, color = "gold", loading, delay = 0 }: KpiCardProps) {
  const c = colors[color];
  if (loading) return (
    <div style={{ background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r2)", padding: 20, animationDelay: `${delay}ms` }}>
      <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 28, width: "80%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 10, width: "40%" }} />
    </div>
  );

  return (
    <div className="card card-hover card-gold-hover" style={{ padding: 20, position: "relative", overflow: "hidden", animationDelay: `${delay}ms`, animation: "fadeUp .5s ease both" }}>
      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: c.top }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, background: c.ic, border: `1px solid ${c.icBor}`, borderRadius: "var(--r)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          {icon}
        </div>
        {change !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 600, color: change >= 0 ? "var(--gr)" : "var(--rd)" }}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 800, color: "var(--tx)", marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: sub ? 4 : 0 }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--tx4)" }}>{sub}</div>}
    </div>
  );
}
