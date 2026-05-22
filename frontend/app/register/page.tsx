"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authAPI } from "@/services/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "", role: "user" as "admin" | "user", customer_id: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) { setError("All fields are required"); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      await authAPI.register({ username: form.username, email: form.email, password: form.password, role: form.role, customer_id: form.customer_id || undefined });
      toast.success("Account created! Please sign in.");
      router.push("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Registration failed — this requires admin access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 20px" }}>
      <div style={{ width: "100%", maxWidth: 460, animation: "fadeUp .4s ease both", position: "relative", zIndex: 2 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,var(--gold),#7A5018)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 800, color: "#000" }}>H&amp;M</div>
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>Retail AI</span>
          </Link>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 32, fontWeight: 800, color: "var(--tx)", marginBottom: 6 }}>Create Account</h1>
          <p style={{ fontSize: 12, color: "var(--tx3)" }}>Admin accounts are created by system administrators</p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(11,15,22,.9)", backdropFilter: "blur(28px)", border: "1px solid var(--bor2)", borderRadius: 24, padding: "32px 32px 28px", boxShadow: "0 24px 64px rgba(0,0,0,.6)" }}>
          {/* Top line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,var(--gold-border2),transparent)", borderRadius: "24px 24px 0 0" }} />

          {error && (
            <div style={{ background: "var(--rd-bg)", border: "1px solid var(--rd-bor)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 12, color: "var(--rd)", marginBottom: 18, animation: "shake .4s ease" }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Grid row: username + email */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[{ k: "username", l: "Username *", p: "johndoe", t: "text" }, { k: "email", l: "Email *", p: "john@example.com", t: "email" }].map(({ k, l, p, t }) => (
                <div key={k}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{l}</label>
                  <input type={t} value={(form as Record<string, string>)[k]} onChange={(e) => update(k, e.target.value)} placeholder={p}
                    style={{ width: "100%", background: "var(--sur2)", border: "1px solid var(--bor)", borderRadius: "var(--r)", padding: "10px 12px", color: "var(--tx)", fontSize: 13, fontFamily: "DM Sans, sans-serif", outline: "none" }}
                    onFocus={(e) => (e.target as HTMLElement).style.borderColor = "var(--gold-border2)"}
                    onBlur={(e) => (e.target as HTMLElement).style.borderColor = "var(--bor)"}
                  />
                </div>
              ))}
            </div>

            {/* Customer ID */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Customer ID <span style={{ color: "var(--tx4)", fontSize: 9 }}>(optional)</span></label>
              <input type="text" value={form.customer_id} onChange={(e) => update("customer_id", e.target.value)} placeholder="e.g. 00000dbacae5abe5..."
                style={{ width: "100%", background: "var(--sur2)", border: "1px solid var(--bor)", borderRadius: "var(--r)", padding: "10px 12px", color: "var(--tx)", fontSize: 12, fontFamily: "DM Mono, monospace", outline: "none" }}
                onFocus={(e) => (e.target as HTMLElement).style.borderColor = "var(--gold-border2)"}
                onBlur={(e) => (e.target as HTMLElement).style.borderColor = "var(--bor)"}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Password *</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 6 characters"
                  style={{ width: "100%", background: "var(--sur2)", border: "1px solid var(--bor)", borderRadius: "var(--r)", padding: "10px 40px 10px 12px", color: "var(--tx)", fontSize: 13, fontFamily: "DM Sans, sans-serif", outline: "none" }}
                  onFocus={(e) => (e.target as HTMLElement).style.borderColor = "var(--gold-border2)"}
                  onBlur={(e) => (e.target as HTMLElement).style.borderColor = "var(--bor)"}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14 }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Confirm Password *</label>
              <input type="password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} placeholder="Repeat password"
                style={{ width: "100%", background: "var(--sur2)", border: `1px solid ${form.confirm && form.confirm !== form.password ? "var(--rd-bor)" : "var(--bor)"}`, borderRadius: "var(--r)", padding: "10px 12px", color: "var(--tx)", fontSize: 13, fontFamily: "DM Sans, sans-serif", outline: "none" }}
                onFocus={(e) => (e.target as HTMLElement).style.borderColor = "var(--gold-border2)"}
                onBlur={(e) => (e.target as HTMLElement).style.borderColor = form.confirm && form.confirm !== form.password ? "var(--rd-bor)" : "var(--bor)"}
              />
              {form.confirm && form.confirm !== form.password && (
                <p style={{ fontSize: 10, color: "var(--rd)", marginTop: 4 }}>Passwords do not match</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Account Role</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(["user", "admin"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => update("role", r)}
                    style={{
                      padding: "12px 8px", borderRadius: "var(--r)", fontSize: 12, fontWeight: 700,
                      fontFamily: "Syne, sans-serif", cursor: "pointer", border: "1px solid",
                      textAlign: "center", transition: "all .2s",
                      background: form.role === r ? (r === "admin" ? "var(--gold-bg)" : "var(--bl-bg)") : "var(--sur2)",
                      borderColor: form.role === r ? (r === "admin" ? "var(--gold-border2)" : "var(--bl-bor)") : "var(--bor)",
                      color: form.role === r ? (r === "admin" ? "var(--gold)" : "var(--bl)") : "var(--tx3)",
                    }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{r === "admin" ? "⚡" : "👤"}</div>
                    <div style={{ textTransform: "capitalize" }}>{r}</div>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold"
              style={{ padding: 13, fontSize: 14, borderRadius: "var(--r)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4, opacity: loading ? .7 : 1 }}>
              {loading ? (
                <><span style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,.2)", borderTopColor: "#000", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Creating...</>
              ) : "✓ Create Account"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--bor)", marginTop: 20, paddingTop: 18, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "var(--tx3)" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "var(--tx4)", marginTop: 20, letterSpacing: 1, textTransform: "uppercase" }}>
          H&M RETAIL AI PLATFORM V2.0 · Admin accounts created by system admin
        </p>
      </div>
    </div>
  );
}
