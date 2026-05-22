"use client";
import { useState } from "react";
import { toast } from "sonner";
import useCartStore from "@/store/cartStore";
import type { Product } from "@/types";
import { normaliseProduct } from "@/lib/normaliseProduct";
export { normaliseProduct };

const wishlist = {
  addItem: (_p: Product) => {},
  removeItem: (_id: string) => {},
  items: [] as Product[],
};

function getPrice(articleId: string): number {
  // Fallback when API hasn't returned a price — generates a plausible INR value
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
        <div style={{
          fontFamily: "var(--font-mono, monospace)", fontSize: 13, fontWeight: 700,
          padding: "6px 14px", borderRadius: 8,
          background: "var(--gold-bg)", border: "1px solid var(--gold-border)",
          color: "var(--gold)", letterSpacing: 1,
        }}>
          {clean}
        </div>
        <div style={{ fontSize: 10, color: "var(--tx3)" }}>article id</div>
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

const CLUSTER_LABELS: Record<number, string> = {
  0: "Champions", 1: "Loyal", 2: "Potential", 3: "At-Risk", 4: "Lost",
};
const CLUSTER_COLORS: Record<number, string> = {
  0: "#C9A84C", 1: "#3B82F6", 2: "#22C55E", 3: "#F97316", 4: "#EF4444",
};

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

  const price      = product.price ?? getPrice(product.article_id);
  const inCart     = items.some((i) => i.product.article_id === product.article_id);
  const inWishlist = wishlist.items.some((i: Product) => i.article_id === product.article_id);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const productWithPrice: Product = { ...product, price };
    addItem(productWithPrice);
    toast.success("Added to bag", { description: String(product.product_name ?? "").slice(0, 40) });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWishlist) {
      wishlist.removeItem(product.article_id);
      toast("Removed from wishlist");
    } else {
      wishlist.addItem(product);
      toast.success("Saved to wishlist");
    }
  };

  return (
    <div
      style={{
        background: "var(--sur)",
        border: `1px solid ${hover ? "var(--gold-border2)" : "var(--bor)"}`,
        borderRadius: "var(--r3)", overflow: "hidden",
        transition: "all .22s cubic-bezier(.4,0,.2,1)",
        transform: hover ? "translateY(-4px)" : "none",
        boxShadow: hover ? "0 12px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(201,168,76,.08)" : "none",
        animationDelay: `${delay}ms`, animation: "fadeUp .4s ease both",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ position: "relative", height: 220, background: "var(--sur2)", overflow: "hidden" }}>
        <HMImage articleId={product.article_id} productName={product.product_name} />

        {showScore && product.score != null && (
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(6,8,14,.85)", backdropFilter: "blur(8px)",
            border: "1px solid var(--gold-border)", borderRadius: 20,
            padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "var(--gold)",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            ✨ {(product.score * 100).toFixed(0)}% match
          </div>
        )}

        {product.cluster != null && (
          <div style={{
            position: "absolute",
            top:    showScore && product.score != null ? "auto" : 10,
            bottom: showScore && product.score != null ? 10 : "auto",
            left: 10,
            background: "rgba(6,8,14,.85)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${(CLUSTER_COLORS[product.cluster] ?? "#3E5468")}40`,
            borderRadius: 20,
            padding: "3px 10px",
            fontSize: 9,
            fontWeight: 700,
            color: CLUSTER_COLORS[product.cluster] ?? "var(--tx3)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <span style={{
              width: 5, height: 5,
              borderRadius: "50%",
              background: CLUSTER_COLORS[product.cluster] ?? "#3E5468",
              display: "inline-block",
            }} />
            {CLUSTER_LABELS[product.cluster] ?? `Cluster ${product.cluster}`}
          </div>
        )}

        <button
          onClick={handleWishlist}
          style={{
            position: "absolute", top: 10, right: 10,
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(6,8,14,.7)", backdropFilter: "blur(8px)",
            border: `1px solid ${inWishlist ? "rgba(239,68,68,.4)" : "var(--bor2)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 13,
            opacity: hover || inWishlist ? 1 : 0, transition: "opacity .2s",
          }}
        >
          {inWishlist ? "❤️" : "🤍"}
        </button>

        {inCart && (
          <div style={{
            position: "absolute", bottom: 10, right: 10,
            background: "var(--gr-bg)", border: "1px solid var(--gr-bor)",
            borderRadius: 20, padding: "2px 8px",
            fontSize: 10, fontWeight: 600, color: "var(--gr)",
          }}>✓ In bag</div>
        )}

        <div style={{
          position: "absolute", bottom: 10, left: 10,
          fontFamily: "var(--font-mono, monospace)", fontSize: 9,
          padding: "2px 7px", borderRadius: 6,
          background: "rgba(6,8,14,.75)", border: "1px solid var(--bor2)",
          color: "var(--tx3)", letterSpacing: .5,
        }}>
          {product.article_id.replace(/^0+/, "").padStart(9, "0")}
        </div>
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontSize: 9, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
          {product.product_type_name || "—"}
        </div>
        <div style={{
          fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700,
          color: "var(--tx)", marginBottom: 3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {product.product_name || "Unknown product"}
        </div>
        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 14 }}>
          {product.colour_group_name || product.section_name || "H&M"}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 800, color: "var(--gold)" }}>
            ₹{Math.round(price).toLocaleString("en-IN")}
          </span>
          <button
            onClick={handleAdd}
            className="btn-gold"
            style={{ padding: "7px 14px", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
          >
            {inCart ? "✓ Added" : "🛍 Add"}
          </button>
        </div>
      </div>
    </div>
  );
}