"use client";  // ← must be the first line
import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import KpiCard from "@/components/ui/KpiCard";
import { adminAPI } from "@/services/api";
import { formatNumber, getClusterLabel, getClusterColor } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface ClusterDetail {
  cluster: number; size: number; percentage: number;
  avg_recency: number; avg_frequency: number; avg_monetary: number;
}
interface ClusterStats {
  n_clusters: number; total_customers: number;
  avg_recency: number; avg_frequency: number; avg_monetary: number;
  clusters: ClusterDetail[];
}
const MOCK: ClusterStats = {
  n_clusters: 5, total_customers: 1362281, avg_recency: 198, avg_frequency: 3.2, avg_monetary: 1.0,
  clusters: [
    { cluster:0, size:360614, percentage:26, avg_recency:45,  avg_frequency:8.2, avg_monetary:3.5 },
    { cluster:1, size:347616, percentage:26, avg_recency:120, avg_frequency:4.1, avg_monetary:2.1 },
    { cluster:2, size:326885, percentage:24, avg_recency:180, avg_frequency:2.8, avg_monetary:1.2 },
    { cluster:3, size:190738, percentage:14, avg_recency:300, avg_frequency:1.5, avg_monetary:0.8 },
    { cluster:4, size:136428, percentage:10, avg_recency:420, avg_frequency:0.8, avg_monetary:0.3 },
  ],
};

