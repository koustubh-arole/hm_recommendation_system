"""
recommendation_pipeline.py
===========================
Production pipeline for Product Recommendations.

Strategy:
  - Known users  → cluster top-N items (based on purchase frequency)
  - Cold users   → global trending items (last 7d / 30d)
  - Co-purchase  → 'customers also bought' pairs within each cluster

Inputs  : data/raw/transactions_train.csv
          data/raw/articles.csv
          data/processed/rfm_segmented.csv
Outputs : data/processed/cluster_recommendations.csv
          data/processed/co_purchase_recs.csv
          data/processed/user_recommendations.csv
          data/processed/top_products_7d.csv
          data/processed/top_products_30d.csv

Run     : python pipelines/recommendation_pipeline.py
Import  : from pipelines.recommendation_pipeline import run_pipeline

IMPORTANT: customer_id is raw hex string. Never hash / convert to int.
           Both transactions_train.csv and rfm_segmented.csv must use raw IDs.
"""

import logging
from datetime import timedelta
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# Path Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA = BASE_DIR / "data" / "raw"
PROCESSED_DATA = BASE_DIR / "data" / "processed"

TRANSACTIONS_RAW_PATH = RAW_DATA / "transactions_train.csv"
ARTICLES_RAW_PATH = RAW_DATA / "articles.csv"
RFM_SEGMENTED_PATH = PROCESSED_DATA / "rfm_segmented.csv"

CLUSTER_RECS_PATH = PROCESSED_DATA / "cluster_recommendations.csv"
CO_PURCHASE_PATH = PROCESSED_DATA / "co_purchase_recs.csv"
USER_RECS_PATH = PROCESSED_DATA / "user_recommendations.csv"
TOP_7D_PATH = PROCESSED_DATA / "top_products_7d.csv"
TOP_30D_PATH = PROCESSED_DATA / "top_products_30d.csv"

# ---------------------------------------------------------------------------
# Hyperparameters / Business Config
# ---------------------------------------------------------------------------
TOP_N = 10           # Recommendations per user
CO_TOP_ITEMS = 50    # Seed items per cluster for co-purchase computation
CO_TOP_RECS = 5      # 'Also bought' items to keep per seed item

# Article metadata columns to enrich outputs
META_COLS = ["article_id", "prod_name", "product_group_name"]

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ===========================================================================
# DATA LOADING
# ===========================================================================

def load_transactions(path: Path = TRANSACTIONS_RAW_PATH) -> pd.DataFrame:
    """Load full transaction history with article_id and customer_id as strings."""
    logger.info(f"Loading transactions from {path}")
    df = pd.read_csv(
        path,
        dtype={"article_id": str, "customer_id": str},
        parse_dates=["t_dat"],
    )
    logger.info(f"Transactions loaded — {df.shape[0]:,} rows")
    return df


def load_rfm(path: Path = RFM_SEGMENTED_PATH) -> pd.DataFrame:
    """Load RFM segmented data produced by rfm_pipeline."""
    logger.info(f"Loading RFM segments from {path}")
    df = pd.read_csv(path, dtype={"customer_id": str})
    logger.info(f"RFM loaded — {df.shape[0]:,} customers, clusters: {sorted(df['cluster'].unique())}")
    return df


def load_articles(path: Path = ARTICLES_RAW_PATH) -> pd.DataFrame:
    """Load article metadata for output enrichment."""
    logger.info(f"Loading articles from {path}")
    df = pd.read_csv(path, dtype={"article_id": str}, usecols=META_COLS)
    logger.info(f"Articles loaded — {len(df):,} rows")
    return df


# ===========================================================================
# ID ALIGNMENT VALIDATION
# ===========================================================================

