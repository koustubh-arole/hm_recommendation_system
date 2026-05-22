


"""
api/main.py
-----------
FastAPI application entry point.

Serves:
  /auth/*          — JWT authentication
  /api/*           — ML recommendation endpoints
  /                — React frontend (built files from frontend/dist)

Run:
  uvicorn api.main:app --reload --port 8000
"""
import threading
import sys
from contextlib import asynccontextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from api.auth import (
    get_current_user,
    init_db,
    require_admin,
    router as auth_router,
)

# ── Path config ────────────────────────────────────────────────────────
PROCESSED = ROOT / "data" / "processed"
RAW       = ROOT / "data" / "raw"
FRONTEND_DIST = ROOT / "frontend" / "dist"

# ── In-memory cache ────────────────────────────────────────────────────
_cache: dict = {}
_cache_lock = threading.Lock()

def get_cached_df(path: str, **read_kwargs):
    with _cache_lock:
        if path not in _cache:
            _cache[path] = pd.read_csv(path, **read_kwargs)
        return _cache[path]


def _get_prices() -> pd.DataFrame:
    """Return article_id → price (INR) lookup (cached)."""
    path = str(PROCESSED / "article_prices.csv")
    with _cache_lock:
        if path not in _cache:
            p = PROCESSED / "article_prices.csv"
            if p.exists():
                df = pd.read_csv(p, dtype={"article_id": str})
                df["article_id"] = df["article_id"].str.lstrip("0")
                # Normalise column name — pipeline outputs 'price' or legacy 'price_gbp'
                if "price_gbp" in df.columns and "price" not in df.columns:
                    df = df.rename(columns={"price_gbp": "price"})
                _cache[path] = df
            else:
                _cache[path] = pd.DataFrame(columns=["article_id", "price"])
        return _cache[path]

# ── Lifespan ───────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("[main] Database initialised.")
    # Pre-warm the ChromaDB embedding model so the first search is instant
    try:
        from utils.chroma_search import _model, collection
        _ = _model.encode("warmup", normalize_embeddings=True)
        print(f"[main] ChromaDB model ready — {collection.count():,} products indexed.")
    except Exception as e:
        print(f"[main] ChromaDB pre-warm skipped: {e}")
    yield

# ── App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="H&M Retail AI Platform",
    version="2.0.0",
    description="Hybrid AI Retail Intelligence — Recommendations, Segmentation & Forecasting",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth router ────────────────────────────────────────────────────────
app.include_router(auth_router)


# ══════════════════════════════════════════════════════════════════════
# RECOMMENDATION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/recommendations/{customer_id}")
def get_recommendations(customer_id: str, current_user=Depends(get_current_user)):
    """
    Return personalised recommendations for a customer, enriched with
    product metadata joined from articles.csv.
    Users can only fetch their own; admins can fetch any.
    """
    if current_user["role"] == "user":
        jwt_cid = current_user.get("customer_id") or ""
        if jwt_cid.lstrip("0") != customer_id.lstrip("0"):
            raise HTTPException(403, "Access denied.")

    path = PROCESSED / "user_recommendations.csv"
    if not path.exists() or path.stat().st_size == 0:
        raise HTTPException(503, "Recommendation data not ready. Run recommendation_pipeline.")

    # Cache the full CSV on first call (slow once, fast forever after)
    df = get_cached_df(str(path), dtype={"customer_id": str, "article_id": str})
    cid_clean = customer_id.lstrip("0")
    recs = df[df["customer_id"].str.lstrip("0") == cid_clean].copy()
    recs["article_id"] = recs["article_id"].str.lstrip("0")

    # Rename prod_name → product_name BEFORE the articles merge to avoid
    # pandas creating prod_name_x / prod_name_y suffix columns
    if "prod_name" in recs.columns and "product_name" not in recs.columns:
        recs = recs.rename(columns={"prod_name": "product_name"})

    if recs.empty:
        # Cold-start fallback — return trending products directly
        trending_path = PROCESSED / "top_products_7d.csv"
        if not trending_path.exists() or trending_path.stat().st_size == 0:
            return {"customer_id": customer_id, "recommendations": []}
        try:
            trending_df = pd.read_csv(trending_path, dtype={"article_id": str})
            return {"window": "7d", "products": trending_df.to_dict(orient="records")}
        except Exception:
            return {"customer_id": customer_id, "recommendations": []}

    art_path = RAW / "articles.csv"
    if art_path.exists():
        arts = get_cached_df(
            str(art_path),
            dtype={"article_id": str},
            usecols=["article_id", "prod_name", "product_type_name", "colour_group_name"],
        )
        arts = arts.copy()
        arts["article_id"] = arts["article_id"].str.lstrip("0")
        # Rename in arts too so the merge produces clean column names
        arts = arts.rename(columns={"prod_name": "article_name"})
        recs = recs.merge(arts, on="article_id", how="left")
        # Use article name as the authoritative name (fill blanks from recs)
        if "article_name" in recs.columns:
            recs["product_name"] = recs["article_name"].fillna(
                recs.get("product_name", "Unknown")
            ).fillna("Unknown")

    recs["product_name"]      = recs.get("product_name",      pd.Series(["Unknown"] * len(recs))).fillna("Unknown")
    recs["product_type_name"] = recs.get("product_type_name", pd.Series([""] * len(recs))).fillna("")
    recs["colour_group_name"] = recs.get("colour_group_name", pd.Series([""] * len(recs))).fillna("")

    # Join prices
    prices = _get_prices()
    if not prices.empty:
        recs = recs.merge(prices, on="article_id", how="left")

    output_cols = [c for c in
        ["article_id", "product_name", "product_type_name", "colour_group_name", "cluster", "rank", "score", "price"]
        if c in recs.columns]
    result = recs[output_cols].head(40).to_dict(orient="records")

    return {"customer_id": customer_id, "recommendations": result}


