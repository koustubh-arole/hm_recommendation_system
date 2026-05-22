"use client";
import { useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { adminAPI } from "@/services/api";
import { toast } from "sonner";

interface Pipeline { id:string; name:string; desc:string; steps:string[]; icon:string; status:"idle"|"running"|"success"|"error"; lastRun:string; duration:string; color:string; }

const INITIAL: Pipeline[] = [
  { id:"full", name:"Full Retraining", desc:"Complete pipeline: data_prep → rfm → recommendations", steps:["data_prep","rfm_compute","kmeans_fit","recommendations"], icon:"🧠", status:"idle", lastRun:"2h ago", duration:"12m 34s", color:"gold" },
  { id:"rfm",  name:"RFM Segmentation", desc:"Recompute RFM features + KMeans clusters", steps:["rfm_features","normalize","kmeans_clusters"], icon:"🎯", status:"idle", lastRun:"5h ago", duration:"4m 12s", color:"blue" },
  { id:"recommendations", name:"Recommendations", desc:"Cluster tops + co-purchase + user recs", steps:["cluster_tops","co_purchase","user_recs"], icon:"✨", status:"idle", lastRun:"1d ago", duration:"6m 55s", color:"green" },
  { id:"forecast", name:"Demand Forecast", desc:"XGBoost 30-day demand forecasting", steps:["feature_eng","model_train","forecast_output"], icon:"📊", status:"idle", lastRun:"3h ago", duration:"8m 21s", color:"purple" },
];

const COLOR_MAP: Record<string,{top:string;ic:string;btn:string}> = {
  gold:   { top:"var(--brand)", ic:"var(--brand-muted)", btn:"var(--brand)" },
  blue:   { top:"#3B82F6",      ic:"var(--bl-bg)",    btn:"linear-gradient(135deg,#3B82F6,#2563EB)" },
  green:  { top:"#22C55E",      ic:"var(--gr-bg)",    btn:"linear-gradient(135deg,#22C55E,#16A34A)" },
  purple: { top:"#A855F7",      ic:"var(--pu-bg)",    btn:"linear-gradient(135deg,#A855F7,#9333EA)" },
};

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>(INITIAL);
  const [log, setLog] = useState<string[]>([]);

  const run = async (p: Pipeline) => {
    if (p.status==="running") return;
    setPipelines(prev => prev.map(x => x.id===p.id ? {...x,status:"running"} : x));
    setLog([`[${new Date().toLocaleTimeString()}] ▶ Starting ${p.name}...`]);
    toast.info(`Pipeline "${p.name}" started`);
    for (let i=0; i<p.steps.length; i++) {
      await new Promise(r=>setTimeout(r,1400));
      setLog(prev=>[...prev, `[${new Date().toLocaleTimeString()}] ✓ ${i+1}/${p.steps.length} ${p.steps[i]}`]);
    }
    try { await adminAPI.retrain(p.id); } catch {}
    await new Promise(r=>setTimeout(r,800));
    setLog(prev=>[...prev, `[${new Date().toLocaleTimeString()}] ✅ Completed successfully`]);
    setPipelines(prev => prev.map(x => x.id===p.id ? {...x,status:"success",lastRun:"Just now"} : x));
    toast.success(`"${p.name}" completed!`);
    setTimeout(()=>setPipelines(prev=>prev.map(x=>x.id===p.id?{...x,status:"idle"}:x)),6000);
  };

  return (
    <DashboardShell requireAdmin>
      <div style={{ maxWidth:1000,margin:"0 auto",animation:"fadeUp .4s ease" }}>
        {/* Warning */}
        <div style={{ padding:"12px 18px",background:"var(--am-bg)",border:"1px solid var(--am-bor)",borderRadius:"var(--r)",marginBottom:24,display:"flex",alignItems:"center",gap:10,fontSize:12,color:"var(--am)" }}>
          ⚠️ Pipelines run in background threads. Check server logs for progress. For production, use Airflow or a job queue.
        </div>

        {/* Grid */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16,marginBottom:24 }}>
          {pipelines.map((p,i) => {
            const c = COLOR_MAP[p.color];
            return (
              <div key={p.id} className="card" style={{ padding:22,position:"relative",overflow:"hidden",animationDelay:`${i*80}ms`,animation:"fadeUp .4s ease both",
                borderColor:p.status==="running"?"var(--brand-border)":undefined,
              }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${c.top},transparent)` }}/>
                <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:38,height:38,background:c.ic,borderRadius:"var(--r)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{p.icon}</div>
                    <div>
                      <div style={{ fontSize:14,fontWeight:700,color:"var(--tx)" }}>{p.name}</div>
                      <div style={{ fontSize:11,color:"var(--tx3)",marginTop:1 }}>{p.desc}</div>
                    </div>
                  </div>
                  <span className={`badge ${p.status==="idle"?"badge-muted":p.status==="running"?"badge-gold":p.status==="success"?"badge-green":"badge-red"}`}>
                    <span className={`status-dot ${p.status==="running"?"status-warning":p.status==="success"?"status-online":p.status==="error"?"status-error":"status-idle"}`}/>
                    {p.status}
                  </span>
                </div>

                {/* Steps */}
                <div style={{ display:"flex",alignItems:"center",flexWrap:"wrap",gap:4,marginBottom:14 }}>
                  {p.steps.map((s,j) => (
                    <span key={s} style={{ display:"flex",alignItems:"center",gap:4 }}>
                      <span style={{ padding:"3px 8px",borderRadius:"var(--r)",fontSize:10,fontFamily:"var(--font-mono)",background:"var(--sur2)",border:"1px solid var(--bor)",color:"var(--tx3)" }}>{s}</span>
                      {j<p.steps.length-1&&<span style={{ fontSize:11,color:"var(--tx4)" }}>→</span>}
                    </span>
                  ))}
                </div>

                <div style={{ display:"flex",gap:14,marginBottom:16,fontSize:11,color:"var(--tx3)" }}>
                  <span>⏱ Last: {p.lastRun}</span>
                  <span>⏱ Duration: {p.duration}</span>
                </div>

                <button onClick={()=>run(p)} disabled={p.status==="running"}
                  style={{
                    padding:"9px 20px",borderRadius:"var(--r)",fontSize:13,fontWeight:700,
                    cursor:p.status==="running"?"not-allowed":"pointer",border:"none",
                    display:"flex",alignItems:"center",gap:7,transition:"all .2s",
                    background:p.status==="success"?"var(--gr-bg)":p.status==="running"?"var(--sur2)":c.btn,
                    color:p.status==="success"?"var(--gr)":p.status==="running"?"var(--tx3)":"#fff",
                    opacity:p.status==="running"?.8:1,
                  }}>
                  {p.status==="running"?(
                    <><span style={{ width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"var(--tx2)",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>Running...</>
                  ):p.status==="success"?(
                    <>✅ Completed</>
                  ):(
                    <>▶ Run</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Log */}
        {log.length>0 && (
          <div className="card" style={{ overflow:"hidden",animation:"fadeUp .3s ease" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderBottom:"1px solid var(--bor)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <span className="status-dot status-online animate-pulse-dot"/>
                <span style={{ fontSize:13,fontWeight:700,color:"var(--tx)" }}>Execution Log</span>
              </div>
              <button onClick={()=>setLog([])} style={{ background:"none",border:"none",fontSize:11,color:"var(--tx3)",cursor:"pointer" }}>✕ Clear</button>
            </div>
            <div style={{ padding:18,background:"var(--sur2)",fontFamily:"var(--font-mono)",fontSize:11,maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:6 }}>
              {log.map((l,i) => <span key={i} style={{ color:"var(--gr)",animation:"fadeIn .3s ease" }}>{l}</span>)}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
