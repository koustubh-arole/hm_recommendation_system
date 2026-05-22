"""
demand_forecasting.py  (project root)
--------------------------------------
End-to-end orchestrator for the demand forecasting pipeline.
Run this file directly:   python demand_forecasting.py

Steps executed:
  1. Aggregate transactions_train.csv → daily_demand.csv  (chunked read)
  2. Feature engineering
  3. Train XGBoost model + evaluate
  4. Forecast next FORECAST_DAYS for top TOP_ARTICLES products
  5. Save outputs to data/processed/

All downstream code (Streamlit app, engine.py) reads only the CSVs —
it does NOT import this file directly, so there is zero circular-import risk.
"""

import sys
import os
from pathlib import Path

# ── Make sure project root is on path so `forecasting` package is importable ──
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import pandas as pd
import numpy as np

from forecasting.feature_engineering import build_features
from forecasting.model_training       import train_model
from forecasting.predict              import generate_forecast, summarise_forecast

# ─── Config ───────────────────────────────────────────────────────────────────
DATA_RAW        = ROOT / 'data' / 'raw'
DATA_PROC       = ROOT / 'data' / 'processed'
MODEL_DIR       = ROOT / 'models'

TRANSACTIONS    = DATA_RAW  / 'transactions_train.csv'
ARTICLE_LOOKUP  = DATA_PROC / 'article_lookup.csv'

DAILY_DEMAND_OUT  = DATA_PROC / 'daily_demand.csv'
FORECAST_OUT      = DATA_PROC / 'forecast_output.csv'
FORECAST_SUMMARY  = DATA_PROC / 'forecast_summary.csv'
MODEL_PATH        = MODEL_DIR  / 'xgb_demand_model.pkl'

TOP_ARTICLES      = 500      # only forecast top N products by total sales
FORECAST_DAYS     = 30
CHUNK_SIZE        = 500_000  # rows per chunk when reading transactions


# ─── Step 1: Aggregate daily demand (chunked to avoid OOM) ────────────────────
def build_daily_demand(transactions_path: Path,
                       top_n: int = TOP_ARTICLES) -> pd.DataFrame:
    """
    Reads transactions in chunks, aggregates to (article_id, date, demand).
    Returns only the top_n articles by total historical purchases.
    """
    print(f'\n[1/4] Building daily demand from {transactions_path.name} ...')
    counts = {}   # article_id → {date → count}

    reader = pd.read_csv(
        transactions_path,
        usecols=['customer_id', 'article_id', 't_dat'],
        dtype={'customer_id': str, 'article_id': str},
        chunksize=CHUNK_SIZE
    )

    for chunk_idx, chunk in enumerate(reader):
        chunk['t_dat'] = pd.to_datetime(chunk['t_dat'])
        agg = chunk.groupby(['article_id', 't_dat']).size().reset_index(name='n')
        for _, row in agg.iterrows():
            key = (row['article_id'], row['t_dat'].date())
            counts[key] = counts.get(key, 0) + row['n']

        if (chunk_idx + 1) % 10 == 0:
            print(f'   … processed {(chunk_idx+1)*CHUNK_SIZE:,} rows')

    print(f'   Unique (article, date) pairs: {len(counts):,}')

    # Materialise into DataFrame
    rows = [{'article_id': k[0], 'date': str(k[1]), 'demand': v}
            for k, v in counts.items()]
    daily = pd.DataFrame(rows)
    daily['date'] = pd.to_datetime(daily['date'])

    # Filter to top_n articles
    totals      = daily.groupby('article_id')['demand'].sum().nlargest(top_n)
    top_ids     = set(totals.index)
    daily       = daily[daily['article_id'].isin(top_ids)].copy()

    print(f'   Kept top-{top_n} articles → {len(daily):,} rows')

    daily.to_csv(DAILY_DEMAND_OUT, index=False)
    print(f'   ✅ Saved → {DAILY_DEMAND_OUT}')
    return daily


# ─── Step 2-4: Feature engineering → train → forecast ────────────────────────
def run_pipeline(daily_demand: pd.DataFrame,
                 article_lookup: pd.DataFrame) -> None:
    """Feature engineering, model training, forecasting — all in sequence."""

    # Step 2: Features
    print('\n[2/4] Building feature matrix …')
    feature_df = build_features(daily_demand, drop_na=True)
    print(f'   Feature matrix: {feature_df.shape}')

    # Step 3: Train
    print('\n[3/4] Training model …')
    model, feat_cols, test_metrics, base_metrics = train_model(
        feature_df, save_path=MODEL_PATH
    )

    print('\n── Metrics comparison ──')
    print(f"   Baseline RMSE : {base_metrics['RMSE']}")
    print(f"   XGBoost  RMSE : {test_metrics['RMSE']}")
    print(f"   Improvement   : {base_metrics['RMSE'] - test_metrics['RMSE']:.4f}")

    # Step 4: Forecast
    print(f'\n[4/4] Generating {FORECAST_DAYS}-day forecast …')
    article_ids = daily_demand['article_id'].unique().tolist()
    forecast_df = generate_forecast(
        model, feat_cols, daily_demand,
        article_ids=article_ids,
        horizon=FORECAST_DAYS
    )
    forecast_df.to_csv(FORECAST_OUT, index=False)
    print(f'   ✅ Saved forecast → {FORECAST_OUT}  ({len(forecast_df):,} rows)')

    summary_df = summarise_forecast(forecast_df, article_lookup)
    summary_df.to_csv(FORECAST_SUMMARY, index=False)
    print(f'   ✅ Saved summary → {FORECAST_SUMMARY}  ({len(summary_df):,} rows)')
    print('\nTop 10 forecasted articles:')
    print(summary_df[['article_id', 'prod_name',
                       'total_predicted', 'daily_avg']].head(10).to_string())


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    DATA_PROC.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Load article metadata
    article_lookup = pd.read_csv(ARTICLE_LOOKUP, dtype={'article_id': str})

    # If daily_demand.csv already exists, skip re-aggregation (saves ~5 min)
    if DAILY_DEMAND_OUT.exists():
        print(f'[1/4] Loading existing daily_demand.csv …')
        daily = pd.read_csv(DAILY_DEMAND_OUT,
                            dtype={'article_id': str},
                            parse_dates=['date'])
        print(f'   Shape: {daily.shape}')
    else:
        daily = build_daily_demand(TRANSACTIONS, top_n=TOP_ARTICLES)

    run_pipeline(daily, article_lookup)
    print('\n🎉 Demand forecasting pipeline complete.')
    print(f'   Outputs in: {DATA_PROC}')