@app.get("/api/trending/{window}")
def get_trending(window: str = "7d", current_user=Depends(get_current_user)):
    """Return globally trending products. window = '7d' or '30d'."""
    if window not in ("7d", "30d"):
        raise HTTPException(400, "window must be '7d' or '30d'")
    path = PROCESSED / f"top_products_{window}.csv"
    if not path.exists() or path.stat().st_size == 0:
        raise HTTPException(503, f"Trending data not ready. Run the trending pipeline to generate top_products_{window}.csv.")
    try:
        df = pd.read_csv(path, dtype={"article_id": str})
    except Exception as e:
        raise HTTPException(503, f"Trending data unreadable: {e}")
    if df.empty:
        raise HTTPException(503, "Trending data is empty. Run the trending pipeline.")
    df["article_id"] = df["article_id"].str.lstrip("0")
    prices = _get_prices()
    if not prices.empty:
        df = df.merge(prices, on="article_id", how="left")
    return {"window": window, "products": df.to_dict(orient="records")}


@app.get("/api/search")
def semantic_search(q: str, n: int = 10, current_user=Depends(get_current_user)):
    """ChromaDB semantic search."""
    try:
        from utils.chroma_search import search as chroma_search
        results = chroma_search(q, n_results=n)
        return {"query": q, "results": results}
    except Exception as e:
        raise HTTPException(503, f"Search unavailable: {e}")


@app.get("/api/customer/{customer_id}/profile")
def get_customer_profile(customer_id: str, current_user=Depends(get_current_user)):
    """RFM cluster + demographic profile for a customer."""
    if current_user["role"] != "admin":
        jwt_cid = current_user.get("customer_id")
        if not jwt_cid:
            raise HTTPException(403, "No customer_id linked to this account.")
        customer_id = jwt_cid

    path = PROCESSED / "rfm_segmented.csv"
    if not path.exists():
        raise HTTPException(503, "RFM data not ready.")

    df = get_cached_df(str(path), dtype={"customer_id": str})

    row = df[df["customer_id"] == customer_id]
    if row.empty:
        stripped = customer_id.lstrip("0")
        row = df[df["customer_id"].str.lstrip("0") == stripped]
    if row.empty:
        raise HTTPException(404, "Customer not found.")

    record = row.iloc[0].to_dict()

    # Labels derived from actual cluster centroids (recency/frequency/monetary analysis)
    cluster_labels = {
        3: "Champions",
        4: "Loyal Customers",
        0: "Potential Loyalists",
        2: "At-Risk Customers",
        1: "Lost Customers",
    }
    cluster = record.get("cluster")
    record["segment"] = cluster_labels.get(int(cluster), f"Cluster {cluster}") if cluster is not None else "Unknown"

    return record


