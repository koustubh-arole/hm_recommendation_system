"use client";
import { useEffect, useState, useMemo } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { adminAPI } from "@/services/api";
import { formatNumber, getClusterLabel, getClusterColor } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend,
} from "recharts";

/* ── Types ── */
interface Product {
  rank: number;
  article_id: string;
  product_name: string;
  product_type_name: string;
  purchase_count: number;
  cluster?: number;
  colour?: string;
  brand_group?: string;
  section?: string;
  description?: string;
}
type ClusterRecs = Record<number, Product[]>;

/* ── Helpers ── */
const hexToRgba = (hex: string, a: number) => {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return `rgba(0,0,0,${a})`;
  return `rgba(${m.map((h) => parseInt(h, 16)).join(",")},${a})`;
};

const imgUrl = (id: string) => {
  const clean = id.replace(/^0+/, "").padStart(9, "0");
  const folder = clean.slice(0, 3);
  return `https://lp2.hm.com/hmgoepprod?set=source[/]${folder}/${clean}_main_01.jpg&scale=size[240x]&sink=format[jpg]`;
};

const TYPE_COLORS: Record<string, string> = {
  "Trousers":               "#3B82F6",
  "Garment Lower body":     "#3B82F6",
  "Leggings/Tights":        "#60A5FA",
  "Shorts":                 "#93C5FD",
  "Skirt":                  "#BFDBFE",
  "T-shirt":                "#F59E0B",
  "Vest top":               "#FBBF24",
  "Garment Upper body":     "#F59E0B",
  "Blouse":                 "#FCD34D",
  "Sweater":                "#D97706",
  "Hoodie":                 "#B45309",
  "Dress":                  "#A855F7",
  "Garment Full body":      "#A855F7",
  "Jumpsuit/Playsuit":      "#C084FC",
  "Jacket":                 "#EF4444",
  "Coat":                   "#F87171",
  "Outdoor":                "#FCA5A5",
  "Underwear bottom":       "#22C55E",
  "Underwear Tights":       "#4ADE80",
  "Underwear top":          "#86EFAC",
  "Bra":                    "#6EE7B7",
  "Socks":                  "#F97316",
  "Socks & Tights":         "#F97316",
  "Accessories":            "#06B6D4",
  "Shoes":                  "#EC4899",
  "Bag":                    "#F472B6",
  "Hat/beanie":             "#FB923C",
  "Belt":                   "#FBBF24",
  "Scarf":                  "#34D399",
  "Nightwear":              "#818CF8",
  "Swimwear bottom":        "#2DD4BF",
  "Swimwear top":           "#5EEAD4",
  "Unknown":                "#94A3B8",
};

const typeColor = (t: string): string => {
  if (TYPE_COLORS[t]) return TYPE_COLORS[t];
  const PALETTE = ["#F59E0B","#3B82F6","#A855F7","#EF4444","#22C55E",
                   "#F97316","#06B6D4","#EC4899","#8B5CF6","#10B981"];
  let hash = 0;
  for (let i = 0; i < t.length; i++) hash = t.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

/* ── Cluster insights ── */
const INSIGHTS: Record<number, { title: string; bullets: string[] }> = {
  0: { title: "Champions", bullets: ["Drive 40%+ of revenue — reward with early access", "High affinity for Outerwear & Denim — stock premium lines", "Cross-sell Accessories — low current penetration"] },
  1: { title: "Loyal Customers", bullets: ["Steady buyers — push subscription / loyalty perks", "Strong Upper body preference — feature new tops in emails", "Re-engagement window: <30 days since last purchase"] },
  2: { title: "Potential Loyalists", bullets: ["High Socks & Basics index — great for bundle promos", "Price-sensitive — target with seasonal discount codes", "Likely to upgrade if Jacket selection is promoted"] },
  3: { title: "At-Risk Customers", bullets: ["Haven't purchased in 60+ days — send win-back campaign", "Last category: Dresses — personalise with similar styles", "Offer free returns to reduce re-purchase friction"] },
  4: { title: "Lost Customers", bullets: ["90+ day lapse — aggressive re-activation needed", "Consider sunset or minimal-send strategy", "Survey for exit intent — feed learnings into UX"] },
};

/* ── Mock fallback ── */
const MOCK: ClusterRecs = {
  0: Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1, article_id: `07060160${String(i).padStart(2,"0")}`,
    product_name: "Loading…", product_type_name: "—",
    purchase_count: 10000 - i * 500, cluster: 0,
  })),
};

