"""
data_prep_pipeline.py
=====================
Production pipeline for Phase 1 — Data Preparation.

Inputs  : data/raw/articles.csv, data/raw/customers.csv, data/raw/transactions_train.csv
Outputs : data/processed/article_lookup.csv
          data/processed/customers_clean.csv
          data/processed/transactions_small.csv

Run     : python pipelines/data_prep_pipeline.py
Import  : from pipelines.data_prep_pipeline import run_pipeline
"""

import logging
import os
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Path Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA = BASE_DIR / "data" / "raw"
PROCESSED_DATA = BASE_DIR / "data" / "processed"

ARTICLES_RAW_PATH = RAW_DATA / "articles.csv"
CUSTOMERS_RAW_PATH = RAW_DATA / "customers.csv"
TRANSACTIONS_RAW_PATH = RAW_DATA / "transactions_train.csv"

ARTICLE_LOOKUP_PATH = PROCESSED_DATA / "article_lookup.csv"
CUSTOMERS_CLEAN_PATH = PROCESSED_DATA / "customers_clean.csv"
TRANSACTIONS_SMALL_PATH = PROCESSED_DATA / "transactions_small.csv"

# ---------------------------------------------------------------------------
# Hyperparameters / Business Config
# ---------------------------------------------------------------------------
TRANSACTIONS_START_DATE = "2019-09-22"   # Keep only last ~1 year of transactions
CHUNK_SIZE = 500_000                      # Streaming chunk size for large TX file

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
# ARTICLES PIPELINE
# ===========================================================================

def load_articles(path: Path = ARTICLES_RAW_PATH) -> pd.DataFrame:
    """Load raw articles CSV."""
    logger.info(f"Loading articles from {path}")
    df = pd.read_csv(path, dtype={"article_id": str})
    logger.info(f"Articles loaded — shape {df.shape}")
    return df


