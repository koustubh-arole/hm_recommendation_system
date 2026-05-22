"use client";

import DashboardShell from "@/components/layout/DashboardShell";
import useCartStore from "@/store/cartStore";
import { toast } from "sonner";
import { useState } from "react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total, count } = useCartStore();
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setCheckingOut(true);
    await new Promise(r => setTimeout(r, 2000));
    clearCart();
    toast.success("Order placed successfully!", { description: "Your H&M order has been confirmed." });
    setCheckingOut(false);
  };

  return (
    <DashboardShell>
      <div style={{ maxWidth: 900, margin: "0 auto", animation: "fadeUp .4s ease" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 800, color: "var(--tx)" }}>Shopping Bag</h2>
            <p style={{ fontSize: 12, color: "var(--tx3)", marginTop: 2 }}>{count} item{count !== 1 ? "s" : ""} in your bag</p>
          </div>
          {items.length > 0 && (
            <button onClick={() => { clearCart(); toast.info("Bag cleared"); }}
              style={{ padding: "7px 14px", borderRadius: "var(--r)", fontSize: 12, background: "var(--rd-bg)", border: "1px solid var(--rd-bor)", color: "var(--rd)", cursor: "pointer" }}>
              🗑 Clear bag
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🛍</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--tx)", marginBottom: 10 }}>Your bag is empty</div>
            <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 24 }}>Discover products and add them to your shopping bag.</div>
            <a href="/products" className="btn-gold" style={{ display: "inline-flex", padding: "12px 28px", fontSize: 14, borderRadius: "var(--r)", textDecoration: "none", alignItems: "center", gap: 8 }}>
              👗 Browse Products
            </a>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
            {/* Items list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((item) => (
                <div key={item.product.article_id} className="card card-hover" style={{ display: "flex", gap: 16, padding: 16, alignItems: "center" }}>
                  {/* Image */}
                  <div style={{ width: 80, height: 100, borderRadius: "var(--r)", overflow: "hidden", background: "var(--sur2)", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://picsum.photos/seed/${item.product.article_id.replace(/\D/g, "").slice(0, 6)}/80/100`}
                      alt={item.product.product_name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/80x100/0A0D14/C9A84C?text=H"; }}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{item.product.product_type_name}</div>
                    <div style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--tx)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.product_name}</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>{item.product.colour_group_name || "H&M"}</div>
                    <div style={{ fontSize: 10, color: "var(--tx4)", fontFamily: "DM Mono, monospace", marginTop: 3 }}>ID: {item.product.article_id}</div>
                  </div>

                  {/* Qty + price + remove */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                    <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 800, color: "var(--gold)" }}>
                      £{((item.product.price ?? 29.99) * item.quantity).toFixed(2)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 0, background: "var(--sur2)", border: "1px solid var(--bor)", borderRadius: "var(--r)" }}>
                      <button onClick={() => updateQuantity(item.product.article_id, item.quantity - 1)}
                        style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14 }}>−</button>
                      <span style={{ padding: "0 10px", fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.article_id, item.quantity + 1)}
                        style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14 }}>+</button>
                    </div>
                    <button onClick={() => { removeItem(item.product.article_id); toast.info("Removed from bag"); }}
                      style={{ background: "none", border: "none", color: "var(--tx3)", fontSize: 11, cursor: "pointer", padding: 0 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--rd)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--tx3)"; }}
                    >
                      🗑 Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div>
              <div className="card" style={{ padding: 22, position: "sticky", top: 16 }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "var(--tx)", marginBottom: 20 }}>Order Summary</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--tx3)" }}>
                    <span>Subtotal ({count} items)</span>
                    <span style={{ color: "var(--tx)" }}>£{total.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--tx3)" }}>
                    <span>Delivery</span>
                    <span style={{ color: "var(--gr)" }}>Free</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--tx3)" }}>
                    <span>Member discount</span>
                    <span style={{ color: "var(--gr)" }}>-£{(total * 0.05).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--bor)", marginBottom: 16 }} />

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>Total</span>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, color: "var(--gold)" }}>£{(total * 0.95).toFixed(2)}</span>
                </div>

                <button onClick={handleCheckout} disabled={checkingOut}
                  className="btn-gold"
                  style={{ width: "100%", padding: 14, fontSize: 14, borderRadius: "var(--r)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: checkingOut ? .7 : 1 }}>
                  {checkingOut ? (
                    <><span style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,.2)", borderTopColor: "#000", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Processing...</>
                  ) : "✓ Place Order"}
                </button>

                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[["🔒", "Secure checkout"], ["🚚", "Free UK delivery"], ["↩️", "30-day returns"]].map(([ic, lb]) => (
                    <div key={lb as string} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--tx3)" }}>
                      <span>{ic}</span>{lb}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
