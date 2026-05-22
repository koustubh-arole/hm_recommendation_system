"""
utils/chroma_setup.py
----------------------
One-time script: reads articles.csv, generates embeddings,
stores everything in ChromaDB with rich metadata.

Run ONCE from your project root:
    python utils/chroma_setup.py
    python -m utils.chroma_setup

After this, streamlit_app1.py can search instantly without re-embedding.
"""

import sys
import time
from pathlib import Path

# ─── Project Root Setup (MUST happen before any local imports) ───────
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# ─── Third-Party Imports ─────────────────────────────────────────────
import pandas as pd
import chromadb
from sentence_transformers import SentenceTransformer

# ─── Config Imports ──────────────────────────────────────────────────
from config import (
    PROJECT_ROOT,
    CHROMA_PATH,
    COLLECTION_NAME,
    EMBED_MODEL,
)

# ─── Module-Level Constants ──────────────────────────────────────────
ARTICLES_CSV = ROOT / "data" / "raw" / "articles.csv"
COLLECTION   = COLLECTION_NAME   # single source of truth — from config
BATCH_SIZE   = 512               # articles per embedding batch
MAX_ARTICLES = None              # set to an int (e.g. 5000) to test on a subset


# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────

def build_product_text(row: pd.Series) -> str:
    """
    Combine multiple article fields into one string for embedding.
    The richer the text, the better the semantic search quality.
    """
    parts = [
        row.get("prod_name", ""),
        row.get("product_type_name", ""),
        row.get("product_group_name", ""),
        row.get("graphical_appearance_name", ""),
        row.get("colour_group_name", ""),
        row.get("perceived_colour_master_name", ""),
        row.get("department_name", ""),
        row.get("section_name", ""),
        row.get("garment_group_name", ""),
        row.get("index_name", ""),
        row.get("detail_desc", ""),
    ]
    return " ".join(str(p) for p in parts if p and str(p) != "nan").strip()


def load_articles() -> pd.DataFrame:
    """Load and clean articles CSV for embedding."""
    print(f"Loading articles from {ARTICLES_CSV} ...")

    if not ARTICLES_CSV.exists():
        raise FileNotFoundError(
            f"articles.csv not found at {ARTICLES_CSV}\n"
            "Run data_prep_pipeline.py first, or check your DATA_RAW path."
        )

    df = pd.read_csv(ARTICLES_CSV, dtype={"article_id": str})
    df["article_id"] = df["article_id"].astype(str).str.zfill(10)

    if MAX_ARTICLES:
        df = df.head(MAX_ARTICLES)

    # Fill missing text fields with empty strings
    str_cols = [
        "prod_name", "product_type_name", "product_group_name",
        "graphical_appearance_name", "colour_group_name",
        "perceived_colour_master_name", "department_name",
        "section_name", "garment_group_name", "index_name",
        "index_group_name", "detail_desc",
    ]
    for c in str_cols:
        if c in df.columns:
            df[c] = df[c].fillna("").astype(str)
        else:
            df[c] = ""

    print(f"Loaded {len(df):,} articles")
    return df


# ─────────────────────────────────────────────────────────────────────
# MAIN RUNNER
# ─────────────────────────────────────────────────────────────────────

def run():
    t_start = time.time()

    # ── Init ChromaDB ─────────────────────────────────────────────────
    CHROMA_PATH.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))

    # Delete existing collection to rebuild fresh
    try:
        client.delete_collection(COLLECTION)
        print(f"Deleted existing '{COLLECTION}' collection (rebuilding fresh)")
    except Exception:
        pass  # collection didn't exist yet — that's fine

    collection = client.create_collection(
        name=COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )

    # ── Load data ─────────────────────────────────────────────────────
    df = load_articles()

    # ── Build embedding texts ─────────────────────────────────────────
    print("Building product text fields ...")
    df["embed_text"] = df.apply(build_product_text, axis=1)

    # ── Load embedding model ──────────────────────────────────────────
    print(f"Loading embedding model: {EMBED_MODEL} ...")
    model = SentenceTransformer(EMBED_MODEL)

    # ── Embed + insert in batches ─────────────────────────────────────
    total    = len(df)
    inserted = 0

    for start in range(0, total, BATCH_SIZE):
        batch_df = df.iloc[start : start + BATCH_SIZE]

        texts      = batch_df["embed_text"].tolist()
        ids        = batch_df["article_id"].tolist()
        embeddings = model.encode(
            texts,
            show_progress_bar=False,
            normalize_embeddings=True,
            batch_size=64,
        ).tolist()

        metadatas = [
            {
                "prod_name":          row.get("prod_name", ""),
                "product_type_name":  row.get("product_type_name", ""),
                "product_group_name": row.get("product_group_name", ""),
                "colour_group_name":  row.get("colour_group_name", ""),
                "department_name":    row.get("department_name", ""),
                "section_name":       row.get("section_name", ""),
                "garment_group_name": row.get("garment_group_name", ""),
                "index_name":         row.get("index_name", ""),
                "index_group_name":   row.get("index_group_name", ""),
                "detail_desc":        str(row.get("detail_desc", ""))[:500],
            }
            for _, row in batch_df.iterrows()
        ]

        collection.add(
            ids        = ids,
            embeddings = embeddings,
            documents  = texts,
            metadatas  = metadatas,
        )

        inserted += len(batch_df)
        pct     = inserted * 100 // total
        elapsed = time.time() - t_start
        eta     = (elapsed / inserted) * (total - inserted) if inserted > 0 else 0
        print(
            f"  [{pct:3d}%]  {inserted:,}/{total:,} articles  "
            f"| elapsed {elapsed:.0f}s  | ETA ~{eta:.0f}s"
        )

    final = collection.count()
    print(f"\n✅ ChromaDB ready — {final:,} articles indexed in {time.time() - t_start:.0f}s")
    print(f"   Location  : {CHROMA_PATH}")
    print(f"   Collection: {COLLECTION}")
    print("\nNow run:  streamlit run app/streamlit_app1.py")


if __name__ == "__main__":
    run()