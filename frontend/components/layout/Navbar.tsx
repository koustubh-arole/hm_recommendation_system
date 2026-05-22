"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import Link from "next/link";

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/overview":       { title: "Platform Overview",         sub: "Live recommendation system snapshot" },
  "/analytics":      { title: "Recommendation Analytics",  sub: "Top products per customer segment" },
  "/forecasting":    { title: "Demand Forecasting",        sub: "XGBoost-powered 30-day forecast" },
  "/pipelines":      { title: "Pipeline Controls",         sub: "Trigger retraining jobs" },
  "/users":          { title: "User Management",           sub: "Manage platform accounts" },
  "/system":         { title: "System Health",             sub: "Infrastructure & API monitoring" },
  "/home":           { title: "Discover",                  sub: "Personalised for you" },
  "/products":       { title: "Browse Products",           sub: "Curated H&M collection" },
  "/recommendations":{ title: "For You",                   sub: "AI-powered picks based on your style" },
  "/wishlist":       { title: "Wishlist",                  sub: "Your saved items" },
  "/search":         { title: "Semantic Search",           sub: "Powered by ChromaDB embeddings" },
  "/cart":           { title: "Shopping Cart",             sub: "Review your items" },
};

export default function Navbar() {
  const pathname  = usePathname();
  const { user }  = useAuthStore();
  const cartCount = useCartStore((s) => s.count);
  const [dropdown, setDropdown] = useState(false);
  const page = PAGE_TITLES[pathname] || { title: "Dashboard", sub: "" };

  useEffect(() => {
    const close = () => setDropdown(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <header style={{
      height: 56,
      background: "var(--bg2)",
      borderBottom: "1px solid var(--bor)",
      display: "flex", alignItems: "center",
      padding: "0 24px", gap: 12,
      flexShrink: 0, position: "sticky", top: 0, zIndex: 10,
    }}>
      {/* Breadcrumb */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--tx3)" }}>
          <span>{user?.role === "admin" ? "Admin" : "My Account"}</span>
          <span style={{ color: "var(--bor2)" }}>/</span>
          <span style={{ color: "var(--tx)", fontWeight: 600 }}>{page.title}</span>
        </div>
        {page.sub && (
          <div style={{ fontSize: 11, color: "var(--tx4)", marginTop: 1 }}>{page.sub}</div>
        )}
      </div>

      {/* Live indicator */}
      <div className="live-pill">
        <span className="status-dot status-online animate-pulse-dot" />
        Live
      </div>

      {/* Cart (user only) */}
      {user?.role === "user" && (
        <Link href="/cart" style={{
          position: "relative", width: 34, height: 34,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--sur)", border: "1.5px solid var(--bor)",
          borderRadius: "var(--r)", cursor: "pointer",
          textDecoration: "none", fontSize: 15, color: "var(--tx3)",
          transition: "all .15s",
        }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
            (e.currentTarget as HTMLElement).style.color = "var(--brand)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--bor)";
            (e.currentTarget as HTMLElement).style.color = "var(--tx3)";
          }}
        >
          🛍
          {cartCount > 0 && (
            <span style={{
              position: "absolute", top: -5, right: -5,
              width: 17, height: 17, borderRadius: "50%",
              background: "var(--brand)", color: "#fff",
              fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid var(--bg2)",
            }}>
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </Link>
      )}

      {/* Notifications */}
      <button style={{
        width: 34, height: 34,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--sur)", border: "1.5px solid var(--bor)",
        borderRadius: "var(--r)", cursor: "pointer",
        fontSize: 15, color: "var(--tx3)",
        transition: "all .15s", position: "relative",
      }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
          (e.currentTarget as HTMLElement).style.color = "var(--brand)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--bor)";
          (e.currentTarget as HTMLElement).style.color = "var(--tx3)";
        }}
      >
        🔔
        <span style={{
          position: "absolute", top: 7, right: 7,
          width: 5, height: 5, borderRadius: "50%",
          background: "var(--brand)", border: "1.5px solid var(--bg2)",
        }} />
      </button>

      {/* Avatar / dropdown */}
      <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setDropdown(!dropdown)} style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "var(--brand)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff",
          cursor: "pointer", border: "2px solid var(--brand-border)",
          transition: "opacity .15s",
        }}>
          {user?.username?.[0]?.toUpperCase()}
        </button>

        {dropdown && (
          <div className="glass animate-scale-in" style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)",
            width: 210, borderRadius: "var(--r2)", padding: "6px 0",
            zIndex: 100,
          }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--bor)", marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{user?.username}</div>
              <span className={`badge ${user?.role === "admin" ? "badge-red" : "badge-blue"}`} style={{ marginTop: 4 }}>
                {user?.role}
              </span>
            </div>
            {[["👤", "Profile"], ["⚙️", "Settings"]].map(([ic, lb]) => (
              <button key={lb} style={{
                width: "100%", background: "none", border: "none",
                padding: "8px 16px", display: "flex", alignItems: "center",
                gap: 9, fontSize: 13, color: "var(--tx2)",
                cursor: "pointer", transition: "all .15s",
              }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--sur2)";
                  (e.currentTarget as HTMLElement).style.color = "var(--tx)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "none";
                  (e.currentTarget as HTMLElement).style.color = "var(--tx2)";
                }}
              >
                <span>{ic}</span>{lb}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
