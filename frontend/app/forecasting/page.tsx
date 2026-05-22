"use client";
import { useState, useEffect, useMemo } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { adminAPI } from "@/services/api";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ForecastKPIs {
  articles_forecasted: number;
  total_predicted_demand: number;
  daily_avg_per_article: number;
  horizon_days: number;
}
interface TopArticle {
  article_id: string;
  product_name: string;
  product_group_name: string;
  total_predicted: number;
  daily_avg?: number;
}
interface DayPoint  { date: string; total_demand?: number; demand?: number; }
interface ArtOption { article_id: string; product_name: string; product_group_name: string; }
interface ForecastData {
  kpis: ForecastKPIs;
  top30: TopArticle[];
  top7:  TopArticle[];
  daily_demand:    DayPoint[];
  article_options: ArtOption[];
  article_daily:   Record<string, DayPoint[]>;
}

// ─── Garment group → short label + color ─────────────────────────────────────
const GROUP_META: Record<string, { short: string; color: string }> = {
  "Garment Lower body": { short: "Lower body",  color: "#3B82F6" },
  "Garment Upper body": { short: "Upper body",  color: "#8B5CF6" },
  "Garment Full body":  { short: "Full body",   color: "#EC4899" },
  "Socks & Tights":     { short: "Socks",       color: "#F97316" },
  "Underwear":          { short: "Underwear",   color: "#06B6D4" },
  "Accessories":        { short: "Accessories", color: "#D97706" },
  "Nightwear":          { short: "Nightwear",   color: "#6366F1" },
  "Swimwear":           { short: "Swimwear",    color: "#22C55E" },
  "Shoes":              { short: "Shoes",       color: "#EF4444" },
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--bor2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "var(--shadow)" }}>
      <p style={{ fontWeight: 700, color: "var(--tx)", marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--tx2)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          {p.name}: <span style={{ color: "var(--tx)", fontWeight: 700 }}>{Number(p.value).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Top-Articles table ───────────────────────────────────────────────────────
function TopTable({ title, items, loading }: { title: string; items: TopArticle[]; loading: boolean }) {
  const max = items[0]?.total_predicted ?? 1;
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)", marginBottom: 14 }}>
        {title}
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 260, borderRadius: "var(--r)" }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => {
            const meta  = GROUP_META[item.product_group_name] ?? { short: item.product_group_name || "—", color: "#94A3B8" };
            const pct   = Math.round((item.total_predicted / max) * 100);
            return (
              <div key={item.article_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 22, textAlign: "center", fontSize: 11, fontWeight: 700,
                  color: i === 0 ? "var(--brand)" : i < 3 ? "var(--tx2)" : "var(--tx4)", flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.product_name}
                  </div>
                  <div style={{ marginTop: 3, height: 4, borderRadius: 2, background: "var(--sur2)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: meta.color, borderRadius: 2, transition: "width .4s ease" }} />
                  </div>
                </div>
                <div style={{
                  padding: "2px 8px", borderRadius: 12, fontSize: 9, fontWeight: 700, flexShrink: 0,
                  background: `${meta.color}18`, border: `1px solid ${meta.color}40`, color: meta.color,
                }}>
                  {meta.short}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)", flexShrink: 0, minWidth: 48, textAlign: "right" }}>
                  {item.total_predicted.toLocaleString("en-IN")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ForecastingPage() {
  const [data,    setData]    = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [artSearch,  setArtSearch]  = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.forecast();
      setData(res as ForecastData);
    } catch {
      setError("Could not load forecast data. Make sure the backend is running.");
      toast.error("Forecast load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const kpis     = data?.kpis;
  const top30    = data?.top30    ?? [];
  const top7     = data?.top7     ?? [];
  const allDaily = data?.daily_demand ?? [];

  const chartData = useMemo(() => {
    if (!selectedId || !data) return allDaily.map(d => ({ date: d.date, demand: d.total_demand }));
    const pts = data.article_daily[selectedId] ?? [];
    return pts.map(d => ({ date: d.date, demand: d.demand }));
  }, [selectedId, data, allDaily]);

  const selectedMeta = useMemo(() =>
    data?.article_options.find(a => a.article_id === selectedId),
    [selectedId, data]
  );

  const filteredOptions = useMemo(() => {
    if (!data) return [];
    const q = artSearch.toLowerCase();
    return q
      ? data.article_options.filter(a => a.product_name.toLowerCase().includes(q) || a.article_id.includes(q))
      : data.article_options;
  }, [artSearch, data]);

  return (
    <DashboardShell requireAdmin>
      <div style={{ maxWidth: 1100, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* ── Status bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {([
            ["📅", "Horizon",  `${kpis?.horizon_days ?? "—"} days`],
            ["🤖", "Model",    "XGBoost"],
            ["📦", "Articles", kpis ? kpis.articles_forecasted.toLocaleString("en-IN") : "—"],
          ] as [string, string, string][]).map(([ic, l, v]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r)", fontSize: 12 }}>
              <span>{ic}</span>
              <span style={{ color: "var(--tx3)" }}>{l}:</span>
              <span style={{ color: "var(--tx)", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div className="live-pill"><span className="status-dot status-online animate-pulse-dot" />Live</div>
          <div style={{ flex: 1 }} />
          <button onClick={load} disabled={loading} className="btn-primary"
            style={{ padding: "8px 18px", fontSize: 12, borderRadius: "var(--r)", display: "flex", alignItems: "center", gap: 7 }}>
            {loading
              ? <><span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />Loading...</>
              : "🔄 Refresh"}
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background: "var(--rd-bg)", border: "1px solid var(--rd-bor)", borderRadius: "var(--r2)", padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "var(--rd)" }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── KPI cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
          {([
            ["📦", "Articles Forecasted",    kpis ? kpis.articles_forecasted.toLocaleString("en-IN") : "—", ""],
            ["📊", "Total Predicted Demand", kpis ? kpis.total_predicted_demand.toLocaleString("en-IN") + " units" : "—", `${kpis?.horizon_days ?? 30}-day window`],
            ["📈", "Avg Daily / Article",    kpis ? kpis.daily_avg_per_article + " units" : "—", "across all articles"],
            ["🗓",  "Forecast Horizon",       kpis ? kpis.horizon_days + " days" : "—", ""],
          ] as [string, string, string, string][]).map(([ic, l, v, s]) => (
            <div key={l} className="card card-hover" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: "var(--brand)", borderRadius: "var(--r2) 0 0 var(--r2)" }} />
              {loading
                ? <div className="skeleton" style={{ height: 80, borderRadius: "var(--r)" }} />
                : <>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>{ic}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--tx)", marginBottom: 2 }}>{v}</div>
                  <div style={{ fontSize: 11, color: "var(--tx3)" }}>{l}</div>
                  {s && <div style={{ fontSize: 10, color: "var(--gr)", marginTop: 3, fontWeight: 600 }}>{s}</div>}
                </>
              }
            </div>
          ))}
        </div>

        {/* ── Forecast chart with article selector ── */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)", marginBottom: 3 }}>
                {selectedId && selectedMeta
                  ? `📦 ${selectedMeta.product_name}`
                  : "📊 Total Forecasted Daily Demand — All Articles"}
              </div>
              <div style={{ fontSize: 11, color: "var(--tx3)" }}>
                {selectedId && selectedMeta
                  ? `${selectedMeta.product_group_name} · Article ${selectedId}`
                  : "Aggregated 30-day XGBoost forecast across all 500 articles"}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 260 }}>
              <input
                value={artSearch}
                onChange={e => setArtSearch(e.target.value)}
                placeholder="Search article name or ID..."
                style={{
                  background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r)",
                  padding: "6px 10px", fontSize: 11, color: "var(--tx)", outline: "none",
                  fontFamily: "var(--font)",
                }}
              />
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setArtSearch(""); }}
                style={{
                  background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r)",
                  padding: "7px 10px", fontSize: 11, color: "var(--tx)", outline: "none", cursor: "pointer",
                  fontFamily: "var(--font)",
                }}
              >
                <option value="">All Articles (Aggregated)</option>
                {filteredOptions.map(a => (
                  <option key={a.article_id} value={a.article_id}>
                    {a.product_name} ({a.article_id})
                  </option>
                ))}
              </select>
              {selectedId && (
                <button onClick={() => { setSelectedId(""); setArtSearch(""); }}
                  style={{ fontSize: 10, color: "var(--tx3)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  ← Back to all articles
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 280, borderRadius: "var(--r)" }} />
          ) : chartData.length === 0 ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--tx3)", fontSize: 13 }}>
              No data for this article
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="gBrand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#CC0000" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#CC0000" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bor)" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--tx3)", fontSize: 11 }} interval={4} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--tx4)", fontSize: 11 }} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="demand" stroke="#CC0000" strokeWidth={2.5}
                  fill="url(#gBrand)" dot={false} activeDot={{ r: 4, fill: "#CC0000" }}
                  name={selectedId ? "Units / day" : "Total demand"} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Top 7-Day and Top 30-Day side by side ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <TopTable title="🔥 Top 10 — Next 7 Days"  items={top7}  loading={loading} />
          <TopTable title="📅 Top 10 — Full 30 Days" items={top30} loading={loading} />
        </div>

        {/* ── Bar chart: top 10 by 30-day demand ── */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)", marginBottom: 4 }}>
            📊 Top 10 by 30-Day Demand — Bar View
          </div>
          <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 18 }}>Units forecasted over the full 30-day window</div>
          {loading ? (
            <div className="skeleton" style={{ height: 300, borderRadius: "var(--r)" }} />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top30} layout="vertical" margin={{ left: 0, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bor)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "var(--tx3)", fontSize: 11 }} />
                <YAxis type="category" dataKey="product_name" axisLine={false} tickLine={false}
                  tick={{ fill: "var(--tx2)", fontSize: 11 }} width={180} />
                <Tooltip
                  contentStyle={{ background: "var(--bg2)", border: "1px solid var(--bor2)", borderRadius: 10, fontSize: 12 }}
                  formatter={(v: unknown) => [Number(v).toLocaleString("en-IN"), "units"]}
                />
                <Bar dataKey="total_predicted" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Predicted Units" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Files + status ── */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)", marginBottom: 14 }}>📁 Forecast Files</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {([["forecast_output.csv", "0.6 MB"], ["forecast_summary.csv", "28 KB"]] as [string, string][]).map(([n, s]) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--sur2)", borderRadius: "var(--r)", border: "1px solid var(--bor)" }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</div>
                  <div style={{ fontSize: 10, color: "var(--tx4)", marginTop: 1 }}>data/processed/{n}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--tx3)", flexShrink: 0 }}>{s}</div>
              </div>
            ))}
          </div>
          {data && !loading && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.2)", borderRadius: "var(--r)", fontSize: 11, color: "var(--gr)", display: "flex", alignItems: "center", gap: 8 }}>
              ✅ Live data from <code style={{ fontFamily: "monospace", background: "rgba(15,23,42,.06)", padding: "1px 6px", borderRadius: 4, color: "var(--tx2)" }}>/api/admin/forecast</code>
              · {kpis?.articles_forecasted} articles · {kpis?.horizon_days}-day horizon
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}