def validate_id_alignment(df_tx: pd.DataFrame, df_rfm: pd.DataFrame) -> None:
    """
    Verify that both transaction and RFM customer IDs are raw hex strings
    (not hashed integers). Raises ValueError if either column is hashed.
    Also logs overlap statistics.
    """
    sample_tx = str(df_tx["customer_id"].iloc[0])
    sample_rfm = str(df_rfm["customer_id"].iloc[0])

    logger.info(f"TX  sample id : {sample_tx!r}  (len={len(sample_tx)})")
    logger.info(f"RFM sample id: {sample_rfm!r}  (len={len(sample_rfm)})")

    def _is_hashed(s: str) -> bool:
        return s.lstrip("-").isdigit() and len(s) < 25

    if _is_hashed(sample_tx) or _is_hashed(sample_rfm):
        raise ValueError(
            "\nOne or both ID columns contain hashed integers.\n"
            "Fix: re-run rfm_pipeline.py — it must keep raw hex IDs.\n"
            "Then delete data/processed/rfm_segmented.csv and re-run."
        )

    overlap = set(df_tx["customer_id"]) & set(df_rfm["customer_id"])
    pct = 100 * len(overlap) / df_rfm["customer_id"].nunique()
    logger.info(f"Overlapping customers: {len(overlap):,}  ({pct:.1f}% of RFM customers)")

    if pct < 50:
        logger.warning(
            "Overlap below 50%. Possible cause: rfm_segmented.csv was built "
            "from customers_clean.csv but not all customers have transactions — "
            "this is normal for H&M dataset."
        )


# ===========================================================================
# COLD-START FALLBACK
# ===========================================================================