/* ══════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const [recs, setRecs]       = useState<ClusterRecs>(MOCK);
  const [sel, setSel]         = useState(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [view, setView]       = useState<"list" | "cards">("list");

  useEffect(() => {
    setLoading(true);
    adminAPI.clusterRecs()
      .then((data: unknown) => {
        if (!data) return;
        if (Array.isArray(data)) {
          const grouped = (data as Product[]).reduce<ClusterRecs>((acc, p) => {
            const key = Number(p.cluster ?? 0);
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
          }, {});
          if (Object.keys(grouped).length > 0) setRecs(grouped);
        } else if (typeof data === "object") {
          const grouped: ClusterRecs = {};
          Object.entries(data as Record<string, Product[]>).forEach(([k, v]) => {
            grouped[Number(k)] = v;
          });
          if (Object.keys(grouped).length > 0) setRecs(grouped);
        }
      })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false));
  }, []);

  const items: Product[] = useMemo(
    () => (Array.isArray(recs[sel]) ? recs[sel] : []),
    [recs, sel]
  );

  const chartData = useMemo(() =>
    items.map((p) => ({
      name: (p.product_name?.length ?? 0) > 20 ? p.product_name.slice(0, 20) + "…" : (p.product_name ?? "Unknown"),
      purchases: p.purchase_count ?? 0,
    })), [items]);

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((p) => {
      const t = p.product_type_name || "Unknown";
      counts[t] = (counts[t] || 0) + (p.purchase_count || 0);
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [items]);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    Object.values(recs).forEach(ps => ps.forEach(p => types.add(p.product_type_name || "Unknown")));
    return Array.from(types).slice(0, 7);
  }, [recs]);

  const radarData = useMemo(() =>
    allTypes.map((type) => {
      const entry: Record<string, string | number> = { subject: type };
      Object.entries(recs).forEach(([k, ps]) => {
        const total = ps.reduce((s, p) => s + (p.purchase_count || 0), 0);
        const typeTotal = ps.filter(p => (p.product_type_name || "Unknown") === type)
          .reduce((s, p) => s + (p.purchase_count || 0), 0);
        entry[`c${k}`] = total > 0 ? Math.round((typeTotal / total) * 100) : 0;
      });
      return entry;
    }), [recs, allTypes]);

  const topBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((p) => {
      const b = p.brand_group || p.section || "General";
      if (b) counts[b] = (counts[b] || 0) + (p.purchase_count || 0);
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [items]);

  const clusterKeys = Object.keys(recs).map(Number).sort();
  const RADAR_COLORS = ["#D97706","#3B82F6","#22C55E","#A855F7","#EF4444"];
  const insight = INSIGHTS[sel] ?? INSIGHTS[0];

  return (
    <DashboardShell requireAdmin>
      <div style={{ maxWidth: 1280, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* ── Error banner ── */}
        {apiError && (
          <div style={{ padding:"10px 16px", marginBottom:16, background:"var(--am-bg)", border:"1px solid var(--am-bor)", borderRadius:"var(--r)", fontSize:12, color:"var(--am)" }}>
            ⚠️ API unreachable — showing mock data. Make sure FastAPI is running on port 8000.
          </div>
        )}

        {/* ── Loading bar ── */}
        {loading && (
          <div style={{ height:2, background:"var(--sur2)", borderRadius:2, marginBottom:20, overflow:"hidden" }}>
            <div style={{ height:"100%", width:"60%", background:"var(--brand)", borderRadius:2, animation:"shimmer 1.4s infinite" }}/>
          </div>
        )}

        {/* ── Page header ── */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:"var(--tx)", marginBottom:4 }}>
            Recommendation Analytics
          </h1>
          <p style={{ fontSize:12, color:"var(--tx3)" }}>
            Top products per customer segment · {Object.values(recs).flat().length.toLocaleString()} total records
          </p>
        </div>

        {/* ── Cluster tabs ── */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:24 }}>
          {clusterKeys.map((c) => (
            <button key={c} onClick={() => setSel(c)} style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"8px 16px", borderRadius:"var(--r)", fontSize:12, fontWeight:700,
              cursor:"pointer", border:"1px solid",
              transition:"all .2s",
              background: sel===c ? hexToRgba(getClusterColor(c), 0.10) : "var(--sur)",
              borderColor: sel===c ? getClusterColor(c) : "var(--bor)",
              color: sel===c ? getClusterColor(c) : "var(--tx3)",
            }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:getClusterColor(c), display:"inline-block" }}/>
              {getClusterLabel(c)}
            </button>
          ))}
        </div>

        {/* ══ ROW 1: Product list/cards + Bar chart ══ */}
        <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20, marginBottom:20 }}>

          {/* Product panel */}
          <div className="card" style={{ overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"16px 18px", borderBottom:"1px solid var(--bor)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--tx)" }}>
                  Cluster {sel} — Top {items.length}
                </div>
                <div style={{ fontSize:11, color:"var(--tx3)", marginTop:2 }}>{getClusterLabel(sel)}</div>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                {(["list","cards"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} style={{
                    padding:"4px 10px", fontSize:10, fontWeight:600, borderRadius:6, cursor:"pointer", border:"1px solid",
                    background: view===v ? "var(--brand-muted)" : "var(--sur2)",
                    borderColor: view===v ? "var(--brand-border)" : "var(--bor)",
                    color: view===v ? "var(--brand)" : "var(--tx3)",
                  }}>{v === "list" ? "≡ List" : "⊞ Cards"}</button>
                ))}
              </div>
            </div>

            {items.length === 0 ? (
              <div style={{ padding:32, textAlign:"center", color:"var(--tx3)", fontSize:12 }}>
                {loading ? "Loading…" : "No data for this cluster"}
              </div>
            ) : view === "list" ? (
              <div style={{ overflowY:"auto", maxHeight:520 }}>
                {items.map((p, i) => (
                  <div key={p.article_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 18px", borderBottom:"1px solid var(--bor)", transition:"background .15s", cursor:"default" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background="var(--sur2)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background="transparent"}>
                    <div style={{ width:26, height:26, borderRadius:"var(--r)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0,
                      background: i===0 ? "var(--brand)" : "var(--sur2)",
                      color: i===0 ? "#fff" : "var(--tx3)", border:`1px solid ${i===0?"var(--brand-border)":"var(--bor)"}` }}>
                      {i===0 ? "★" : p.rank}
                    </div>
                    <img src={imgUrl(p.article_id)} alt="" width={36} height={36}
                      style={{ borderRadius:6, objectFit:"cover", background:"var(--sur2)", flexShrink:0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"var(--tx)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {p.product_name ?? "—"}
                      </div>
                      <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:10,
                          background: hexToRgba(typeColor(p.product_type_name), 0.12),
                          border:`1px solid ${hexToRgba(typeColor(p.product_type_name), 0.3)}`,
                          color: typeColor(p.product_type_name) }}>
                          {p.product_type_name || "—"}
                        </span>
                        {p.colour && (
                          <span style={{ fontSize:9, color:"var(--tx3)", padding:"1px 6px", borderRadius:10, background:"var(--sur2)", border:"1px solid var(--bor)" }}>
                            {p.colour}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:"var(--tx2)", flexShrink:0, fontWeight:600 }}>
                      {formatNumber(p.purchase_count ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, overflowY:"auto", maxHeight:520 }}>
                {items.map((p, i) => (
                  <div key={p.article_id} style={{ background:"var(--sur2)", border:"1px solid var(--bor)", borderRadius:10, overflow:"hidden", transition:"all .2s", cursor:"default" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="var(--bor2)"; el.style.transform="translateY(-2px)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="var(--bor)"; el.style.transform="none"; }}>
                    <div style={{ position:"relative", height:90, background:"var(--sur2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <img src={imgUrl(p.article_id)} alt={p.product_name}
                        style={{ width:"100%", height:"100%", objectFit:"cover" }}
                        onError={e => { (e.target as HTMLImageElement).src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23F8FAFC'/%3E%3Ctext x='50%25' y='50%25' fill='%2394A3B8' text-anchor='middle' dy='.3em' font-size='24'%3E%F0%9F%91%95%3C/text%3E%3C/svg%3E"; }} />
                      {i===0 && <div style={{ position:"absolute", top:6, right:6, fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:8, background:"var(--brand)", color:"#fff" }}>★ #1</div>}
                    </div>
                    <div style={{ padding:"8px 10px" }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--tx)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>
                        {p.product_name ?? "—"}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:8,
                          background: hexToRgba(typeColor(p.product_type_name), 0.15),
                          color: typeColor(p.product_type_name) }}>
                          {(p.product_type_name || "—").split(" ").slice(-1)[0]}
                        </span>
                        <span style={{ fontSize:10, color:"var(--tx2)", fontWeight:600 }}>
                          {formatNumber(p.purchase_count ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bar chart */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--tx)", marginBottom:4 }}>Purchase Distribution</div>
            <div style={{ fontSize:11, color:"var(--tx3)", marginBottom:18 }}>Top products by purchase count — Cluster {sel}</div>
            {chartData.length === 0 ? (
              <div className="skeleton" style={{ height:340 }}/>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={chartData} layout="vertical" margin={{ left:0, right:24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bor)" horizontal={false}/>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill:"var(--tx3)", fontSize:11 }}/>
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill:"var(--tx2)", fontSize:11 }} width={160}/>
                  <Tooltip
                    contentStyle={{ background:"var(--bg2)", border:"1px solid var(--bor2)", borderRadius:10, fontSize:12 }}
                    formatter={(v: unknown) => [formatNumber(Number(v)), "purchases"]}/>
                  <Bar dataKey="purchases" fill={getClusterColor(sel)} radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ══ ROW 2: Type breakdown pie + Top brands + Radar ══ */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 220px 1fr", gap:20, marginBottom:20 }}>

          {/* Pie */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--tx)", marginBottom:4 }}>Product Type Mix</div>
            <div style={{ fontSize:11, color:"var(--tx3)", marginBottom:12 }}>Category share by purchase volume — Cluster {sel}</div>
            {typeBreakdown.length === 0 ? (
              <div className="skeleton" style={{ height:200 }}/>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {typeBreakdown.map((entry, index) => (
                      <Cell key={index} fill={typeColor(entry.name)} opacity={0.85}/>
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background:"var(--bg2)", border:"1px solid var(--bor2)", borderRadius:10, fontSize:12 }}
                    formatter={(v: unknown) => [formatNumber(Number(v)), "purchases"]}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11, color:"var(--tx2)" }}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top sections */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--tx)", marginBottom:4 }}>Top Sections</div>
            <div style={{ fontSize:10, color:"var(--tx3)", marginBottom:14 }}>By purchase volume</div>
            {topBrands.length === 0 ? (
              <div style={{ color:"var(--tx3)", fontSize:12 }}>No section data</div>
            ) : topBrands.map(([name, count], i) => {
              const max = topBrands[0][1];
              const pct = Math.round((count / max) * 100);
              return (
                <div key={name} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, color:"var(--tx2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"70%" }}>{name || "General"}</span>
                    <span style={{ fontSize:10, color:"var(--tx3)" }}>{formatNumber(count)}</span>
                  </div>
                  <div style={{ height:4, background:"var(--sur2)", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, borderRadius:2,
                      background: i===0 ? "var(--brand)" : i===1 ? "#3B82F6" : "var(--tx4)",
                      transition:"width .6s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Radar */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--tx)", marginBottom:4 }}>Category Affinity Radar</div>
            <div style={{ fontSize:11, color:"var(--tx3)", marginBottom:12 }}>Type preference (% of purchases) across all segments</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--bor)"/>
                <PolarAngleAxis dataKey="subject" tick={{ fill:"var(--tx2)", fontSize:10 }}/>
                <PolarRadiusAxis tick={false} axisLine={false}/>
                {clusterKeys.map((c, i) => (
                  <Radar key={c} name={getClusterLabel(c)} dataKey={`c${c}`}
                    stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                    fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                    fillOpacity={sel===c ? 0.2 : 0.05}
                    strokeWidth={sel===c ? 2 : 1}/>
                ))}
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexWrap:"wrap", gap:12, justifyContent:"center", marginTop:6 }}>
              {clusterKeys.map((c, i) => (
                <div key={c} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color: sel===c ? "var(--tx)" : "var(--tx3)" }}>
                  <span style={{ width:10, height:3, borderRadius:2, background:RADAR_COLORS[i % RADAR_COLORS.length], display:"inline-block" }}/>
                  {getClusterLabel(c)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ ROW 3: Insights panel ══ */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:20 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:"var(--am-bg)", border:"1px solid var(--am-bor)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
              💡
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--am)", marginBottom:2 }}>
                Insights — {insight.title}
              </div>
              <div style={{ fontSize:11, color:"var(--tx3)", marginBottom:14 }}>
                Actionable recommendations based on Cluster {sel} purchase behaviour
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:10 }}>
                {insight.bullets.map((b, i) => (
                  <div key={i} style={{ display:"flex", gap:10, padding:"10px 14px", background:"var(--sur2)", borderRadius:"var(--r)", border:"1px solid var(--bor)" }}>
                    <span style={{ color:"var(--am)", fontSize:14, flexShrink:0, marginTop:1 }}>→</span>
                    <span style={{ fontSize:12, color:"var(--tx2)", lineHeight:1.6 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