def clean_articles(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fill nulls and create derived feature columns:
      - detail_desc       : fill nulls with empty string
      - style_key         : product_type | colour | graphical_appearance
      - product_family    : alias for product_type_name (cross-sell seed)
      - gender_category   : alias for index_name (prevents cross-gender recs)
    """
    logger.info("Cleaning articles data …")
    df = df.copy()

    df["detail_desc"] = df["detail_desc"].fillna("")

    # Derived features
    df["style_key"] = (
        df["product_type_name"].fillna("Unknown") + " | " +
        df["colour_group_name"].fillna("Unknown") + " | " +
        df["graphical_appearance_name"].fillna("Unknown")
    )
    df["product_family"] = df["product_type_name"]
    df["gender_category"] = df["index_name"]

    logger.info(f"Articles cleaned — shape {df.shape}")
    return df


def build_article_lookup(df: pd.DataFrame) -> pd.DataFrame:
    """
    Select and fill required lookup columns.
    Returns a slim article lookup table used by recommendation pipelines.
    """
    logger.info("Building article lookup table …")
    cols = [
        "article_id", "prod_name", "product_type_name", "product_group_name",
        "graphical_appearance_name", "colour_group_name", "index_name",
        "style_key", "product_family", "gender_category",
    ]
    # Keep only columns that exist (guard against schema changes)
    cols = [c for c in cols if c in df.columns]
    lookup = df[cols].copy()

    fill_map = {
        "prod_name": "Unknown Product",
        "product_type_name": "Unknown Type",
        "product_group_name": "Unknown Group",
        "graphical_appearance_name": "Unknown Appearance",
        "colour_group_name": "Unknown Color",
        "index_name": "Unknown",
    }
    for col, val in fill_map.items():
        if col in lookup.columns:
            lookup[col] = lookup[col].fillna(val)

    logger.info(f"Article lookup built — {len(lookup):,} rows")
    return lookup


def validate_article_lookup(df: pd.DataFrame) -> None:
    """Hard assertions on article lookup integrity."""
    assert "article_id" in df.columns, "Missing article_id column"
    assert df["article_id"].isna().sum() == 0, "Null article_ids found"
    assert len(df) > 100_000, f"Suspiciously few articles: {len(df)}"
    logger.info("Article lookup validation passed.")


def save_article_lookup(df: pd.DataFrame, path: Path = ARTICLE_LOOKUP_PATH) -> None:
    """Persist article lookup to CSV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    logger.info(f"Saved article_lookup.csv — {len(df):,} rows → {path}")


# ===========================================================================
# CUSTOMERS PIPELINE
# ===========================================================================

def load_customers(path: Path = CUSTOMERS_RAW_PATH) -> pd.DataFrame:
    """Load raw customers CSV."""
    logger.info(f"Loading customers from {path}")
    df = pd.read_csv(path, dtype={"customer_id": str})
    logger.info(f"Customers loaded — shape {df.shape}")
    return df


def clean_customers(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full customer cleaning pipeline:
      1. Fill FN / Active nulls with 0 (preserve signal via binary flag first)
      2. Fill fashion_news_frequency nulls with 'NONE'
      3. Normalise club_member_status (PRE-CREATE / LEFT CLUB → INACTIVE)
      4. Fill club_member_status nulls with 'UNKNOWN'
      5. Fill age nulls with median
      6. Drop postal_code (high cardinality, low predictive value)
      7. Engineer: age_group, engagement_score, age_bucket
    """
    logger.info("Cleaning customers data …")
    df = df.copy()

    # Nulls for behavioural flags
    df["FN"] = df["FN"].fillna(0)
    df["Active"] = df["Active"].fillna(0)
    df["fashion_news_frequency"] = df["fashion_news_frequency"].fillna("NONE")

    # Club status normalisation
    df["club_member_status"] = df["club_member_status"].replace({
        "PRE-CREATE": "INACTIVE",
        "LEFT CLUB": "INACTIVE",
    })
    df["club_member_status"] = df["club_member_status"].fillna("UNKNOWN")

    # Age imputation
    median_age = df["age"].median()
    df["age"] = df["age"].fillna(median_age)

    # Drop high-cardinality / irrelevant columns
    if "postal_code" in df.columns:
        df = df.drop(columns=["postal_code"])

    # Engineered features
    df["age_group"] = df["age"].apply(_age_group)
    df["engagement_score"] = df.apply(_engagement_score, axis=1)
    df["age_bucket"] = pd.cut(
        df["age"],
        bins=[0, 25, 40, 60, 100],
        labels=[0, 1, 2, 3],
    )

    logger.info(f"Customers cleaned — shape {df.shape}")
    logger.info(f"Null check:\n{df.isna().sum()[df.isna().sum() > 0]}")
    return df


def _age_group(age: float) -> str:
    """Bucket raw age into named demographic group."""
    if age < 25:
        return "Young"
    elif age < 40:
        return "Adult"
    elif age < 60:
        return "Middle"
    return "Senior"


def _engagement_score(row: pd.Series) -> int:
    """
    Composite engagement score:
      FN flag (0/1) + Active flag (0/1) + news_frequency bonus (0/1/2)
    """
    score = int(row["FN"]) + int(row["Active"])
    freq = row["fashion_news_frequency"]
    if freq == "Regularly":
        score += 2
    elif freq == "Monthly":
        score += 1
    return score


def save_customers_clean(df: pd.DataFrame, path: Path = CUSTOMERS_CLEAN_PATH) -> None:
    """Persist cleaned customers to CSV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    logger.info(f"Saved customers_clean.csv — {len(df):,} rows → {path}")


# ===========================================================================
# TRANSACTIONS PIPELINE
# ===========================================================================

def build_transactions_small(
    raw_path: Path = TRANSACTIONS_RAW_PATH,
    out_path: Path = TRANSACTIONS_SMALL_PATH,
    start_date: str = TRANSACTIONS_START_DATE,
    chunk_size: int = CHUNK_SIZE,
) -> None:
    """
    Stream-process the large transactions CSV in chunks to avoid OOM.
    Filters to start_date onwards, keeps required columns, and writes
    directly to disk (no full-file RAM accumulation).

    NOTE: customer_id is kept as raw string (NOT hashed) to maintain
    compatibility with rfm_pipeline and recommendation_pipeline.
    """
    logger.info(f"Building transactions_small.csv (start_date={start_date}) …")
    start_dt = pd.to_datetime(start_date)

    if out_path.exists():
        os.remove(out_path)
        logger.info(f"Removed existing {out_path.name}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    first_chunk = True
    total_rows = 0

    for chunk in pd.read_csv(
        raw_path,
        chunksize=chunk_size,
        parse_dates=["t_dat"],
        dtype={
            "customer_id": "str",
            "article_id": "str",     # keep as string — aligns with article_lookup
            "price": "float32",
            "sales_channel_id": "int8",
        },
    ):
        chunk = chunk[chunk["t_dat"] >= start_dt]
        chunk = chunk[["t_dat", "customer_id", "article_id", "price"]]
        chunk["price"] = chunk["price"].astype("float32")

        chunk.to_csv(
            out_path,
            mode="w" if first_chunk else "a",
            header=first_chunk,
            index=False,
        )
        total_rows += len(chunk)
        first_chunk = False

    logger.info(f"transactions_small.csv written — {total_rows:,} rows → {out_path}")


def validate_transactions_small(path: Path = TRANSACTIONS_SMALL_PATH) -> None:
    """Quick sanity check on the filtered transactions file."""
    df = pd.read_csv(path, nrows=1000, parse_dates=["t_dat"])
    assert "customer_id" in df.columns
    assert "article_id" in df.columns
    assert len(df) > 0
    logger.info("transactions_small.csv validation passed.")


# ===========================================================================
# MASTER PIPELINE RUNNER
# ===========================================================================

def run_pipeline() -> dict:
    """
    Execute the full data preparation pipeline in order:
      1. Articles → article_lookup.csv
      2. Customers → customers_clean.csv
      3. Transactions → transactions_small.csv

    Returns a dict of output paths for orchestrator use.
    """
    logger.info("=" * 60)
    logger.info("START: data_prep_pipeline")
    logger.info("=" * 60)

    # --- Articles ---
    articles_raw = load_articles()
    articles_clean = clean_articles(articles_raw)
    article_lookup = build_article_lookup(articles_clean)
    validate_article_lookup(article_lookup)
    save_article_lookup(article_lookup)

    # --- Customers ---
    customers_raw = load_customers()
    customers_clean = clean_customers(customers_raw)
    save_customers_clean(customers_clean)

    # --- Transactions ---
    build_transactions_small()
    validate_transactions_small()

    outputs = {
        "article_lookup": str(ARTICLE_LOOKUP_PATH),
        "customers_clean": str(CUSTOMERS_CLEAN_PATH),
        "transactions_small": str(TRANSACTIONS_SMALL_PATH),
    }

    logger.info("=" * 60)
    logger.info("DONE: data_prep_pipeline")
    for k, v in outputs.items():
        logger.info(f"  {k}: {v}")
    logger.info("=" * 60)
    return outputs


# ===========================================================================
# ENTRY POINT
# ===========================================================================

if __name__ == "__main__":
    run_pipeline()