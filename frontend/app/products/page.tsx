"use client";
import { useState, useEffect, useMemo } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import ProductCard from "@/components/ui/ProductCard";
import { productsAPI } from "@/services/api";
import type { Product } from "@/types";

const CATEGORIES = ["All", "Garment Upper body", "Garment Lower body", "Garment Full body", "Jacket", "Sweater", "Socks & Tights", "Accessories"];
const SORT_OPTIONS = [
  { v: "default",    l: "Featured" },
  { v: "price_asc",  l: "Price: Low → High" },
  { v: "price_desc", l: "Price: High → Low" },
  { v: "name",       l: "A → Z" },
];

const MOCK_PRODUCTS: Product[] = [
  { id:"1",  article_id:"0706016001", product_name:"Jade HW Skinny Denim TRS",   product_type_name:"Garment Lower body", product_group_name:"Garment", colour_group_name:"Denim blue",  section_name:"Ladies", index_name:"Ladieswear", price:2999 },
  { id:"2",  article_id:"0372860001", product_name:"Tilda Tank",                  product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"White",       section_name:"Ladies", index_name:"Ladieswear", price:999  },
  { id:"3",  article_id:"0108775044", product_name:"Tilly",                       product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"Pink",        section_name:"Ladies", index_name:"Ladieswear", price:1499 },
  { id:"4",  article_id:"0534324001", product_name:"Oversized Hoodie",            product_type_name:"Sweater",            product_group_name:"Garment", colour_group_name:"Grey",        section_name:"Divided", index_name:"Divided",   price:2799 },
  { id:"5",  article_id:"0688537002", product_name:"Relaxed Fit Joggers",         product_type_name:"Garment Lower body", product_group_name:"Garment", colour_group_name:"Black",       section_name:"Sport",  index_name:"Sport",      price:1999 },
  { id:"6",  article_id:"0520013001", product_name:"Padded Jacket",               product_type_name:"Jacket",             product_group_name:"Garment", colour_group_name:"Navy",        section_name:"Ladies", index_name:"Ladieswear", price:4999 },
  { id:"7",  article_id:"0448509014", product_name:"7p Basic Shaftless Socks",    product_type_name:"Socks & Tights",    product_group_name:"Accessories", colour_group_name:"Black",    section_name:"Ladies", index_name:"Ladieswear", price:699  },
  { id:"8",  article_id:"0508789001", product_name:"Moa Tank",                    product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"White",       section_name:"Ladies", index_name:"Ladieswear", price:1199 },
  { id:"9",  article_id:"0372860002", product_name:"Summer Slip Dress",           product_type_name:"Garment Full body",  product_group_name:"Garment", colour_group_name:"Beige",       section_name:"Ladies", index_name:"Ladieswear", price:2399 },
  { id:"10", article_id:"0610776002", product_name:"Clean Shorts",                product_type_name:"Garment Lower body", product_group_name:"Garment", colour_group_name:"White",       section_name:"Ladies", index_name:"Ladieswear", price:1599 },
  { id:"11", article_id:"0924243001", product_name:"Ohlsson Shirt",               product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"Off white",   section_name:"Ladies", index_name:"Ladieswear", price:2299 },
  { id:"12", article_id:"0918522001", product_name:"Jackie Cable Vest",           product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"Cream",       section_name:"Ladies", index_name:"Ladieswear", price:2799 },
  { id:"13", article_id:"0909370001", product_name:"FF Pl Haley Dress",           product_type_name:"Garment Full body",  product_group_name:"Garment", colour_group_name:"Brown",       section_name:"Ladies", index_name:"Ladieswear", price:3699 },
  { id:"14", article_id:"0572720001", product_name:"Ribbed Crop Top",             product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"Black",       section_name:"Divided", index_name:"Divided",   price:799  },
  { id:"15", article_id:"0372860004", product_name:"High Waist Jeans",            product_type_name:"Garment Lower body", product_group_name:"Garment", colour_group_name:"Light blue",  section_name:"Ladies", index_name:"Ladieswear", price:2799 },
  { id:"16", article_id:"0372860003", product_name:"Basic Crew Neck Tee",         product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"White",       section_name:"Ladies", index_name:"Ladieswear", price:699  },
  { id:"17", article_id:"0923758001", product_name:"Vanessa Blouse",              product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"White",       section_name:"Ladies", index_name:"Ladieswear", price:1899 },
  { id:"18", article_id:"0448509015", product_name:"Cotton Socks 5-Pack",         product_type_name:"Socks & Tights",    product_group_name:"Accessories", colour_group_name:"White",    section_name:"Ladies", index_name:"Ladieswear", price:799  },
  { id:"19", article_id:"0520013002", product_name:"Puffer Coat",                 product_type_name:"Jacket",             product_group_name:"Garment", colour_group_name:"Black",       section_name:"Ladies", index_name:"Ladieswear", price:6499 },
  { id:"20", article_id:"0688537003", product_name:"Wide Leg Joggers",            product_type_name:"Garment Lower body", product_group_name:"Garment", colour_group_name:"Grey",        section_name:"Sport",  index_name:"Sport",      price:2299 },
  { id:"21", article_id:"0534324002", product_name:"Zip-Up Hoodie",               product_type_name:"Sweater",            product_group_name:"Garment", colour_group_name:"Beige",       section_name:"Divided", index_name:"Divided",   price:3199 },
  { id:"22", article_id:"0706016003", product_name:"Mom Jeans",                   product_type_name:"Garment Lower body", product_group_name:"Garment", colour_group_name:"Denim blue",  section_name:"Ladies", index_name:"Ladieswear", price:3099 },
  { id:"23", article_id:"0508789002", product_name:"Sports Bra",                  product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"Black",       section_name:"Sport",  index_name:"Sport",      price:1199 },
  { id:"24", article_id:"0924243002", product_name:"Ohlsson Blouse",              product_type_name:"Garment Upper body", product_group_name:"Garment", colour_group_name:"Light pink",  section_name:"Ladies", index_name:"Ladieswear", price:1999 },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [category, setCategory] = useState("All");
  const [sort, setSort]         = useState("default");
  const [query, setQuery]       = useState("");
  const [page, setPage]         = useState(1);
  const perPage = 12;

  useEffect(() => {
    productsAPI.list({ page: 1, per_page: 100 }).then((data) => {
      if (data?.length > 0) setProducts(data);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let items = [...products];
    if (category !== "All") items = items.filter(p => p.product_type_name === category);
    if (query) items = items.filter(p =>
      p.product_name.toLowerCase().includes(query.toLowerCase()) ||
      (p.colour_group_name ?? "").toLowerCase().includes(query.toLowerCase())
    );
    if (sort === "price_asc")  items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === "price_desc") items.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (sort === "name")       items.sort((a, b) => a.product_name.localeCompare(b.product_name));
    return items;
  }, [category, sort, query, products]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageItems  = filtered.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [category, sort, query]);

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1200, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--tx)", marginBottom: 3, letterSpacing: "-0.03em" }}>Browse Collection</h2>
          <p style={{ fontSize: 12, color: "var(--tx3)" }}>{filtered.length} products · H&amp;M curated catalogue</p>
        </div>

        {/* Search + Sort bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--tx3)" }}>⌕</span>
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search products, colours…"
              style={{
                width: "100%", background: "var(--sur)",
                border: "1.5px solid var(--bor)", borderRadius: "var(--r)",
                padding: "9px 12px 9px 32px", color: "var(--tx)",
                fontSize: 13, outline: "none", transition: "border-color .18s",
                fontFamily: "var(--font)",
              }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = "var(--brand)"}
              onBlur={e  => (e.target as HTMLElement).style.borderColor = "var(--bor)"}
            />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{
              background: "var(--sur)", border: "1.5px solid var(--bor)",
              borderRadius: "var(--r)", padding: "9px 14px",
              color: "var(--tx2)", fontSize: 13, outline: "none",
              cursor: "pointer", fontFamily: "var(--font)",
            }}>
            {SORT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12,
                fontWeight: category === c ? 600 : 400, cursor: "pointer",
                border: "1.5px solid", transition: "all .15s",
                background: category === c ? "var(--brand)" : "var(--sur)",
                borderColor: category === c ? "var(--brand)" : "var(--bor)",
                color: category === c ? "#fff" : "var(--tx3)",
              }}>
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        {pageItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>👗</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", marginBottom: 8 }}>No products found</div>
            <div style={{ fontSize: 12, color: "var(--tx3)" }}>Try a different search or filter.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
            {pageItems.map((p, i) => <ProductCard key={p.article_id} product={p} delay={i * 40} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "7px 16px", borderRadius: "var(--r)", fontSize: 12, background: "var(--sur)", border: "1px solid var(--bor)", color: "var(--tx2)", cursor: "pointer", opacity: page === 1 ? .4 : 1 }}>
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const n = i + 1;
              return (
                <button key={n} onClick={() => setPage(n)}
                  style={{
                    width: 34, height: 34, borderRadius: "var(--r)", fontSize: 12,
                    fontWeight: 600, cursor: "pointer", border: "1.5px solid",
                    transition: "all .15s",
                    background: page === n ? "var(--brand)" : "var(--sur)",
                    borderColor: page === n ? "var(--brand)" : "var(--bor)",
                    color: page === n ? "#fff" : "var(--tx3)",
                  }}>
                  {n}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "7px 16px", borderRadius: "var(--r)", fontSize: 12, background: "var(--sur)", border: "1px solid var(--bor)", color: "var(--tx2)", cursor: "pointer", opacity: page === totalPages ? .4 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
