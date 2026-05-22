import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Product } from "@/types";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatNumber(v: number | undefined | null): string {
  if (v === undefined || v === null || isNaN(Number(v))) {
    return "0";
  }

  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;

  return Number(v).toLocaleString();
}
export function formatCurrency(
  v: number | undefined | null,
  sym = "₹"
): string {
  if (v === undefined || v === null || isNaN(Number(v))) {
    return `${sym}0`;
  }

  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;

  return `${sym}${Number(v).toLocaleString()}`;
}
export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
// Cluster label mapping derived from actual RFM centroid analysis:
//   Cluster 3 → recency=45d,  freq=136, spend=high  → Champions
//   Cluster 4 → recency=79d,  freq=47,  spend=med   → Loyal Customers
//   Cluster 0 → recency=128d, freq=16,  spend=low   → Potential Loyalists
//   Cluster 2 → recency=172d, freq=3,   spend=low   → At-Risk
//   Cluster 1 → recency=565d, freq=5,   spend=low   → Lost
export function getClusterLabel(c: number): string {
  const m: Record<number, string> = {
    3: "Champions",
    4: "Loyal Customers",
    0: "Potential Loyalists",
    2: "At-Risk Customers",
    1: "Lost Customers",
  };
  return m[c] ?? `Cluster ${c}`;
}
export function getClusterColor(c: number): string {
  const m: Record<number, string> = {
    3: "#C9A84C", // gold   — Champions
    4: "#22C55E", // green  — Loyal
    0: "#3B82F6", // blue   — Potential
    2: "#F97316", // orange — At-Risk
    1: "#EF4444", // red    — Lost
  };
  return m[c] ?? "#3E5468";
}
export function getProductImageUrl(id: string): string {
  const seed = id?.replace(/\D/g, "").slice(0, 6) || "100000";
  return `https://picsum.photos/seed/${seed}/280/360`;
}
export function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n) + "…" : s; }
