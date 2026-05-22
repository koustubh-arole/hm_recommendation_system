"""
utils/chroma_search.py
"""
from __future__ import annotations
from pathlib import Path
from typing import Optional
from sentence_transformers import SentenceTransformer
import chromadb

ROOT = Path(__file__).resolve().parent.parent

# Initialise once at import time — never re-created per request
_chroma_client = chromadb.PersistentClient(path=str(ROOT / "chroma_db"))
collection = _chroma_client.get_or_create_collection(name="hm_products")

EMBED_MODEL = "all-MiniLM-L6-v2"

# Load model once at module level — this is what was causing the 30-60s delay
_model = SentenceTransformer(EMBED_MODEL)


def collection_size(collection) -> int:
    try:
        return collection.count()
    except Exception:
        return 0


def semantic_search(
    query: str,
    collection,
    model: SentenceTransformer,
    n_results: int = 8,
    filter_group: Optional[str] = None,
    filter_department: Optional[str] = None,
) -> list[dict]:
    if not query.strip():
        return []

    query_vec = model.encode(query.strip(), normalize_embeddings=True).tolist()

    where, filters = None, []
    if filter_group:
        filters.append({"product_group_name": {"$eq": filter_group}})
    if filter_department:
        filters.append({"department_name": {"$eq": filter_department}})
    if len(filters) == 1:
        where = filters[0]
    elif len(filters) > 1:
        where = {"$and": filters}

    kwargs = dict(
        query_embeddings=[query_vec],
        n_results=n_results,
        include=["metadatas", "documents", "distances"],
    )
    if where:
        kwargs["where"] = where

    try:
        results = collection.query(**kwargs)
    except Exception:
        kwargs.pop("where", None)
        results = collection.query(**kwargs)

    output = []
    for article_id, meta, dist in zip(
        results["ids"][0], results["metadatas"][0], results["distances"][0]
    ):
        output.append({
            "article_id":         article_id,
            "prod_name":          meta.get("prod_name", "N/A"),
            "product_group_name": meta.get("product_group_name", ""),
            "product_type_name":  meta.get("product_type_name", ""),
            "department_name":    meta.get("department_name", ""),
            "colour_group_name":  meta.get("colour_group_name", ""),
            "garment_group_name": meta.get("garment_group_name", ""),
            "index_name":         meta.get("index_name", ""),
            "detail_desc":        meta.get("detail_desc", ""),
            "distance":           round(dist, 4),
            "similarity_pct":     round((1 - dist / 2) * 100, 1),
        })
    return output


def get_unique_metadata_values(collection, field: str) -> list[str]:
    try:
        results = collection.get(limit=10_000, include=["metadatas"])
        values  = {m.get(field, "") for m in results["metadatas"] if m.get(field, "")}
        return sorted(v for v in values if v)
    except Exception:
        return []

# ── Public entry point called by api/main.py ──────────────────────────
def search(query: str, n_results: int = 10) -> list[dict]:
    """
    Run semantic search and return results normalised to the standard
    product shape expected by the frontend:
        article_id, product_name, product_type_name,
        colour_group_name, score
    """
    raw = semantic_search(query, collection, _model, n_results=n_results)

    output = []
    for item in raw:
        article_id = str(item.get("article_id", "")).lstrip("0") or str(item.get("id", ""))
        output.append({
            "article_id":        article_id,
            "product_name":      item.get("prod_name") or item.get("product_name") or item.get("document") or "Unknown product",
            "product_type_name": item.get("product_type_name") or item.get("product_group_name") or "",
            "colour_group_name": item.get("colour_group_name") or "",
            "section_name":      item.get("garment_group_name") or "",
            "purchase_count":    0,
            "score":             round((1 - item["distance"] / 2), 4) if "distance" in item else item.get("similarity_pct", 0) / 100,
        })
    return output
