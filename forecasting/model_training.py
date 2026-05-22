"""
model_training.py
-----------------
Trains an XGBoost regressor on the feature matrix produced by
feature_engineering.build_features().

Design decisions:
- Time-based split: last HOLDOUT_DAYS → test, everything before → train.
  (Never use random split on time series — it leaks the future.)
- XGBoost chosen over ARIMA/Prophet because:
    1. Single model covers ALL articles (no per-article fitting loop)
    2. Handles non-stationarity through tree splits
    3. No extra dependencies (xgboost is already common in ML stacks)
- Baseline: rolling 7-day mean (simple, always interpretable)
"""

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

# XGBoost import with friendly error
try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

from .feature_engineering import get_feature_columns, TARGET_COL, DATE_COL

HOLDOUT_DAYS = 30          # last N days used for evaluation
MODEL_DIR    = Path('models')


# ─── Baseline ─────────────────────────────────────────────────────────────────
def baseline_predict(df: pd.DataFrame, window: int = 7) -> pd.Series:
    """
    Naïve baseline: use the rolling 7-day mean of demand as the prediction.
    Returns a Series aligned with df's index.
    """
    col = f'rolling_mean_{window}'
    if col in df.columns:
        return df[col].fillna(df[TARGET_COL].median())
    return pd.Series(df[TARGET_COL].median(), index=df.index)


# ─── Train / Evaluate ─────────────────────────────────────────────────────────
def time_based_split(df: pd.DataFrame, holdout_days: int = HOLDOUT_DAYS):
    """Split df into train / test using a date cutoff."""
    cutoff = pd.to_datetime(df[DATE_COL]).max() - pd.Timedelta(days=holdout_days)
    train  = df[pd.to_datetime(df[DATE_COL]) <= cutoff]
    test   = df[pd.to_datetime(df[DATE_COL]) >  cutoff]
    return train, test


def evaluate_model(y_true: np.ndarray, y_pred: np.ndarray,
                   label: str = '') -> dict:
    """Compute MAE, RMSE, MAPE for a set of predictions."""
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    # MAPE: ignore zeros to avoid division-by-zero
    mask = y_true != 0
    mape = (np.abs((y_true[mask] - y_pred[mask]) / y_true[mask]).mean() * 100
            if mask.sum() > 0 else float('nan'))

    metrics = {'MAE': round(mae, 4), 'RMSE': round(rmse, 4), 'MAPE_%': round(mape, 2)}
    if label:
        print(f'\n📊 {label}')
        for k, v in metrics.items():
            print(f'   {k}: {v}')
    return metrics


def train_model(feature_df: pd.DataFrame,
                save_path: Path = None) -> tuple:
    """
    Train XGBoost on feature_df.  Falls back to a gradient-boosting-free
    linear model if xgboost is not installed.

    Parameters
    ----------
    feature_df : output of feature_engineering.build_features()
    save_path  : optional Path to save the trained model as .pkl

    Returns
    -------
    model       : fitted estimator
    test_metrics: dict with MAE / RMSE / MAPE on hold-out set
    base_metrics: dict with baseline metrics for comparison
    """
    feat_cols = get_feature_columns()
    # Keep only feature columns that exist in this df
    feat_cols = [c for c in feat_cols if c in feature_df.columns]

    train_df, test_df = time_based_split(feature_df)

    X_train = train_df[feat_cols].fillna(0)
    y_train = train_df[TARGET_COL].values
    X_test  = test_df[feat_cols].fillna(0)
    y_test  = test_df[TARGET_COL].values

    print(f'Train rows: {len(X_train):,}  |  Test rows: {len(X_test):,}')
    print(f'Features  : {len(feat_cols)}')

    # ── Baseline ──────────────────────────────────────────────────────────────
    base_pred    = baseline_predict(test_df).values
    base_metrics = evaluate_model(y_test, base_pred, 'Baseline (rolling-7 mean)')

    # ── XGBoost model ─────────────────────────────────────────────────────────
    if XGB_AVAILABLE:
        model = xgb.XGBRegressor(
            n_estimators     = 400,
            max_depth        = 6,
            learning_rate    = 0.05,
            subsample        = 0.8,
            colsample_bytree = 0.8,
            min_child_weight = 3,
            reg_alpha        = 0.1,    # L1 regularisation
            reg_lambda       = 1.0,    # L2 regularisation
            random_state     = 42,
            n_jobs           = -1,
            verbosity        = 0
        )
    else:
        # Fallback: sklearn GradientBoosting (slower but no extra dep)
        print('⚠  xgboost not found — using sklearn GradientBoostingRegressor')
        from sklearn.ensemble import GradientBoostingRegressor
        model = GradientBoostingRegressor(
            n_estimators = 200, max_depth = 5,
            learning_rate = 0.05, random_state = 42
        )

    model.fit(X_train, y_train)

    y_pred       = np.clip(model.predict(X_test), 0, None)   # demand ≥ 0
    test_metrics = evaluate_model(y_test, y_pred, 'XGBoost model')

    # ── Save model ────────────────────────────────────────────────────────────
    if save_path is not None:
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, 'wb') as f:
            pickle.dump({'model': model, 'feature_cols': feat_cols}, f)
        print(f'\n✅ Model saved → {save_path}')

    return model, feat_cols, test_metrics, base_metrics


def load_model(model_path: Path) -> tuple:
    """Load a previously saved model. Returns (model, feature_cols)."""
    with open(model_path, 'rb') as f:
        bundle = pickle.load(f)
    return bundle['model'], bundle['feature_cols']