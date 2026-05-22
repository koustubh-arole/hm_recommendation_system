"use client";

import { useState, useEffect } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import ProductCard from "@/components/ui/ProductCard";
import { recsAPI } from "@/services/api";
import useAuthStore from "@/store/authStore";
import type { Product, CustomerProfile, TrendingProduct } from "@/types";
import { getClusterLabel } from "@/lib/utils";

// Segment metadata
const SEGMENT_META: Record<string, { icon: string; color: string; desc: string }> = {
  "Champions":           { icon: "👑", color: "var(--gold)", desc: "Your top customers — high frequency, recent, high spend" },
  "Loyal Customers":     { icon: "⭐", color: "var(--gr)",   desc: "Regular shoppers with strong engagement" },
  "Potential Loyalists": { icon: "💎", color: "var(--bl)",   desc: "Recent buyers with growing potential" },
  "At-Risk Customers":   { icon: "⚠️", color: "var(--gold)", desc: "Previously active but declining engagement" },
  "Lost Customers":      { icon: "😴", color: "var(--rd)",   desc: "Long inactive — needs re-engagement" },
};

// Fallback mock trending (used only if API is down)
const MOCK_TRENDING: TrendingProduct[] = [
  { rank:1, article_id:"0924243001", product_name:"Ohlsson",              product_type_name:"Garment Upper body", purchase_count:450 },
  { rank:2, article_id:"0924243002", product_name:"Ohlsson",              product_type_name:"Garment Upper body", purchase_count:420 },
  { rank:3, article_id:"0923758001", product_name:"Vanessa",              product_type_name:"Garment Upper body", purchase_count:398 },
  { rank:4, article_id:"0918522001", product_name:"Jackie cable vest",    product_type_name:"Garment Upper body", purchase_count:372 },
  { rank:5, article_id:"0909370001", product_name:"FF Pl Haley dress",   product_type_name:"Garment Full body",  purchase_count:351 },
  { rank:6, article_id:"0706016001", product_name:"Jade HW Skinny Denim TRS", product_type_name:"Garment Lower body", purchase_count:320 },
  { rank:7, article_id:"0372860001", product_name:"Tilda tank",           product_type_name:"Garment Upper body", purchase_count:298 },
  { rank:8, article_id:"0108775044", product_name:"Tilly (1)",            product_type_name:"Garment Upper body", purchase_count:280 },
];

