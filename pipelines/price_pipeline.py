"""
pipelines/price_pipeline.py
-----------------------------
Computes a canonical GBP price for every article using the H&M
normalization formula:

    price_gbp = round(normalized_price * 590 * 0.79, 2)

Where:
  * 590  — community-discovered USD de-scaling factor for this dataset
  * 0.79 — approximate USD → GBP exchange rate

Reads  : data/processed/transactions_small.csv  (article_id, price columns)
Writes : data/processed/article_prices.csv       (article_id, price_gbp)

Run once:
    python pipelines/price_pipeline.py
"""
from pathlib import Path
import pandas as pd

ROOT      = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"

USD_DESCALE  = 590    # de-normalisation scalar (community-verified)
USD_TO_INR   = 83.5   # USD → INR exchange rate
MIN_PRICE    = 99     # floor ₹ — avoids sub-₹100 artefacts
MAX_PRICE    = 24999  # ceiling ₹


def run_pipeline():
    tx_path = PROCESSED / "transactions_small.csv"
    print(f"[prices] Loading transactions ({tx_path.stat().st_size // 1_000_000} MB) ...")

    # Only load the two columns we need — much faster than full file
    tx = pd.read_csv(
        tx_path,
        dtype={"article_id": str},
        usecols=["article_id", "price"],
    )
    tx["article_id"] = tx["article_id"].str.lstrip("0")

    print(f"[prices] {len(tx):,} transactions for {tx['article_id'].nunique():,} unique articles")

    # Median normalized price per article (robust to sale outliers)
    prices = (
        tx.groupby("article_id")["price"]
        .median()
        .reset_index(name="price_norm")
    )

    # Apply de-normalization formula  →  INR
    prices["price_usd"] = prices["price_norm"] * USD_DESCALE
    prices["price"]     = (prices["price_usd"] * USD_TO_INR).round(0).astype(int)

    # Clamp to realistic retail range
    prices["price"] = prices["price"].clip(lower=MIN_PRICE, upper=MAX_PRICE)

    out = PROCESSED / "article_prices.csv"
    prices[["article_id", "price"]].to_csv(out, index=False)
    print(f"[prices] Saved {len(prices):,} article prices -> {out}")
    print(f"[prices] Sample prices (INR):")
    print(prices[["article_id", "price_norm", "price"]].head(5).to_string(index=False))
    print("[prices] Done.")


if __name__ == "__main__":
    run_pipeline()
