"""
predict.py
----------
Generates multi-step demand forecasts for each article using
a trained model + the most recent history as seed.

Strategy (recursive / multi-step):
  For each future date d+1, d+2 … d+N:
    1. Build the feature row using known history + previously predicted values
    2. Predict demand for that date
    3. Append prediction to history → use as lag input for next step

This avoids needing future data as input.
"""

import numpy as np
import pandas as pd
from pathlib import Path

from .feature_engineering import (
    build_features, get_feature_columns,
    LAG_DAYS, ROLL_DAYS,
    TARGET_COL, DATE_COL, ARTICLE_COL
)

FORECAST_DAYS = 30     # default horizon


def _build_future_row(history: pd.Series, future_date: pd.Timestamp,
                      trend_base: int) -> dict:
    """
    Build one feature-row for a future date given the demand history
    (a Series indexed by date, for a single article).
    """
    row = {}

    # Calendar
    row['day_of_week']  = future_date.dayofweek
    row['day_of_month'] = future_date.day
    row['month']        = future_date.month
    row['week_of_year'] = future_date.isocalendar()[1]
    row['is_weekend']   = int(future_date.dayofweek >= 5)
    row['quarter']      = future_date.quarter
    row['trend_idx']    = trend_base

    # Lags
    for lag in LAG_DAYS:
        target_date = future_date - pd.Timedelta(days=lag)
        if target_date in history.index:
            row[f'lag_{lag}'] = history[target_date]
        else:
            row[f'lag_{lag}'] = history.iloc[-1] if len(history) else 0

    # Rolling mean / std
    for window in ROLL_DAYS:
        recent = history.iloc[-window:] if len(history) >= window else history
        row[f'rolling_mean_{window}'] = recent.mean() if len(recent) else 0
        row[f'rolling_std_{window}']  = recent.std()  if len(recent) > 1 else 0

    return row


def generate_forecast(model,
                      feat_cols: list,
                      daily_demand: pd.DataFrame,
                      article_ids: list = None,
                      horizon: int = FORECAST_DAYS) -> pd.DataFrame:
    """
    Generate a horizon-day forecast for each article.

    Parameters
    ----------
    model        : trained estimator (XGBoost or sklearn)
    feat_cols    : list of feature column names the model expects
    daily_demand : historical daily demand DataFrame
                   columns: [article_id, date, demand]
    article_ids  : list of article_ids to forecast. None → all in daily_demand
    horizon      : number of days ahead to forecast

    Returns
    -------
    DataFrame with columns [article_id, date, predicted_demand]
    """
    daily_demand = daily_demand.copy()
    daily_demand[DATE_COL] = pd.to_datetime(daily_demand[DATE_COL])

    if article_ids is None:
        article_ids = daily_demand[ARTICLE_COL].unique().tolist()

    latest_date = daily_demand[DATE_COL].max()
    future_dates = [latest_date + pd.Timedelta(days=i+1) for i in range(horizon)]

    all_forecasts = []

    for article_id in article_ids:
        art_hist = (
            daily_demand[daily_demand[ARTICLE_COL] == article_id]
            .set_index(DATE_COL)[TARGET_COL]
            .sort_index()
        )
        if art_hist.empty:
            continue

        trend_base = len(art_hist)
        history    = art_hist.copy()

        for d, future_date in enumerate(future_dates):
            row      = _build_future_row(history, future_date, trend_base + d)
            X        = np.array([[row.get(c, 0) for c in feat_cols]])
            pred     = float(np.clip(model.predict(X)[0], 0, None))
            pred_int = round(pred)

            all_forecasts.append({
                ARTICLE_COL:        article_id,
                DATE_COL:           future_date,
                'predicted_demand': pred_int,
                'predicted_demand_raw': pred
            })

            # Append prediction to history so next step can use it as a lag
            history.loc[future_date] = pred

    forecast_df = pd.DataFrame(all_forecasts)
    forecast_df[DATE_COL] = pd.to_datetime(forecast_df[DATE_COL])
    return forecast_df.sort_values([ARTICLE_COL, DATE_COL]).reset_index(drop=True)


def summarise_forecast(forecast_df: pd.DataFrame,
                       article_lookup: pd.DataFrame = None) -> pd.DataFrame:
    """
    Aggregate per-article forecast into a summary table:
    total predicted demand over the horizon + daily average.

    Optionally joins article_lookup to add prod_name, product_group_name.
    """
    summary = (
        forecast_df
        .groupby(ARTICLE_COL)
        .agg(
            total_predicted = ('predicted_demand', 'sum'),
            daily_avg       = ('predicted_demand', 'mean'),
            forecast_days   = ('predicted_demand', 'count')
        )
        .reset_index()
        .sort_values('total_predicted', ascending=False)
    )
    summary['daily_avg'] = summary['daily_avg'].round(2)

    if article_lookup is not None:
        meta = article_lookup[['article_id', 'prod_name',
                                'product_group_name']].copy()
        meta['article_id'] = meta['article_id'].astype(str)
        summary['article_id'] = summary['article_id'].astype(str)
        summary = summary.merge(meta, on='article_id', how='left')

    return summary