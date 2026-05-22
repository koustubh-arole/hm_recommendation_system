"use client";
import { useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import ProductCard from "@/components/ui/ProductCard";
import type { Product } from "@/types";
import Link from "next/link";

const DEMO_WISHLIST: Product[] = [
  { id:"1", article_id:"0706016001", product_name:"Jade HW Skinny Denim TRS", product_type_name:"Garment Lower body", product_group_name:"Garment", colour_group_name:"Denim blue", section_name:"Ladies", index_name:"Ladieswear", price:2999 },
  { id:"2", article_id:"0520013001", product_name:"Padded Jacket",             product_type_name:"Jacket",            product_group_name:"Garment", colour_group_name:"Navy",       section_name:"Ladies", index_name:"Ladieswear", price:4999 },
  { id:"3", article_id:"0909370001", product_name:"FF Pl Haley Dress",         product_type_name:"Garment Full body", product_group_name:"Garment", colour_group_name:"Brown",      section_name:"Ladies", index_name:"Ladieswear", price:3699 },
];

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<Product[]>(DEMO_WISHLIST);
  const remove = (id: string) => setWishlist(w => w.filter(p => p.article_id !== id));
  const totalValue = wishlist.reduce((s, p) => s + (p.price ?? 0), 0);

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--tx)", letterSpacing: "-0.03em" }}>Wishlist</h2>
            <p style={{ fontSize: 12, color: "var(--tx3)", marginTop: 2 }}>{wishlist.length} saved item{wishlist.length !== 1 ? "s" : ""}</p>
          </div>
          {wishlist.length > 0 && (
            <button onClick={() => setWishlist([])}
              style={{ padding: "7px 14px", borderRadius: "var(--r)", fontSize: 12, background: "var(--sur)", border: "1px solid var(--bor)", color: "var(--tx3)", cursor: "pointer" }}>
              Clear all
            </button>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>♡</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--tx)", marginBottom: 8, letterSpacing: "-0.03em" }}>Your wishlist is empty</div>
            <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 24 }}>Save items you love by clicking the heart icon on any product.</div>
            <Link href="/products" className="btn-primary"
              style={{ display: "inline-flex", padding: "12px 28px", fontSize: 14, borderRadius: "var(--r)", textDecoration: "none", alignItems: "center", gap: 8 }}>
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16, marginBottom: 24 }}>
              {wishlist.map((p, i) => (
                <div key={p.article_id} style={{ position: "relative" }}>
                  <ProductCard product={p} delay={i * 60} />
                  <button onClick={() => remove(p.article_id)}
                    style={{
                      position: "absolute", top: 10, right: 10,
                      width: 26, height: 26, borderRadius: "50%",
                      background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.25)",
                      color: "var(--rd)", cursor: "pointer", fontSize: 11,
                      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5,
                    }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Footer summary */}
            <div className="card" style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)", marginBottom: 2 }}>
                  {wishlist.length} item{wishlist.length !== 1 ? "s" : ""} saved
                </div>
                <div style={{ fontSize: 11, color: "var(--tx3)" }}>
                  Total value: <span style={{ color: "var(--tx)", fontWeight: 700 }}>₹{Math.round(totalValue).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/products"
                  style={{ padding: "9px 18px", borderRadius: "var(--r)", fontSize: 13, background: "var(--sur2)", border: "1px solid var(--bor)", color: "var(--tx2)", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  Continue Shopping
                </Link>
                <Link href="/cart" className="btn-primary"
                  style={{ padding: "9px 18px", borderRadius: "var(--r)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                  Add All to Bag
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