# ══════════════════════════════════════════════════════════════════════
# PRODUCT CATALOGUE ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/products")
def get_products(
    page: int = 1,
    per_page: int = 50,
    category: str = "",
    q: str = "",
    current_user=Depends(get_current_user),
):
    """Paginated product catalogue from article_lookup.csv."""
    path = PROCESSED / "article_lookup.csv"
    if not path.exists():
        path = RAW / "articles.csv"
    if not path.exists():
        raise HTTPException(503, "Product data not ready.")

    df = get_cached_df(str(path), dtype={"article_id": str})
    df = df.copy()
    df.columns = [c.lower().strip() for c in df.columns]

    if "prod_name" in df.columns and "product_name" not in df.columns:
        df = df.rename(columns={"prod_name": "product_name"})

    if category:
        cat_col = next((c for c in df.columns if "product_type" in c), None)
        if cat_col:
            df = df[df[cat_col].str.lower() == category.lower()]

    if q:
        name_col = "product_name" if "product_name" in df.columns else None
        if name_col:
            df = df[df[name_col].str.lower().str.contains(q.lower(), na=False)]

    total = len(df)
    start = (page - 1) * per_page
    page_df = df.iloc[start : start + per_page].copy()

    prices = _get_prices()
    if not prices.empty:
        page_df = page_df.merge(prices, on="article_id", how="left")

    return {"total": total, "page": page, "per_page": per_page, "products": page_df.to_dict(orient="records")}


@app.get("/api/products/{article_id}")
def get_product(article_id: str, current_user=Depends(get_current_user)):
    """Single product by article_id."""
    path = PROCESSED / "article_lookup.csv"
    if not path.exists():
        path = RAW / "articles.csv"
    if not path.exists():
        raise HTTPException(503, "Product data not ready.")

    df = get_cached_df(str(path), dtype={"article_id": str})
    df = df.copy()
    df.columns = [c.lower().strip() for c in df.columns]
    df["article_id"] = df["article_id"].str.lstrip("0")

    row = df[df["article_id"] == article_id.lstrip("0")]
    if row.empty:
        raise HTTPException(404, "Product not found.")

    record = row.iloc[0].to_dict()
    if "prod_name" in record and "product_name" not in record:
        record["product_name"] = record.pop("prod_name")

    prices = _get_prices()
    if not prices.empty:
        p_row = prices[prices["article_id"] == article_id.lstrip("0")]
        if not p_row.empty:
            record["price"] = float(p_row.iloc[0]["price_gbp"])

    return record


# ══════════════════════════════════════════════════════════════════════
# ADMIN-ONLY ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/admin/cluster-stats")
def cluster_stats(current_user=Depends(get_current_user)):
    path = PROCESSED / "rfm_segmented.csv"
    if not path.exists():
        raise HTTPException(503, "RFM data not ready.")

    df = get_cached_df(str(path), usecols=lambda c: c.lower() in [
        "cluster", "recency", "frequency", "monetary",
        "recency_score", "frequency_score", "monetary_score"
    ])
    df.columns = [c.lower().strip() for c in df.columns]

    cluster_col  = next((c for c in df.columns if "cluster"   in c), None)
    rec_col      = next((c for c in df.columns if "recency"   in c), None)
    freq_col     = next((c for c in df.columns if "frequency" in c), None)
    mon_col      = next((c for c in df.columns if "monetary"  in c), None)

    if not cluster_col:
        raise HTTPException(500, "No cluster column found.")

    total = len(df)
    grouped = df.groupby(cluster_col)

    clusters = []
    for c, grp in grouped:
        clusters.append({
            "cluster":       int(c),
            "size":          int(len(grp)),
            "percentage":    round(len(grp) / total * 100),
            "avg_recency":   round(float(grp[rec_col].mean()),  1) if rec_col  else 0,
            "avg_frequency": round(float(grp[freq_col].mean()), 2) if freq_col else 0,
            "avg_monetary":  round(float(grp[mon_col].mean()),  2) if mon_col  else 0,
        })

    return {
        "n_clusters":      len(clusters),
        "total_customers": total,
        "avg_recency":     round(float(df[rec_col].mean()),  1) if rec_col  else 0,
        "avg_frequency":   round(float(df[freq_col].mean()), 2) if freq_col else 0,
        "avg_monetary":    round(float(df[mon_col].mean()),  2) if mon_col  else 0,
        "clusters":        sorted(clusters, key=lambda x: x["cluster"]),
    }


