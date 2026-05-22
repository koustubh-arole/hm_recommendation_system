"""
full_retraining_pipeline.py
============================
Master orchestrator that runs all pipelines end-to-end in dependency order.

Execution order:
  1. data_prep_pipeline      → article_lookup, customers_clean, transactions_small
  2. rfm_pipeline            → rfm_segmented (CSV + Parquet)
  3. recommendation_pipeline → cluster_recs, co_purchase, user_recs, trending

This file is designed for:
  - Manual full retrains     : python pipelines/full_retraining_pipeline.py
  - Scheduled cron jobs      : 0 2 * * 0 /usr/bin/python3 /path/to/full_retraining_pipeline.py
  - Airflow DAG tasks        : from pipelines.full_retraining_pipeline import run_pipeline
  - CI/CD post-deploy hooks  : python -m pipelines.full_retraining_pipeline

Run  : python pipelines/full_retraining_pipeline.py
       python pipelines/full_retraining_pipeline.py --skip-data-prep   (if raw data unchanged)
"""

import argparse
import logging
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap (ensure project root is on sys.path when run directly)
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from pipelines.data_prep_pipeline import run_pipeline as run_data_prep
from pipelines.rfm_pipeline import run_pipeline as run_rfm
from pipelines.recommendation_pipeline import run_pipeline as run_recommendations

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
# STAGE RUNNER
# ===========================================================================

def _run_stage(name: str, fn) -> dict:
    """
    Execute a single pipeline stage with timing and error isolation.
    Returns the stage output dict on success, raises on failure.
    """
    logger.info(f"{'─' * 60}")
    logger.info(f"STAGE START: {name}")
    logger.info(f"{'─' * 60}")
    t0 = time.perf_counter()

    try:
        outputs = fn()
        elapsed = time.perf_counter() - t0
        logger.info(f"STAGE DONE: {name} — {elapsed:.1f}s")
        return outputs
    except Exception as exc:
        elapsed = time.perf_counter() - t0
        logger.error(f"STAGE FAILED: {name} — {elapsed:.1f}s — {exc}", exc_info=True)
        raise


# ===========================================================================
# MASTER PIPELINE RUNNER
# ===========================================================================

def run_pipeline(skip_data_prep: bool = False) -> dict:
    """
    Run the full end-to-end retraining pipeline.

    Parameters
    ----------
    skip_data_prep : bool
        If True, skip Stage 1 (data_prep_pipeline). Use when raw source data
        has not changed and you only want to refresh ML models.

    Returns
    -------
    dict
        Aggregated outputs from all stages, keyed by stage name.
    """
    wall_start = time.perf_counter()
    all_outputs: dict = {}

    logger.info("=" * 60)
    logger.info("START: full_retraining_pipeline")
    logger.info(f"skip_data_prep={skip_data_prep}")
    logger.info("=" * 60)

    # ------------------------------------------------------------------
    # Stage 1 — Data Preparation
    # ------------------------------------------------------------------
    if not skip_data_prep:
        outputs = _run_stage("data_prep_pipeline", run_data_prep)
        all_outputs["data_prep"] = outputs
    else:
        logger.info("STAGE SKIPPED: data_prep_pipeline (--skip-data-prep flag set)")

    # ------------------------------------------------------------------
    # Stage 2 — RFM Segmentation
    # ------------------------------------------------------------------
    outputs = _run_stage("rfm_pipeline", run_rfm)
    all_outputs["rfm"] = outputs

    # ------------------------------------------------------------------
    # Stage 3 — Product Recommendations
    # ------------------------------------------------------------------
    outputs = _run_stage("recommendation_pipeline", run_recommendations)
    all_outputs["recommendations"] = outputs

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    wall_elapsed = time.perf_counter() - wall_start
    logger.info("=" * 60)
    logger.info(f"DONE: full_retraining_pipeline — total {wall_elapsed:.1f}s")
    logger.info("Outputs summary:")
    for stage, stage_outputs in all_outputs.items():
        logger.info(f"  [{stage}]")
        for k, v in stage_outputs.items():
            logger.info(f"    {k}: {v}")
    logger.info("=" * 60)

    return all_outputs


# ===========================================================================
# ENTRY POINT
# ===========================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Full end-to-end retraining pipeline for the H&M Retail AI Platform."
    )
    parser.add_argument(
        "--skip-data-prep",
        action="store_true",
        help="Skip Stage 1 (data_prep_pipeline) when raw data is unchanged.",
    )
    args = parser.parse_args()

    try:
        run_pipeline(skip_data_prep=args.skip_data_prep)
        sys.exit(0)
    except Exception:
        logger.critical("full_retraining_pipeline FAILED — see errors above.", exc_info=True)
        sys.exit(1)