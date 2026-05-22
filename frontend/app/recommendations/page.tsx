"use client";
import { useEffect, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import ProductCard from "@/components/ui/ProductCard";
import { recsAPI } from "@/services/api";
import useAuthStore from "@/store/authStore";
import type { Product, CustomerProfile } from "@/types";
import { getClusterLabel } from "@/lib/utils";

export default function RecommendationsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [recs, setRecs] = useState<Product[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!isAuthenticated) return;

    const cid = user?.customer_id;
    if (!cid) {
      setError("No customer ID linked to this account.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.allSettled([recsAPI.forCustomer(cid), recsAPI.profile(cid)])
      .then(([r, p]) => {
        if (r.status === "fulfilled") {
          setRecs(r.value?.recommendations ?? []);
        } else {
          setError("Could not load recommendations. Please try again later.");
        }
        if (p.status === "fulfilled") setProfile(p.value);
      })
      .finally(() => setLoading(false));
  }, [user?.customer_id, isAuthenticated]);

  const clusterLabel = profile?.cluster != null ? getClusterLabel(profile.cluster) : null;

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: "var(--tx)", marginBottom: 6 }}>
            ✨ For You
          </h2>
          <p style={{ fontSize: 13, color: "var(--tx3)" }}>
            AI-powered recommendations from your cluster — RFM + co-purchase analysis
          </p>
        </div>

        {/* ── Cluster label banner ── */}
        {clusterLabel && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--gold-bg)", border: "1px solid var(--gold-border2)",
            borderRadius: "var(--r)", padding: "6px 14px",
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 14 }}>🏷️</span>
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
              Your segment: {clusterLabel}
            </span>
          </div>
        )}

        {/* ── Customer profile card ── */}
        {profile && (
          <div style={{
            background: "linear-gradient(135deg,rgba(201,168,76,.06),rgba(201,168,76,.02))",
            border: "1px solid var(--gold-border2)", borderRadius: "var(--r2)",
            padding: 20, marginBottom: 24,
            display: "flex", gap: 20, alignItems: "center",
          }}>
            <div style={{ fontSize: 40 }}>🎯</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--tx)", marginBottom: 6 }}>
                Your Customer Profile
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12 }}>
                {([
                  ["Segment",   clusterLabel ?? "—"],
                  ["Recency",   `${profile.recency}d ago`],
                  ["Frequency", `${profile.frequency} orders`],
                  ["Spend",     `₹${Math.round((profile.monetary ?? 0) * 590 * 83.5).toLocaleString("en-IN")}`],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{
                    background: "var(--sur)", border: "1px solid var(--bor)",
                    borderRadius: "var(--r)", padding: "6px 12px",
                  }}>
                    <div style={{ fontSize: 9, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--tx3)", fontFamily: "DM Mono, monospace" }}>
              ID: {profile.customer_id?.slice(0, 16)}…
            </div>
          </div>
        )}

        {/* ── View toggle ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <div style={{
            display: "flex", gap: 2, background: "var(--sur)",
            border: "1px solid var(--bor)", borderRadius: "var(--r)", padding: 3,
          }}>
            {(["grid", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 12,
                  background: view === v ? "var(--gold-bg)" : "none",
                  border: `1px solid ${view === v ? "var(--gold-border)" : "transparent"}`,
                  color: view === v ? "var(--gold)" : "var(--tx3)",
                  cursor: "pointer",
                }}>
                {v === "grid" ? "⊞" : "☰"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error state ── */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.3)",
            borderRadius: "var(--r2)", padding: "14px 18px", marginBottom: 20,
            fontSize: 13, color: "#EF4444",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div style={{
            display: "grid",
            gridTemplateColumns: view === "grid" ? "repeat(auto-fill, minmax(200px, 1fr))" : "1fr",
            gap: 14,
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ height: view === "grid" ? 220 : 80, borderRadius: "var(--r2)" }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && recs.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--tx)", marginBottom: 8 }}>
              {user?.customer_id ? "No recommendations yet" : "Please log in to see your picks"}
            </div>
            <div style={{ fontSize: 12, color: "var(--tx3)" }}>
              Powered by cluster-based recommendations from your purchase history
            </div>
          </div>
        )}

        {/* ── Grid view ── */}
        {!loading && recs.length > 0 && view === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {recs.slice(0, 20).map((p, i) => (
              <ProductCard key={p.article_id} product={p} showScore delay={i * 40} />
            ))}
          </div>
        )}

        {/* ── List view ── */}
        {!loading && recs.length > 0 && view === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recs.slice(0, 20).map((p, i) => (
              <div key={p.article_id} className="card card-hover"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", animationDelay: `${i * 40}ms`, animation: "fadeUp .4s ease both" }}>
                <div style={{ width: 52, height: 64, borderRadius: "var(--r)", overflow: "hidden", background: "var(--sur2)", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://picsum.photos/seed/${p.article_id.replace(/\D/g, "").slice(0, 6)}/52/64`}
                    alt={p.product_name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/52x64/0A0D14/C9A84C?text=H"; }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 1 }}>{p.product_type_name}</div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--tx)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.product_name}
                  </div>
                  {p.score && <div style={{ fontSize: 10, color: "var(--gold)", marginTop: 2 }}>✨ {(p.score * 100).toFixed(0)}% match</div>}
                </div>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 800, color: "var(--gold)", flexShrink: 0 }}>
                  {p.price != null ? `₹${Math.round(p.price).toLocaleString("en-IN")}` : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}