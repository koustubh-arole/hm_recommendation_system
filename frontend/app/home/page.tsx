"use client";

import { useState, useEffect } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import ProductCard from "@/components/ui/ProductCard";
import { recsAPI } from "@/services/api";
import useAuthStore from "@/store/authStore";
import type { Product, TrendingProduct } from "@/types";

const MOCK_TRENDING: TrendingProduct[] = [
  { rank:1, article_id:"0924243001", product_name:"Ohlsson",               product_type_name:"Garment Upper body", purchase_count:450 },
  { rank:2, article_id:"0924243002", product_name:"Ohlsson",               product_type_name:"Garment Upper body", purchase_count:420 },
  { rank:3, article_id:"0923758001", product_name:"Vanessa",               product_type_name:"Garment Upper body", purchase_count:398 },
  { rank:4, article_id:"0918522001", product_name:"Jackie Cable Vest",     product_type_name:"Garment Upper body", purchase_count:372 },
  { rank:5, article_id:"0909370001", product_name:"FF Pl Haley Dress",     product_type_name:"Garment Full body",  purchase_count:351 },
  { rank:6, article_id:"0706016001", product_name:"Jade HW Skinny Denim",  product_type_name:"Garment Lower body", purchase_count:320 },
  { rank:7, article_id:"0372860001", product_name:"Tilda Tank",             product_type_name:"Garment Upper body", purchase_count:298 },
  { rank:8, article_id:"0108775044", product_name:"Tilly",                  product_type_name:"Garment Upper body", purchase_count:280 },
];

function trendingToProduct(p: TrendingProduct): Product {
  return {
    id: p.article_id, article_id: p.article_id,
    product_name: p.product_name, product_type_name: p.product_type_name ?? "",
    product_group_name: "", colour_group_name: "", section_name: "", index_name: "",
  };
}

const HERO_CARDS = [
  {
    icon: "✨",
    title: "Your Style",
    value: "Personalised for you",
    desc: "AI picks curated from your purchase history and shoppers with similar taste.",
    color: "var(--brand)",
    bg: "var(--brand-muted)",
    bor: "var(--brand-border)",
  },
  {
    icon: "🎁",
    title: "Exclusive Offer",
    value: "Member promo active",
    desc: "Based on your purchase history, you qualify for a member-exclusive discount.",
    color: "var(--am)",
    bg: "var(--am-bg)",
    bor: "var(--am-bor)",
  },
  {
    icon: "🛍️",
    title: "AI Recommendations",
    value: "Products picked for you",
    desc: "Handpicked by AI based on what people with your taste are buying right now.",
    color: "var(--bl)",
    bg: "var(--bl-bg)",
    bor: "var(--bl-bor)",
  },
];

export default function UserHomePage() {
  const { user } = useAuthStore();
  const [trending,  setTrending]  = useState<Product[]>([]);
  const [recs,      setRecs]      = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"trending" | "recommendations">("trending");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const tr  = await recsAPI.trending("7d");
        const raw: TrendingProduct[] = Array.isArray(tr) ? tr : (tr?.products ?? []);
        setTrending(raw.length > 0 ? raw.map(trendingToProduct) : MOCK_TRENDING.map(trendingToProduct));
      } catch {
        setTrending(MOCK_TRENDING.map(trendingToProduct));
      }

      if (user?.customer_id) {
        try {
          const r = await recsAPI.forCustomer(user.customer_id);
          setRecs(r?.recommendations ?? []);
        } catch { setRecs([]); }
      }

      setLoading(false);
    };
    load();
  }, [user?.customer_id]);

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1200, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* Welcome header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--tx)", marginBottom: 4, letterSpacing: "-0.03em" }}>
            Welcome back, {user?.username} 👋
          </h2>
          <p style={{ fontSize: 13, color: "var(--tx3)" }}>
            Here&apos;s what&apos;s trending and personalised for you today.
          </p>
        </div>

        {/* Hero cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {HERO_CARDS.map((card) => (
            <div key={card.title} className="card" style={{ padding: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: card.color, borderRadius: "var(--r2) var(--r2) 0 0" }} />
              <div style={{ width: 38, height: 38, background: card.bg, border: `1px solid ${card.bor}`, borderRadius: "var(--r)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 12 }}>
                {card.icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{card.title}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)", marginBottom: 6 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: "var(--tx3)", lineHeight: 1.6 }}>{card.desc}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          display: "inline-flex", gap: 2, marginBottom: 22,
          background: "var(--sur)", padding: 4,
          borderRadius: "var(--r)", border: "1px solid var(--bor)",
        }}>
          {(["trending", "recommendations"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: "7px 18px", borderRadius: 6, fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: "pointer", border: "none",
                background: activeTab === tab ? "var(--brand)" : "transparent",
                color: activeTab === tab ? "#fff" : "var(--tx3)",
                transition: "all .18s",
              }}>
              {tab === "trending" ? "🔥 Trending" : "✨ For You"}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ height: 220, borderRadius: "var(--r2) var(--r2) 0 0" }} />
                <div className="card" style={{ borderTop: "none", borderRadius: "0 0 var(--r2) var(--r2)", padding: "12px 14px" }}>
                  <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 13, width: "80%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 28 }} />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "trending" ? (
          trending.length === 0 ? (
            <EmptyState icon="🔥" title="Trending data loading" sub="Connect the /api/trending endpoint to show live data." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {trending.slice(0, 12).map((p, i) => (
                <ProductCard key={p.article_id ?? i} product={p} delay={i * 50} />
              ))}
            </div>
          )
        ) : recs.length === 0 ? (
          <EmptyState
            icon="✨"
            title="No recommendations yet"
            sub={user?.customer_id
              ? "Recommendations are being generated based on your profile."
              : "Link your Customer ID in your profile to get personalised picks."}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {recs.slice(0, 12).map((p, i) => (
              <ProductCard key={p.article_id} product={p} showScore delay={i * 50} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--tx3)", maxWidth: 360, margin: "0 auto" }}>{sub}</div>
    </div>
  );
}