@app.get("/api/admin/forecast")
def admin_forecast(_admin=Depends(require_admin)):
    """XGBoost forecast — structured summary, top-7d, top-30d, per-article data."""
    path         = PROCESSED / "forecast_output.csv"
    summary_path = PROCESSED / "forecast_summary.csv"

    if not path.exists() or path.stat().st_size == 0:
        raise HTTPException(503, "Forecast data not ready. Run the forecasting pipeline.")

    df = get_cached_df(str(path), dtype={"article_id": str})
    df = df.copy()
    df["article_id"] = df["article_id"].str.lstrip("0")
    df["date_dt"]    = pd.to_datetime(df["date"])

    # ── KPIs, top-30d, top-7d from summary ───────────────────────────
    top30, top7, kpis, article_options = [], [], {}, []

    if summary_path.exists():
        summary = pd.read_csv(summary_path, dtype={"article_id": str})
        summary["article_id"] = summary["article_id"].str.lstrip("0")

        # 7-day window: first 7 calendar days of the forecast
        min_date = df["date_dt"].min()
        df_7d    = df[df["date_dt"] <= min_date + pd.Timedelta(days=6)]
        demand_7d = df_7d.groupby("article_id")["predicted_demand"].sum().reset_index(name="demand_7d")

        summary = summary.merge(demand_7d, on="article_id", how="left")
        summary["demand_7d"] = summary["demand_7d"].fillna(0).astype(int)

        top30 = (
            summary.sort_values("total_predicted", ascending=False)
            .head(10)
            [["article_id", "prod_name", "product_group_name", "total_predicted", "daily_avg"]]
            .rename(columns={"prod_name": "product_name"})
            .to_dict(orient="records")
        )
        top7 = (
            summary.sort_values("demand_7d", ascending=False)
            .head(10)
            [["article_id", "prod_name", "product_group_name", "demand_7d"]]
            .rename(columns={"prod_name": "product_name", "demand_7d": "total_predicted"})
            .to_dict(orient="records")
        )
        kpis = {
            "articles_forecasted":    int(len(summary)),
            "total_predicted_demand": int(summary["total_predicted"].sum()),
            "daily_avg_per_article":  round(float(summary["daily_avg"].mean()), 1),
            "horizon_days":           int(summary["forecast_days"].iloc[0]) if len(summary) > 0 else 30,
        }
        article_options = (
            summary[["article_id", "prod_name", "product_group_name"]]
            .rename(columns={"prod_name": "product_name"})
            .sort_values("product_name")
            .to_dict(orient="records")
        )

    # ── Aggregated daily totals (for the overview chart) ─────────────
    daily = (
        df.groupby("date")["predicted_demand"]
        .sum()
        .reset_index()
        .rename(columns={"predicted_demand": "total_demand"})
    )
    daily["date"] = pd.to_datetime(daily["date"]).dt.strftime("%b %d")

    # ── Per-article daily data (for the dropdown chart) ───────────────
    df["date_fmt"] = pd.to_datetime(df["date"]).dt.strftime("%b %d")
    article_daily: dict = {}
    for art_id, grp in df.groupby("article_id"):
        grp_s = grp.sort_values("date_dt")
        article_daily[str(art_id)] = (
            grp_s[["date_fmt", "predicted_demand"]]
            .rename(columns={"date_fmt": "date", "predicted_demand": "demand"})
            .assign(demand=lambda x: x["demand"].astype(int))
            .to_dict(orient="records")
        )

    return {
        "kpis":           kpis,
        "top30":          top30,
        "top7":           top7,
        "daily_demand":   daily.to_dict(orient="records"),
        "article_options": article_options,
        "article_daily":  article_daily,
    }


