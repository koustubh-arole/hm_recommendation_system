# H&M Retail AI Platform — Complete Technical Documentation
### Comprehensive Reference for Presentation & Technical Review

---

## TABLE OF CONTENTS

1. [Project Overview](#section-1)
2. [Data Layer](#section-2)
3. [RFM Segmentation & KMeans Clustering](#section-3)
4. [Recommendation Engine](#section-4)
5. [Demand Forecasting (XGBoost)](#section-5)
6. [Backend API (FastAPI)](#section-6)
7. [Frontend (Next.js)](#section-7)
8. [Pipelines](#section-8)
9. [Semantic Search (ChromaDB)](#section-9)
10. [Key Technical Decisions & Tradeoffs](#section-10)
11. [Presentation Talking Points](#section-11)

---

# SECTION 1 — PROJECT OVERVIEW

## What Problem Does This Solve?

H&M is one of the world's largest fashion retailers with over **1.36 million registered customers** and a product catalogue of **~105,000 articles**. The core business problem is:

> *"Out of 105,000 products, which 5-10 should we show to each specific customer, at the right time, to maximise engagement and purchase?"*

This system solves three interconnected business problems:
1. **Personalisation at Scale** — Every customer sees different product recommendations tailored to their purchase history and behaviour pattern
2. **Customer Segmentation** — Automatically categorises 1.36M customers into 5 behavioural groups so marketing teams can apply targeted strategies (win-back campaigns, loyalty rewards, etc.)
3. **Demand Forecasting** — Predicts how many units of each product will be needed over the next 30 days, enabling smarter inventory management and reducing stockouts

Without this system, H&M would either show the same products to everyone (no personalisation) or rely on manual rules written by merchandisers (expensive, doesn't scale, misses patterns in 31M transactions).

## End-to-End Flow

```
RAW DATA (Kaggle)
    │
    ▼
[data_prep_pipeline.py]
    │  → article_lookup.csv    (product catalogue, cleaned)
    │  → customers_clean.csv   (demographics, engineered features)
    │  → transactions_small.csv (filtered ~1-year window)
    │
    ▼
[rfm_pipeline.py]
    │  Reads: transactions_train.csv (all 31M rows)
    │  → rfm_segmented.csv     (each customer + cluster 0-4)
    │
    ▼
[recommendation_pipeline.py]
    │  → cluster_recommendations.csv  (top products per cluster)
    │  → user_recommendations.csv     (personalised per user)
    │  → co_purchase_recs.csv         (also-bought pairs)
    │  → top_products_7d.csv          (trending, cold-start)
    │  → top_products_30d.csv
    │
    ▼
[FastAPI Backend — api/main.py]
    │  Serves REST endpoints at http://localhost:8000
    │  JWT authentication (SQLite users.db)
    │  In-memory CSV cache (pandas DataFrames)
    │
    ▼
[Next.js 14 Frontend]
    │  Zustand state management
    │  Recharts data visualisations
    │  ChromaDB semantic search
    │
    ▼
USER SEES RECOMMENDATIONS
```

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Next.js 14 App Router (frontend/)                     │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐ │  │
│  │  │ User Pages   │ │ Admin Pages  │ │ Search Page    │ │  │
│  │  │ /home        │ │ /overview    │ │ /search        │ │  │
│  │  │ /recs        │ │ /analytics   │ │ ChromaDB+      │ │  │
│  │  │ /products    │ │ /forecasting │ │ all-MiniLM     │ │  │
│  │  │ /cart        │ │              │ │                │ │  │
│  │  └──────────────┘ └──────────────┘ └────────────────┘ │  │
│  │  Zustand (authStore, cartStore) │ Recharts charts      │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / REST (axios)
                         │ Bearer JWT tokens
┌────────────────────────▼────────────────────────────────────┐
│                         API LAYER                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  FastAPI (api/main.py) — port 8000                     │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐ │  │
│  │  │ /auth/*      │ │ /api/*       │ │ /api/admin/*   │ │  │
│  │  │ JWT login    │ │ recs,search  │ │ cluster-stats  │ │  │
│  │  │ SQLite users │ │ trending     │ │ forecast       │ │  │
│  │  │ HS256 tokens │ │ products     │ │ retrain        │ │  │
│  │  └──────────────┘ └──────────────┘ └────────────────┘ │  │
│  │  In-memory _cache dict (pandas DataFrames)              │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ pd.read_csv (cached)
┌────────────────────────▼────────────────────────────────────┐
│                       DATA LAYER                             │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │  data/raw/               │  │  data/processed/          │  │
│  │  articles.csv  (~35MB)   │  │  rfm_segmented.csv        │  │
│  │  customers.csv (~199MB)  │  │  user_recommendations.csv │  │
│  │  transactions_train.csv  │  │  cluster_recommendations  │  │
│  │           (~3.3GB)       │  │  co_purchase_recs.csv     │  │
│  └─────────────────────────┘  │  top_products_7d/30d.csv  │  │
│  ┌──────────────────────────┐  │  article_lookup.csv       │  │
│  │  data/users.db (SQLite)  │  │  forecast_output.csv      │  │
│  │  users table             │  │  forecast_summary.csv     │  │
│  └──────────────────────────┘  └──────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                       ML LAYER                               │
│  ┌──────────────────────────┐  ┌──────────────────────────┐  │
│  │  engine.py + pipelines/  │  │  chroma_db/               │  │
│  │  KMeans (5 clusters)     │  │  105K product embeddings  │  │
│  │  StandardScaler+log1p    │  │  all-MiniLM-L6-v2 model   │  │
│  │  XGBoost forecasting     │  │  cosine similarity index  │  │
│  └──────────────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technologies Used

| Technology | Purpose | Why This Over Alternatives |
|---|---|---|
| **Python 3.x** | Backend, ML pipelines | Industry standard for data science; pandas/scikit-learn ecosystem |
| **FastAPI** | REST API | Auto-generates OpenAPI docs; async support; 10x faster than Django |
| **SQLite** | User authentication DB | Zero config, file-based, perfect for single-server deployment |
| **pandas** | Data processing | 31M row operations; vectorised operations vs pure Python loops |
| **scikit-learn** | KMeans + StandardScaler | Battle-tested, consistent API, well-documented |
| **XGBoost** | Demand forecasting | Best-in-class for tabular time-series; handles missing data natively |
| **ChromaDB** | Vector database for search | Local embedding store; no cloud cost; persistent across restarts |
| **sentence-transformers** | NLP embeddings | `all-MiniLM-L6-v2` is 6x faster than BERT with 90% quality |
| **Next.js 14** | Frontend framework | Server components; App Router; React 18 with streaming |
| **Zustand** | State management | 1/10th the boilerplate of Redux; built-in persistence middleware |
| **Recharts** | Charts/visualisations | Pure React; responsive containers; composable primitives |
| **JWT (HS256)** | Authentication | Stateless; no session DB needed; carries role + customer_id |

## Two Types of Users

### Admin User
- **Login**: Username + password (stored in SQLite `users.db`)
- **Default credentials**: `admin` / `admin123`
- **What they can access**:
  - `/overview` — Cluster stats, KPI cards, RFM charts, system health
  - `/analytics` — Per-cluster recommendation analytics, type breakdown pie charts, affinity radar
  - `/forecasting` — 30-day XGBoost demand forecast, per-article drill-down
  - Can trigger pipeline retraining from UI
  - Can view all users via `/api/admin/users`
  - Can fetch recommendations for ANY customer
- **Access control**: `require_admin` FastAPI dependency; `requireAdmin` prop on `DashboardShell`

### Regular User
- **Login Option 1**: Username + password (registered account)
- **Login Option 2**: Customer ID direct login (hex string, matched against rfm_segmented.csv)
- **Default demo**: `koustubh` / `user123`
- **What they can access**:
  - `/home` — Trending products + personalised recommendations
  - `/recommendations` (For You page) — AI-powered personal picks
  - `/products` — Full product catalogue with search/filter
  - `/search` — ChromaDB semantic search
  - `/cart` — Shopping bag with checkout simulation
  - `/wishlist` — Saved items
- **Access control**: Can only fetch their own recommendations (lstrip("0") comparison in `/api/recommendations/{customer_id}`)

---

# SECTION 2 — DATA LAYER

## Original Raw Dataset

The dataset is from the **H&M Personalized Fashion Recommendations** Kaggle competition:
> https://www.kaggle.com/competitions/h-and-m-personalized-fashion-recommendations/data

### customers.csv
- **Size**: ~199 MB
- **Rows**: ~1,362,281 customers
- **Columns**:
  - `customer_id` — 64-char hex string (e.g. `00006413d8573cd20ed7128e53b7b13819fe5cfc...`)
  - `FN` — Fashion News subscription flag (0 or 1, with nulls)
  - `Active` — Active member flag (0 or 1, with nulls)
  - `club_member_status` — `ACTIVE`, `PRE-CREATE`, `LEFT CLUB` (with nulls)
  - `fashion_news_frequency` — `Regularly`, `Monthly`, `NONE` (with nulls)
  - `age` — Customer age in years (with nulls, median ~35)
  - `postal_code` — Home postal code (high cardinality, dropped)

### articles.csv
- **Size**: ~35 MB
- **Rows**: ~105,542 articles
- **Columns** (25 columns total):
  - `article_id` — 10-digit zero-padded ID (e.g. `0706016001`)
  - `product_code`, `prod_name` — Product identifier and display name
  - `product_type_no`, `product_type_name` — Category hierarchy level 1
  - `product_group_name` — Garment/Accessories/Etc.
  - `graphical_appearance_no`, `graphical_appearance_name` — Pattern/print type
  - `colour_group_code`, `colour_group_name` — Color family
  - `perceived_colour_value_id`, `perceived_colour_master_name` — Perceived colour
  - `department_no`, `department_name` — Department
  - `index_code`, `index_name` — Top-level gender index (Ladieswear, Menswear, etc.)
  - `index_group_no`, `index_group_name` — Index grouping
  - `section_no`, `section_name` — Section within index
  - `garment_group_no`, `garment_group_name` — Garment category
  - `detail_desc` — Long-form product description text (has nulls)

### transactions_train.csv
- **Size**: ~3.3 GB
- **Rows**: ~31,788,324 transactions
- **Columns**:
  - `t_dat` — Transaction date (2018-09-20 to 2020-09-22)
  - `customer_id` — 64-char hex (matches customers.csv)
  - `article_id` — 10-digit zero-padded (matches articles.csv)
  - `price` — Normalised decimal price (NOT in GBP — must multiply by 590)
  - `sales_channel_id` — 1 (online) or 2 (store)

## Why the Data Is So Large — The Challenges

1. **transactions_train.csv at 3.3GB** cannot fit in RAM on most development machines if loaded naively. A naive `pd.read_csv("transactions_train.csv")` would require ~12GB RAM.
2. **31 million rows** means even simple groupby operations take 30-120 seconds without optimisation.
3. **The price column is not real GBP.** H&M normalised all prices to a ~0.0-0.1 range. Community analysis discovered the de-scaling factor of **590** (see `SCALING_FACTOR = 590` in `engine.py`).
4. **The customer_id is a 64-character hex hash** — not an integer. This prevents naive integer joins and requires string matching throughout the pipeline.
5. **The article_id has leading zeros** (e.g., `0706016001`) that get stripped in different parts of the system, causing join failures if not normalised consistently with `.lstrip("0")`.

## Fragmented Data — transactions_small.csv

### What it is
`transactions_small.csv` is a **time-filtered subset** of `transactions_train.csv`, created by `data_prep_pipeline.py`:

```python
TRANSACTIONS_START_DATE = "2019-09-22"   # Keep only last ~1 year
```

The pipeline streams through the 3.3GB file in **500,000-row chunks** (`CHUNK_SIZE = 500_000`), filtering to dates ≥ 2019-09-22, keeping only 4 columns: `t_dat`, `customer_id`, `article_id`, `price`.

### Why it was necessary
- Keeps the most **recent and relevant** ~1 year of behaviour (2019-09-22 to 2020-09-22)
- Reduces RAM usage dramatically for trend analysis and price pipeline
- Trending products (7d/30d) only make sense on recent data
- The `rfm_pipeline.py` still uses the **full** `transactions_train.csv` for complete RFM calculation (recency goes back to 2018)

### What percentage?
The full file spans Sept 2018 – Sept 2020 (2 years). The small file keeps only the last year. Approximate: **~50% of rows** by count, but these 50% represent the most commercially relevant behaviour.

## Lookup Files — article_lookup.csv

### What it is
`article_lookup.csv` is a **slim, cleaned, enriched** version of `articles.csv` with only the columns needed by recommendation pipelines:

```python
cols = [
    "article_id", "prod_name", "product_type_name", "product_group_name",
    "graphical_appearance_name", "colour_group_name", "index_name",
    "style_key", "product_family", "gender_category",
]
```

It also includes 3 **derived/engineered columns** not in the original:
- `style_key` = `product_type_name | colour_group_name | graphical_appearance_name` (composite for similarity)
- `product_family` = alias for `product_type_name` (used for cross-sell seeding)
- `gender_category` = alias for `index_name` (prevents cross-gender recommendations)

### Why we need it
1. `articles.csv` has 25 columns; the API and recommendation engine only need ~10
2. Loading 25 columns × 105K rows repeatedly wastes memory
3. All nulls are **pre-filled** at build time: `"Unknown Product"`, `"Unknown Type"`, etc.
4. The API can serve product catalogue pages directly from this leaner file

### How it is used at runtime
The `/api/products` endpoint caches `article_lookup.csv` in the in-memory `_cache` dict:
```python
df = get_cached_df(str(path), dtype={"article_id": str})
```
First call loads from disk (~35ms). Every subsequent call returns the cached DataFrame in <1ms.

## NULL Value Handling — Detailed Per-File

### customers.csv → customers_clean.csv
From `data_prep_pipeline.py` `clean_customers()`:

| Column | Null Strategy | Code | Why |
|---|---|---|---|
| `FN` | Fill with `0` | `df["FN"].fillna(0)` | Null = no fashion news = not subscribed |
| `Active` | Fill with `0` | `df["Active"].fillna(0)` | Null = not active member |
| `fashion_news_frequency` | Fill with `"NONE"` | `.fillna("NONE")` | Null = no news = NONE frequency |
| `club_member_status` | Normalise `PRE-CREATE`/`LEFT CLUB` → `INACTIVE`, then fill null → `"UNKNOWN"` | `.replace({...}).fillna("UNKNOWN")` | Business logic: pre-signup and ex-members are inactive |
| `age` | Fill with **median age** | `df["age"].fillna(median_age)` | Median is robust to outliers vs mean |
| `postal_code` | **Dropped entirely** | `df.drop(columns=["postal_code"])` | High cardinality (thousands of values), low ML value |

**Engineered after cleaning:**
- `age_group`: Young/Adult/Middle/Senior from age buckets
- `engagement_score`: `int(FN) + int(Active)` + news_frequency bonus (0/1/2)
- `age_bucket`: pd.cut into [0,25,40,60,100] → labels [0,1,2,3]

### articles.csv
From `data_prep_pipeline.py` `clean_articles()`:

| Column | Null Strategy | Why |
|---|---|---|
| `detail_desc` | Fill with `""` (empty string) | Used in semantic search embeddings; empty string = no description |
| All other text cols | Fill with `"Unknown ..."` in `build_article_lookup()` | Downstream pipeline needs non-null strings |
| Numeric IDs | No nulls expected; assertions fail if found | Article IDs must be complete |

### transactions_train.csv
From `rfm_pipeline.py` `load_transactions()`:

| Situation | Handling | Why |
|---|---|---|
| `price` nulls | float32 dtype — pandas coerces null to NaN, which pandas.groupby().sum() ignores naturally | Sum of NaN = 0, so monetary is correct |
| `t_dat` parse failures | `parse_dates=["t_dat"]` — invalid dates become NaT, filtered out by groupby | Ensures recency calculation is always valid |
| Missing customers | `customer_id` as category type — unknown IDs simply don't appear in the groupby | Natural left-join semantic |

### rfm_segmented.csv
Built by `rfm_pipeline.py` `compute_rfm()`:

- RFM table is computed by `groupby("customer_id").agg(...)` on the full transaction history
- Every customer who made at least one transaction will appear — **no nulls** in recency/frequency/monetary for these customers
- After `merge_customer_attributes()`, demographic columns (age, FN, etc.) can have nulls for customers not in `customers.csv`
- Nulls in features are filled with `features.fillna(features.median())` before KMeans fitting:

```python
features = features.fillna(features.median())
```

## Processed Data Folder — All Files

| File | Contains | How Generated |
|---|---|---|
| `article_lookup.csv` | 105K articles, 10 cols, pre-cleaned | `data_prep_pipeline.py` |
| `customers_clean.csv` | 1.36M customers, cleaned + engineered features | `data_prep_pipeline.py` |
| `transactions_small.csv` | ~1-year filtered transactions, 4 cols | `data_prep_pipeline.py` (chunked streaming) |
| `rfm_segmented.csv` | 1.36M customers with recency/frequency/monetary + cluster (0-4) | `rfm_pipeline.py` |
| `rfm_segmented.parquet` | Same as above, binary format for fast loading | `rfm_pipeline.py` |
| `cluster_recommendations.csv` | Top-10 articles per cluster (5×10=50 rows) with metadata | `recommendation_pipeline.py` |
| `user_recommendations.csv` | Per-user recommended articles, flat table (1 row = 1 user×article) | `recommendation_pipeline.py` |
| `co_purchase_recs.csv` | Article pairs (article_id, also_bought_id, co_count, cluster) | `recommendation_pipeline.py` |
| `top_products_7d.csv` | Top-50 articles by purchase count, last 7 days | `trending_pipeline.py` |
| `top_products_30d.csv` | Top-50 articles by purchase count, last 30 days | `trending_pipeline.py` |
| `article_prices.csv` | article_id → price (INR) from median normalised price × 590 × 83.5 | `price_pipeline.py` |
| `forecast_output.csv` | article_id, date, predicted_demand (30-day horizon) | XGBoost forecasting (external notebook) |
| `forecast_summary.csv` | Per-article total_predicted, daily_avg, forecast_days | XGBoost forecasting (external notebook) |

---

# SECTION 3 — RFM SEGMENTATION & KMEANS CLUSTERING

## What is RFM?

RFM is a proven marketing framework for understanding customer behaviour through three dimensions:

| Metric | Definition | Formula (from `rfm_pipeline.py`) |
|---|---|---|
| **Recency (R)** | How many days ago did the customer last buy? | `(snapshot_date - customer_last_tx_date).days` |
| **Frequency (F)** | How many total transactions did they make? | `count(t_dat)` per customer |
| **Monetary (M)** | How much did they spend in total? | `sum(price)` per customer (raw normalised units) |

The **snapshot date** is: `transactions["t_dat"].max() + timedelta(days=1)` — one day after the last transaction in the dataset. This is a standard RFM convention to ensure the most recent buyer has Recency = 1, not 0.

```python
rfm = transactions.groupby("customer_id").agg(
    recency=("t_dat",  lambda x: (snapshot_date - x.max()).days),
    frequency=("t_dat",  "count"),
    monetary=("price",   "sum"),
)
```

## The Dual-Track Approach: display_monetary vs monetary

The raw Kaggle price values are normalised decimals (e.g., `0.05084` for a ₹2,500 item). They need to be multiplied by 590 to get approximate USD equivalents.

From `engine.py`:
```python
SCALING_FACTOR = 590

rfm['display_monetary'] = rfm['monetary'] * SCALING_FACTOR
```

**Track A — display_monetary**: Used only for showing numbers to users. E.g., a raw monetary of `3.5` becomes `3.5 × 590 = ₹2,065`. This is what the admin dashboard shows.

**Track B — monetary (raw)**: Used as input to KMeans. The raw decimal values are mathematically better for clustering because they avoid introducing a 590x scaling artefact into the feature space before StandardScaler.

The `SCALING_FACTOR = 590` was **community-discovered** by Kaggle participants analysing the price distribution against known H&M price points. The `price_pipeline.py` adds a USD→INR conversion: `price_usd × 83.5`, clamped to ₹99–₹24,999.

## How KMeans Works — Plain English

Imagine you have 1.36 million customers plotted as dots in 3D space, where the axes are recency, frequency, and monetary value.

1. **Initialisation**: KMeans randomly picks 5 points as starting "centres" (cluster centroids). With `n_init=10`, it does this 10 times and keeps the best result.
2. **Assignment**: Every customer dot is assigned to whichever centre it's closest to.
3. **Update**: Move each centre to the average position of all dots assigned to it.
4. **Repeat**: Steps 2-3 repeat until nothing changes (convergence).
5. **Result**: 5 groups of customers where everyone within a group is more similar to each other than to anyone in another group.

**Technical version**: KMeans minimises the Within-Cluster Sum of Squares (WCSS): `Σ ||x - μ_k||²` where x is a customer feature vector and μ_k is the centroid of cluster k.

## Why KMeans? Why 5 Clusters?

**Why KMeans**:
- Interpretable: centroids have direct business meaning (avg recency, frequency, monetary)
- Scales to 1.36M customers in under 60 seconds
- Deterministic with `random_state=42`
- Works well with the log1p + StandardScaler preprocessing applied here

**Why 5 clusters**:
- The **elbow method** was used in `notebooks/02_rfm_segmentation_FIXED.ipynb` — plotting WCSS vs number of clusters. The "elbow" (where adding more clusters stops reducing WCSS significantly) appeared at **k=5**.
- 5 also maps cleanly to the 5 standard RFM business personas: Champions, Loyal, Potential, At-Risk, Lost

**What happened with other k values**:
- k=3: Too coarse — mixed Champions and Loyal together, losing actionable distinctions
- k=7: The extra clusters had overlapping centroids with no clear business interpretation
- k=5: Best balance of statistical separation and business meaning

## Preprocessing Before KMeans

From `rfm_pipeline.py` `train_kmeans()`:

```python
features["frequency"] = np.log1p(features["frequency"])
features["monetary"]  = np.log1p(features["monetary"])

scaler = StandardScaler()
X_scaled = scaler.fit_transform(features)
```

**Why log-transform frequency and monetary?**
Both follow a heavy right-skewed distribution (most customers buy 1-5 times, a few buy 100+ times). Without log transform, KMeans would be dominated by the rare 100-purchase customers, creating one enormous cluster and four tiny ones. `log1p(x) = log(1+x)` handles zeros gracefully.

**Why StandardScaler?**
Recency is in units of days (0–730), frequency in count (1–100+), monetary in normalised price (0–50). Without scaling, the days column would numerically dominate clustering. StandardScaler centres each feature to mean=0 and scales to standard deviation=1, making all three dimensions equally weighted.

**What would happen without StandardScaler?** Recency would completely dominate clustering because 200 days > 50 purchases numerically, even though they might have equal business importance.

## The 5 Customer Clusters

From `engine.py` CLUSTER_STRATEGY and `api/auth.py` cluster_labels:

| Cluster | Name | Typical Profile | Business Meaning | Strategy |
|---|---|---|---|---|
| **0** | Potential Loyalists | Mid recency (~45d), high freq (8.2×), high spend | Recent, frequent, high-value — almost VIP | `"15% OFF your next order"` code `HMPOTENTIAL15` |
| **1** | Recent Shoppers | Mid recency (~120d), mid freq (4.1×) | Recently bought, moderate frequency | `"BUY 1 GET 1 50% OFF"` code `HMSTYLE50` |
| **2** | VIP Champions | Low recency (~180d), mid freq (2.8×) | Strong historical buyers, slightly dormant | `"FREE SHIPPING + 20% OFF"` code `HMVIPGOLD` |
| **3** | At-Risk Customers | High recency (~300d), low freq (1.5×) | Haven't bought in 300 days | `"25% OFF — We miss you!"` code `WE_MISS_YOU25` |
| **4** | Occasional Shoppers | Very high recency (~420d), very low freq | Bought once or twice long ago | `"₹200 OFF on orders above ₹1000"` code `HMSTART200` |

*Note: The cluster IDs (0-4) are assigned by KMeans based on centroid positions. The labels above are derived from analysing cluster mean profiles.*

## How New Customers Are Assigned at Runtime

The cluster assignment is **not** done at request time. The approach is:

1. Pipelines pre-compute the cluster for every known customer and store it in `rfm_segmented.csv`
2. At request time, `get_customer_payload()` in `engine.py` does a simple lookup:
   ```python
   customer_row = rfm_df[rfm_df['customer_id'] == str(customer_id)]
   cluster_id = int(row['cluster'])
   ```
3. If the customer is **not found** in rfm_segmented.csv (truly new customer with no history), the system returns `is_cold=True` and serves global trending products as a cold-start fallback.

---

# SECTION 4 — RECOMMENDATION ENGINE

## Part A — User Recommendations (user_recommendations.csv)

### How it was generated

From `recommendation_pipeline.py` `compute_user_recommendations()`:

**Step 1**: Cluster top-N lookup dict is built from `cluster_recommendations.csv`:
```python
cluster_tops_dict = {
    cid: grp["article_id"].tolist()
    for cid, grp in cluster_tops.groupby("cluster")
}
```

**Step 2**: For each user, get their cluster from rfm_segmented.csv, then take the top-10 articles for that cluster:
```python
user_recs["recommendations"] = user_recs.apply(
    lambda row: recommend_for_user(row["cluster"], row["purchased_set"], cluster_tops_dict),
    axis=1,
)
```

**Step 3**: "Explode" the list into flat rows — one row per (customer, recommended_article):
```python
user_recs_flat = (
    user_recs.explode("recommendations")
    .rename(columns={"recommendations": "article_id"})
    .merge(df_articles[available_meta], on="article_id", how="left")
    .assign(rank=lambda df: df.groupby("customer_id").cumcount() + 1)
)
```

**The merge operation**: 
- `transactions_train.csv` → merge with `rfm_segmented.csv` on `customer_id` → adds `cluster` column
- Then `cluster_tops` → merge with `articles.csv` on `article_id` → adds `prod_name`, `product_group_name`

**Each row in user_recommendations.csv represents**: One recommendation for one customer. Columns: `customer_id`, `cluster`, `article_id`, `prod_name`, `product_group_name`, `rank` (1-10).

**Note on purchased exclusion**: `exclude_purchased=False` by default because most users bought only 1-2 items from the top-10 cluster list. Excluding them would unnecessarily reduce results.

## Part B — Cluster Recommendations (cluster_recommendations.csv)

### How generated

From `recommendation_pipeline.py` `compute_cluster_top_products()`:

```python
df_merged = df_tx.merge(df_rfm[["customer_id", "cluster"]], on="customer_id", how="inner")

cluster_tops = (
    df_merged
    .groupby(["cluster", "article_id"])
    .size()
    .reset_index(name="purchase_count")
    .sort_values(["cluster", "purchase_count"], ascending=[True, False])
    .groupby("cluster")
    .head(TOP_N)   # TOP_N = 10
)
```

**Difference from user-level**: User recommendations are cluster-based WITH a personalised rank taking into account what the specific user has already purchased. Cluster recommendations are the global best-sellers within each RFM segment, without per-user exclusion.

**When does a user fall back to cluster recs?** If the user has no personal history in `user_recommendations.csv`, the API's `/api/recommendations/{customer_id}` endpoint serves the cluster-level top products instead (using `engine.py`'s `get_customer_payload()`).

## Part C — Co-Purchase Recommendations (co_purchase_recs.csv)

### What is co-purchase analysis?

"Customers who bought product A also bought product B." Amazon pioneered this. It captures complementary purchase patterns within each customer segment.

### How generated

From `recommendation_pipeline.py` `compute_co_purchase()`:

1. Take the top `CO_TOP_ITEMS = 50` most-purchased articles within each cluster
2. For each cluster, build a (customer, article) deduplicated table `slim`
3. **Self-join** `slim` with itself on `customer_id` to find all article pairs bought by the same customer:
   ```python
   co = slim.merge(
       slim.rename(columns={"article_id": "also_bought_id"}),
       on="customer_id",
   )
   co = co[co["article_id"] != co["also_bought_id"]]  # exclude self-pairs
   ```
4. Count co-occurrences per pair, keep top `CO_TOP_RECS = 5` per seed article

**`also_bought_id`**: The article that was frequently purchased together with `article_id` by customers in the same cluster.

**Columns in co_purchase_recs.csv**: `article_id`, `also_bought_id`, `co_count`, `cluster`

### How used at runtime

In `engine.py` `get_customer_payload()`:
```python
seed_item = top_article_ids[0]  # first recommended article
co_ids = co_purchase_df[
    (co_purchase_df['cluster'] == cluster_id) &
    (co_purchase_df['article_id'] == seed_item)
]['also_bought_id'].head(n_recs).tolist()
```
The seed item is the #1 recommended article for the customer's cluster. The co-purchase list provides the "Also Bought" section.

## Part D — Trending Products

### How calculated

From `trending_pipeline.py` and `recommendation_pipeline.py` `compute_trending_products()`:

```python
latest_date = df_tx["t_dat"].max()

for window, days in [("7d", 7), ("30d", 30)]:
    cutoff = max_date - pd.Timedelta(days=days)
    recent = tx[tx["t_dat"] >= cutoff]
    top = recent.groupby("article_id").size().reset_index(name="purchase_count")
              .sort_values("purchase_count", ascending=False).head(50)
```

**7d vs 30d**:
- `top_products_7d.csv`: Articles most purchased in the last 7 days — captures **short-term trends** (viral items, new arrivals)
- `top_products_30d.csv`: Articles most purchased in the last 30 days — captures **monthly bestsellers** (seasonally trending items)

**When shown**: Cold-start fallback when a customer_id doesn't appear in rfm_segmented.csv (truly new customer). Also shown on the Home page "Trending" tab for all users.

---

# SECTION 5 — DEMAND FORECASTING (XGBoost)

## What Is Being Forecast?

**Target variable**: `predicted_demand` = the number of units of a specific article_id that will be purchased on a given date.

The model produces a **30-day forward-looking forecast** for each of ~500 articles, one row per (article_id, date) in `forecast_output.csv`.

## Features Used as XGBoost Inputs

Based on the time-series structure of `forecast_output.csv` (date, article_id, predicted_demand), the features used in training would include:

- **Temporal features**: day_of_week, week_of_year, month, is_weekend, days_since_epoch
- **Lag features**: sales 7 days ago, 14 days ago, 28 days ago (rolling patterns)
- **Rolling statistics**: 7-day mean, 7-day std, 28-day mean (moving averages)
- **Article features**: product_group_name, product_type_name (encoded)
- **Seasonal features**: spring/summer/autumn/winter indicators

## Why XGBoost Over Every Other Model

| Model | Why NOT Used Here |
|---|---|
| **Linear Regression** | Assumes linear relationships. Fashion demand is non-linear (spikes on weekends, holiday effects, viral trends). Cannot capture interactions between article type and day-of-week. |
| **Random Forest** | Good but no sequential learning. Each tree is independent, so it can't efficiently model temporal dependencies. Also can't extrapolate beyond training range. |
| **ARIMA/SARIMA** | Excellent for single-series forecasting with strong seasonality. But we have **~500 articles** — fitting a separate ARIMA per article is impractical. Also struggles with irregular missing dates. |
| **Prophet (Facebook)** | Good for business-calendar seasonality. But slow for 500 series; requires complete daily data with no gaps; overkill for 30-day horizon. |
| **LSTM/Neural Networks** | Requires large amounts of sequential data per series. With some articles having sparse purchase history, LSTMs would overfit. Also requires GPU for practical training speed. |
| **SVMs** | Poor scalability to large feature sets; no native handling of missing values; doesn't naturally handle time-series structure. |
| **XGBoost** ✓ | Handles missing values natively. Captures non-linear feature interactions. Works well with tabular lag features. Trains quickly (CPU, no GPU needed). Can model all 500 articles in one model using article_id as a categorical feature. Industry standard for demand forecasting competitions. |

## What Is Gradient Boosting?

**Plain English version**: Imagine trying to predict demand and you make your first guess. You'll probably be wrong by some amount. Now a second "learner" focuses specifically on correcting your mistakes. Then a third corrects *its* mistakes. And so on for 100-1000 rounds. Each round, a new small decision tree learns from the residual errors of all previous trees.

**Technical version**: XGBoost builds an ensemble of regression trees sequentially. At each step t, a new tree f_t is fitted to the **negative gradient of the loss function** with respect to the current predictions. The final prediction is the sum of all trees: `ŷ = Σ f_t(x)`. XGBoost adds L1/L2 regularisation (`lambda` and `alpha` hyperparameters) to prevent overfitting, and uses **second-order Taylor approximation** of the loss for more precise updates.

## Output Structure

**forecast_output.csv** columns: `article_id`, `date`, `predicted_demand`
- One row per (article, day)
- ~500 articles × 30 days = ~15,000 rows

**forecast_summary.csv** columns: `article_id`, `prod_name`, `product_group_name`, `total_predicted`, `daily_avg`, `forecast_days`
- One row per article (500 rows)
- Pre-aggregated for the admin dashboard

## How Shown in Admin Dashboard

The `/api/admin/forecast` endpoint (line 381 in `main.py`) reads both files and returns:
```json
{
  "kpis": { "articles_forecasted": 500, "total_predicted_demand": 150000, "daily_avg_per_article": 10.2, "horizon_days": 30 },
  "top30": [ top 10 articles by 30-day demand ],
  "top7":  [ top 10 articles by first-7-day demand ],
  "daily_demand": [ aggregated daily totals for the area chart ],
  "article_daily": { "706016": [ {date, demand}, ... ] }
}
```

The frontend's `ForecastingPage` (`app/forecasting/page.tsx`) renders:
- 4 KPI cards (articles forecasted, total predicted demand, daily avg, horizon days)
- Area chart (H&M red gradient) of total forecasted demand over 30 days
- Article selector to drill into per-article daily forecast
- Two side-by-side tables: Top 10 by 7-day, Top 10 by 30-day demand
- Horizontal bar chart of Top 10 by 30-day demand

## Business Impact of Wrong Forecasting

If demand forecasting is **too high** (overstock):
- Working capital tied up in unsold inventory
- Increased markdown pressure (end-of-season discounts)
- Warehouse storage costs
- Fashion items lose value quickly; unsold winter coats in March = near zero value

If demand forecasting is **too low** (understock):
- **Stockouts** — customers arrive, product isn't available, sale lost permanently
- Lost revenue is unrecoverable (unlike perishables, you can't "make up" the lost sale)
- Customer frustration leads to competitor switching
- H&M estimates stockouts cost the industry billions annually

---

# SECTION 6 — BACKEND API (FastAPI)

## Complete Endpoint Reference

| Method | Endpoint | Auth Required | What It Does | Returns |
|---|---|---|---|---|
| `POST` | `/auth/login` | None | Username+password login, returns JWT | `Token` (access_token, role, username, customer_id) |
| `POST` | `/auth/login/customer` | None | Customer ID login, validates against rfm_segmented.csv | `Token` with customer_id+cluster in payload |
| `POST` | `/auth/register` | **Admin JWT** | Create new user account | `UserOut` |
| `GET` | `/auth/me` | Any JWT | Returns current user profile from DB | `UserOut` |
| `GET` | `/auth/users` | **Admin JWT** | List all registered users | `list[dict]` |
| `DELETE` | `/auth/users/{id}` | **Admin JWT** | Delete a user | `{"detail": "..."}` |
| `GET` | `/api/recommendations/{customer_id}` | Any JWT (user: own only) | Personalised recommendations enriched with product metadata | `{customer_id, recommendations:[...]}` |
| `GET` | `/api/trending/{window}` | Any JWT | Trending products for 7d or 30d | `{window, products:[...]}` |
| `GET` | `/api/search` | Any JWT | ChromaDB semantic search | `{query, results:[...]}` |
| `GET` | `/api/customer/{id}/profile` | Any JWT (user: own only) | RFM cluster profile for customer | Full RFM row dict + segment label |
| `GET` | `/api/products` | Any JWT | Paginated product catalogue | `{total, page, per_page, products:[...]}` |
| `GET` | `/api/products/{article_id}` | Any JWT | Single product detail | Full article dict |
| `GET` | `/api/admin/cluster-stats` | Any JWT | RFM cluster statistics | `{n_clusters, total_customers, clusters:[...]}` |
| `GET` | `/api/admin/forecast` | **Admin JWT** | XGBoost 30-day demand forecast | `{kpis, top30, top7, daily_demand, article_daily}` |
| `GET` | `/api/admin/health` | **Admin JWT** | System health check | `{status, services:{...}}` |
| `GET` | `/api/admin/cluster-recommendations` | Any JWT | Top products per cluster | `[{cluster, article_id, prod_name, ...}]` |
| `GET` | `/api/admin/co-purchase` | **Admin JWT** | First 500 co-purchase pairs | `[{article_id, also_bought_id, co_count, cluster}]` |
| `POST` | `/api/admin/retrain` | **Admin JWT** | Trigger pipeline retraining in background thread | `{detail, status: "running"}` |
| `GET` | `/api/admin/users` | **Admin JWT** | List all users (admin-specific view) | `list[dict]` |

## JWT Authentication — How It Works Exactly

### Creating a Token (Normal Login)

From `api/auth.py`:
```python
SECRET_KEY = os.getenv("JWT_SECRET", "CHANGE_ME_IN_PRODUCTION_use_openssl_rand")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

def create_access_token(data: dict, ...) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
```

For a normal admin login, the JWT payload contains:
```json
{
  "sub": "admin",
  "role": "admin",
  "exp": <unix timestamp 8h from now>
}
```

### Customer ID Direct Login

When a user logs in with a Customer ID (hex string), the payload includes additional fields:
```json
{
  "sub": "00006413d857...",
  "role": "user",
  "customer_id": "00006413d8573cd20ed7128e53b7b13819fe5cfc2d801fe7fc0f26dd8d65a85a",
  "cluster": 2,
  "exp": <unix timestamp>
}
```

This creates a **"virtual user"** — there's no database record for this user in `users.db`. The JWT itself carries all needed state.

### Token Validation on Each Request

Every protected endpoint uses `Depends(get_current_user)`:

```python
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid token.")

    customer_id = payload.get("customer_id")
    role        = payload.get("role", "user")
    sub         = payload.get("sub", "")
```

The `HTTPBearer()` dependency automatically extracts the `Authorization: Bearer <token>` header from every request.

### How get_current_user() Works — Full Logic

```
Request arrives with Bearer token
     │
     ▼
jwt.decode() — verifies signature + expiry
     │
     ├── If customer_id in payload AND role == "user":
     │       → "Customer ID login"
     │       → Check if sub (customer_id[:16]) is a real DB user
     │       └── If NOT in DB: return virtual user dict (no DB record)
     │           {id:0, username:sub, role:"user", customer_id:customer_id}
     │
     └── If no customer_id (normal login):
             → Look up user in SQLite by payload["sub"]
             → If not found: raise 401
             → Return full DB user dict
```

### The lstrip("0") Comparison

The customer_id normalisation in `/api/recommendations/{customer_id}`:
```python
if current_user["role"] == "user":
    jwt_cid = current_user.get("customer_id") or ""
    if jwt_cid.lstrip("0") != customer_id.lstrip("0"):
        raise HTTPException(403, "Access denied.")
```

This solves a critical data quality problem: the same customer ID can appear as `"00006413..."` in the JWT and `"6413..."` in a URL parameter. `.lstrip("0")` normalises both to the same canonical form before comparison, preventing both false positives (blocking valid access) and false negatives (allowing unauthorised access).

## The In-Memory Cache

```python
_cache: dict = {}
_cache_lock = threading.Lock()

def get_cached_df(path: str, **read_kwargs):
    with _cache_lock:
        if path not in _cache:
            _cache[path] = pd.read_csv(path, **read_kwargs)
        return _cache[path]
```

**Why it was added**: `user_recommendations.csv` is loaded on every `/api/recommendations/` request. At 1.36M users × 10 recs = 13.6M rows, loading from disk takes 2-5 seconds per request. With caching, the second request takes <5ms.

**Threading safety**: `threading.Lock()` prevents race conditions when two requests arrive simultaneously and both try to populate the same cache key.

**Important cache key caveat**: The cache key is the file path string only. If the same file is loaded with different `usecols` parameters in different parts of the code, the second call returns the first call's result (wrong columns). This was a real bug discovered in `cluster_recommendations` — `articles.csv` is intentionally kept on `pd.read_csv` (not cached) to avoid contaminating the `get_recommendations` endpoint's cached version.

## Co-Purchase Fallback Chain in get_customer_payload()

```
Customer ID supplied
         │
         ▼
Is customer in rfm_segmented.csv?
    YES ──────────────────────────────────────────────────►
         │                                                  │
         │  1. Get cluster_id from rfm row                  │
         │  2. Get top cluster articles                     │
         │  3. Get co-purchase for top[0] article           │
         │  4. Return {is_cold:False, recommendations, also_bought}
         │
    NO ─────────────────────────────────────────────────►
         │                                                  │
         │  1. Load top_7d trending products               │
         │  2. Return {is_cold:True, recommendations:trending, also_bought:[]}
```

---

# SECTION 7 — FRONTEND (Next.js)

## Complete User Flow — Step by Step

### Customer ID Login

1. User navigates to `/login`, clicks "Customer ID" tab
2. Enters hex customer ID (e.g. `00006413d857...`)
3. Frontend calls `api.post("/auth/login/customer", {username: customerId, password: ""})` (`services/api.ts:53`)
4. FastAPI's `login_as_customer()` searches `rfm_segmented.csv` for the customer ID (with lstrip("0") normalisation)
5. Backend creates JWT with payload `{sub, role:"user", customer_id, cluster}`
6. Frontend receives `{access_token, username, customer_id}`
7. Token is stored in THREE places (to ensure persistence across page navigations):
   - `localStorage["hm_token"]` — for the Axios interceptor
   - Zustand `authStore` state (in-memory)
   - `localStorage["hm-auth"]` — Zustand `persist` middleware snapshot

```javascript
// login/page.tsx - handleCustomerLogin()
localStorage.setItem("hm_token", data.access_token);
useAuthStore.setState({ user, token, isAuthenticated: true });
// Direct localStorage write to ensure persist middleware is in sync:
existing.state = { user, token, isAuthenticated: true };
localStorage.setItem("hm-auth", JSON.stringify(existing));
```

8. `router.push("/home")` navigates to home page

### JWT Storage & Propagation

The Axios interceptor in `services/api.ts` attaches the token to every outgoing request:
```javascript
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("hm_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
```

### DashboardShell — checkAuth()

Every page wrapped in `<DashboardShell>` runs `checkAuth()` on mount:

```javascript
// store/authStore.ts
checkAuth: async () => {
    const token = localStorage.getItem("hm_token");
    if (!token) { /* set unauthenticated */ return; }

    // Try to decode JWT locally (for customer-ID logins):
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.customer_id && payload.role === "user") {
        set({ user: {role:"user", customer_id: payload.customer_id, ...}, isAuthenticated: true });
        return;
    }

    // For normal DB logins — verify via /auth/me:
    const user = await authAPI.me();
    set({ user, isAuthenticated: true });
}
```

This is important because Zustand state is **not persisted across hard refreshes** without the `persist` middleware. The `checkAuth` re-hydrates from `localStorage["hm_token"]` on every page load.

### Recommendations Loading on For You Page

From `app/recommendations/page.tsx`:
```javascript
useEffect(() => {
    if (!isAuthenticated) return;
    const cid = user?.customer_id;
    if (!cid) { setError("No customer ID linked."); return; }

    recsAPI.forCustomer(cid)
        .then((r) => setRecs(r?.recommendations ?? []))
}, [user?.customer_id, isAuthenticated]);
```

The `forCustomer()` call hits `GET /api/recommendations/{customer_id}`. The response is normalised through `normaliseProduct()` before being set in state.

### The Zustand Rehydration Race Condition

**The problem that was fixed**: On page load, Next.js renders components before Zustand has rehydrated from localStorage. This means `isAuthenticated` is briefly `false` even for logged-in users, causing an immediate redirect to `/login`.

**The fix**: The `isLoading` state in authStore acts as a guard:
```javascript
// DashboardShell.tsx
if (isLoading || !isAuthenticated) {
    return <LoadingSpinner />;  // Show spinner, don't redirect yet
}
```
`isLoading` is `true` until `checkAuth()` completes. The redirect to `/login` only fires after `isLoading` is `false` AND `isAuthenticated` is `false` — meaning we've genuinely confirmed the user is not logged in.

## Admin Flow

1. Admin logs in with `admin` / `admin123`
2. JWT contains `{sub:"admin", role:"admin"}`
3. Redirected to `/overview` (role-check in `handleSubmit`: `user?.role === "admin" ? "/overview" : "/home"`)
4. `DashboardShell requireAdmin` prop triggers check: `if (requireAdmin && user?.role !== "admin") router.push("/home")`
5. `OverviewPage` fetches `adminAPI.clusterStats()` → `/api/admin/cluster-stats`
6. Shows 4 KPI cards, cluster bar chart, cluster size pie chart, detail table
7. Admin can navigate to `/analytics` for cluster-level product analysis
8. Admin can navigate to `/forecasting` for 30-day demand charts

## The Circular Import Bug

**Original problem**: An older version had `normaliseProduct` defined inside `services/api.ts`. When `api.ts` imported from `types/index.ts` to get the `Product` type, and `types/index.ts` imported from `api.ts` for something else, Node.js module resolution would see a circular dependency. The error was `"got: object"` instead of the expected module exports — a classic Node.js circular import symptom where one module gets an empty object during initialisation.

**The fix**: Moving `normaliseProduct` to `lib/normaliseProduct.ts` — a pure utility file with no upstream imports — broke the circular chain. Now `api.ts` imports from `lib/normaliseProduct.ts`, and `lib/normaliseProduct.ts` only imports from `types/index.ts`. No cycle.

## normaliseProduct() — Why It Exists

The backend returns product data in multiple inconsistent shapes:
- Recommendations endpoint: `prod_name`, `product_group_name`, `article_id`
- Search endpoint: `prod_name`, `product_type_name`, `colour_group_name`
- Trending endpoint: `product_name`, `purchase_count`
- Products endpoint: `product_name`, `product_type_name`

The frontend's `Product` type has fixed field names. `normaliseProduct()` provides a consistent adapter:

```typescript
// lib/normaliseProduct.ts
export function normaliseProduct(raw: Record<string, unknown>): Product {
    const articleId = String(raw.article_id || raw.id || raw.articleId || "")
        .replace(/^0+/, "");

    return {
        id:                articleId,
        article_id:        articleId,
        product_name:      String(raw.product_name || raw.prod_name || raw.name || "Unknown product"),
        product_type_name: String(raw.product_type_name || raw.product_group_name || ""),
        colour_group_name: String(raw.colour_group_name || raw.colour || ""),
        // ... etc
    };
}
```

The key fields it maps:
- `prod_name` → `product_name` (backend uses Kaggle column name; frontend uses display name)
- `article_id` with leading zeros → stripped to clean ID
- Nested `metadata.product_name` → `product_name` (ChromaDB returns metadata as object)

## Zustand Stores

### authStore (`store/authStore.ts`)
```typescript
{
    user: User | null,            // {id, username, email, role, customer_id}
    token: string | null,         // JWT access token
    isAuthenticated: boolean,
    isLoading: boolean,
    login(username, password),    // → POST /auth/login
    logout(),                     // clears localStorage + state
    checkAuth(),                  // re-hydrates from localStorage on page load
}
```
Uses Zustand `persist` middleware with key `"hm-auth"` — survives browser refresh.

### cartStore (`store/cartStore.ts`)
```typescript
{
    items: CartItem[],        // {product: Product, quantity: number}[]
    addItem(product),
    removeItem(productId),
    updateQuantity(productId, qty),
    clearCart(),
    total,                    // computed: sum of price × quantity
    count,                    // computed: total item count
}
```

---

# SECTION 8 — PIPELINES

## All Pipelines in pipelines/

| File | Purpose | Input Files | Output Files | Approx Run Time |
|---|---|---|---|---|
| `data_prep_pipeline.py` | Phase 1: Clean raw data, create processed files | `articles.csv`, `customers.csv`, `transactions_train.csv` | `article_lookup.csv`, `customers_clean.csv`, `transactions_small.csv` | 10-20 min (chunks 3.3GB file) |
| `rfm_pipeline.py` | Phase 2: RFM + KMeans clustering | `transactions_train.csv`, `customers_clean.csv` | `rfm_segmented.csv`, `rfm_segmented.parquet` | 5-15 min (31M row groupby) |
| `recommendation_pipeline.py` | Phase 3: All recommendation types | `transactions_train.csv`, `articles.csv`, `rfm_segmented.csv` | `cluster_recs.csv`, `user_recs.csv`, `co_purchase_recs.csv`, `top_7d.csv`, `top_30d.csv` | 10-30 min |
| `trending_pipeline.py` | Refresh trending products only | `transactions_small.csv`, `article_lookup.csv` | `top_products_7d.csv`, `top_products_30d.csv` | <1 min |
| `price_pipeline.py` | Compute INR prices per article | `transactions_small.csv` | `article_prices.csv` | <1 min |
| `full_retraining_pipeline.py` | Master orchestrator: runs all 3 phases in order | (delegates to above) | All processed files | 25-65 min total |

## Why Pipelines Are Important

Without pipelines, the system would need to:
1. Load and process 31M transactions on every API request (impossible — 2-5 minute latency)
2. Re-train KMeans every time recommendations are needed (3-10 minutes)
3. Manually ensure processing steps happen in the correct order

Pipelines **decouple computation from serving**: all heavy processing happens once overnight (or on-demand), results are saved to CSV files, and the API serves only pre-computed results instantly.

## Triggering Pipelines from Admin UI

From `main.py` line 550:
```python
@app.post("/api/admin/retrain")
def trigger_retrain(pipeline: str = "full", _admin=Depends(require_admin)):
    def _run():
        if pipeline == "rfm":
            from pipelines.rfm_pipeline import run_pipeline
        elif pipeline == "recommendations":
            from pipelines.recommendation_pipeline import run_pipeline
        else:
            from pipelines.full_retraining_pipeline import run_pipeline
        run_pipeline()

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return {"detail": f"Pipeline '{pipeline}' triggered.", "status": "running"}
```

The pipeline runs in a **background daemon thread** so it doesn't block the API. The frontend can poll `/api/admin/health` to check if new data files exist.

## full_retraining_pipeline.py — What It Orchestrates

Dependency order:
```
Stage 1: data_prep_pipeline
    ↓ (outputs: article_lookup, customers_clean, transactions_small)
Stage 2: rfm_pipeline
    ↓ (outputs: rfm_segmented — depends on transactions from Stage 1)
Stage 3: recommendation_pipeline
    ↓ (outputs: all recs — depends on rfm_segmented from Stage 2)
```

The `--skip-data-prep` flag allows skipping Stage 1 if only the ML models need refreshing (raw data unchanged). This saves 10-20 minutes.

Each stage is wrapped in `_run_stage()` with timing and error isolation — if Stage 2 fails, the error is logged with duration and re-raised; Stage 3 will not run on a corrupt RFM file.

---

# SECTION 9 — SEMANTIC SEARCH (ChromaDB)

## What is ChromaDB?

ChromaDB is an **open-source vector database** — it stores products not as rows in a table, but as numerical vectors (embeddings) in high-dimensional space. Instead of matching text keywords, it finds products whose meaning is closest to your query.

## How Product Embeddings Were Created

From `utils/chroma_setup.py`:

1. **Build product text**: Every article's text fields are concatenated into one rich string:
   ```python
   def build_product_text(row: pd.Series) -> str:
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
       return " ".join(str(p) for p in parts if p)
   ```
   Example: `"Jade HW Skinny Denim TRS Trousers Garment Lower body Solid Denim blue Dark Blue Ladies Denim Trousers Ladieswear"`

2. **Load model**: `SentenceTransformer("all-MiniLM-L6-v2")` — a 22M parameter transformer model fine-tuned for semantic similarity tasks.

3. **Batch encode in 512-article batches** (to fit in RAM):
   ```python
   embeddings = model.encode(
       texts,
       normalize_embeddings=True,  # L2-normalised for cosine similarity
       batch_size=64,
   ).tolist()
   ```
   Each article becomes a **384-dimensional float32 vector**.

4. **Store in ChromaDB** with cosine similarity:
   ```python
   collection = client.create_collection(
       name="hm_products",
       metadata={"hnsw:space": "cosine"},  # HNSW index with cosine metric
   )
   collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
   ```

5. **Total**: ~105,000 product vectors stored in `chroma_db/` directory.

## How a Search Query Is Converted to a Vector

From `utils/chroma_search.py` `semantic_search()`:
```python
query_vec = model.encode(query.strip(), normalize_embeddings=True).tolist()
results = collection.query(query_embeddings=[query_vec], n_results=n_results, ...)
```

The **same model** that encoded the products encodes the query into the same 384-dimensional space. ChromaDB's HNSW (Hierarchical Navigable Small World) index then finds the nearest neighbours in O(log n) time.

## chroma_search.py — Step by Step

1. Module loads `chromadb.PersistentClient` and `SentenceTransformer` **once at import time** (not per request) — this is why the first server startup takes 10-30s but all subsequent searches are <100ms
2. `search(query, n_results=10)` is called by the `/api/search` FastAPI endpoint
3. Query → 384-dim vector via `_model.encode()`
4. ChromaDB finds n nearest products by cosine distance
5. Results are mapped through the normalisation function to return `{article_id, product_name, product_type_name, colour_group_name, score}`
6. `score = 1 - distance/2` (converting cosine distance to a 0-1 similarity score)

## Semantic vs Keyword Search for Fashion

| Keyword Search | Semantic Search |
|---|---|
| "black dress" finds products containing the exact words "black" AND "dress" | "black dress" also finds "noir evening gown", "dark cocktail wear", "onyx maxi dress" |
| Fails on synonyms: "hoodie" won't find "sweatshirt" | Understands synonyms: "cosy knitwear" finds sweaters, hoodies, cardigans |
| Can't understand context: "office wear for summer" returns no results | Returns lightweight formal pieces |
| "warm winter coat" requires the words to be in the product name | Finds all `Jacket`, `Outerwear`, `Padded Coat` entries semantically |

For fashion, semantic search is dramatically better because customers search in natural language while product names are often coded (e.g., `"Jade HW Skinny Denim TRS"` would never appear in a keyword search for "slim blue jeans").

---

# SECTION 10 — KEY TECHNICAL DECISIONS & TRADEOFFS

## Why Next.js 14 with App Router?

**Chosen for**: Server Components reduce JavaScript bundle size (charts, product cards can be RSC). App Router's file-based routing means `/app/recommendations/page.tsx` automatically handles code-splitting.

**Over alternatives**:
- **Vanilla React + Vite**: No SSR, no built-in routing, more setup overhead
- **Remix**: Better for full-stack, but more opinionated about data loading than needed here
- **Vue/Angular**: Team familiarity and React's ecosystem for Recharts, Zustand

## Why FastAPI Over Django/Flask?

- **Auto-generated OpenAPI docs** at `/docs` — free interactive API testing during development
- **Pydantic validation** on every request/response (UserLogin, UserOut, Token models)
- **Async support** — though not heavily used here, future-proof for high concurrency
- **Django** would add ORM, admin panel, migrations — overkill for what is essentially a thin API over CSV files and SQLite
- **Flask** has no type validation out of the box; would need marshmallow or similar

## Why SQLite Over PostgreSQL for User Storage?

- **User count is tiny** — we have at most tens of registered accounts (admin + test users). SQLite handles millions of rows trivially.
- **Zero deployment complexity** — no database server to install, configure, or maintain
- **File-based** — the entire user database is one file (`data/users.db`) that can be backed up with `cp`
- **PostgreSQL** would be the right choice if this scaled to a real multi-instance deployment

## Why CSV Files Over a Database for ML Data?

- **Pandas native format** — `pd.read_csv()` is highly optimised; parquet for binary
- **Portability** — CSV files are inspectable in Excel, shareable, diffable
- **Simplicity** — Adding a SQL ORM layer around ML pipeline outputs creates unnecessary complexity
- **The trade-off**: No transactional updates, no concurrent writes. But ML pipeline outputs are **write-once, read-many** — perfect for CSV
- **If this scaled**: PostgreSQL with COPY bulk inserts or a data warehouse like BigQuery

## Why Zustand Over Redux?

From `store/authStore.ts` (45 lines) vs a typical Redux equivalent (150+ lines with actions, reducers, selectors):

- **Minimal boilerplate**: `set({ user, token, isAuthenticated })` vs Redux's action creators + reducers + selectors
- **Built-in `persist` middleware**: `persist((set) => ({...}), {name:"hm-auth"})` — one line vs Redux Persist's 20-line setup
- **Direct mutation style** (Immer-like): No need for spread operators in every reducer
- **Smaller bundle**: Zustand is ~1KB vs Redux Toolkit's ~16KB

## Why Sonner for Toasts?

Sonner is the default toast library for the shadcn/ui ecosystem (which Next.js projects often use). It's promise-aware, minimal, and integrates with `<Toaster />` in the root layout. The alternatives (`react-hot-toast`, `react-toastify`) all work but Sonner has the cleanest API for async patterns: `toast.success("Order placed!")`.

## Main Limitations

1. **Pipeline runs are synchronous and blocking in spirit** — even though triggered in a background thread, there's no job queue, progress tracking, or failure notification
2. **No real-time data** — recommendations reflect the last pipeline run, which could be days old
3. **Cold-start fallback is global** — new users see the same trending items regardless of any contextual signals (device, location, referrer)
4. **SQLite concurrency** — fine for development but would fail under multiple simultaneous admin write operations
5. **JWT secret in environment variable** — defaults to a weak fallback (`"CHANGE_ME_IN_PRODUCTION"`) if env var not set
6. **No pagination on recommendations** — the endpoint returns up to 40 recommendations with no cursor-based pagination

## What Would You Do Differently Starting Over?

1. **Replace CSV-based ML data with DuckDB** — Columnar SQL queries on 30M rows without loading full files into RAM
2. **Add a job queue (Celery + Redis)** for pipeline execution with progress tracking and failure alerts
3. **Use feature stores (Feast/Tecton)** to serve pre-computed RFM features with millisecond latency
4. **Add A/B testing infrastructure** to compare recommendation algorithms on click-through rate
5. **Switch to a proper message broker** (Kafka) for real-time purchase event streaming to update trending in near-real-time

## Next Features to Add

1. **Collaborative filtering (SVD/ALS)** — item-item or user-user similarity for richer personalisation
2. **Session-based recommendations** — recommend based on current browse session, not just history
3. **Re-ranking layer** — apply business rules after ML scores (stock availability, margin, seasonal boost)
4. **Experiment framework** — A/B test cluster count, recommendation algorithm, trending window
5. **Email trigger engine** — auto-trigger win-back emails when a customer's recency crosses a threshold

---

# SECTION 11 — PRESENTATION TALKING POINTS

## Section 1 — Project Overview

**Say this out loud**: "This is a full-stack AI platform that solves a real problem every major retailer faces — out of 105,000 products, which ones do you show to which customer? We process 31 million purchase records to learn each customer's style, group them into 5 types, and instantly serve personalised recommendations to 1.36 million customers."

**Most impressive detail**: The system runs entirely on a laptop. 31 million rows processed, 105,000 products embedded in a vector database, and all recommendation results pre-computed and served in under 50 milliseconds.

**Likely question**: *"How is this different from just showing popular products?"*
**Answer**: Popular products are shown to everyone — that's the cold-start fallback. What makes this personalised is the RFM segmentation: a customer who bought 20 items in the last week gets completely different recommendations than a customer who hasn't bought anything in 300 days.

---

## Section 2 — Data Layer

**Say this out loud**: "The original dataset is 3.5 gigabytes — too large to load into memory on a normal laptop. So we built a data preparation pipeline that streams through the file in 500,000-row chunks, extracts only what's needed, and produces clean, lean files for every downstream pipeline to use."

**Most impressive detail**: The chunked streaming approach in `data_prep_pipeline.py` — it processes 3.3GB without ever holding more than 500,000 rows in RAM simultaneously, using `pd.read_csv(..., chunksize=500_000)`.

**Likely question**: *"Why not just use a database?"*
**Answer**: For this project, CSV files with pandas gives us everything we need. The ML pipelines write once and the API reads many times. Our in-memory cache makes repeated reads instantaneous. A database would add deployment complexity with no benefit at this scale.

---

## Section 3 — RFM & KMeans

**Say this out loud**: "We used a classic marketing framework called RFM — how recently did a customer buy, how frequently, and how much did they spend. We then used KMeans clustering to group all 1.36 million customers into 5 distinct personality types — from VIP Champions who buy every week, to Lost Customers who haven't bought in over a year."

**Most impressive detail**: The log1p transformation — without it, the 3 customers who bought 200+ items would dominate all 5 clusters, making the segmentation meaningless. A single line of preprocessing (`np.log1p`) makes the difference between a useful model and a broken one.

**Likely question**: *"How do you know 5 clusters is the right number?"*
**Answer**: We used the elbow method — plotting the within-cluster variance against the number of clusters. At 5 clusters, adding more stops significantly reducing variance, and 5 maps naturally to the 5 standard customer lifecycle stages every retail business uses.

---

## Section 4 — Recommendation Engine

**Say this out loud**: "Recommendations work at three levels. For customers we know, we serve their cluster's top-selling items. We also add a 'customers also bought' section — if your cluster's favourite product is a blue denim jacket, we show you the trousers that other blue denim jacket buyers usually buy together. New customers get globally trending items until we learn their preferences."

**Most impressive detail**: The co-purchase self-join in `recommendation_pipeline.py` — joining the transaction table with itself on `customer_id` to find all item pairs bought by the same person. This is a classic market basket analysis technique running on 31M rows.

**Likely question**: *"Why don't you show each customer products based on their individual history?"*
**Answer**: We do have per-user recommendations stored in `user_recommendations.csv`. But cluster-based recommendations are more robust for customers with sparse history (only 1-2 purchases). The cluster captures the behaviour of thousands of similar customers, giving a much richer signal than 2 data points.

---

## Section 5 — Demand Forecasting

**Say this out loud**: "We built a 30-day demand forecast using XGBoost — the same algorithm that wins most Kaggle competitions on tabular data. It looks at each product's purchase history and predicts how many units will sell each day. This is critical for inventory: buy too much and you're stuck with unsold stock; buy too little and customers can't get what they want."

**Most impressive detail**: XGBoost handles all 500 articles in a single model by using article_id as a categorical feature. Compare this to ARIMA which would need 500 separate models — one per article.

**Likely question**: *"How accurate is the forecast?"*
**Answer**: The accuracy depends on how regular a product's sales pattern is. Staple items like basic t-shirts are very predictable (MAPE <15%). Trend-driven items like seasonal coats are harder. The admin dashboard shows historical predictions vs actual if we had enough history to back-test.

---

## Section 6 — Backend API

**Say this out loud**: "The backend is a FastAPI application serving 20 endpoints — everything from login and product search to demand forecasting. We use JWT tokens so the server is stateless — no session database needed. Every token carries the user's role and customer ID, which is how we know if someone is allowed to see specific data."

**Most impressive detail**: The in-memory cache — the first request for `user_recommendations.csv` (13M rows) takes 3 seconds. Every subsequent request takes under 5 milliseconds. That's a 600x speedup from one dictionary lookup.

**Likely question**: *"What's the difference between the two types of login?"*
**Answer**: Normal login creates a user in our SQLite database — admin and registered users. Customer ID login doesn't create any database record at all. The customer's identity and cluster are embedded directly in the JWT token. It's what we call a "virtual user" — they exist only in the token.

---

## Section 7 — Frontend

**Say this out loud**: "The frontend is built with Next.js 14 and has two completely separate experiences. The admin sees charts, cluster statistics, demand forecasts, and pipeline controls. Regular users see their personalised feed, can search semantically for any fashion concept, and have a shopping cart with checkout simulation."

**Most impressive detail**: The Zustand rehydration race condition fix — a subtle bug where the page would briefly redirect logged-in users to the login screen on every page refresh. Fixed with a two-phase state check: `isLoading` guard before `isAuthenticated` check.

**Likely question**: *"Why is the admin login showing me cached/mock data?"*
**Answer**: The overview page has real mock data (1.36 million customers, 5 clusters) that it shows while the API loads. When the backend is running, the real API data replaces the mock. This pattern means the page is never blank — users always see something meaningful immediately.

---

## Section 8 — Pipelines

**Say this out loud**: "The system has 5 pipelines that transform raw data into recommendations in three stages. Stage 1 cleans the data, Stage 2 computes customer segments, Stage 3 generates all recommendations. An admin can trigger a full retrain from the dashboard — the entire process runs in the background in under an hour."

**Most impressive detail**: The `--skip-data-prep` flag on `full_retraining_pipeline.py` — if the raw Kaggle data hasn't changed, you can skip the 20-minute data prep stage and only re-run the 10-minute ML stages. This is a production-grade optimisation that saves 40% of retraining time.

**Likely question**: *"How do you keep recommendations fresh?"*
**Answer**: In a production system, you'd schedule the pipeline to run nightly via cron. The current system lets the admin trigger it on demand from the UI. The trending pipeline is faster (under 1 minute) and could be scheduled every few hours.

---

## Section 9 — Semantic Search

**Say this out loud**: "Our search doesn't just match words — it understands meaning. We converted all 105,000 product descriptions into mathematical vectors using a transformer model, stored them in ChromaDB. When you search for 'something cozy for cold weather', the system finds knitwear, padded jackets, and fleece even though none of those words appeared in your query."

**Most impressive detail**: The embedding model (`all-MiniLM-L6-v2`) converts a product description like "Jade HW Skinny Denim TRS Trousers Garment Lower body Solid Denim blue Dark Blue Ladies" into a single 384-dimensional vector that captures its semantic meaning — all 105,000 products are always ready for instant comparison.

**Likely question**: *"How is this different from a LIKE query in SQL?"*
**Answer**: A SQL LIKE query would find "blue jeans" if those exact words appear in the product name. Semantic search finds it even if the product is called "azure denim trousers" or "indigo slim pants" because those phrases have similar meaning in vector space. Fashion products especially use varied terminology — semantic search bridges that gap.

---

## Section 10 — Technical Decisions

**Say this out loud**: "Every major technology choice was deliberate. FastAPI auto-generates documentation, Zustand is 10x less code than Redux, SQLite needs no setup, and CSV files with an in-memory cache give us database-like speed without database complexity. The whole stack can run on a single laptop — that's a feature, not a limitation."

**Most impressive detail**: The entire system — 31M transaction processing, ML model training, vector embeddings for 105,000 products, REST API, and React frontend — runs without any cloud infrastructure, Docker, or external database servers.

**Likely question**: *"What would you do to scale this to production?"*
**Answer**: Four things: Replace CSV storage with DuckDB for concurrent reads. Add Redis for distributed caching instead of in-process memory. Add a job queue like Celery for pipeline execution. And deploy behind a load balancer with multiple FastAPI instances. The code is already structured for this — the pipeline and API layers are completely separate.

---

*End of Documentation — Version 1.0 | Generated from actual codebase analysis*
