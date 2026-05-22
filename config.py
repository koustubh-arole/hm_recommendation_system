from pathlib import Path

# Base directory (project root)
BASE_DIR = Path(__file__).resolve().parent

# Data folders
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

# RAW FILE PATHS
ARTICLES_RAW_PATH = RAW_DIR / "articles.csv"
CUSTOMERS_RAW_PATH = RAW_DIR / "customers.csv"
TRANSACTIONS_RAW_PATH = RAW_DIR / "transactions_train.csv"

# PROCESSED FILE PATHS
CUSTOMERS_CLEAN_PATH = PROCESSED_DIR / "customers_clean.csv"
TRANSACTIONS_SMALL_PATH = PROCESSED_DIR / "transactions_small.csv"
ARTICLE_LOOKUP_PATH = PROCESSED_DIR / "article_lookup.csv"
CUSTOMER_SEGMENTS_PATH = PROCESSED_DIR / "customer_segments.csv"

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent

CHROMA_PATH = PROJECT_ROOT / "chroma_db"

COLLECTION_NAME = "hm_products"
EMBED_MODEL = "all-MiniLM-L6-v2"

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent

CHROMA_PATH = PROJECT_ROOT / "chroma_db"

ARTICLES_CSV = PROJECT_ROOT / "data" / "raw" / "articles.csv"

COLLECTION_NAME = "hm_products"

EMBED_MODEL = "all-MiniLM-L6-v2"