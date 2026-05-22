"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";

const ADMIN_NAV = [
  { section: "Analytics", items: [
    { label: "Overview", href: "/overview", ic: "📊" },
    { label: "Analytics", href: "/analytics", ic: "📈" },
    { label: "Forecasting", href: "/forecasting", ic: "🔮" },
  ]},
  { section: "Operations", items: [
    { label: "Pipelines", href: "/pipelines", ic: "⚙️" },
    { label: "Users", href: "/users", ic: "👥" },
    { label: "System", href: "/system", ic: "🖥" },
  ]},
];

const USER_NAV = [
  { section: "Discover", items: [
    { label: "Home", href: "/home", ic: "🏠" },
    { label: "For You", href: "/recommendations", ic: "✨" },
    { label: "Products", href: "/products", ic: "👗" },
    { label: "Search", href: "/search", ic: "🔍" },
  ]},
  { section: "Shopping", items: [
    { label: "Wishlist", href: "/wishlist", ic: "❤️" },
    { label: "Cart", href: "/cart", ic: "🛍" },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const navGroups = user?.role === "admin" ? ADMIN_NAV : USER_NAV;

  return (
    <aside style={{
      width: collapsed ? 58 : 220, minWidth: collapsed ? 58 : 220,
      background: "var(--bg2)", borderRight: "1px solid var(--bor)",
      display: "flex", flexDirection: "column",
      transition: "width .3s cubic-bezier(.4,0,.2,1)",
      position: "sticky", top: 0, height: "100vh",
      zIndex: 20, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid var(--bor)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, minWidth: 30, background: "linear-gradient(135deg,var(--gold),#7A5018)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 800, color: "#000", letterSpacing: -1 }}>H&M</div>
        {!collapsed && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 12, fontWeight: 800, color: "var(--gold)" }}>H&M Retail AI</div>
            <div style={{ fontSize: 9, color: "var(--tx3)", letterSpacing: "1.5px", textTransform: "uppercase" }}>Platform V2</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0", scrollbarWidth: "none" }}>
        {navGroups.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <div style={{ padding: "12px 14px 3px", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "var(--tx4)", fontWeight: 700 }}>
                {group.section}
              </div>
            )}
            {group.items.map(({ label, href, ic }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", margin: "1px 7px",
                    borderRadius: "var(--r)", cursor: "pointer",
                    transition: "all .15s", textDecoration: "none",
                    color: active ? "var(--gold)" : "var(--tx3)",
                    fontSize: 12, fontWeight: 500,
                    whiteSpace: "nowrap", overflow: "hidden",
                    border: `1px solid ${active ? "var(--gold-border)" : "transparent"}`,
                    background: active ? "var(--gold-bg)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--sur)"; (e.currentTarget as HTMLElement).style.color = "var(--tx2)"; }}}
                  onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--tx3)"; }}}
                >
                  <span style={{ fontSize: 15, minWidth: 20, textAlign: "center", flexShrink: 0 }}>{ic}</span>
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: 10, borderTop: "1px solid var(--bor)" }}>
        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, minWidth: 30, borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),#7A5018)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#000", flexShrink: 0 }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username}</div>
              <div style={{ fontSize: 9, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: .5 }}>{user?.role}</div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button onClick={logout}
          style={{ width: "100%", background: "none", border: "none", borderRadius: "var(--r)", padding: "7px 10px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--tx3)", fontSize: 11, fontWeight: 600, transition: "all .15s", justifyContent: collapsed ? "center" : "flex-start" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--rd)"; (e.currentTarget as HTMLElement).style.background = "var(--rd-bg)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--tx3)"; (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          <span style={{ fontSize: 14 }}>🚪</span>
          {!collapsed && "Sign out"}
        </button>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ width: "100%", background: "none", border: "none", borderRadius: "var(--r)", padding: "7px 10px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--tx3)", fontSize: 11, transition: "all .15s", justifyContent: collapsed ? "center" : "flex-start" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gold)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--tx3)"; }}
        >
          <span>{collapsed ? "→" : "←"}</span>
          {!collapsed && <span style={{ fontSize: 10 }}>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
