"use client";
import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { authAPI } from "@/services/api";
import { toast } from "sonner";
import type { User } from "@/types";
import { formatDate } from "@/lib/utils";

interface NewUserForm { username:string; email:string; password:string; role:"admin"|"user"; customer_id:string; }
const EMPTY: NewUserForm = { username:"",email:"",password:"",role:"user",customer_id:"" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<NewUserForm>(EMPTY);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number|null>(null);

  const load = async () => {
    setLoading(true);
    try { const d = await authAPI.listUsers(); setUsers(d); }
    catch { toast.error("Failed to load users"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try { await authAPI.deleteUser(id); setUsers(p => p.filter(u => u.id!==id)); toast.success("User deleted"); }
    catch { toast.error("Delete failed"); }
    setDeleting(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username||!form.email||!form.password) { toast.error("Fill all required fields"); return; }
    setSaving(true);
    try {
      await authAPI.register(form as unknown as Record<string,unknown>);
      toast.success(`User "${form.username}" created`);
      setModal(false); setForm(EMPTY); await load();
    } catch (err: unknown) {
      const msg = (err as { response?:{ data?:{ detail?:string } } })?.response?.data?.detail;
      toast.error(msg || "Failed to create user");
    }
    setSaving(false);
  };

  return (
    <DashboardShell requireAdmin>
      <div style={{ maxWidth:1100, margin:"0 auto", animation:"fadeUp .4s ease" }}>
        {/* Controls */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:"var(--tx3)" }}>{users.length} account{users.length!==1?"s":""}</span>
          <div style={{ position:"relative", flex:1, maxWidth:320 }}>
            <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by username or email..."
              style={{ width:"100%",background:"var(--sur)",border:"1px solid var(--bor2)",borderRadius:"var(--r)",padding:"9px 12px 9px 34px",color:"var(--tx)",fontSize:13,fontFamily:"DM Sans,sans-serif",outline:"none" }}
              onFocus={e=>(e.target as HTMLElement).style.borderColor="var(--gold-border2)"}
              onBlur={e=>(e.target as HTMLElement).style.borderColor="var(--bor2)"}
            />
          </div>
          <div style={{ flex:1 }}/>
          <button onClick={()=>setModal(true)} className="btn-gold"
            style={{ padding:"9px 18px",fontSize:13,display:"flex",alignItems:"center",gap:7,borderRadius:"var(--r)" }}>
            ＋ New User
          </button>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid var(--bor)" }}>
                  {["ID","Username","Email","Role","Customer ID","Created","Actions"].map(h => (
                    <th key={h} style={{ textAlign:"left",padding:"10px 18px",fontSize:9,color:"var(--tx3)",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:4}).map((_,i) => (
                  <tr key={i} style={{ borderBottom:"1px solid var(--bor)" }}>
                    {Array.from({length:7}).map((__,j) => <td key={j} style={{ padding:"13px 18px" }}><div className="skeleton" style={{ height:12,width:j===0?32:100 }}/></td>)}
                  </tr>
                )) : filtered.length===0 ? (
                  <tr><td colSpan={7} style={{ padding:"48px 18px",textAlign:"center",color:"var(--tx3)",fontSize:13 }}>No users found</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className="table-row" style={{ borderBottom:"1px solid var(--bor)",transition:"background .15s" }}>
                    <td style={{ padding:"12px 18px",fontFamily:"DM Mono,monospace",fontSize:11,color:"var(--tx4)" }}>{u.id}</td>
                    <td style={{ padding:"12px 18px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,var(--gold),#7A5018)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#000",flexShrink:0 }}>
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight:600,color:"var(--tx)",fontSize:13 }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ padding:"12px 18px",color:"var(--tx2)",fontSize:12 }}>{u.email}</td>
                    <td style={{ padding:"12px 18px" }}>
                      <span className={`badge ${u.role==="admin"?"badge-gold":"badge-blue"}`}>{u.role}</span>
                    </td>
                    <td style={{ padding:"12px 18px",fontFamily:"DM Mono,monospace",fontSize:11,color:"var(--tx3)" }}>{u.customer_id||"—"}</td>
                    <td style={{ padding:"12px 18px",color:"var(--tx3)",fontSize:11 }}>{u.created_at ? formatDate(u.created_at) : "—"}</td>
                    <td style={{ padding:"12px 18px" }}>
                      <button onClick={()=>handleDelete(u.id)} disabled={deleting===u.id}
                        style={{ padding:"6px 12px",borderRadius:"var(--r)",fontSize:11,fontWeight:600,background:"var(--rd-bg)",border:"1px solid var(--rd-bor)",color:"var(--rd)",cursor:"pointer",display:"flex",alignItems:"center",gap:5,opacity:deleting===u.id?.5:1 }}>
                        {deleting===u.id ? <span style={{ width:10,height:10,border:"1px solid var(--rd)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block" }}/> : "🗑"} Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {modal && (
          <div style={{ position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(6,8,14,.8)",backdropFilter:"blur(6px)",animation:"fadeIn .2s ease" }}
            onClick={()=>setModal(false)}>
            <div style={{ background:"var(--bg2)",border:"1px solid var(--bor2)",borderRadius:20,padding:"28px 28px 24px",width:"100%",maxWidth:460,animation:"scaleIn .2s ease",position:"relative" }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22 }}>
                <div style={{ fontFamily:"Syne,sans-serif",fontSize:18,fontWeight:800,color:"var(--tx)" }}>Create New User</div>
                <button onClick={()=>setModal(false)} style={{ background:"none",border:"none",color:"var(--tx3)",fontSize:18,cursor:"pointer",lineHeight:1 }}>✕</button>
              </div>
              <form onSubmit={handleCreate} style={{ display:"flex",flexDirection:"column",gap:14 }}>
                {[{k:"username",l:"Username*",t:"text",p:"johndoe"},{k:"email",l:"Email*",t:"email",p:"john@example.com"},{k:"customer_id",l:"Customer ID",t:"text",p:"00000abc..."}].map(({k,l,t,p}) => (
                  <div key={k}>
                    <label style={{ display:"block",fontSize:10,fontWeight:700,color:"var(--tx2)",textTransform:"uppercase",letterSpacing:1,marginBottom:6 }}>{l}</label>
                    <input type={t} value={(form as unknown as Record<string,string>)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={p}
                      style={{ width:"100%",background:"var(--sur2)",border:"1px solid var(--bor)",borderRadius:"var(--r)",padding:"10px 14px",color:"var(--tx)",fontSize:13,fontFamily:"DM Sans,sans-serif",outline:"none" }}
                      onFocus={e=>(e.target as HTMLElement).style.borderColor="var(--gold-border2)"}
                      onBlur={e=>(e.target as HTMLElement).style.borderColor="var(--bor)"}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display:"block",fontSize:10,fontWeight:700,color:"var(--tx2)",textTransform:"uppercase",letterSpacing:1,marginBottom:6 }}>Password*</label>
                  <div style={{ position:"relative" }}>
                    <input type={showPw?"text":"password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min 8 characters"
                      style={{ width:"100%",background:"var(--sur2)",border:"1px solid var(--bor)",borderRadius:"var(--r)",padding:"10px 40px 10px 14px",color:"var(--tx)",fontSize:13,fontFamily:"DM Sans,sans-serif",outline:"none" }}
                      onFocus={e=>(e.target as HTMLElement).style.borderColor="var(--gold-border2)"}
                      onBlur={e=>(e.target as HTMLElement).style.borderColor="var(--bor)"}
                    />
                    <button type="button" onClick={()=>setShowPw(!showPw)} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--tx3)",cursor:"pointer",fontSize:14 }}>
                      {showPw?"🙈":"👁"}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display:"block",fontSize:10,fontWeight:700,color:"var(--tx2)",textTransform:"uppercase",letterSpacing:1,marginBottom:8 }}>Role</label>
                  <div style={{ display:"flex",gap:10 }}>
                    {(["user","admin"] as const).map(r => (
                      <button key={r} type="button" onClick={()=>setForm(f=>({...f,role:r}))}
                        style={{ flex:1,padding:"10px",borderRadius:"var(--r)",fontSize:13,fontWeight:700,fontFamily:"Syne,sans-serif",cursor:"pointer",border:"1px solid",textTransform:"capitalize",
                          background:form.role===r?(r==="admin"?"linear-gradient(135deg,var(--gold),#9A6C1A)":"var(--bl-bg)"):"var(--sur2)",
                          borderColor:form.role===r?(r==="admin"?"var(--gold-border2)":"var(--bl-bor)"):"var(--bor)",
                          color:form.role===r?(r==="admin"?"#000":"var(--bl)"):"var(--tx3)",
                        }}>
                        {r==="admin"?"⚡ Admin":"👤 User"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex",gap:10,paddingTop:4 }}>
                  <button type="button" onClick={()=>{setModal(false);setForm(EMPTY);}} className="btn-outline"
                    style={{ flex:1,padding:11,fontSize:13,borderRadius:"var(--r)" }}>Cancel</button>
                  <button type="submit" disabled={saving} className="btn-gold"
                    style={{ flex:1,padding:11,fontSize:13,borderRadius:"var(--r)",display:"flex",alignItems:"center",justifyContent:"center",gap:7,opacity:saving?.7:1 }}>
                    {saving?<><span style={{ width:14,height:14,border:"2px solid rgba(0,0,0,.2)",borderTopColor:"#000",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>Creating...</>:"✓ Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
