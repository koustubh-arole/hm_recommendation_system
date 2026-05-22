"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

export default function DashboardShell({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) { router.push("/login"); return; }
      if (requireAdmin && user?.role !== "admin") router.push("/home");
    }
  }, [isAuthenticated, isLoading, user, requireAdmin]);

  if (isLoading || !isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 36, height: 36, border: "2px solid var(--bor2)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
          <p style={{ fontSize: 12, color: "var(--tx3)", letterSpacing: 1 }}>Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Navbar />
        <div style={{ flex: 1, overflowY: "auto", padding: 26, scrollbarWidth: "thin", scrollbarColor: "var(--bor) transparent" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