def compute_trending_products(df_tx: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """
    Compute globally trending products for cold-start (new/unknown users).
    Returns top-N articles by purchase count for 7-day and 30-day windows.
    """
    logger.info("Computing cold-start trending products …")
    latest_date = df_tx["t_dat"].max()

    def _top_window(days: int) -> pd.DataFrame:
        cutoff = latest_date - timedelta(days=days)
        return (
            df_tx[df_tx["t_dat"] >= cutoff]
            .groupby("article_id")
            .size()
            .reset_index(name="purchase_count")
            .sort_values("purchase_count", ascending=False)
            .head(TOP_N)
        )

    top_7d = _top_window(7)
    top_30d = _top_window(30)

    logger.info(f"Latest date: {latest_date.date()}")
    logger.info(f"Top-7d  articles: {len(top_7d)}")
    logger.info(f"Top-30d articles: {len(top_30d)}")
    return {"7d": top_7d, "30d": top_30d}


# ===========================================================================
# CLUSTER-LEVEL RECOMMENDATIONS
# ===========================================================================

def compute_cluster_top_products(
    df_tx: pd.DataFrame,
    df_rfm: pd.DataFrame,
    df_articles: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Merge transactions with cluster assignments, then rank articles by
    purchase frequency within each cluster.

    Returns:
      df_merged    : transactions enriched with cluster column
      cluster_tops : top-N articles per cluster with article metadata
    """
    logger.info("Computing cluster top products …")
    df_merged = df_tx.merge(df_rfm[["customer_id", "cluster"]], on="customer_id", how="inner")
    logger.info(f"Merged rows: {len(df_merged):,}")

    if len(df_merged) == 0:
        raise ValueError(
            "Transaction-RFM merge produced 0 rows. "
            "Run validate_id_alignment() to diagnose the ID mismatch."
        )

    cluster_tops = (
        df_merged
        .groupby(["cluster", "article_id"])
        .size()
        .reset_index(name="purchase_count")
        .sort_values(["cluster", "purchase_count"], ascending=[True, False])
        .groupby("cluster")
        .head(TOP_N)
        .reset_index(drop=True)
    )

    # Enrich with article metadata
    available_meta = [c for c in META_COLS if c in df_articles.columns]
    cluster_tops = cluster_tops.merge(df_articles[available_meta], on="article_id", how="left")

    logger.info(f"Cluster top-{TOP_N} table — {len(cluster_tops):,} rows")
    return df_merged, cluster_tops


# ===========================================================================
# CO-PURCHASE RECOMMENDATIONS
# ===========================================================================

def compute_co_purchase(df_merged: pd.DataFrame) -> pd.DataFrame:
    """
    Within each cluster, compute 'customers also bought' pairs via self-join.
    Only considers the top CO_TOP_ITEMS seed items per cluster to keep the
    self-join tractable on large datasets.

    Returns co_purchase_df with columns:
      [article_id, also_bought_id, co_count, cluster]
    """
    logger.info("Computing co-purchase recommendations …")
    co_rows = []

    for cluster_id, cluster_df in df_merged.groupby("cluster"):
        n_customers = cluster_df["customer_id"].nunique()
        logger.info(
            f"  Cluster {cluster_id}: {len(cluster_df):,} transactions, "
            f"{n_customers:,} customers"
        )

        top_items = (
            cluster_df.groupby("article_id").size()
            .nlargest(CO_TOP_ITEMS).index.tolist()
        )

        # One row per (customer, item) — removes duplicate buys of same item
        slim = (
            cluster_df[cluster_df["article_id"].isin(top_items)]
            [["customer_id", "article_id"]]
            .drop_duplicates()
        )

        # Self-join: find all item pairs bought by same customer
        co = slim.merge(
            slim.rename(columns={"article_id": "also_bought_id"}),
            on="customer_id",
        )
        co = co[co["article_id"] != co["also_bought_id"]]

        if co.empty:
            logger.warning(f"No co-purchases in cluster {cluster_id} — skipping")
            continue

        co_counts = (
            co.groupby(["article_id", "also_bought_id"])
            .size()
            .reset_index(name="co_count")
            .sort_values("co_count", ascending=False)
        )
        top_co = co_counts.groupby("article_id").head(CO_TOP_RECS).copy()
        top_co["cluster"] = cluster_id
        co_rows.append(top_co)

    if co_rows:
        co_purchase_df = pd.concat(co_rows, ignore_index=True)
        logger.info(f"Co-purchase table: {len(co_purchase_df):,} rows")
    else:
        co_purchase_df = pd.DataFrame(
            columns=["article_id", "also_bought_id", "co_count", "cluster"]
        )
        logger.warning("co_purchase_df is empty — customers may not be buying multiple items")

    return co_purchase_df


# ===========================================================================
# PER-USER PERSONALISED RECOMMENDATIONS
# ===========================================================================

def build_user_history(df_tx: pd.DataFrame) -> pd.DataFrame:
    """Build a set of already-purchased article_ids per customer for exclusion."""
    return (
        df_tx.groupby("customer_id")["article_id"]
        .apply(set)
        .reset_index()
        .rename(columns={"article_id": "purchased_set"})
    )


def recommend_for_user(
    cluster: int,
    purchased: set,
    cluster_tops_dict: dict,
    n: int = TOP_N,
    exclude_purchased: bool = False,
) -> list:
    """
    Return top-N recommended article_ids for a single user.

    exclude_purchased=False (default) because most users bought only 1-2 items
    from the top-10 cluster list, so exclusion reduces result count unnecessarily.
    Set to True for pure novelty mode.
    """
    candidates = cluster_tops_dict.get(cluster, [])
    if exclude_purchased:
        candidates = [a for a in candidates if a not in purchased]
    return candidates[:n]


def compute_user_recommendations(
    df_rfm: pd.DataFrame,
    df_tx: pd.DataFrame,
    cluster_tops: pd.DataFrame,
    df_articles: pd.DataFrame,
) -> pd.DataFrame:
    """
    Generate per-user personalised recommendations and return a flat table
    with one row per (user, recommended_article).
    """
    logger.info("Computing per-user personalised recommendations …")

    # Build cluster → [article_id, ...] lookup dict
    cluster_tops_dict = {
        cid: grp["article_id"].tolist()
        for cid, grp in cluster_tops.groupby("cluster")
    }

    user_history = build_user_history(df_tx)

    user_recs = df_rfm[["customer_id", "cluster"]].merge(
        user_history, on="customer_id", how="left"
    )
    user_recs["purchased_set"] = user_recs["purchased_set"].apply(
        lambda x: x if isinstance(x, set) else set()
    )
    user_recs["recommendations"] = user_recs.apply(
        lambda row: recommend_for_user(row["cluster"], row["purchased_set"], cluster_tops_dict),
        axis=1,
    )

    n_users = len(user_recs)
    avg_recs = user_recs["recommendations"].apply(len).mean()
    zero_recs = (user_recs["recommendations"].apply(len) == 0).sum()
    logger.info(f"Users with recommendations: {n_users:,}")
    logger.info(f"Avg recs per user: {avg_recs:.1f}")
    logger.info(f"Users with 0 recs: {zero_recs:,}")

    # Explode to flat table
    available_meta = [c for c in META_COLS if c in df_articles.columns]
    user_recs_flat = (
        user_recs[["customer_id", "cluster", "recommendations"]]
        .explode("recommendations")
        .rename(columns={"recommendations": "article_id"})
        .dropna(subset=["article_id"])
        .merge(df_articles[available_meta], on="article_id", how="left")
        .assign(rank=lambda df: df.groupby("customer_id").cumcount() + 1)
    )

    logger.info(f"User recommendations flat table — {len(user_recs_flat):,} rows")
    return user_recs_flat


# ===========================================================================
# SAVE OUTPUTS
# ===========================================================================

def save_outputs(
    cluster_tops: pd.DataFrame,
    co_purchase_df: pd.DataFrame,
    user_recs_flat: pd.DataFrame,
    trending: dict[str, pd.DataFrame],
    df_articles: pd.DataFrame,
) -> None:
    """Persist all recommendation outputs to the processed data directory."""
    PROCESSED_DATA.mkdir(parents=True, exist_ok=True)
    available_meta = [c for c in META_COLS if c in df_articles.columns]

    cluster_tops.to_csv(CLUSTER_RECS_PATH, index=False)
    logger.info(f"Saved cluster_recommendations.csv — {len(cluster_tops):,} rows")

    co_purchase_df.to_csv(CO_PURCHASE_PATH, index=False)
    logger.info(f"Saved co_purchase_recs.csv — {len(co_purchase_df):,} rows")

    user_recs_flat.to_csv(USER_RECS_PATH, index=False)
    logger.info(f"Saved user_recommendations.csv — {len(user_recs_flat):,} rows")

    for window, df_top in trending.items():
        out_path = PROCESSED_DATA / f"top_products_{window}.csv"
        enriched = df_top.merge(df_articles[available_meta], on="article_id", how="left")
        enriched.to_csv(out_path, index=False)
        logger.info(f"Saved top_products_{window}.csv — {len(enriched)} rows")

    logger.info(f"All outputs written to {PROCESSED_DATA}")


# ===========================================================================
# COVERAGE DIAGNOSTICS
# ===========================================================================

def log_coverage_report(
    df_rfm: pd.DataFrame,
    df_merged: pd.DataFrame,
    user_recs_flat: pd.DataFrame,
    cluster_tops: pd.DataFrame,
) -> None:
    """Log a coverage report for monitoring / alerting."""
    total_rfm = len(df_rfm)
    users_with_tx = df_merged["customer_id"].nunique()
    total_recs = len(user_recs_flat)
    users_with_recs = user_recs_flat["customer_id"].nunique() if total_recs > 0 else 0
    avg_recs = user_recs_flat.groupby("customer_id").size().mean() if total_recs > 0 else 0

    logger.info("=== COVERAGE REPORT ===")
    logger.info(f"Total RFM users            : {total_rfm:,}")
    logger.info(f"Users with TX in merged    : {users_with_tx:,}")
    logger.info(f"Users with recommendations : {users_with_recs:,}")
    logger.info(f"Avg recommendations/user   : {avg_recs:.1f}")

    dist = df_rfm["cluster"].value_counts().sort_index()
    logger.info(f"Cluster distribution:\n{dist.to_string()}")


# ===========================================================================
# MASTER PIPELINE RUNNER
# ===========================================================================

def run_pipeline() -> dict:
    """
    Execute the full recommendation pipeline:
      1. Load transactions, RFM segments, article metadata
      2. Validate ID alignment (raw hex, no hashing)
      3. Compute cold-start trending products (7d / 30d)
      4. Compute cluster-level top products
      5. Compute co-purchase ('also bought') pairs
      6. Generate per-user personalised recommendations
      7. Save all outputs

    Returns dict of output paths for orchestrator use.
    """
    logger.info("=" * 60)
    logger.info("START: recommendation_pipeline")
    logger.info("=" * 60)

    df_tx = load_transactions()
    df_rfm = load_rfm()
    df_articles = load_articles()

    validate_id_alignment(df_tx, df_rfm)

    trending = compute_trending_products(df_tx)
    df_merged, cluster_tops = compute_cluster_top_products(df_tx, df_rfm, df_articles)
    co_purchase_df = compute_co_purchase(df_merged)
    user_recs_flat = compute_user_recommendations(df_rfm, df_tx, cluster_tops, df_articles)

    save_outputs(cluster_tops, co_purchase_df, user_recs_flat, trending, df_articles)
    log_coverage_report(df_rfm, df_merged, user_recs_flat, cluster_tops)

    outputs = {
        "cluster_recommendations": str(CLUSTER_RECS_PATH),
        "co_purchase_recs": str(CO_PURCHASE_PATH),
        "user_recommendations": str(USER_RECS_PATH),
        "top_products_7d": str(TOP_7D_PATH),
        "top_products_30d": str(TOP_30D_PATH),
    }

    logger.info("=" * 60)
    logger.info("DONE: recommendation_pipeline")
    for k, v in outputs.items():
        logger.info(f"  {k}: {v}")
    logger.info("=" * 60)
    return outputs


# ===========================================================================
# ENTRY POINT
# ===========================================================================

if __name__ == "__main__":
    run_pipeline()