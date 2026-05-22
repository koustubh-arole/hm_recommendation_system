"use client";
import { useState } from "react";
import { toast } from "sonner";
import useCartStore from "@/store/cartStore";
import type { Product } from "@/types";
import { normaliseProduct } from "@/lib/normaliseProduct";
export { normaliseProduct };

function getPrice(articleId: string): number {
  const n = parseInt(articleId?.slice(-4) || "0");
  return 499 + (n % 2500);
}

function HMImage({ articleId, productName }: { articleId: string; productName: string }) {
  const [failed, setFailed] = useState(false);
  const clean  = articleId.replace(/^0+/, "").padStart(9, "0");
  const folder = clean.slice(0, 3);
  const src    = `https://lp2.hm.com/hmgoepprod?set=source[/]${folder}/${clean}_main_01.jpg&scale=size[240x]&sink=format[jpg]`;

  if (failed) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100%", gap: 6,
        background: "var(--sur2)",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          padding: "5px 12px", borderRadius: 6,
          background: "#fff", border: "1px solid var(--bor)",
          color: "var(--tx3)", letterSpacing: .5,
          fontFamily: "var(--font-mono)",
        }}>
          {clean}
        </div>
        <div style={{ fontSize: 10, color: "var(--tx4)" }}>H&M</div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={productName}
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

export default function ProductCard({
  product,
  showScore,
  delay = 0,
}: {
  product: Product;
  showScore?: boolean;
  delay?: number;
}) {
  const { addItem, items } = useCartStore();
  const [hover, setHover]  = useState(false);

  const price  = product.price ?? getPrice(product.article_id);
  const inCart = items.some((i) => i.product.article_id === product.article_id);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ ...product, price });
    toast.success("Added to bag", { description: String(product.product_name ?? "").slice(0, 40) });
  };

  return (
    <div
      style={{
        background: "var(--sur)",
        border: `1px solid ${hover ? "var(--bor2)" : "var(--bor)"}`,
        borderRadius: "var(--r2)", overflow: "hidden",
        transition: "all .2s cubic-bezier(.4,0,.2,1)",
        transform: hover ? "translateY(-3px)" : "none",
        boxShadow: hover ? "var(--shadow)" : "var(--shadow-sm)",
        animationDelay: `${delay}ms`, animation: "fadeUp .4s ease both",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Image area */}
      <div style={{ position: "relative", height: 220, background: "var(--sur2)", overflow: "hidden" }}>
        <HMImage articleId={product.article_id} productName={product.product_name} />

        {/* AI match score */}
        {showScore && product.score != null && (
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: "var(--brand)", borderRadius: 20,
            padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#fff",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            ★ {(product.score * 100).toFixed(0)}% match
          </div>
        )}

        {/* In cart badge */}
        {inCart && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: "var(--gr-bg)", border: "1px solid var(--gr-bor)",
            borderRadius: 20, padding: "3px 10px",
            fontSize: 10, fontWeight: 600, color: "var(--gr)",
          }}>✓ In bag</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{
          fontSize: 10, color: "var(--tx4)",
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 3,
        }}>
          {product.product_type_name || "H&M"}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: "var(--tx)",
          marginBottom: 2, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {product.product_name || "Unknown product"}
        </div>
        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 12 }}>
          {product.colour_group_name || product.section_name || ""}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)", letterSpacing: "-0.02em" }}>
            ₹{Math.round(price).toLocaleString("en-IN")}
          </span>
          <button
            onClick={handleAdd}
            className="btn-primary"
            style={{ padding: "7px 14px", fontSize: 11 }}
          >
            {inCart ? "✓ Added" : "+ Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