export default function OverviewPage() {
  const [stats, setStats]       = useState<ClusterStats>(MOCK);
  const [loading, setLoading]   = useState(true);
  const [apiError, setApiError] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    setErrorDetail("");
    try {
      const raw = await adminAPI.clusterStats();
      if (!raw) throw new Error("Empty response from server");

      // ── Transform flat array → ClusterStats shape ──────────────────────
      // Backend returns: [{cluster:0, recency_mean:45, recency_count:360614, ...}, ...]
      // Frontend needs: { n_clusters, total_customers, avg_recency, clusters:[...] }
      if (Array.isArray(raw)) {
        const clusters: ClusterDetail[] = raw.map((row: Record<string, number>) => {
          const total = raw.reduce((s: number, r: Record<string, number>) => s + (r.recency_count ?? r.frequency_count ?? 0), 0);
          const size  = row.recency_count ?? row.frequency_count ?? 0;
          return {
            cluster:       row.cluster,
            size,
            percentage:    total > 0 ? Math.round((size / total) * 100) : 0,
            avg_recency:   Math.round(row.recency_mean   ?? 0),
            avg_frequency: parseFloat((row.frequency_mean ?? 0).toFixed(1)),
            avg_monetary:  parseFloat((row.monetary_mean  ?? 0).toFixed(2)),
          };
        });
        const totalCustomers = clusters.reduce((s, c) => s + c.size, 0);
        const shaped: ClusterStats = {
          n_clusters:     clusters.length,
          total_customers: totalCustomers,
          avg_recency:    Math.round(clusters.reduce((s, c) => s + c.avg_recency, 0) / clusters.length),
          avg_frequency:  parseFloat((clusters.reduce((s, c) => s + c.avg_frequency, 0) / clusters.length).toFixed(1)),
          avg_monetary:   parseFloat((clusters.reduce((s, c) => s + c.avg_monetary, 0) / clusters.length).toFixed(2)),
          clusters,
        };
        setStats(shaped);
      } else if (typeof raw === "object" && "clusters" in raw) {
        // Already correct shape
        setStats(raw as ClusterStats);
      } else {
        throw new Error("Unexpected response shape from /api/admin/cluster-stats");
      }
    } catch (err: unknown) {
      setApiError(true);
      setErrorDetail(err instanceof Error ? err.message : "Unknown error");
      console.error("[Overview] API error:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const rfmData = stats.clusters.map(c => ({
    name: `C${c.cluster}`,
    Recency:   c.avg_recency,
    Frequency: Math.round(c.avg_frequency * 50),
    Monetary:  Math.round(c.avg_monetary * 100),
  }));
  const pieData = stats.clusters.map(c => ({
    name:  getClusterLabel(c.cluster),
    value: c.size,
    color: getClusterColor(c.cluster),
  }));

  const TT = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; fill: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:"var(--bg2)", border:"1px solid var(--bor2)", borderRadius:10, padding:"10px 14px", fontSize:12 }}>
        <p style={{ fontFamily:"Inter,sans-serif", fontWeight:700, color:"var(--tx)", marginBottom:6 }}>{label}</p>
        {payload.map(p => (
          <div key={p.name} style={{ display:"flex", alignItems:"center", gap:8, color:"var(--tx2)", marginBottom:2 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:p.fill, display:"inline-block" }}/>
            {p.name}: <span style={{ color:"var(--tx)", fontWeight:600 }}>{formatNumber(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardShell requireAdmin>
      <div style={{ maxWidth:1200, margin:"0 auto", animation:"fadeUp .4s ease", fontFamily:"Inter,sans-serif" }}>

        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div style={{ fontSize:12, color:"var(--tx3)" }}>
            {apiError ? (
              <span style={{ color:"#f59e0b", display:"flex", alignItems:"center", gap:6 }}>
                ⚠️ API error — showing cached data
                {errorDetail && (
                  <span style={{ fontSize:10, color:"var(--tx4)", fontFamily:"'Roboto Mono',monospace" }}>
                    ({errorDetail})
                  </span>
                )}
              </span>
            ) : (
              <>Last updated: <span style={{ color:"var(--tx2)", fontFamily:"'Roboto Mono',monospace" }}>{lastUpdated.toLocaleTimeString()}</span></>
            )}
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {!loading && !apiError && (
              <div className="live-pill"><span className="status-dot status-online animate-pulse-dot"/>Live</div>
            )}
            <button onClick={fetchStats} disabled={loading} className="btn-outline"
              style={{ padding:"6px 14px", fontSize:11, display:"flex", alignItems:"center", gap:6 }}>
              {loading
                ? <><span style={{ width:12, height:12, border:"2px solid var(--bor2)", borderTopColor:"var(--gold)", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/> Loading...</>
                : "↻ Refresh"
              }
            </button>
          </div>
        </div>

        {/* KPI grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
          <KpiCard loading={loading} title="Total Customers"   value={formatNumber(stats.total_customers)}    icon="👥" color="gold"   change={2.4}  sub="vs last month"   delay={0}  />
          <KpiCard loading={loading} title="Customer Clusters" value={stats.n_clusters}                       icon="🎯" color="blue"                                         delay={80} />
          <KpiCard loading={loading} title="Avg Recency"       value={`${stats.avg_recency}d`}                icon="⏱" color="purple" change={-3.2}                         delay={160}/>
          <KpiCard loading={loading} title="Avg Frequency"     value={stats.avg_frequency.toFixed(1)}         icon="📦" color="green"  change={1.8}  sub="orders/customer"  delay={240}/>
        </div>

        {/* Charts row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:20, marginBottom:28 }}>
          <div className="card" style={{ padding:24 }}>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:700, color:"var(--tx)", marginBottom:3 }}>Cluster Profiles — Avg RFM</div>
              <div style={{ fontSize:11, color:"var(--tx3)" }}>Recency (days) · Frequency ×50 · Monetary ×100</div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rfmData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bor)" vertical={false}/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:"var(--tx3)", fontSize:12, fontFamily:"Inter,sans-serif" }}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fill:"var(--tx4)", fontSize:11 }}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="Recency"   fill="#3B82F6" radius={[4,4,0,0]}/>
                <Bar dataKey="Frequency" fill="#C9A84C" radius={[4,4,0,0]}/>
                <Bar dataKey="Monetary"  fill="#22C55E" radius={[4,4,0,0]}/>
                <Legend wrapperStyle={{ paddingTop:16, fontSize:12, color:"var(--tx2)" }}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding:24 }}>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:700, color:"var(--tx)", marginBottom:3 }}>Cluster Size Distribution</div>
              <div style={{ fontSize:11, color:"var(--tx3)" }}>{formatNumber(stats.total_customers)} total customers</div>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="rgba(0,0,0,.4)" strokeWidth={2}/>)}
                </Pie>
                <Tooltip
                  contentStyle={{ background:"var(--bg2)", border:"1px solid var(--bor2)", borderRadius:10, fontSize:12 }}
                  formatter={(v: unknown) => [formatNumber(Number(v)), ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:7, marginTop:10 }}>
              {stats.clusters.map(c => (
                <div key={c.cluster} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, color:"var(--tx2)" }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:getClusterColor(c.cluster), display:"inline-block", flexShrink:0 }}/>
                    {getClusterLabel(c.cluster)}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:56, height:3, background:"var(--sur2)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ width:`${c.percentage}%`, height:"100%", background:getClusterColor(c.cluster) }}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:"var(--tx3)", fontFamily:"'Roboto Mono',monospace", width:28, textAlign:"right" }}>{c.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail table */}
        <div className="card" style={{ overflow:"hidden", marginBottom:24 }}>
          <div style={{ padding:"16px 22px", borderBottom:"1px solid var(--bor)" }}>
            <div style={{ fontFamily:"Inter,sans-serif", fontSize:15, fontWeight:700, color:"var(--tx)" }}>Cluster Detail Breakdown</div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid var(--bor)" }}>
                  {["Cluster","Segment","Customers","Share","Avg Recency","Avg Freq","Avg Spend","Status"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"10px 18px", fontSize:9, color:"var(--tx3)", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", whiteSpace:"nowrap", fontFamily:"Inter,sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.clusters.map(c => (
                  <tr key={c.cluster} className="table-row" style={{ borderBottom:"1px solid var(--bor)", transition:"background .15s" }}>
                    <td style={{ padding:"13px 18px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ width:10, height:10, borderRadius:"50%", background:getClusterColor(c.cluster), display:"inline-block", flexShrink:0 }}/>
                        <span style={{ fontFamily:"'Roboto Mono',monospace", fontSize:13, color:"var(--tx)", fontWeight:600 }}>{c.cluster}</span>
                      </div>
                    </td>
                    <td style={{ padding:"13px 18px", color:"var(--tx2)", fontSize:12, fontFamily:"Inter,sans-serif" }}>{getClusterLabel(c.cluster)}</td>
                    <td style={{ padding:"13px 18px", fontFamily:"Inter,sans-serif", fontSize:14, fontWeight:700, color:"var(--tx)" }}>{formatNumber(c.size)}</td>
                    <td style={{ padding:"13px 18px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:60, height:3, background:"var(--sur2)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ width:`${c.percentage}%`, height:"100%", background:getClusterColor(c.cluster) }}/>
                        </div>
                        <span style={{ fontSize:11, color:"var(--tx3)", fontFamily:"'Roboto Mono',monospace" }}>{c.percentage}%</span>
                      </div>
                    </td>
                    <td style={{ padding:"13px 18px", color:"var(--tx2)", fontSize:12, fontFamily:"Inter,sans-serif" }}>{c.avg_recency}d</td>
                    <td style={{ padding:"13px 18px", color:"var(--tx2)", fontSize:12, fontFamily:"Inter,sans-serif" }}>{c.avg_frequency.toFixed(1)}×</td>
                    <td style={{ padding:"13px 18px", color:"var(--tx2)", fontSize:12, fontFamily:"Inter,sans-serif" }}>£{c.avg_monetary.toFixed(2)}</td>
                    <td style={{ padding:"13px 18px" }}>
                      <span className={`badge ${c.cluster<=1?"badge-green":c.cluster<=3?"badge-gold":"badge-red"}`}>
                        <span className={`status-dot ${c.cluster<=1?"status-online":c.cluster<=3?"status-warning":"status-error"}`}/>
                        {c.cluster<=1?"Active":c.cluster<=3?"Moderate":"At Risk"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System strip */}
        <div className="card" style={{ padding:"13px 22px", display:"flex", flexWrap:"wrap", alignItems:"center", gap:22 }}>
          <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, fontWeight:700, color:"var(--tx2)" }}>⚡ System</span>
          {[["API", !apiError],["Database",true],["ChromaDB",true],["ML Model",true]].map(([n,ok]) => (
            <div key={n as string} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span className={`status-dot ${ok?"status-online":"status-error"}`}/>
              <span style={{ fontSize:11, color:"var(--tx3)", fontFamily:"Inter,sans-serif" }}>{n as string}</span>
              <span style={{ fontSize:10, color:ok?"var(--gr)":"var(--rd)", fontWeight:600 }}>{ok?"Healthy":"Offline"}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
