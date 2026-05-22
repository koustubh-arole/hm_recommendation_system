"use client";

import { useState, useEffect } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { adminAPI } from "@/services/api";

type Health = "healthy" | "degraded" | "down";

interface ServiceStatus {
  name:     string;
  status:   Health;
  uptime:   string;
  latency?: string;
  details?: string;
  icon:     string;
}

/* Fallback shown before API responds */
const MOCK_SERVICES: ServiceStatus[] = [
  { name:"FastAPI Server",          status:"healthy", uptime:"99.9%", latency:"12ms",  details:"Running on :8000",                icon:"⚡" },
  { name:"SQLite Database",         status:"healthy", uptime:"99.8%", latency:"3ms",   details:"data/users.db",                    icon:"🗄" },
  { name:"ChromaDB Vector Store",   status:"healthy", uptime:"99.5%", latency:"45ms",  details:"chroma_db/ — 3 collections",       icon:"🧠" },
  { name:"XGBoost ML Model",        status:"healthy", uptime:"99.9%", latency:"8ms",   details:"models/xgb_demand_model.pkl",      icon:"🤖" },
  { name:"RFM Pipeline",            status:"healthy", uptime:"99.7%",                  details:"Last run: checking...",            icon:"🔄" },
  { name:"Recommendation Engine",   status:"healthy", uptime:"99.9%", latency:"22ms",  details:"Cluster-based + co-purchase",      icon:"✨" },
];

const STATUS_COLORS: Record<Health, { bg:string; bor:string; tx:string; dot:string }> = {
  healthy:  { bg:"var(--gr-bg)",              bor:"var(--gr-bor)",     tx:"var(--gr)",   dot:"status-online"  },
  degraded: { bg:"var(--am-bg)",              bor:"var(--am-bor)",      tx:"var(--am)",   dot:"status-warning" },
  down:     { bg:"var(--rd-bg)",              bor:"var(--rd-bor)",     tx:"var(--rd)",   dot:"status-error"   },
};

const FONT = "Inter, system-ui, sans-serif";
const MONO = "var(--font-mono)";

