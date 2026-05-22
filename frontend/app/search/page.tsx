"use client";
import { useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import ProductCard from "@/components/ui/ProductCard";
import { recsAPI } from "@/services/api";
import type { Product } from "@/types";

const CATEGORIES = ["Dresses","Jeans","T-Shirts","Jackets","Sportswear","Formal Wear","Floral Prints","Kids"];
const SUGGESTIONS = ["summer floral dress","warm winter jacket","casual t-shirt","black jeans","workout clothes","formal shirt","evening wear","kids hoodie"];

export default function SearchPage() {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [lastQuery,setLastQuery]= useState("");
  const [count,    setCount]    = useState(8);
  const [error,    setError]    = useState("");

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setLastQuery(q.trim());
    setError("");
    try {
      // recsAPI.search already calls normaliseProduct() on every item
      const data = await recsAPI.search(q.trim(), count);

      // data.results is already Product[] after normalisation in api.ts
      const normalised: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results) ? data.results : [];

      setResults(normalised);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        setError("ChromaDB is not ready. Run the embedding pipeline first:\n  python pipelines/data_prep_pipeline.py");
      } else if (status === 404) {
        setError("Search endpoint not found. Check api/main.py has /api/search route.");
      } else {
        setError("Search failed — make sure FastAPI is running on port 8000.");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearched(false);
    setResults([]);
    setQuery("");
    setLastQuery("");
    setError("");
  };

  return (
    <DashboardShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", animation: "fadeUp .4s ease" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--bl-bg)", border: "1px solid var(--bl-bor)", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: "var(--bl)", marginBottom: 12 }}>
            🔍 Semantic Search
          </div>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: "var(--tx)", marginBottom: 6 }}>
            Find anything with AI
          </h2>
          <p style={{ fontSize: 12, color: "var(--tx3)" }}>
            Powered by ChromaDB + all-MiniLM-L6-v2 embeddings · Finds products by meaning, not just keywords
          </p>
        </div>

        {/* Search input */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", fontSize: 18 }}>🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
            placeholder={`e.g. "summer floral dress" or "warm winter jacket for men"`}
            style={{
              width: "100%", background: "var(--sur)", border: "1px solid var(--bor2)",
              borderRadius: "var(--r2)", padding: "16px 140px 16px 52px",
              color: "var(--tx)", fontSize: 15, fontFamily: "DM Sans, sans-serif",
              outline: "none", transition: "all .2s",
            }}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = "var(--gold-border2)"; (e.target as HTMLElement).style.background = "var(--sur2)"; }}
            onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = "var(--bor2)";        (e.target as HTMLElement).style.background = "var(--sur)";  }}
          />
          <button onClick={() => doSearch(query)} className="btn-gold"
            style={{ position: "absolute", right: 8, top: 8, bottom: 8, padding: "0 20px", fontSize: 13, borderRadius: "var(--r)" }}>
            🔍 Search
          </button>
        </div>

        {/* Semantic hint */}
        <div style={{ background: "var(--sur2)", border: "1px solid var(--bor)", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 11, color: "var(--tx3)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
          💡 <strong style={{ color: "var(--gold)" }}>Semantic search</strong> understands meaning — try{" "}
          <em style={{ color: "var(--tx2)" }}>&ldquo;something cozy for cold weather&rdquo;</em> or{" "}
          <em style={{ color: "var(--tx2)" }}>&ldquo;office wear for women&rdquo;</em>.
        </div>

        {/* Count selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <span style={{ fontSize: 11, color: "var(--tx3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Results:</span>
          {[4, 8, 12, 20].map((n) => (
            <button key={n} onClick={() => setCount(n)}
              style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer", border: "1px solid", transition: "all .15s",
                background: count === n ? "var(--gold-bg)" : "transparent",
                borderColor: count === n ? "var(--gold-border2)" : "var(--bor)",
                color: count === n ? "var(--gold)" : "var(--tx3)",
              }}>
              {n}
            </button>
          ))}
        </div>

        {/* Pre-search: category + suggestion chips */}
        {!searched && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "var(--tx)", marginBottom: 14 }}>⭐ Popular Categories</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => doSearch(cat)}
                  style={{ padding: "14px 12px", borderRadius: "var(--r)", fontSize: 13, fontWeight: 600, background: "var(--sur)", border: "1px solid var(--bor)", color: "var(--tx2)", cursor: "pointer", transition: "all .2s", fontFamily: "Syne, sans-serif" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--gold-border2)"; el.style.color = "var(--gold)"; el.style.background = "var(--gold-bg)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--bor)"; el.style.color = "var(--tx2)"; el.style.background = "var(--sur)"; }}>
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>💡 Try these</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => doSearch(s)}
                  style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, background: "var(--sur2)", border: "1px solid var(--bor)", color: "var(--tx3)", cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-border)"; (e.currentTarget as HTMLElement).style.color = "var(--gold)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--bor)";         (e.currentTarget as HTMLElement).style.color = "var(--tx3)"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div>
            <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 16, fontFamily: "Syne, sans-serif" }}>
              Searching <strong style={{ color: "var(--tx)" }}>&ldquo;{lastQuery}&rdquo;</strong> with ChromaDB embeddings…
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {Array.from({ length: count }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ height: 220, borderRadius: "var(--r2) var(--r2) 0 0" }} />
                  <div style={{ background: "var(--sur)", border: "1px solid var(--bor)", borderTop: "none", borderRadius: "0 0 var(--r2) var(--r2)", padding: "14px 16px" }}>
                    <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 14, width: "80%", marginBottom: 12 }} />
                    <div className="skeleton" style={{ height: 32, width: "100%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ background: "var(--rd-bg)", border: "1px solid var(--rd-bor)", borderRadius: "var(--r2)", padding: "16px 20px", color: "var(--rd)", fontSize: 13, whiteSpace: "pre-line" }}>
            ⚠️ {error}
          </div>
        )}

        {/* No results */}
        {searched && !loading && !error && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "var(--tx)", marginBottom: 8 }}>
              No results for &ldquo;{lastQuery}&rdquo;
            </div>
            <div style={{ fontSize: 12, color: "var(--tx3)" }}>Try a different term or browse the categories above.</div>
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <div>
            {/* Result count + query echo */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>
                  Results for &ldquo;{lastQuery}&rdquo;
                </div>
                <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>
                  {results.length} product{results.length !== 1 ? "s" : ""} via semantic embedding
                </div>
              </div>
              <button onClick={handleClear}
                style={{ padding: "6px 14px", borderRadius: "var(--r)", fontSize: 12, background: "none", border: "1px solid var(--bor)", color: "var(--tx3)", cursor: "pointer" }}>
                ✕ Clear
              </button>
            </div>

            {/* ProductCard grid — data already normalised by api.ts */}
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
