"use client";

// ── Generic block skeleton ─────────────────────────────────────────────────
export function SkeletonBlock({ w = "100%", h = 16, radius = 6 }: { w?: string | number; h?: number; radius?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: radius }} />;
}

// ── KPI card skeleton ──────────────────────────────────────────────────────
export function KpiSkeleton() {
  return (
    <div style={{ background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r2)", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <SkeletonBlock w={38} h={38} radius={8} />
        <SkeletonBlock w={40} h={14} />
      </div>
      <SkeletonBlock w="65%" h={28} radius={6} />
      <div style={{ marginTop: 8 }}><SkeletonBlock w="45%" h={12} /></div>
    </div>
  );
}

// ── Product card skeleton ──────────────────────────────────────────────────
export function ProductSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 50}ms`, animation: "fadeUp .4s ease both" }}>
          <SkeletonBlock h={220} radius={14} />
          <div style={{ background: "var(--sur)", border: "1px solid var(--bor)", borderTop: "none", borderRadius: "0 0 14px 14px", padding: "14px 16px 16px" }}>
            <SkeletonBlock w="50%" h={10} />
            <div style={{ marginTop: 8 }}><SkeletonBlock w="85%" h={14} /></div>
            <div style={{ marginTop: 6 }}><SkeletonBlock w="40%" h={10} /></div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SkeletonBlock w={48} h={18} />
              <SkeletonBlock w={72} h={32} radius={8} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Table row skeletons ────────────────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ borderBottom: "1px solid var(--bor)" }}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} style={{ padding: "13px 18px" }}>
              <SkeletonBlock w={j === 0 ? 32 : j === cols - 1 ? 60 : `${60 + (j * 15)}%`} h={12} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Chart skeleton ─────────────────────────────────────────────────────────
export function ChartSkeleton({ h = 260 }: { h?: number }) {
  return (
    <div style={{ position: "relative", height: h, display: "flex", alignItems: "flex-end", gap: 6, padding: "0 8px" }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="skeleton" style={{
          flex: 1,
          height: `${30 + Math.sin(i * 0.8) * 30 + Math.random() * 40}%`,
          borderRadius: "4px 4px 0 0",
          animationDelay: `${i * 80}ms`,
        }} />
      ))}
    </div>
  );
}

// ── Full page loader ───────────────────────────────────────────────────────
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 16 }}>
      <div style={{
        width: 36, height: 36,
        border: "2px solid var(--bor2)",
        borderTopColor: "var(--gold)",
        borderRadius: "50%",
        animation: "spin .7s linear infinite",
      }} />
      <p style={{ fontSize: 12, color: "var(--tx3)", letterSpacing: 1 }}>{message}</p>
    </div>
  );
}

// ── Inline spinner ─────────────────────────────────────────────────────────
export function Spinner({ size = 16, color = "var(--gold)" }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: "inline-block",
      width: size, height: size,
      border: `2px solid ${color}22`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "spin .7s linear infinite",
      flexShrink: 0,
    }} />
  );
}
