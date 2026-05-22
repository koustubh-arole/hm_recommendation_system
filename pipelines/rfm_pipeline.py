"""
rfm_pipeline.py
===============
Production pipeline for RFM Segmentation + KMeans Clustering.

Inputs  : data/raw/transactions_train.csv
          data/processed/customers_clean.csv
Outputs : data/processed/rfm_segmented.csv
          data/processed/rfm_segmented.parquet

Run     : python pipelines/rfm_pipeline.py
Import  : from pipelines.rfm_pipeline import run_pipeline

IMPORTANT: customer_id is stored as raw hex string throughout.
           Never hash or convert to integer — downstream pipelines depend on
           raw IDs for correct merges.
"""

import logging
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Path Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA = BASE_DIR / "data" / "raw"
PROCESSED_DATA = BASE_DIR / "data" / "processed"

TRANSACTIONS_RAW_PATH = RAW_DATA / "transactions_train.csv"
CUSTOMERS_CLEAN_PATH = PROCESSED_DATA / "customers_clean.csv"
RFM_SEGMENTED_CSV = PROCESSED_DATA / "rfm_segmented.csv"
RFM_SEGMENTED_PARQUET = PROCESSED_DATA / "rfm_segmented.parquet"

# ---------------------------------------------------------------------------
# Hyperparameters
# ---------------------------------------------------------------------------
N_CLUSTERS = 5
RANDOM_STATE = 42
KMEANS_N_INIT = 10

# Customer attribute columns to merge into RFM (keep only those present)
CUSTOMER_COLS = [
    "customer_id", "FN", "Active", "club_member_status",
    "fashion_news_frequency", "age", "age_group",
    "engagement_score", "age_bucket",
]

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
    """
    Load only the columns required for RFM computation.
    customer_id is read as str and immediately converted to category to save RAM.
    """
    logger.info(f"Loading transactions from {path}")
    df = pd.read_csv(
        path,
        usecols=["t_dat", "customer_id", "price"],
        dtype={"customer_id": "str", "price": "float32"},
        parse_dates=["t_dat"],
        engine="c",
    )
    df["customer_id"] = df["customer_id"].astype("category")
    logger.info(f"Transactions loaded — {len(df):,} rows")
    return df


def load_customers(path: Path = CUSTOMERS_CLEAN_PATH) -> pd.DataFrame:
    """Load cleaned customer attributes produced by data_prep_pipeline."""
    logger.info(f"Loading customers from {path}")
    df = pd.read_csv(
        path,
        dtype={
            "customer_id": "str",
            "club_member_status": "category",
            "fashion_news_frequency": "category",
        },
    )
    df["customer_id"] = df["customer_id"].astype("category")
    logger.info(f"Customers loaded — {len(df):,} rows")
    return df


# ===========================================================================
# RFM FEATURE ENGINEERING
# ===========================================================================

def compute_rfm(transactions: pd.DataFrame) -> pd.DataFrame:
    """
    Compute Recency, Frequency, Monetary features per customer.

    Recency  : days since last purchase (from snapshot = max_date + 1 day)
    Frequency: total number of transactions
    Monetary : total spend (GBP)
    """
    snapshot_date = transactions["t_dat"].max() + pd.Timedelta(days=1)
    logger.info(f"Snapshot date: {snapshot_date.date()}")

    rfm = (
        transactions
        .groupby("customer_id")
        .agg(
            recency=("t_dat", lambda x: (snapshot_date - x.max()).days),
            frequency=("t_dat", "count"),
            monetary=("price", "sum"),
        )
        .reset_index()
    )

    logger.info(f"RFM computed — {rfm.shape[0]:,} customers")
    return rfm


def merge_customer_attributes(rfm: pd.DataFrame, customers: pd.DataFrame) -> pd.DataFrame:
    """
    Left-join customer demographic / engagement features onto RFM table.
    Only keeps columns that actually exist in the customers dataframe.
    """
    logger.info("Merging customer attributes into RFM …")

    # Align category dtype for a fast merge
    customers["customer_id"] = customers["customer_id"].astype("category")
    rfm["customer_id"] = rfm["customer_id"].astype("category")

    # Keep only existing columns
    available_cols = [c for c in CUSTOMER_COLS if c in customers.columns]
    rfm = rfm.merge(customers[available_cols], on="customer_id", how="left")

    logger.info(f"After merge — shape {rfm.shape}")
    null_counts = rfm.isna().sum()
    null_counts = null_counts[null_counts > 0]
    if not null_counts.empty:
        logger.warning(f"Nulls after merge:\n{null_counts}")
    return rfm


# ===========================================================================
# MODEL TRAINING
# ===========================================================================

