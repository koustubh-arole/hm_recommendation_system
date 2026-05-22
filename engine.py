import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

# ─── Cluster personas & offers ────────────────────────────────────────────────
CLUSTER_STRATEGY = {
    0: {
        "class":  "Potential Loyalists",
        "offer":  "15% OFF your next order",
        "code":   "HMPOTENTIAL15",
        "color":  "#FF6B6B",
        "icon":   "⭐",
        "desc":   "You're close to VIP status! Keep shopping to unlock exclusive perks."
    },
    1: {
        "class":  "Recent Shoppers",
        "offer":  "BUY 1 GET 1 50% OFF",
        "code":   "HMSTYLE50",
        "color":  "#4ECDC4",
        "icon":   "🛒",
        "desc":   "Thanks for your recent visit! Here's what's trending in your segment."
    },
    2: {
        "class":  "VIP Champions",
        "offer":  "FREE SHIPPING + 20% OFF",
        "code":   "HMVIPGOLD",
        "color":  "#FFD700",
        "icon":   "👑",
        "desc":   "You're one of our most valued customers. Enjoy exclusive VIP benefits."
    },
    3: {
        "class":  "At-Risk Customers",
        "offer":  "25% OFF — We miss you!",
        "code":   "WE_MISS_YOU25",
        "color":  "#FF8C42",
        "icon":   "💛",
        "desc":   "It's been a while. Come back and discover what's new just for you."
    },
    4: {
        "class":  "Occasional Shoppers",
        "offer":  "₹200 OFF on orders above ₹1000",
        "code":   "HMSTART200",
        "color":  "#6C5CE7",
        "icon":   "🎯",
        "desc":   "Explore our most popular picks — loved by shoppers just like you."
    },
}

META_COLS = ['article_id', 'prod_name', 'product_group_name']
SCALING_FACTOR = 590 

def load_all_data(data_proc: str = "data/processed", data_raw: str = "data/raw"):
    p = Path(data_proc)
    r = Path(data_raw)

    # Ensure display_monetary is loaded if it exists in the CSV
    rfm = pd.read_csv(p / "rfm_segmented.csv", dtype={'customer_id': str})
    articles = pd.read_csv(r / "articles.csv", dtype={'article_id': str})
    cluster_recs = pd.read_csv(p / "cluster_recommendations.csv", dtype={'article_id': str})
    top_7d  = pd.read_csv(p / "top_products_7d.csv",  dtype={'article_id': str})
    top_30d = pd.read_csv(p / "top_products_30d.csv", dtype={'article_id': str})

    co_purchase = None
    co_path = p / "co_purchase_recs.csv"
    if co_path.exists():
        co_purchase = pd.read_csv(co_path, dtype={'article_id': str, 'also_bought_id': str})

    return rfm, articles, cluster_recs, top_7d, top_30d, co_purchase

def _enrich(id_list: list, articles_df: pd.DataFrame, n: int = 5) -> list:
    rows = articles_df[articles_df['article_id'].isin([str(x) for x in id_list])]
    rows = rows.set_index('article_id').reindex([str(x) for x in id_list]).reset_index()
    return rows[META_COLS].dropna(subset=['prod_name']).head(n).to_dict('records')

def get_customer_payload(customer_id: str, rfm_df, cluster_recs_df, top_7d_df, top_30d_df, co_purchase_df, articles_df, n_recs: int = 5) -> dict:
    customer_row = rfm_df[rfm_df['customer_id'] == str(customer_id)]

    if not customer_row.empty:
        row = customer_row.iloc[0]
        cluster_id = int(row['cluster'])
        strategy = CLUSTER_STRATEGY.get(cluster_id, CLUSTER_STRATEGY[0])

        top_article_ids = cluster_recs_df[cluster_recs_df['cluster'] == cluster_id]['article_id'].head(n_recs).tolist()
        recommendations = _enrich(top_article_ids, articles_df, n_recs)

        also_bought = []
        if co_purchase_df is not None and top_article_ids:
            seed_item = top_article_ids[0]
            co_ids = co_purchase_df[(co_purchase_df['cluster'] == cluster_id) & (co_purchase_df['article_id'] == seed_item)]['also_bought_id'].head(n_recs).tolist()
            if co_ids:
                also_bought = _enrich(co_ids, articles_df, n_recs)

        # ── DUAL-TRACK STATS ──────────────────────────────────────────────────
        stats = {
            'recency':   int(row.get('recency',   0)),
            'frequency': int(row.get('frequency', 0)),
            'monetary':  float(row.get('monetary', 0.0)),
            'display_monetary': float(row.get('display_monetary', row.get('monetary', 0) * SCALING_FACTOR)),
            'cluster':   cluster_id,
        }

        return {
            "is_cold": False,
            "persona": strategy['class'],
            "icon": strategy['icon'],
            "desc": strategy['desc'],
            "offer": strategy['offer'],
            "promo_code": strategy['code'],
            "color": strategy['color'],
            "cluster_id": cluster_id,
            "recommendations": recommendations,
            "also_bought": also_bought,
            "stats": stats,
        }
    else:
        trending = _enrich(top_7d_df['article_id'].head(n_recs).tolist(), articles_df, n_recs)
        return {
            "is_cold": True, "persona": "New Member", "icon": "🌟",
            "desc": "Welcome! Here's what's trending this week.",
            "offer": "WELCOME 10% OFF", "promo_code": "HMNEW10", "color": "#00B4D8",
            "cluster_id": None, "recommendations": trending, "also_bought": [], "stats": None,
        }

def process_rfm_data(transactions_df):
    # Ensure date handling is robust
    transactions_df['t_dat'] = pd.to_datetime(transactions_df['t_dat'])
    max_date = transactions_df['t_dat'].max()

    # 1. Create the base RFM table (Raw Kaggle decimals)
    rfm = transactions_df.groupby('customer_id').agg({
        't_dat': lambda x: (max_date - x.max()).days,
        'article_id': 'count',
        'price': 'sum'
    }).rename(columns={'t_dat': 'recency', 'article_id': 'frequency', 'price': 'monetary'})

    # --- TRACK A: DISPLAY DATA (Scaled for humans) ---
    rfm['display_monetary'] = rfm['monetary'] * SCALING_FACTOR

    # --- TRACK B: MODEL DATA (Mathematically optimized) ---
    features = rfm[['recency', 'frequency', 'monetary']].copy()
    
    # Log-transform to handle skewness
    features['frequency'] = np.log1p(features['frequency'])
    features['monetary'] = np.log1p(features['monetary'])

    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)

    # Apply Clustering
    kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
    rfm['cluster'] = kmeans.fit_predict(X_scaled)

    return rfm