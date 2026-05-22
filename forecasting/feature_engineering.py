"""
feature_engineering.py
-----------------------
Converts a daily demand time series (article_id, date, demand) into
a supervised ML feature matrix ready for XGBoost.

Input  : DataFrame with columns [article_id, date, demand]
Output : DataFrame with lag / rolling / calendar features + target column
"""

import pandas as pd
import numpy as np


# ─── Constants ────────────────────────────────────────────────────────────────
LAG_DAYS    = [1, 7, 14, 28]          # look-back windows for lag features
ROLL_DAYS   = [7, 14, 28]             # windows for rolling mean / std
TARGET_COL  = 'demand'
DATE_COL    = 'date'
ARTICLE_COL = 'article_id'


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add day-of-week, month, week-of-year, is_weekend from the date column."""
    df = df.copy()
    dt = pd.to_datetime(df[DATE_COL])
    df['day_of_week']   = dt.dt.dayofweek          # 0=Mon … 6=Sun
    df['day_of_month']  = dt.dt.day
    df['month']         = dt.dt.month
    df['week_of_year']  = dt.dt.isocalendar().week.astype(int)
    df['is_weekend']    = (dt.dt.dayofweek >= 5).astype(int)
    df['quarter']       = dt.dt.quarter
    return df


def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add lag features per article_id.
    Requires df to be sorted by [article_id, date] before calling.
    """
    df = df.copy()
    for lag in LAG_DAYS:
        df[f'lag_{lag}'] = (
            df.groupby(ARTICLE_COL)[TARGET_COL]
            .shift(lag)
        )
    return df


def add_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add rolling mean and std per article_id.
    Uses min_periods=1 so early rows are not all-NaN.
    """
    df = df.copy()
    for window in ROLL_DAYS:
        grouped = df.groupby(ARTICLE_COL)[TARGET_COL]
        df[f'rolling_mean_{window}'] = (
            grouped.transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
        )
        df[f'rolling_std_{window}'] = (
            grouped.transform(lambda x: x.shift(1).rolling(window, min_periods=1).std().fillna(0))
        )
    return df


def add_trend_feature(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add a simple linear trend index per article (0 = earliest date for that article).
    Captures overall growth / decline trajectory.
    """
    df = df.copy()
    df['trend_idx'] = df.groupby(ARTICLE_COL).cumcount()
    return df


def build_features(daily_demand: pd.DataFrame,
                   drop_na: bool = True) -> pd.DataFrame:
    """
    Full feature pipeline.

    Parameters
    ----------
    daily_demand : DataFrame
        Columns: [article_id, date, demand]
        One row per (article, day).
    drop_na : bool
        Drop rows where lag features are NaN (first LAG_DAYS rows per article).
        Set False if you need to keep all rows (e.g. for prediction only).

    Returns
    -------
    DataFrame with original columns + all features.
    """
    df = daily_demand.copy()
    df[DATE_COL] = pd.to_datetime(df[DATE_COL])
    df = df.sort_values([ARTICLE_COL, DATE_COL]).reset_index(drop=True)

    df = add_calendar_features(df)
    df = add_lag_features(df)
    df = add_rolling_features(df)
    df = add_trend_feature(df)

    if drop_na:
        max_lag = max(LAG_DAYS)
        df = df.dropna(subset=[f'lag_{max_lag}']).reset_index(drop=True)

    return df


def get_feature_columns() -> list:
    """Return the exact list of feature columns used by the model."""
    cols = []
    # Calendar
    cols += ['day_of_week', 'day_of_month', 'month', 'week_of_year',
             'is_weekend', 'quarter']
    # Lags
    cols += [f'lag_{l}' for l in LAG_DAYS]
    # Rolling
    for w in ROLL_DAYS:
        cols += [f'rolling_mean_{w}', f'rolling_std_{w}']
    # Trend
    cols += ['trend_idx']
    return cols