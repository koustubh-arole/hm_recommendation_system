"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useAuthStore from "@/store/authStore";
import api from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [mode, setMode] = useState<"credentials" | "customer">("credentials");
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [cidLoading, setCidLoading] = useState(false);

  const fillDemo = (r: "admin" | "user") => {
    setRole(r);
    setUsername(r === "admin" ? "admin" : "koustubh");
    setPassword(r === "admin" ? "admin123" : "user123");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Please fill in all fields"); return; }
    setError("");
    try {
      await login(username, password);
      const user = useAuthStore.getState().user;
      toast.success(`Welcome back, ${user?.username}!`);
      router.push(user?.role === "admin" ? "/overview" : "/home");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Invalid credentials");
    }
  };

 const handleCustomerLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!customerId.trim()) { setError("Please enter a Customer ID"); return; }
  setError("");
  setCidLoading(true);
  try {
    const res = await api.post("/auth/login/customer", {
      username: customerId.trim(),
      password: "",
    });
    const data = res.data;

    // Save token to localStorage first
    if (typeof window !== "undefined") {
      localStorage.setItem("hm_token", data.access_token);
    }

    // Use the proper login flow via authStore so persist middleware saves it
    useAuthStore.setState({
      user: {
        id: 0,
        username: data.username,
        email: "",
        role: "user",
        customer_id: data.customer_id,
      },
      token: data.access_token,
      isAuthenticated: true,
      isLoading: false,
    });

    // Also update the persisted storage key directly
    const persistKey = "hm-auth";
    const existing = JSON.parse(localStorage.getItem(persistKey) || "{}");
    existing.state = {
      ...existing.state,
      user: {
        id: 0,
        username: data.username,
        email: "",
        role: "user",
        customer_id: data.customer_id,
      },
      token: data.access_token,
      isAuthenticated: true,
    };
    localStorage.setItem(persistKey, JSON.stringify(existing));

    toast.success(`Welcome! Profile loaded for ${data.customer_id?.slice(0, 12)}...`);
    router.push("/home");
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
    setError(msg || "Customer ID not found");
  } finally {
    setCidLoading(false);
  }
};

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 20px" }}>
      <div style={{ width: "100%", maxWidth: 460, animation: "fadeUp .4s ease both", position: "relative", zIndex: 2 }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,var(--gold),#7A5018)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 800, color: "#000", letterSpacing: -1 }}>H&amp;M</div>
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 800, color: "var(--gold)" }}>Retail AI</span>
          </div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "clamp(36px,6vw,56px)", fontWeight: 800, lineHeight: .95, letterSpacing: -2, marginBottom: 12 }}>
            Intelligence<br /><span style={{ color: "var(--gold)" }}>at Scale.</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--tx3)", lineHeight: 1.7, maxWidth: 360, margin: "0 auto" }}>
            Personalised recommendations, customer segmentation,<br />and demand forecasting — unified.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 4, background: "var(--sur)", padding: 4, borderRadius: "var(--r2)", border: "1px solid var(--bor)", marginBottom: 20 }}>
          {(["credentials", "customer"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "var(--r)", fontSize: 12, fontWeight: 700,
                fontFamily: "Syne, sans-serif", cursor: "pointer", border: "none",
                background: mode === m ? "var(--gold-bg)" : "transparent",
                color: mode === m ? "var(--gold)" : "var(--tx3)",
                transition: "all .2s",
              }}>
              {m === "credentials" ? "🔐 Username / Password" : "🆔 Customer ID"}
            </button>
          ))}
        </div>

        {/* Auth card */}
        <div style={{
          background: "rgba(11,15,22,.9)", backdropFilter: "blur(28px)",
          border: "1px solid var(--bor2)", borderRadius: 26, padding: "36px 36px 32px",
          position: "relative", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,.65)",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,var(--gold-border2),transparent)" }} />

          {error && (
            <div style={{ background: "var(--rd-bg)", border: "1px solid var(--rd-bor)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 12, color: "var(--rd)", textAlign: "center", marginBottom: 14 }}>
              {error}
            </div>
          )}

          {mode === "credentials" ? (
            <>
              {/* Role selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {(["admin", "user"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => fillDemo(r)}
                    style={{
                      background: role === r ? (r === "admin" ? "var(--gold-bg)" : "var(--bl-bg)") : "var(--sur2)",
                      border: `2px solid ${role === r ? (r === "admin" ? "var(--gold-border2)" : "rgba(59,130,246,.4)") : "var(--bor2)"}`,
                      borderRadius: 16, padding: "14px 12px", cursor: "pointer", textAlign: "center", transition: "all .22s",
                    }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{r === "admin" ? "⚡" : "👤"}</div>
                    <div style={{ fontFamily: "Syne, sans-serif", fontSize: 12, fontWeight: 700, color: role === r ? (r === "admin" ? "var(--gold)" : "var(--bl)") : "var(--tx2)" }}>
                      {r === "admin" ? "Admin Portal" : "User Portal"}
                    </div>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username" className="form-input" autoComplete="username" />
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password" className="form-input" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14 }}>
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="btn-gold"
                  style={{ width: "100%", padding: 13, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isLoading ? .7 : 1 }}>
                  {isLoading ? "Signing in..." : <><span>Sign in</span><span>→</span></>}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🆔</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--tx)", marginBottom: 6 }}>Login with Customer ID</div>
                <div style={{ fontSize: 12, color: "var(--tx3)" }}>Enter your H&M customer ID to load your personalised recommendations</div>
              </div>

              <form onSubmit={handleCustomerLogin}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>Customer ID</label>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="e.g. 00006413d8573cd2..."
                    className="form-input"
                    style={{ fontFamily: "DM Mono, monospace", fontSize: 11 }}
                  />
                </div>

                {/* Demo hint */}
                <div style={{ background: "var(--sur2)", border: "1px solid var(--bor2)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 10, color: "var(--tx3)", marginBottom: 20, fontFamily: "DM Mono, monospace", wordBreak: "break-all" }}>
                  Demo ID: <span
                    style={{ color: "var(--gold)", cursor: "pointer" }}
                    onClick={() => setCustomerId("00006413d8573cd20ed7128e53b7b13819fe5cfc2d801fe7fc0f26dd8d65a85a")}
                  >
                    00006413d8573cd20ed7128e53b7b13819fe5cfc2d801fe7fc0f26dd8d65a85a
                  </span>
                </div>

                <button type="submit" disabled={cidLoading} className="btn-gold"
                  style={{ width: "100%", padding: 13, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: cidLoading ? .7 : 1 }}>
                  {cidLoading ? "Loading profile..." : <><span>Load My Profile</span><span>→</span></>}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "var(--tx4)", marginTop: 20, letterSpacing: 1, textTransform: "uppercase" }}>
          H&M RETAIL AI PLATFORM V2.0
        </p>
      </div>
    </div>
  );
}