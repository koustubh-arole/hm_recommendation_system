"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import Link from "next/link";

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/overview": { title: "Platform Overview", sub: "Live recommendation system snapshot" },
  "/analytics": { title: "Recommendation Analytics", sub: "Top products per customer segment" },
  "/forecasting": { title: "Demand Forecasting", sub: "XGBoost-powered 30-day forecast" },
  "/pipelines": { title: "Pipeline Controls", sub: "Trigger retraining jobs" },
  "/users": { title: "User Management", sub: "Manage platform accounts" },
  "/system": { title: "System Health", sub: "Infrastructure & API monitoring" },
  "/home": { title: "Discover", sub: "Personalised for you" },
  "/products": { title: "Browse Products", sub: "Curated H&M collection" },
  "/recommendations": { title: "For You", sub: "AI-powered picks based on your style" },
  "/wishlist": { title: "Wishlist", sub: "Your saved items" },
  "/search": { title: "Semantic Search", sub: "Powered by ChromaDB embeddings" },
  "/cart": { title: "Shopping Cart", sub: "Review your items" },
};

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
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
      height: 54, background: "var(--bg2)", borderBottom: "1px solid var(--bor)",
      display: "flex", alignItems: "center", padding: "0 22px", gap: 10,
      flexShrink: 0, position: "sticky", top: 0, zIndex: 10,
    }}>
      {/* Breadcrumb */}
      <div>
        <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "var(--tx2)" }}>
          {user?.role === "admin" ? "Admin" : "My Account"} <span style={{ color: "var(--tx)" }}>/ {page.title}</span>
        </span>
        {page.sub && <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 1 }}>{page.sub}</div>}
      </div>

      <div style={{ flex: 1 }} />

      {/* Live pill */}
      <div className="live-pill">
        <span className="status-dot status-online animate-pulse-dot" />
        Live
      </div>

      {/* Cart (user only) */}
      {user?.role === "user" && (
        <Link href="/cart" style={{ position: "relative", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r)", cursor: "pointer", textDecoration: "none", fontSize: 13, color: "var(--tx2)", transition: "all .15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-border)"; (e.currentTarget as HTMLElement).style.color = "var(--gold)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--bor)"; (e.currentTarget as HTMLElement).style.color = "var(--tx2)"; }}
        >
          🛍
          {cartCount > 0 && (
            <span style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: "var(--gold)", color: "#000", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)" }}>
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </Link>
      )}

      {/* Notifications */}
      <button style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r)", cursor: "pointer", fontSize: 13, color: "var(--tx2)", transition: "all .15s", position: "relative" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-border)"; (e.currentTarget as HTMLElement).style.color = "var(--gold)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--bor)"; (e.currentTarget as HTMLElement).style.color = "var(--tx2)"; }}
      >
        🔔
        <span style={{ position: "absolute", top: 4, right: 4, width: 5, height: 5, borderRadius: "50%", background: "var(--gold)", border: "1.5px solid var(--bg2)" }} />
      </button>

      {/* Avatar / dropdown */}
      <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setDropdown(!dropdown)}
          style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),#7A5018)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#000", cursor: "pointer", border: "2px solid var(--gold-border)", fontFamily: "Syne, sans-serif" }}>
          {user?.username?.[0]?.toUpperCase()}
        </button>

        {dropdown && (
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 200, background: "var(--sur)", border: "1px solid var(--bor2)", borderRadius: "var(--r2)", padding: "6px 0", boxShadow: "0 8px 32px rgba(0,0,0,.5)", animation: "scaleIn .2s ease", zIndex: 100 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--bor)", marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{user?.username}</div>
              <span className={`badge ${user?.role === "admin" ? "badge-gold" : "badge-blue"}`} style={{ marginTop: 4 }}>{user?.role}</span>
            </div>
            {[["👤", "Profile"], ["⚙️", "Settings"]].map(([ic, lb]) => (
              <button key={lb} style={{ width: "100%", background: "none", border: "none", padding: "8px 14px", display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "var(--tx2)", cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "all .15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sur2)"; (e.currentTarget as HTMLElement).style.color = "var(--tx)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--tx2)"; }}
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