def train_kmeans(rfm: pd.DataFrame) -> tuple[pd.DataFrame, KMeans, StandardScaler]:
    """
    Scale RFM features and fit KMeans clustering.

    Pre-processing:
      - Log1p transform frequency + monetary to reduce right skew
      - StandardScaler to normalise all three dimensions

    Returns rfm dataframe with 'cluster' column, fitted KMeans, and scaler.
    """
    logger.info(f"Training KMeans (n_clusters={N_CLUSTERS}, random_state={RANDOM_STATE}) …")

    features = rfm[["recency", "frequency", "monetary"]].copy()
    features["frequency"] = np.log1p(features["frequency"])
    features["monetary"] = np.log1p(features["monetary"])
    features = features.fillna(features.median())

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)

    kmeans = KMeans(
        n_clusters=N_CLUSTERS,
        random_state=RANDOM_STATE,
        n_init=KMEANS_N_INIT,
    )
    rfm = rfm.copy()
    rfm["cluster"] = kmeans.fit_predict(X_scaled)

    dist = rfm["cluster"].value_counts().sort_index()
    logger.info(f"Cluster distribution:\n{dist.to_string()}")

    return rfm, kmeans, scaler


# ===========================================================================
# VALIDATION
# ===========================================================================

def validate_rfm(rfm: pd.DataFrame) -> None:
    """
    Sanity checks:
      1. customer_id must be raw hex strings (not hashed integers)
      2. cluster column must exist with expected range
    """
    sample = str(rfm["customer_id"].iloc[0])
    assert len(sample) > 20 and not sample.lstrip("-").isdigit(), (
        f"customer_id looks like a hash ({sample!r}). "
        "Check that transactions_train.csv and customers_clean.csv have raw hex IDs."
    )

    assert "cluster" in rfm.columns, "Missing cluster column"
    assert rfm["cluster"].nunique() == N_CLUSTERS, (
        f"Expected {N_CLUSTERS} clusters, found {rfm['cluster'].nunique()}"
    )

    profile = rfm.groupby("cluster")[["recency", "frequency", "monetary"]].mean().round(2)
    logger.info(f"Cluster profiles:\n{profile.to_string()}")
    logger.info(f"customer_id format OK — sample: {sample[:30]}…")
    logger.info("RFM validation passed.")


# ===========================================================================
# SAVE OUTPUTS
# ===========================================================================

def save_outputs(rfm: pd.DataFrame) -> None:
    """
    Persist RFM segmented data in both CSV and Parquet formats.
    CSV  — compatibility with downstream notebooks / Streamlit
    Parquet — fast loading for production pipelines
    """
    PROCESSED_DATA.mkdir(parents=True, exist_ok=True)

    rfm.to_csv(RFM_SEGMENTED_CSV, index=False)
    logger.info(f"Saved rfm_segmented.csv — shape {rfm.shape} → {RFM_SEGMENTED_CSV}")

    rfm.to_parquet(RFM_SEGMENTED_PARQUET, index=False)
    logger.info(f"Saved rfm_segmented.parquet → {RFM_SEGMENTED_PARQUET}")

    logger.info(f"Sample customer_id: {rfm['customer_id'].iloc[0]}")
    logger.info(f"Columns: {rfm.columns.tolist()}")


# ===========================================================================
# MASTER PIPELINE RUNNER
# ===========================================================================

def run_pipeline() -> dict:
    """
    Execute the full RFM segmentation pipeline:
      1. Load transactions + cleaned customers
      2. Compute RFM features
      3. Merge customer attributes
      4. Train KMeans clustering
      5. Validate output integrity
      6. Save CSV + Parquet

    Returns dict of output paths for orchestrator use.
    """
    logger.info("=" * 60)
    logger.info("START: rfm_pipeline")
    logger.info("=" * 60)

    transactions = load_transactions()
    customers = load_customers()

    rfm = compute_rfm(transactions)
    rfm = merge_customer_attributes(rfm, customers)
    rfm, kmeans, scaler = train_kmeans(rfm)

    validate_rfm(rfm)
    save_outputs(rfm)

    outputs = {
        "rfm_segmented_csv": str(RFM_SEGMENTED_CSV),
        "rfm_segmented_parquet": str(RFM_SEGMENTED_PARQUET),
        "n_customers": len(rfm),
        "n_clusters": N_CLUSTERS,
    }

    logger.info("=" * 60)
    logger.info("DONE: rfm_pipeline")
    for k, v in outputs.items():
        logger.info(f"  {k}: {v}")
    logger.info("=" * 60)
    return outputs


# ===========================================================================
# ENTRY POINT
# ===========================================================================

if __name__ == "__main__":
    run_pipeline()