export default function UserHomePage() {
  const { user } = useAuthStore();
  const [trending, setTrending] = useState<Product[]>([]);
  const [recs,     setRecs]     = useState<Product[]>([]);
  const [profile,  setProfile]  = useState<CustomerProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<"trending" | "recommendations">("trending");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // ── Trending — already normalised by recsAPI.trending() ──────────
      function trendingToProduct(p: TrendingProduct): Product {
  return {
    id:                 p.article_id,
    article_id:         p.article_id,
    product_name:       p.product_name,
    product_type_name:  p.product_type_name ?? "",
    product_group_name: "",
    colour_group_name:  "",
    section_name:       "",
    index_name:         "",
  };
}
      try {
  const tr = await recsAPI.trending("7d");
  const raw: TrendingProduct[] = Array.isArray(tr)
    ? tr
    : (tr?.products ?? []);
  const products = raw.map(trendingToProduct);
  setTrending(products.length > 0 ? products : MOCK_TRENDING.map(trendingToProduct));
} catch {
  setTrending(MOCK_TRENDING.map(trendingToProduct));
}
      // ── Per-customer data (only if logged in with customer_id) ────────
      if (user?.customer_id) {
        try {
          const r = await recsAPI.forCustomer(user.customer_id);
          // recsAPI.forCustomer returns { recommendations: Product[] }
          setRecs(r?.recommendations ?? []);
        } catch { setRecs([]); }

        try {
          // get_customer_profile now reads customer_id from JWT server-side
          // so we can pass the same id — the backend ignores it for non-admins
          const p = await recsAPI.profile(user.customer_id);
          setProfile(p);
        } catch { /* profile stays null — segment card shows skeleton text */ }
      }

      setLoading(false);
    };
    load();
  }, [user?.customer_id]);

  const segment = profile ? getClusterLabel(profile.cluster) : null;
  const segMeta = segment ? SEGMENT_META[segment] : null;

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1200, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* Welcome header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: "var(--tx)", marginBottom: 8 }}>
            Welcome back, {user?.username} 👋
          </div>
          <p style={{ fontSize: 13, color: "var(--tx3)" }}>
            Here&apos;s what&apos;s trending and personalised for you today.
          </p>
        </div>

        {/* Hero cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>

          {/* Segment card — auto-loaded from JWT */}
          <div style={{ background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r2)", padding: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--gold),transparent)" }} />
            <div style={{ fontSize: 26, marginBottom: 10 }}>{segMeta?.icon || "🎯"}</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--tx)", marginBottom: 4 }}>Your Segment</div>
            {loading ? (
              <>
                <div className="skeleton" style={{ height: 18, width: "60%", marginBottom: 8, borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 11, width: "90%", borderRadius: 6 }} />
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: segMeta?.color || "var(--gold)", marginBottom: 6 }}>
                  {segment || "Not found"}
                </div>
                <div style={{ fontSize: 11, color: "var(--tx3)", lineHeight: 1.6 }}>
                  {segMeta?.desc || "Link your Customer ID in your profile to see your segment."}
                </div>
              </>
            )}
          </div>

          {/* Exclusive offer */}
          <div style={{ background: "linear-gradient(135deg,rgba(201,168,76,.06),rgba(201,168,76,.02))", border: "1px solid var(--gold-border)", borderRadius: "var(--r2)", padding: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--gold),transparent)" }} />
            <div style={{ fontSize: 26, marginBottom: 10 }}>🎁</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--tx)", marginBottom: 4 }}>Exclusive Offer</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>Personalised promo</div>
            <div style={{ fontSize: 11, color: "var(--tx3)" }}>Based on your purchase history, you qualify for a member-exclusive discount.</div>
          </div>

          {/* AI Recs preview */}
          <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,.06),rgba(59,130,246,.02))", border: "1px solid var(--bl-bor)", borderRadius: "var(--r2)", padding: 20, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--bl),transparent)" }} />
            <div style={{ fontSize: 26, marginBottom: 10 }}>✨</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--tx)", marginBottom: 4 }}>AI Recommendations</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--bl)", marginBottom: 6 }}>Products loved by shoppers like you</div>
            <div style={{ fontSize: 11, color: "var(--tx3)" }}>Powered by RFM segmentation + co-purchase analysis.</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 22, background: "var(--sur)", padding: 4, borderRadius: "var(--r2)", border: "1px solid var(--bor)", width: "fit-content" }}>
          {(["trending", "recommendations"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: "7px 18px", borderRadius: "var(--r)", fontSize: 12, fontWeight: 700,
                fontFamily: "Syne, sans-serif", cursor: "pointer", border: "none",
                background: activeTab === tab ? "var(--gold-bg)" : "transparent",
                color: activeTab === tab ? "var(--gold)" : "var(--tx3)",
                transition: "all .2s",
              }}>
              {tab === "trending" ? "🔥 Trending This Week" : "✨ For You"}
            </button>
          ))}
        </div>

        {/* Products grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ animationDelay: `${i * 60}ms`, animation: "fadeUp .4s ease both" }}>
                <div className="skeleton" style={{ height: 220, borderRadius: "var(--r2) var(--r2) 0 0" }} />
                <div style={{ background: "var(--sur)", border: "1px solid var(--bor)", borderTop: "none", borderRadius: "0 0 var(--r2) var(--r2)", padding: "14px 16px 16px" }}>
                  <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 14, width: "80%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 28, width: "100%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "trending" ? (
          trending.length === 0 ? (
            <EmptyState icon="🔥" title="Trending data loading" sub="Connect the /api/trending endpoint to show live data from top_products_7d.csv" />
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:16 }}>
  {trending.slice(0, 12).map((p, i) => (
    <ProductCard
      key={p.article_id ?? i}
      product={p}
      delay={i * 50}
    />
  ))}
</div>
          )
        ) : recs.length === 0 ? (
          <EmptyState
            icon="✨"
            title="No recommendations yet"
            sub={user?.customer_id
              ? "Recommendations are being generated based on your profile."
              : "Link your Customer ID in your profile to get personalised recommendations."}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {recs.slice(0, 12).map((p, i) => (
              <ProductCard key={p.article_id} product={p} showScore delay={i * 50} />
            ))}
          </div>
        )}

        {/* Segment legend */}
        <div style={{ marginTop: 40, background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r2)", padding: 20 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Segment Legend</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {Object.entries(SEGMENT_META).map(([name, meta]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--tx2)" }}>
                <span>{meta.icon}</span><span>{name}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 10, color: "var(--tx4)" }}>
            Powered by RFM segmentation + co-purchase analysis
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "var(--tx)", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--tx3)", maxWidth: 380, margin: "0 auto" }}>{sub}</div>
    </div>
  );
}
