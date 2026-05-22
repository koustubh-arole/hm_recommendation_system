"""
pipelines/trending_pipeline.py
--------------------------------
Generates top_products_7d.csv and top_products_30d.csv from
transactions_small.csv joined with article_lookup.csv.

Run:
    python pipelines/trending_pipeline.py
"""
from pathlib import Path
import pandas as pd

ROOT      = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"


def run_pipeline():
    print("[trending] Loading transactions...")
    tx = pd.read_csv(
        PROCESSED / "transactions_small.csv",
        dtype={"customer_id": str, "article_id": str},
        parse_dates=["t_dat"],
        usecols=["t_dat", "article_id"],
    )
    tx["article_id"] = tx["article_id"].str.lstrip("0")

    print("[trending] Loading article lookup...")
    arts = pd.read_csv(
        PROCESSED / "article_lookup.csv",
        dtype={"article_id": str},
        usecols=["article_id", "prod_name", "product_type_name", "colour_group_name", "index_name"],
    )
    arts["article_id"] = arts["article_id"].str.lstrip("0")
    arts = arts.rename(columns={"prod_name": "product_name"})

    max_date = tx["t_dat"].max()
    print(f"[trending] Latest transaction date: {max_date.date()}")

    for window, days in [("7d", 7), ("30d", 30)]:
        cutoff = max_date - pd.Timedelta(days=days)
        recent = tx[tx["t_dat"] >= cutoff]

        top = (
            recent.groupby("article_id")
            .size()
            .reset_index(name="purchase_count")
            .sort_values("purchase_count", ascending=False)
            .head(50)
        )
        top["rank"] = range(1, len(top) + 1)
        top = top.merge(arts, on="article_id", how="left")
        top["product_name"]      = top["product_name"].fillna("Unknown")
        top["product_type_name"] = top["product_type_name"].fillna("")
        top["colour_group_name"] = top["colour_group_name"].fillna("")
        top["index_name"]        = top["index_name"].fillna("")

        out = PROCESSED / f"top_products_{window}.csv"
        top.to_csv(out, index=False)
        print(f"[trending] Saved {len(top)} products -> {out}")

    print("[trending] Done.")


if __name__ == "__main__":
    run_pipeline()
