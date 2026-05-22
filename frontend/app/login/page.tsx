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
      setError(msg || "Invalid credentials. Please try again.");
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

      if (typeof window !== "undefined") {
        localStorage.setItem("hm_token", data.access_token);
      }

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

      const persistKey = "hm-auth";
      const existing = JSON.parse(localStorage.getItem(persistKey) || "{}");
      existing.state = {
        ...existing.state,
        user: { id: 0, username: data.username, email: "", role: "user", customer_id: data.customer_id },
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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "var(--bg)",
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: "0 0 420px",
        background: "var(--brand)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 48px",
        color: "#fff",
      }} className="login-left">
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", opacity: .7, marginBottom: 20 }}>H&M Retail AI</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 20, color: "#fff" }}>
          Intelligence<br />at Scale.
        </h1>
        <p style={{ fontSize: 14, opacity: .8, lineHeight: 1.7, maxWidth: 320, color: "#fff" }}>
          Personalised recommendations, customer segmentation, and demand forecasting — unified in one platform.
        </p>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            ["✨", "AI-powered recommendations"],
            ["📊", "RFM customer segmentation"],
            ["📈", "30-day demand forecasting"],
          ].map(([ic, lb]) => (
            <div key={lb} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, opacity: .85 }}>
              <span style={{ fontSize: 16 }}>{ic}</span>
              <span style={{ color: "#fff" }}>{lb}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{ width: "100%", maxWidth: 440, animation: "fadeUp .4s ease both" }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "var(--brand)", borderRadius: 10, fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: -1, marginBottom: 16 }}>H&M</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--tx)", letterSpacing: "-0.03em", marginBottom: 6 }}>Sign in to your account</h2>
            <p style={{ fontSize: 13, color: "var(--tx3)" }}>Welcome back — enter your credentials to continue</p>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 0, background: "var(--sur)", borderRadius: "var(--r)", border: "1.5px solid var(--bor)", marginBottom: 24, overflow: "hidden" }}>
            {(["credentials", "customer"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "9px 12px", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: "none",
                  background: mode === m ? "var(--brand)" : "transparent",
                  color: mode === m ? "#fff" : "var(--tx3)",
                  transition: "all .18s",
                }}>
                {m === "credentials" ? "🔐 Username / Password" : "🆔 Customer ID"}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "var(--rd-bg)", border: "1px solid var(--rd-bor)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 13, color: "var(--rd)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              ⚠️ {error}
            </div>
          )}

          {mode === "credentials" ? (
            <>
              {/* Role quick-fill */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                {(["admin", "user"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => fillDemo(r)}
                    style={{
                      background: role === r ? (r === "admin" ? "var(--brand-muted)" : "var(--bl-bg)") : "var(--sur)",
                      border: `1.5px solid ${role === r ? (r === "admin" ? "var(--brand-border)" : "var(--bl-bor)") : "var(--bor)"}`,
                      borderRadius: "var(--r)", padding: "14px 12px", cursor: "pointer", textAlign: "center", transition: "all .18s",
                    }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{r === "admin" ? "⚡" : "👤"}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: role === r ? (r === "admin" ? "var(--brand)" : "var(--bl)") : "var(--tx2)" }}>
                      {r === "admin" ? "Admin Portal" : "User Portal"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--tx4)", marginTop: 2 }}>
                      {r === "admin" ? "admin / admin123" : "koustubh / user123"}
                    </div>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx3)", marginBottom: 6 }}>Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username" className="form-input" autoComplete="username" />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx3)", marginBottom: 6 }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password" className="form-input" autoComplete="current-password"
                      style={{ paddingRight: 42 }} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14, padding: 0 }}>
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary"
                  style={{ width: "100%", padding: 13, fontSize: 14, borderRadius: "var(--r)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: isLoading ? .7 : 1 }}>
                  {isLoading
                    ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Signing in…</>
                    : "Sign in →"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 16 }}>
                  Enter your H&M customer ID to load your personalised recommendations.
                </p>
                <form onSubmit={handleCustomerLogin}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--tx3)", marginBottom: 6 }}>Customer ID</label>
                    <input
                      type="text"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      placeholder="e.g. 00006413d8573cd2..."
                      className="form-input"
                      style={{ fontFamily: "monospace", fontSize: 11 }}
                    />
                  </div>

                  <div style={{ background: "var(--sur2)", border: "1px solid var(--bor)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 11, color: "var(--tx3)", marginBottom: 20 }}>
                    Demo ID:{" "}
                    <span
                      style={{ color: "var(--brand)", cursor: "pointer", fontFamily: "monospace", wordBreak: "break-all" }}
                      onClick={() => setCustomerId("00006413d8573cd20ed7128e53b7b13819fe5cfc2d801fe7fc0f26dd8d65a85a")}
                    >
                      00006413d8573cd20...
                    </span>
                    <span style={{ color: "var(--tx4)" }}> (click to fill)</span>
                  </div>

                  <button type="submit" disabled={cidLoading} className="btn-primary"
                    style={{ width: "100%", padding: 13, fontSize: 14, borderRadius: "var(--r)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: cidLoading ? .7 : 1 }}>
                    {cidLoading
                      ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Loading profile…</>
                      : "Load My Profile →"}
                  </button>
                </form>
              </div>
            </>
          )}

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--tx4)", marginTop: 24 }}>
            H&M Retail AI Platform · v2.0
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-left { display: none !important; }
        }
      `}</style>
    </div>
  );
}
