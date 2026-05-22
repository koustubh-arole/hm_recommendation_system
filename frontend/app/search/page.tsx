"use client";
import { useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import ProductCard from "@/components/ui/ProductCard";
import { recsAPI } from "@/services/api";
import type { Product } from "@/types";

const CATEGORIES  = ["Dresses", "Jeans", "T-Shirts", "Jackets", "Sportswear", "Formal Wear", "Floral Prints", "Kids"];
const SUGGESTIONS = ["summer floral dress", "warm winter jacket", "casual t-shirt", "black jeans", "workout clothes", "formal shirt", "evening wear", "kids hoodie"];

export default function SearchPage() {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [searched,  setSearched]  = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [count,     setCount]     = useState(8);
  const [error,     setError]     = useState("");

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setSearched(true);
    setLastQuery(q.trim()); setError("");
    try {
      const data = await recsAPI.search(q.trim(), count);
      const normalised: Product[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
      setResults(normalised);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(
        status === 503 ? "ChromaDB is not ready. Run the embedding pipeline first." :
        status === 404 ? "Search endpoint not found. Check api/main.py." :
        "Search failed — make sure FastAPI is running on port 8000."
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => { setSearched(false); setResults([]); setQuery(""); setLastQuery(""); setError(""); };

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--tx)", marginBottom: 4, letterSpacing: "-0.03em" }}>
            Find anything with AI
          </h2>
          <p style={{ fontSize: 12, color: "var(--tx3)" }}>
            Powered by ChromaDB + all-MiniLM-L6-v2 embeddings · Finds products by meaning, not just keywords
          </p>
        </div>

        {/* Search bar */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--tx3)" }}>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
            placeholder={`e.g. "summer floral dress" or "warm winter jacket for men"`}
            style={{
              width: "100%", background: "var(--sur)",
              border: "1.5px solid var(--bor)", borderRadius: "var(--r2)",
              padding: "14px 140px 14px 46px",
              color: "var(--tx)", fontSize: 14,
              fontFamily: "var(--font)", outline: "none", transition: "border-color .18s",
            }}
            onFocus={(e) => (e.target as HTMLElement).style.borderColor = "var(--brand)"}
            onBlur={(e)  => (e.target as HTMLElement).style.borderColor = "var(--bor)"}
          />
          <button onClick={() => doSearch(query)} className="btn-primary"
            style={{ position: "absolute", right: 8, top: 8, bottom: 8, padding: "0 20px", fontSize: 13, borderRadius: "var(--r)", display: "flex", alignItems: "center", gap: 6 }}>
            ⌕ Search
          </button>
        </div>

        {/* Semantic hint */}
        <div style={{
          background: "var(--bl-bg)", border: "1px solid var(--bl-bor)",
          borderRadius: "var(--r)", padding: "9px 14px",
          fontSize: 11, color: "var(--tx3)", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ color: "var(--bl)", fontWeight: 600 }}>💡 Semantic search</span>
          understands meaning — try <em style={{ color: "var(--tx2)" }}>"something cozy for cold weather"</em> or <em style={{ color: "var(--tx2)" }}>"office wear for women"</em>.
        </div>

        {/* Result count selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 11, color: "var(--tx3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Results:</span>
          {[4, 8, 12, 20].map((n) => (
            <button key={n} onClick={() => setCount(n)}
              style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 12,
                fontWeight: 600, cursor: "pointer", border: "1.5px solid",
                transition: "all .15s",
                background: count === n ? "var(--brand)" : "var(--sur)",
                borderColor: count === n ? "var(--brand)" : "var(--bor)",
                color: count === n ? "#fff" : "var(--tx3)",
              }}>
              {n}
            </button>
          ))}
        </div>

        {/* Pre-search: categories + suggestions */}
        {!searched && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)", marginBottom: 12 }}>Popular Categories</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => doSearch(cat)}
                  style={{
                    padding: "14px 12px", borderRadius: "var(--r)",
                    fontSize: 13, fontWeight: 500,
                    background: "var(--sur)", border: "1.5px solid var(--bor)",
                    color: "var(--tx2)", cursor: "pointer", transition: "all .18s",
                  }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--brand)"; el.style.color = "var(--brand)"; el.style.background = "var(--brand-muted)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--bor)";   el.style.color = "var(--tx2)";   el.style.background = "var(--sur)"; }}>
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Try these</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => doSearch(s)}
                  style={{
                    padding: "5px 14px", borderRadius: 20, fontSize: 12,
                    background: "var(--sur2)", border: "1px solid var(--bor)",
                    color: "var(--tx3)", cursor: "pointer", transition: "all .15s",
                  }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--brand)"; el.style.color = "var(--brand)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--bor)";   el.style.color = "var(--tx3)"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div>
            <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 16 }}>
              Searching <strong style={{ color: "var(--tx)" }}>&ldquo;{lastQuery}&rdquo;</strong> with ChromaDB embeddings…
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {Array.from({ length: count }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ height: 220, borderRadius: "var(--r2) var(--r2) 0 0" }} />
                  <div className="card" style={{ borderTop: "none", borderRadius: "0 0 var(--r2) var(--r2)", padding: "12px 14px" }}>
                    <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 13, width: "80%", marginBottom: 12 }} />
                    <div className="skeleton" style={{ height: 28 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ background: "var(--rd-bg)", border: "1px solid var(--rd-bor)", borderRadius: "var(--r2)", padding: "16px 20px", color: "var(--rd)", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* No results */}
        {searched && !loading && !error && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>⌕</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", marginBottom: 8 }}>No results for &ldquo;{lastQuery}&rdquo;</div>
            <div style={{ fontSize: 12, color: "var(--tx3)" }}>Try a different term or browse the categories above.</div>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>Results for &ldquo;{lastQuery}&rdquo;</div>
                <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>
                  {results.length} product{results.length !== 1 ? "s" : ""} via semantic search
                </div>
              </div>
              <button onClick={handleClear}
                style={{ padding: "6px 14px", borderRadius: "var(--r)", fontSize: 12, background: "none", border: "1px solid var(--bor)", color: "var(--tx3)", cursor: "pointer" }}>
                ✕ Clear
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {results.map((p, i) => (
                <ProductCard key={p.article_id || i} product={p} showScore delay={i * 40} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