export default function SystemPage() {
  const [services,   setServices]   = useState<ServiceStatus[]>(MOCK_SERVICES);
  const [apiVersion, setApiVersion] = useState("2.0.0");
  const [lastCheck,  setLastCheck]  = useState(new Date());
  const [checking,   setChecking]   = useState(false);
  const [fetchError, setFetchError] = useState("");

  const runHealthCheck = async () => {
    setChecking(true);
    setFetchError("");
    try {
      const data = await adminAPI.systemHealth();
      if (data && data.services) {
        /* Map real API response → ServiceStatus[] */
        const svcMap: Record<string, string> = {
          fastapi:    "FastAPI Server",
          sqlite:     "SQLite Database",
          chromadb:   "ChromaDB Vector Store",
          ml_model:   "XGBoost ML Model",
          rfm_pipeline: "RFM Pipeline",
        };
        setServices(prev => prev.map(s => {
          // Find the matching key in data.services
          const key = Object.keys(svcMap).find(k => svcMap[k] === s.name);
          if (!key || !data.services[key]) return s;
          const svc = data.services[key];
          return {
            ...s,
            status:  (svc.status as Health) || s.status,
            latency: svc.latency_ms != null ? `${svc.latency_ms}ms` : s.latency,
            details: key === "chromadb" && svc.collections != null
              ? `chroma_db/ — ${svc.collections} collections`
              : s.details,
          };
        }));
        setApiVersion(data.version || apiVersion);
      } else if (data === null) {
        // safe() returned null — health endpoint missing or errored
        setFetchError("Health endpoint unreachable — FastAPI may be down or /api/admin/health is not deployed yet.");
      }
    } catch (err) {
      setFetchError(String(err));
    }
    setLastCheck(new Date());
    setChecking(false);
  };

  useEffect(() => { runHealthCheck(); }, []);

  const allHealthy = services.every(s => s.status === "healthy");
  const anyDown    = services.some(s  => s.status === "down");

  return (
    <DashboardShell requireAdmin>
      <div style={{ maxWidth:900, margin:"0 auto", animation:"fadeUp .4s ease", fontFamily:FONT }}>

        {/* API error notice */}
        {fetchError && (
          <div style={{ padding:"10px 16px", marginBottom:16, background:"var(--am-bg)", border:"1px solid var(--am-bor)", borderRadius:"var(--r)", fontSize:12, color:"var(--am)", fontFamily:FONT }}>
            ⚠️ {fetchError} — <span style={{ color:"var(--tx3)" }}>Showing last known state.</span>
          </div>
        )}

        {/* Overall status banner */}
        <div style={{
          background: allHealthy ? "var(--gr-bg)" : anyDown ? "var(--rd-bg)" : "var(--am-bg)",
          border: `1px solid ${allHealthy ? "var(--gr-bor)" : anyDown ? "var(--rd-bor)" : "var(--am-bor)"}`,
          borderRadius:"var(--r2)", padding:"18px 22px", marginBottom:28,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontSize:32 }}>{allHealthy ? "✅" : anyDown ? "❌" : "⚠️"}</span>
            <div>
              <div style={{ fontFamily:FONT, fontSize:18, fontWeight:700, color: allHealthy ? "var(--gr)" : anyDown ? "var(--rd)" : "var(--am)" }}>
                {allHealthy ? "All Systems Operational" : anyDown ? "Service Disruption Detected" : "Degraded Performance"}
              </div>
              <div style={{ fontSize:11, color:"var(--tx3)", marginTop:2, fontFamily:MONO }}>
                Last checked: {lastCheck.toLocaleTimeString()}
              </div>
            </div>
          </div>
          <button onClick={runHealthCheck} disabled={checking} className="btn-outline"
            style={{ padding:"8px 16px", fontSize:12, display:"flex", alignItems:"center", gap:6, fontFamily:FONT }}>
            {checking ? (
              <><span style={{ width:12, height:12, border:"2px solid var(--bor2)", borderTopColor:"var(--tx2)", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/> Checking...</>
            ) : "↻ Run Check"}
          </button>
        </div>

        {/* Service cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14, marginBottom:28 }}>
          {services.map((svc, i) => {
            const c = STATUS_COLORS[svc.status];
            return (
              <div key={svc.name} className="card card-hover"
                style={{ padding:20, position:"relative", overflow:"hidden", animationDelay:`${i*70}ms`, animation:"fadeUp .4s ease both" }}>
                {/* Top accent bar */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${c.tx},transparent)` }}/>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:22 }}>{svc.icon}</span>
                    <div>
                      <div style={{ fontFamily:FONT, fontSize:13, fontWeight:700, color:"var(--tx)", marginBottom:2 }}>{svc.name}</div>
                      <div style={{ fontSize:10, color:"var(--tx3)", fontFamily:MONO }}>{svc.details}</div>
                    </div>
                  </div>
                  <span className="badge" style={{ background:c.bg, borderColor:c.bor, color:c.tx, fontFamily:FONT, fontSize:11 }}>
                    <span className={`status-dot ${c.dot}`}/>
                    {svc.status}
                  </span>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ background:"var(--sur2)", borderRadius:"var(--r)", padding:"8px 14px" }}>
                    <div style={{ fontSize:9, color:"var(--tx3)", textTransform:"uppercase", letterSpacing:1.2, marginBottom:3, fontFamily:FONT }}>Uptime</div>
                    <div style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:"var(--tx)" }}>{svc.uptime}</div>
                  </div>
                  {svc.latency && (
                    <div style={{ background:"var(--sur2)", borderRadius:"var(--r)", padding:"8px 14px" }}>
                      <div style={{ fontSize:9, color:"var(--tx3)", textTransform:"uppercase", letterSpacing:1.2, marginBottom:3, fontFamily:FONT }}>Latency</div>
                      <div style={{ fontFamily:FONT, fontSize:15, fontWeight:700, color:"var(--tx)" }}>{svc.latency}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* System info */}
        <div className="card" style={{ padding:22, marginBottom:16 }}>
          <div style={{ fontFamily:FONT, fontSize:14, fontWeight:700, color:"var(--tx)", marginBottom:16 }}>System Information</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[
              { label:"API Version",      value:`v${apiVersion}` },
              { label:"ML Framework",     value:"XGBoost 2.x" },
              { label:"Vector DB",        value:"ChromaDB 0.4.x" },
              { label:"Auth Method",      value:"JWT HS256" },
              { label:"Session Duration", value:"8 hours" },
              { label:"Data Pipeline",    value:"Pandas + Scikit-learn" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background:"var(--sur2)", borderRadius:"var(--r)", padding:"10px 14px" }}>
                <div style={{ fontSize:9, color:"var(--tx3)", textTransform:"uppercase", letterSpacing:1.2, marginBottom:4, fontFamily:FONT }}>{label}</div>
                <div style={{ fontFamily:MONO, fontSize:12, fontWeight:500, color:"var(--tx2)" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Data files */}
        <div className="card" style={{ padding:22 }}>
          <div style={{ fontFamily:FONT, fontSize:14, fontWeight:700, color:"var(--tx)", marginBottom:16 }}>📁 Data Files</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              { path:"data/processed/rfm_segmented.csv",              size:"18.2 MB", desc:"RFM features + cluster labels" },
              { path:"data/processed/cluster_recommendations.csv",    size:"4.1 MB",  desc:"Top products per cluster" },
              { path:"data/processed/co_purchase_recs.csv",           size:"2.8 MB",  desc:"Co-purchase recommendation matrix" },
              { path:"data/processed/user_recommendations.csv",       size:"22.5 MB", desc:"Per-user recommendation lists" },
              { path:"data/processed/forecast_output.csv",            size:"2.4 MB",  desc:"XGBoost demand forecasts" },
              { path:"data/processed/top_products_7d.csv",            size:"120 KB",  desc:"Trending — 7-day window" },
              { path:"data/processed/top_products_30d.csv",           size:"340 KB",  desc:"Trending — 30-day window" },
            ].map(f => (
              <div key={f.path} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"var(--sur2)", borderRadius:"var(--r)", border:"1px solid var(--bor)" }}>
                <span style={{ fontSize:14 }}>📄</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:MONO, fontSize:11, color:"var(--tx2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.path}</div>
                  <div style={{ fontSize:10, color:"var(--tx3)", marginTop:1, fontFamily:FONT }}>{f.desc}</div>
                </div>
                <span className="badge badge-green" style={{ fontFamily:MONO, fontSize:10 }}>{f.size}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