@app.get("/api/admin/health")
def system_health(_admin=Depends(require_admin)):
    """System health check — returns status of all services."""
    import time

    health: dict = {"version": "2.0.0", "status": "healthy", "services": {}}
    health["services"]["fastapi"] = {"status": "healthy", "latency_ms": 1}

    try:
        from api.auth import _get_conn
        t0 = time.time()
        _get_conn().execute("SELECT 1").fetchone()
        health["services"]["sqlite"] = {"status": "healthy", "latency_ms": round((time.time()-t0)*1000)}
    except Exception as e:
        health["services"]["sqlite"] = {"status": "down", "error": str(e)}

    try:
        t0 = time.time()
        import chromadb
        client = chromadb.PersistentClient(path=str(ROOT / "chroma_db"))
        cols = client.list_collections()
        health["services"]["chromadb"] = {"status": "healthy", "collections": len(cols), "latency_ms": round((time.time()-t0)*1000)}
    except Exception as e:
        health["services"]["chromadb"] = {"status": "down", "error": str(e)}

    rfm_path = PROCESSED / "rfm_segmented.csv"
    health["services"]["rfm_pipeline"] = {
        "status": "healthy" if rfm_path.exists() else "down",
        "file_exists": rfm_path.exists(),
    }

    model_path = ROOT / "models" / "xgb_demand_model.pkl"
    health["services"]["ml_model"] = {
        "status": "healthy" if model_path.exists() else "down",
        "file_exists": model_path.exists(),
    }

    any_down = any(s.get("status") == "down" for s in health["services"].values())
    health["status"] = "degraded" if any_down else "healthy"
    return health


@app.get("/api/admin/cluster-recommendations")
def cluster_recommendations(current_user=Depends(get_current_user)):
    recs_path = PROCESSED / "cluster_recommendations.csv"
    if not recs_path.exists():
        raise HTTPException(503, "Cluster data not ready.")

    recs = get_cached_df(str(recs_path), dtype={"article_id": str})

    art_path = RAW / "articles.csv"
    if art_path.exists():
        extra_cols = ["article_id", "product_type_name", "colour_group_name",
                      "index_group_name", "section_name", "detail_desc"]
        existing = set(recs.columns)
        load_cols = [c for c in extra_cols if c not in existing or c == "article_id"]
        if len(load_cols) > 1:
            arts = pd.read_csv(art_path, dtype={"article_id": str}, usecols=load_cols)
            recs["article_id"] = recs["article_id"].str.lstrip("0")
            arts["article_id"] = arts["article_id"].str.lstrip("0")
            recs = recs.merge(arts, on="article_id", how="left")
        else:
            recs["article_id"] = recs["article_id"].str.lstrip("0")

    recs["product_name"]      = recs["prod_name"].fillna("Unknown") if "prod_name" in recs.columns else "Unknown"
    recs["product_type_name"] = recs["product_type_name"].fillna("Unknown") if "product_type_name" in recs.columns else "Unknown"
    recs["colour"]            = recs["colour_group_name"].fillna("") if "colour_group_name" in recs.columns else ""
    recs["brand_group"]       = recs["index_group_name"].fillna("") if "index_group_name" in recs.columns else ""
    recs["section"]           = recs["section_name"].fillna("") if "section_name" in recs.columns else ""
    recs["description"]       = recs["detail_desc"].fillna("") if "detail_desc" in recs.columns else ""

    return recs.to_dict(orient="records")


@app.get("/api/admin/co-purchase")
def admin_co_purchase(_admin=Depends(require_admin)):
    path = PROCESSED / "co_purchase_recs.csv"
    if not path.exists():
        raise HTTPException(503, "Data not ready.")
    df = pd.read_csv(path, dtype={"article_id": str, "also_bought_id": str})
    return df.head(500).to_dict(orient="records")


@app.post("/api/admin/retrain")
def trigger_retrain(pipeline: str = "full", _admin=Depends(require_admin)):
    """Trigger a pipeline retraining run in the background."""
    def _run():
        if pipeline == "rfm":
            from pipelines.rfm_pipeline import run_pipeline
        elif pipeline == "recommendations":
            from pipelines.recommendation_pipeline import run_pipeline
        else:
            from pipelines.full_retraining_pipeline import run_pipeline
        run_pipeline()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return {"detail": f"Pipeline '{pipeline}' triggered.", "status": "running"}


@app.get("/api/admin/users")
def admin_users(_admin=Depends(require_admin)):
    from api.auth import db_list_users
    return db_list_users()


# ══════════════════════════════════════════════════════════════════════
# SERVE REACT FRONTEND (production)
# ══════════════════════════════════════════════════════════════════════

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_react(full_path: str):
        """Catch-all: serve React index.html for client-side routing."""
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(str(index))
        raise HTTPException(404, "Frontend not built. Run: cd frontend && npm run build")
else:
    @app.get("/", include_in_schema=False)
    def root():
        return {
            "message": "H&M Retail AI API is running.",
            "docs": "/docs",
            "note": "Frontend not built yet. Run: cd frontend && npm run build",
        }
    