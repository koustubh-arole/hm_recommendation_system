"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";

const ADMIN_NAV = [
  { section: "Analytics", items: [
    { label: "Overview",    href: "/overview",    ic: "▦" },
    { label: "Analytics",   href: "/analytics",   ic: "↗" },
    { label: "Forecasting", href: "/forecasting", ic: "◈" },
  ]},
  { section: "Operations", items: [
    { label: "Pipelines", href: "/pipelines", ic: "⟳" },
    { label: "Users",     href: "/users",     ic: "⊙" },
    { label: "System",    href: "/system",    ic: "◎" },
  ]},
];

const USER_NAV = [
  { section: "Discover", items: [
    { label: "Home",     href: "/home",            ic: "⌂" },
    { label: "For You",  href: "/recommendations", ic: "★" },
    { label: "Products", href: "/products",         ic: "▣" },
    { label: "Search",   href: "/search",           ic: "○" },
  ]},
  { section: "Shopping", items: [
    { label: "Wishlist", href: "/wishlist", ic: "♡" },
    { label: "Cart",     href: "/cart",     ic: "◫" },
  ]},
];

export default function Sidebar() {
  const pathname   = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const navGroups  = user?.role === "admin" ? ADMIN_NAV : USER_NAV;

  return (
    <aside style={{
      width: collapsed ? 56 : 220, minWidth: collapsed ? 56 : 220,
      background: "var(--bg2)",
      borderRight: "1px solid var(--bor)",
      display: "flex", flexDirection: "column",
      transition: "width .25s cubic-bezier(.4,0,.2,1)",
      position: "sticky", top: 0, height: "100vh",
      zIndex: 20, flexShrink: 0,
      boxShadow: "1px 0 0 var(--bor)",
    }}>

      {/* Logo */}
      <div style={{
        padding: collapsed ? "18px 12px" : "18px 16px",
        borderBottom: "1px solid var(--bor)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, minWidth: 32,
          background: "var(--brand)", borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 800, color: "#fff",
          letterSpacing: -0.5, flexShrink: 0,
        }}>
          H&M
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)", lineHeight: 1.2 }}>H&M Retail AI</div>
            <div style={{ fontSize: 10, color: "var(--tx4)", letterSpacing: "1px", textTransform: "uppercase", marginTop: 1 }}>Platform V2</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 8px", scrollbarWidth: "none" }}>
        {navGroups.map((group) => (
          <div key={group.section} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{
                padding: "10px 8px 4px",
                fontSize: 10, letterSpacing: "1.2px",
                textTransform: "uppercase", color: "var(--tx4)", fontWeight: 600,
              }}>
                {group.section}
              </div>
            )}
            {group.items.map(({ label, href, ic }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  style={{
                    display: "flex", alignItems: "center",
                    gap: 9, padding: "8px 10px",
                    marginBottom: 1, borderRadius: "var(--r)",
                    transition: "all .15s", textDecoration: "none",
                    color: active ? "var(--brand)" : "var(--tx3)",
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    whiteSpace: "nowrap", overflow: "hidden",
                    background: active ? "var(--brand-muted)" : "transparent",
                    border: `1px solid ${active ? "var(--brand-border)" : "transparent"}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "var(--sur2)";
                      (e.currentTarget as HTMLElement).style.color = "var(--tx)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--tx3)";
                    }
                  }}
                >
                  <span style={{
                    fontSize: 16, minWidth: 20, textAlign: "center",
                    flexShrink: 0, color: active ? "var(--brand)" : "var(--tx3)",
                  }}>{ic}</span>
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 8px", borderTop: "1px solid var(--bor)" }}>
        {/* User info */}
        {!collapsed && (
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "8px 10px", marginBottom: 4,
            background: "var(--sur2)", borderRadius: "var(--r)",
            border: "1px solid var(--bor)",
          }}>
            <div style={{
              width: 28, height: 28, minWidth: 28, borderRadius: "50%",
              background: "var(--brand)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.username}
              </div>
              <div style={{ fontSize: 10, color: "var(--tx4)", textTransform: "uppercase", letterSpacing: ".5px" }}>
                {user?.role}
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button onClick={logout} style={{
          width: "100%", background: "none", border: "none",
          borderRadius: "var(--r)", padding: "7px 10px",
          display: "flex", alignItems: "center",
          gap: 7, cursor: "pointer",
          color: "var(--tx3)", fontSize: 12, fontWeight: 500,
          transition: "all .15s",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--rd)";
            (e.currentTarget as HTMLElement).style.background = "var(--rd-bg)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--tx3)";
            (e.currentTarget as HTMLElement).style.background = "none";
          }}
        >
          <span style={{ fontSize: 14 }}>↩</span>
          {!collapsed && "Sign out"}
        </button>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          width: "100%", background: "none", border: "none",
          borderRadius: "var(--r)", padding: "6px 10px",
          display: "flex", alignItems: "center",
          gap: 7, cursor: "pointer",
          color: "var(--tx4)", fontSize: 11,
          transition: "all .15s",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--tx)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--tx4)"; }}
        >
          <span style={{ fontSize: 13 }}>{collapsed ? "→" : "←"}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
