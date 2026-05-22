"use client";
import DashboardShell from "@/components/layout/DashboardShell";
import useCartStore from "@/store/cartStore";
import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";

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

  const subtotal  = total;
  const discount  = total * 0.05;
  const finalTotal = total - discount;

  return (
    <DashboardShell>
      <div style={{ maxWidth: 920, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--tx)", letterSpacing: "-0.03em" }}>Shopping Bag</h2>
            <p style={{ fontSize: 12, color: "var(--tx3)", marginTop: 2 }}>{count} item{count !== 1 ? "s" : ""}</p>
          </div>
          {items.length > 0 && (
            <button onClick={() => { clearCart(); toast.info("Bag cleared"); }}
              style={{ padding: "7px 14px", borderRadius: "var(--r)", fontSize: 12, background: "var(--rd-bg)", border: "1px solid var(--rd-bor)", color: "var(--rd)", cursor: "pointer" }}>
              Clear bag
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 18 }}>🛍</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--tx)", marginBottom: 8, letterSpacing: "-0.03em" }}>Your bag is empty</div>
            <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 24 }}>Discover products and add them to your shopping bag.</div>
            <Link href="/products" className="btn-primary"
              style={{ display: "inline-flex", padding: "12px 28px", fontSize: 14, borderRadius: "var(--r)", textDecoration: "none", alignItems: "center", gap: 8 }}>
              Browse Products
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item) => (
                <div key={item.product.article_id} className="card" style={{ display: "flex", gap: 14, padding: 14, alignItems: "center" }}>
                  <div style={{ width: 76, height: 96, borderRadius: "var(--r)", overflow: "hidden", background: "var(--sur2)", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={(() => {
                        const clean = item.product.article_id.replace(/^0+/, "").padStart(9, "0");
                        return `https://lp2.hm.com/hmgoepprod?set=source[/]${clean.slice(0, 3)}/${clean}_main_01.jpg&scale=size[240x]&sink=format[jpg]`;
                      })()}
                      alt={item.product.product_name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "var(--tx4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{item.product.product_type_name}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.product_name}</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>{item.product.colour_group_name || "H&M"}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)", letterSpacing: "-0.02em" }}>
                      ₹{Math.round((item.product.price ?? 1999) * item.quantity).toLocaleString("en-IN")}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", background: "var(--sur2)", border: "1px solid var(--bor)", borderRadius: "var(--r)" }}>
                      <button onClick={() => updateQuantity(item.product.article_id, item.quantity - 1)}
                        style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14 }}>−</button>
                      <span style={{ padding: "0 10px", fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.article_id, item.quantity + 1)}
                        style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14 }}>+</button>
                    </div>
                    <button onClick={() => { removeItem(item.product.article_id); toast.info("Removed from bag"); }}
                      style={{ background: "none", border: "none", color: "var(--tx4)", fontSize: 11, cursor: "pointer", padding: 0, transition: "color .15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--rd)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--tx4)"; }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div>
              <div className="card" style={{ padding: 20, position: "sticky", top: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)", marginBottom: 18 }}>Order Summary</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: `Subtotal (${count} items)`, value: `₹${Math.round(subtotal).toLocaleString("en-IN")}`, color: "var(--tx)" },
                    { label: "Delivery",                  value: "Free",                                             color: "var(--gr)" },
                    { label: "Member discount (5%)",       value: `−₹${Math.round(discount).toLocaleString("en-IN")}`, color: "var(--gr)" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--tx3)" }}>
                      <span>{label}</span>
                      <span style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: "var(--bor)", marginBottom: 14 }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "var(--tx)", letterSpacing: "-0.03em" }}>
                    ₹{Math.round(finalTotal).toLocaleString("en-IN")}
                  </span>
                </div>

                <button onClick={handleCheckout} disabled={checkingOut} className="btn-primary"
                  style={{ width: "100%", padding: "13px 0", fontSize: 14, borderRadius: "var(--r)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: checkingOut ? .7 : 1 }}>
                  {checkingOut ? (
                    <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Processing…</>
                  ) : "Place Order"}
                </button>

                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
                  {[["🔒", "Secure checkout"], ["🚚", "Free delivery in India"], ["↩️", "30-day returns"]].map(([ic, lb]) => (
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
