import streamlit as st
import pandas as pd
import numpy as np
import sys, os
from pathlib import Path
import plotly.express as px
import plotly.graph_objects as go

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import engine

# ── Resolve ChromaDB path from THIS file's location ──────────────────────────
# streamlit_app1.py lives in  app/
# chroma_db/         lives in  <project_root>/chroma_db/
# So go up ONE level from app/ to reach project root.
_APP_DIR      = Path(__file__).resolve().parent          # .../app/
_PROJECT_ROOT = _APP_DIR.parent                          # .../hm_recommendation_system/
CHROMA_DB_PATH = str(_PROJECT_ROOT / "chroma_db")        # always absolute, always correct

# ── ChromaDB search helpers (graceful import — search tab shows warning if missing)
try:
    from utils.chroma_search import semantic_search, collection_size, get_unique_metadata_values
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

# ─── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="H&M Analytics Platform",
    page_icon="🛍️",
    layout="wide"
)

# ─── CSS ──────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    html, body, [class*="css"] { font-family: 'DM Sans', sans-serif; }
    h1,h2,h3 { font-family: 'Syne', sans-serif !important; }

    .segment-card {
        padding:18px 22px; border-radius:12px; border-left:5px solid;
        margin-bottom:14px;
    }
    .offer-banner {
        background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
        color:white; padding:22px; border-radius:14px;
        text-align:center; margin-bottom:16px;
    }
    .offer-banner .code {
        font-size:1.5rem; font-weight:800; letter-spacing:4px; color:#FFD700;
        font-family:'Syne',sans-serif;
    }
    .product-card {
        background:#f8f9fa; border-radius:10px; padding:14px;
        text-align:center; height:155px;
        display:flex; flex-direction:column; justify-content:space-between;
    }
    .search-result-card {
        background:#ffffff;
        border: 1px solid #e8ecf0;
        border-radius: 14px;
        padding: 18px 16px;
        height: 220px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: box-shadow 0.2s;
        position: relative;
        overflow: hidden;
    }
    .sim-badge {
        position: absolute;
        top: 10px; right: 10px;
        background: #4361ee;
        color: white;
        font-size: 0.68rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 20px;
    }
    .forecast-header {
        font-family:'Syne',sans-serif; font-size:1.6rem;
        font-weight:800; margin-bottom:4px;
    }
    .search-header {
        font-family:'Syne',sans-serif; font-size:1.6rem;
        font-weight:800; margin-bottom:4px;
        background: linear-gradient(90deg, #4361ee, #f72585);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .tag {
        display:inline-block; padding:2px 10px; border-radius:20px;
        font-size:0.72rem; font-weight:600; margin-top:4px;
    }
    .block-container { padding-top:1.5rem; }
    .search-tip {
        background: #f0f4ff;
        border-left: 4px solid #4361ee;
        padding: 10px 14px;
        border-radius: 0 8px 8px 0;
        font-size: 0.85rem;
        color: #333;
        margin-bottom: 16px;
    }
    .dept-pill {
        display:inline-block; padding:3px 12px; border-radius:20px;
        font-size:0.75rem; font-weight:600; margin:2px;
        background:#f0f4ff; color:#4361ee; cursor:pointer;
    }
</style>
""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# DATA LOADING — Cached once per session
# ══════════════════════════════════════════════════════════════════════════════

@st.cache_data
def load_rec_data():
    return engine.load_all_data(data_proc="data/processed", data_raw="data/raw")


@st.cache_data
def load_forecast_data():
    proc = Path("data/processed")
    forecast, summary, daily = None, None, None
    if (proc / "forecast_output.csv").exists():
        forecast = pd.read_csv(proc / "forecast_output.csv",
                               dtype={"article_id": str}, parse_dates=["date"])
    if (proc / "forecast_summary.csv").exists():
        summary  = pd.read_csv(proc / "forecast_summary.csv",
                               dtype={"article_id": str})
    if (proc / "daily_demand.csv").exists():
        daily    = pd.read_csv(proc / "daily_demand.csv",
                               dtype={"article_id": str}, parse_dates=["date"])
    return forecast, summary, daily


@st.cache_data
def enrich_forecast_summary(summary_df: pd.DataFrame) -> pd.DataFrame:
    df = summary_df.copy()
    df["article_id"] = df["article_id"].astype(str).str.zfill(10)
    has_names = ("prod_name" in df.columns) and df["prod_name"].notna().any()
    if not has_names:
        try:
            arts = pd.read_csv("data/raw/articles.csv", dtype={"article_id": str})
            arts["article_id"] = arts["article_id"].astype(str).str.zfill(10)
            for c in ["prod_name", "product_group_name"]:
                if c in df.columns:
                    df = df.drop(columns=[c])
            df = df.merge(
                arts[["article_id", "prod_name", "product_group_name"]],
                on="article_id", how="left"
            )
        except Exception:
            pass
    if "prod_name" not in df.columns:
        df["prod_name"] = ""
    df["prod_name"] = df["prod_name"].fillna("").astype(str)
    if "product_group_name" not in df.columns:
        df["product_group_name"] = ""
    df["product_group_name"] = df["product_group_name"].fillna("").astype(str)
    df["display_name"] = df.apply(
        lambda r: r["prod_name"] if r["prod_name"] else f"Product {r['article_id']}", axis=1)
    df["label"] = df["display_name"] + "  (" + df["article_id"] + ")"
    return df


# ── ChromaDB resources (cached — model loads only once) ──────────────────────
@st.cache_resource
def load_chroma():
    """
    Returns (collection, model).  Uses CHROMA_DB_PATH (absolute, from __file__)
    and get_collection() — NOT get_or_create — so wrong path raises an error
    instead of silently creating an empty collection.
    """
    if not CHROMA_AVAILABLE:
        return None, None
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer
        client     = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        collection = client.get_collection("hm_products")   # raises if not found
        model      = SentenceTransformer("all-MiniLM-L6-v2")
        return collection, model
    except Exception as e:
        st.session_state["chroma_error"] = str(e)
        return None, None


# ── Load all data ─────────────────────────────────────────────────────────────
rfm_df, articles_df, cluster_recs_df, top_7d_df, top_30d_df, co_purchase_df = load_rec_data()
forecast_df, forecast_summary_raw, daily_demand_df = load_forecast_data()
forecast_summary = (enrich_forecast_summary(forecast_summary_raw)
                    if forecast_summary_raw is not None else None)
chroma_collection, embed_model = load_chroma()
chroma_ready = chroma_collection is not None and collection_size(chroma_collection) > 10


# ══════════════════════════════════════════════════════════════════════════════
# TOP NAVIGATION
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("""
    <div style="
        display: flex; align-items: center; gap: 16px;
        margin-bottom: 24px; padding: 10px 0;
        border-bottom: 2px solid #f0f2f6;
    ">
        <span style="font-size: 2.5rem; line-height: 1;">🛍️</span>
        <h1 style="
            font-family: 'Syne', sans-serif;
            font-size: 2.2rem; font-weight: 800;
            margin: 0; letter-spacing: -0.5px; line-height: 1.2;
        ">H&M Analytics Platform</h1>
    </div>
""", unsafe_allow_html=True)

PAGE_PORTAL   = "🏠 Member Portal"
PAGE_SEARCH   = "🔍 Product Search"        # ← NEW
PAGE_FORECAST = "📈 Demand Forecasting"

page = st.radio(
    "Navigate",
    [PAGE_PORTAL, PAGE_SEARCH, PAGE_FORECAST],
    horizontal=True,
    label_visibility="collapsed",
    key="main_nav"
)
st.markdown("---")


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 1 — MEMBER PORTAL  (unchanged)
# ══════════════════════════════════════════════════════════════════════════════
if page == PAGE_PORTAL:

    with st.sidebar:
        st.markdown("### 🔍 Customer Lookup")
        user_input = st.text_input(
            "Customer ID",
            placeholder="00000dbacae5abe5e23885...",
            label_visibility="collapsed",
            key="portal_customer_id"
        )
        st.markdown("---")
        st.markdown("#### Segment Legend")
        for cid, info in engine.CLUSTER_STRATEGY.items():
            st.markdown(
                f"<span style='color:{info['color']}'>{info['icon']}</span> "
                f"**{info['class']}**", unsafe_allow_html=True)
        st.caption("Powered by RFM segmentation + co-purchase analysis")

    if not user_input:
        st.markdown("### 👋 Welcome to the H&M Member Portal")
        c1, c2, c3 = st.columns(3)
        c1.info("**🎯 Your Segment** — See your shopper persona")
        c2.info("**🎁 Exclusive Offer** — Personalised promo code")
        c3.info("**🛍️ Recommendations** — Products loved by shoppers like you")
        st.markdown("---")
        st.markdown("#### 🔥 Trending This Week")
        t_recs = engine._enrich(top_7d_df["article_id"].head(5).tolist(), articles_df)
        cols = st.columns(5)
        for i, item in enumerate(t_recs):
            with cols[i]:
                st.markdown(f"**{item.get('prod_name','N/A')}**")
                st.caption(item.get("product_group_name", "—"))
                st.code(f"ID: {item['article_id']}", language="text")

    else:
        payload = engine.get_customer_payload(
            customer_id=user_input, rfm_df=rfm_df,
            cluster_recs_df=cluster_recs_df,
            top_7d_df=top_7d_df, top_30d_df=top_30d_df,
            co_purchase_df=co_purchase_df, articles_df=articles_df,
        )
        color   = payload["color"]
        persona = payload["persona"]
        is_cold = payload["is_cold"]

        st.markdown(
            f'<div class="segment-card" style="border-color:{color};background:{color}18">'
            f'<span style="font-size:2rem">{payload["icon"]}</span>'
            f'<span style="font-size:1.35rem;font-weight:800;margin-left:10px;color:{color}">'
            f'{"Welcome, " if is_cold else "Welcome back, "}{persona}</span><br/>'
            f'<span style="color:#666;font-size:.9rem;margin-top:4px;display:block">'
            f'{payload["desc"]}</span></div>',
            unsafe_allow_html=True)

        if not is_cold and payload["stats"]:
            s = payload["stats"]
            s1, s2, s3, s4 = st.columns(4)
            s1.metric("🕐 Last Purchase",  f"{s['recency']} days ago")
            s2.metric("🔁 Total Purchases", s["frequency"])
            s3.metric("💰 Total Spent",     f"${s['monetary']:,.2f}")
            s4.metric("📊 Cluster",         f"#{s['cluster']} — {persona}")
            st.markdown("---")

        st.markdown(
            f'<div class="offer-banner">🎁 <strong>{payload["offer"]}</strong><br/>'
            f'<span style="opacity:.7;font-size:.85rem">Use code at checkout:</span><br/>'
            f'<span class="code">{payload["promo_code"]}</span></div>',
            unsafe_allow_html=True)

        st.markdown("---")
        st.markdown(f'### {"🔥 Trending This Week" if is_cold else "🛍️ Recommended for You"}')
        recs = payload["recommendations"]
        if recs:
            cols = st.columns(min(len(recs), 5))
            for i, item in enumerate(recs[:5]):
                with cols[i]:
                    st.markdown(
                        f'<div class="product-card"><div>'
                        f'<div style="font-weight:700;font-size:.88rem">{item.get("prod_name","N/A")}</div>'
                        f'<span class="tag" style="background:{color}22;color:{color}">'
                        f'{item.get("product_group_name","Garment")}</span></div>'
                        f'<div style="font-family:monospace;font-size:.72rem;color:#999">'
                        f'{item["article_id"]}</div></div>',
                        unsafe_allow_html=True)
                    st.button("🛒 View", key=f"portal_rec_{item['article_id']}_{i}",
                              use_container_width=True)

        also = payload.get("also_bought", [])
        if also:
            st.markdown("---")
            st.markdown("### 🤝 Customers Also Bought")
            cols2 = st.columns(min(len(also), 5))
            for i, item in enumerate(also[:5]):
                with cols2[i]:
                    st.markdown(
                        f'<div class="product-card" style="background:#fff5f5"><div>'
                        f'<div style="font-weight:700;font-size:.88rem">{item.get("prod_name","N/A")}</div>'
                        f'<span class="tag" style="background:#ff6b6b22;color:#ff6b6b">'
                        f'{item.get("product_group_name","Garment")}</span></div>'
                        f'<div style="font-family:monospace;font-size:.72rem;color:#999">'
                        f'{item["article_id"]}</div></div>',
                        unsafe_allow_html=True)
                    st.button("🛒 View", key=f"portal_ab_{item['article_id']}_{i}",
                              use_container_width=True)


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 2 — SEMANTIC PRODUCT SEARCH  (NEW)
# ══════════════════════════════════════════════════════════════════════════════
elif page == PAGE_SEARCH:

    st.markdown('<div class="search-header">🔍 Semantic Product Search</div>',
                unsafe_allow_html=True)
    st.caption("Powered by ChromaDB + all-MiniLM-L6-v2 embeddings · Finds products by meaning, not just keywords")

    # ── Guard: ChromaDB not ready ─────────────────────────────────────────────
    if not chroma_ready:
        n_items = collection_size(chroma_collection) if chroma_collection else 0
        err_msg = st.session_state.get("chroma_error", "")

        st.error(
            f"**ChromaDB not connected** — {n_items} items found at path below."
        )

        # Show the exact path the app is looking at — key for debugging
        st.code(f"Looking for DB at: {CHROMA_DB_PATH}", language="text")

        if err_msg:
            st.code(f"Error: {err_msg}", language="text")

        st.info(
            "**How to fix:**\n\n"
            "1. Make sure `chroma_setup.py` ran successfully (you should have seen ✅ Done!)\n"
            "2. Check that the `chroma_db/` folder exists at your project root\n"
            "3. Run setup if needed:\n"
            "```cmd\npython utils/chroma_setup.py --top 10000\n```"
        )

        if n_items > 0 and chroma_collection and embed_model:
            st.info(f"Demo mode: showing results from {n_items} sample products.")
        else:
            st.stop()

    # ── Sidebar filters ───────────────────────────────────────────────────────
    with st.sidebar:
        st.markdown("### 🎛️ Search Filters")
        n_results = st.slider("Results to show", 4, 20, 8, 4, key="search_n")

        # Populate filter dropdowns from ChromaDB metadata
        st.markdown("**Category**")
        groups = ["All"] + get_unique_metadata_values(chroma_collection, "product_group_name")
        sel_group = st.selectbox("Product group", groups, key="search_group",
                                 label_visibility="collapsed")

        st.markdown("**Department**")
        depts = ["All"] + get_unique_metadata_values(chroma_collection, "department_name")
        sel_dept = st.selectbox("Department", depts, key="search_dept",
                                label_visibility="collapsed")

        st.markdown("---")
        st.markdown("#### 💡 Try these searches")
        suggestions = [
            "summer dress", "black jeans", "winter jacket",
            "casual t-shirt", "workout clothes", "formal shirt",
            "floral pattern", "kids hoodie", "evening wear",
        ]
        for s in suggestions:
            st.markdown(f"<span class='dept-pill'>{s}</span>",
                        unsafe_allow_html=True)

        st.markdown("---")
        n_indexed = collection_size(chroma_collection)
        st.caption(f"📦 {n_indexed:,} products indexed")

    # ── Search bar ────────────────────────────────────────────────────────────
    col_inp, col_btn = st.columns([5, 1])
    with col_inp:
        query = st.text_input(
            "Search",
            placeholder='e.g.  "summer floral dress"  or  "warm winter jacket for men"',
            label_visibility="collapsed",
            key="search_query"
        )
    with col_btn:
        search_clicked = st.button("🔍 Search", use_container_width=True,
                                   key="search_btn")

    # Tip box
    st.markdown(
        '<div class="search-tip">💡 <strong>Semantic search</strong> understands '
        'meaning — try <em>"something cozy for cold weather"</em> or '
        '<em>"office wear for women"</em> instead of just keywords.</div>',
        unsafe_allow_html=True
    )

    # ── Build articles lookup once (article_id → metadata dict) ─────────────
    @st.cache_data
    def build_article_lookup():
        """Fast lookup: article_id → {prod_name, product_group_name, department_name}"""
        needed = ["article_id", "prod_name", "product_group_name",
                  "department_name", "colour_group_name", "garment_group_name"]
        cols   = [c for c in needed if c in articles_df.columns]
        df     = articles_df[cols].copy()
        df["article_id"] = df["article_id"].astype(str).str.zfill(10)
        return df.set_index("article_id").to_dict("index")

    art_lookup = build_article_lookup()

    # ── Run search on Enter OR button click ───────────────────────────────────
    if query.strip():
        with st.spinner(f'Searching for "{query}" ...'):
            results = semantic_search(
                query         = query,
                collection    = chroma_collection,
                model         = embed_model,
                n_results     = n_results,
                filter_group  = None if sel_group == "All" else sel_group,
                filter_department = None if sel_dept == "All" else sel_dept,
            )

        # Enrich results with articles_df — ChromaDB metadata can be empty
        # if the indexing run was interrupted or the metadata was stripped.
        for item in results:
            aid = str(item.get("article_id", "")).zfill(10)
            row = art_lookup.get(aid, {})
            # Only overwrite if ChromaDB returned empty / N/A
            if not item.get("prod_name") or item["prod_name"] in ("", "N/A"):
                item["prod_name"] = row.get("prod_name", f"Product {aid}")
            if not item.get("product_group_name"):
                item["product_group_name"] = row.get("product_group_name", "")
            if not item.get("department_name"):
                item["department_name"] = row.get("department_name", "")
            if not item.get("colour_group_name"):
                item["colour_group_name"] = row.get("colour_group_name", "")

        if not results:
            st.error("No results found. Try a different query or remove filters.")
        else:
            st.markdown(f"### ✨ {len(results)} Results for &nbsp;**\"{query}\"**",
                        unsafe_allow_html=True)
            if sel_group != "All" or sel_dept != "All":
                filters_str = "  ·  ".join(
                    f for f in [
                        sel_group if sel_group != "All" else "",
                        sel_dept  if sel_dept  != "All" else "",
                    ] if f
                )
                st.caption(f"Filtered by: {filters_str}")

            st.markdown("---")

            # ── Result cards in rows of 4 ─────────────────────────────────────
            cols_per_row = 4
            for row_start in range(0, len(results), cols_per_row):
                row_items = results[row_start : row_start + cols_per_row]
                cols = st.columns(cols_per_row)

                for col_idx, item in enumerate(row_items):
                    with cols[col_idx]:
                        sim       = item["similarity_pct"]
                        prod_name = (item.get("prod_name") or "").strip()
                        if not prod_name or prod_name == "N/A":
                            prod_name = f"Product {item.get('article_id','')}"
                        group  = item.get("product_group_name", "")
                        dept   = item.get("department_name", "")
                        colour = item.get("colour_group_name", "")
                        article = item.get("article_id", "")

                        if sim >= 75:   badge_bg = "#4361ee"
                        elif sim >= 55: badge_bg = "#7B2FBE"
                        else:           badge_bg = "#adb5bd"

                        group_html  = f'<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:.7rem;font-weight:600;background:#4361ee18;color:#4361ee;margin-top:4px">{group}</span>' if group else ""
                        dept_html   = f' <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:.7rem;font-weight:600;background:#f7258518;color:#f72585">{dept}</span>' if dept else ""
                        colour_html = f'<div style="font-size:.72rem;color:#888;margin-top:3px">🎨 {colour}</div>' if colour else ""

                        st.markdown(f"""
                        <div style="background:#ffffff;border:1px solid #e0e4ea;
                                    border-radius:14px;padding:14px 14px 10px;
                                    position:relative;min-height:165px;
                                    display:flex;flex-direction:column;gap:5px;
                                    color:#1a1a2e;">
                            <span style="position:absolute;top:10px;right:10px;
                                         background:{badge_bg};color:white;
                                         font-size:.68rem;font-weight:700;
                                         padding:2px 8px;border-radius:20px;">
                                {sim}% match
                            </span>
                            <div style="font-weight:800;font-size:.9rem;
                                        color:#1a1a2e;line-height:1.35;
                                        padding-right:65px;margin-top:2px;">
                                {prod_name}
                            </div>
                            <div>{group_html}{dept_html}</div>
                            {colour_html}
                            <div style="margin-top:auto;padding-top:6px;
                                        font-family:monospace;font-size:.68rem;color:#aaa;">
                                ID: {article}
                            </div>
                        </div>""", unsafe_allow_html=True)

                        st.button("🛒 Add to bag",
                                  key=f"search_add_{article}_{row_start}_{col_idx}",
                                  use_container_width=True)

            # ── Similarity distribution mini-chart ────────────────────────────
            st.markdown("---")
            with st.expander("📊 Similarity score breakdown", expanded=False):
                sim_data = pd.DataFrame({
                    "Product": [r["prod_name"][:30] for r in results],
                    "Match %": [r["similarity_pct"] for r in results],
                })
                fig_sim = px.bar(
                    sim_data, x="Match %", y="Product",
                    orientation="h",
                    color="Match %",
                    color_continuous_scale=["#adb5bd", "#7B2FBE", "#4361ee"],
                    range_color=[40, 100],
                    labels={"Match %": "Semantic Similarity %", "Product": ""}
                )
                fig_sim.update_layout(
                    yaxis=dict(autorange="reversed"),
                    height=40 * len(results) + 60,
                    margin=dict(l=0, r=20, t=20, b=20),
                    coloraxis_showscale=False,
                    plot_bgcolor="rgba(0,0,0,0)",
                    paper_bgcolor="rgba(0,0,0,0)"
                )
                fig_sim.update_traces(marker_line_width=0)
                st.plotly_chart(fig_sim, use_container_width=True)

    else:
        # ── Empty state: show popular category shortcuts ───────────────────────
        st.markdown("### 🌟 Popular Categories")
        st.markdown("Click a category below or type your own search above.")

        quick_searches = [
            ("👗", "Dresses",        "summer dress"),
            ("👖", "Jeans",          "slim fit jeans"),
            ("👕", "T-Shirts",       "casual t-shirt"),
            ("🧥", "Jackets",        "warm winter jacket"),
            ("👟", "Sportswear",     "gym workout top"),
            ("👔", "Formal Wear",    "formal shirt office"),
            ("🌸", "Floral Prints",  "floral pattern blouse"),
            ("🧒", "Kids",           "kids clothing colourful"),
        ]

        rows = [quick_searches[:4], quick_searches[4:]]
        for row in rows:
            cols = st.columns(4)
            for i, (icon, label, search_q) in enumerate(row):
                with cols[i]:
                    if st.button(
                        f"{icon}  {label}",
                        key=f"quick_{label}",
                        use_container_width=True
                    ):
                        # Inject search term into the input box
                        st.session_state["search_query"] = search_q
                        st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 3 — DEMAND FORECASTING  (unchanged)
# ══════════════════════════════════════════════════════════════════════════════
elif page == PAGE_FORECAST:

    st.markdown('<div class="forecast-header">📈 Demand Forecasting</div>',
                unsafe_allow_html=True)
    st.caption("XGBoost-powered 30-day demand forecast per product")

    if forecast_summary is None or forecast_df is None or daily_demand_df is None:
        st.warning(
            "⚠️  Forecast data not found. Run the pipeline first:\n\n"
            "```bash\npython demand_forecasting.py\n```\n\n"
            "This generates the required CSVs in `data/processed/`."
        )
        st.stop()

    SCALING_FACTOR = 590
    top1 = forecast_summary.iloc[0]
    top1_revenue = top1["total_predicted"] * (top1.get("price", 0.02) * SCALING_FACTOR)

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Articles Forecasted", f"{forecast_summary['article_id'].nunique():,}")
    k2.metric("Projected #1 Revenue", f"${top1_revenue:,.0f}",
              f"{int(top1['total_predicted'])} units/30d")
    k3.metric("Platform Avg Daily",  f"{forecast_summary['daily_avg'].mean():.1f} units")
    k4.metric("Horizon", "30 days")
    st.markdown("---")

    st.markdown("### 📊 Top 10 Products by Forecasted Demand")
    top10 = forecast_summary.head(10).copy()
    fig_top = px.bar(top10, x="total_predicted", y="display_name", orientation="h",
                     color="total_predicted", color_continuous_scale="Blues",
                     labels={"total_predicted": "Forecasted Units (30d)", "display_name": ""})
    fig_top.update_layout(yaxis=dict(autorange="reversed"), showlegend=False,
                          coloraxis_showscale=False, height=380,
                          margin=dict(l=0, r=20, t=10, b=40),
                          plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
    fig_top.update_traces(marker_line_width=0)
    st.plotly_chart(fig_top, use_container_width=True)
    st.markdown("---")

    st.markdown("### 🔍 Product Deep Dive")
    sel_label = st.selectbox("Select a product to analyse:",
                             options=forecast_summary["label"].tolist(),
                             key="forecast_product_select")
    sel_id    = sel_label.split("(")[-1].replace(")", "").strip()
    hist = daily_demand_df[daily_demand_df["article_id"] == sel_id].sort_values("date")
    fut  = forecast_df[forecast_df["article_id"] == sel_id].sort_values("date")

    col_chart, col_stats = st.columns([3, 1])
    with col_chart:
        fig2 = go.Figure()
        if not hist.empty:
            fig2.add_trace(go.Scatter(
                x=hist.tail(60)["date"], y=hist.tail(60)["demand"],
                mode="lines", name="Historical", line=dict(color="#4361ee", width=2)))
        if not fut.empty:
            fig2.add_trace(go.Scatter(
                x=fut["date"], y=fut["predicted_demand"],
                mode="lines+markers", name="Forecast",
                line=dict(color="#f72585", width=2, dash="dash"), marker=dict(size=5)))
            upper = (fut["predicted_demand"] * 1.2).round()
            lower = (fut["predicted_demand"] * 0.8).round()
            fig2.add_trace(go.Scatter(
                x=pd.concat([fut["date"], fut["date"][::-1]]),
                y=pd.concat([upper, lower[::-1]]),
                fill="toself", fillcolor="rgba(247,37,133,0.08)",
                line=dict(color="rgba(0,0,0,0)"), name="Uncertainty", showlegend=True))
        if not hist.empty:
            vts = pd.to_datetime(hist["date"].max())
            if pd.notna(vts):
                fig2.add_vline(x=int(vts.timestamp() * 1000), line_dash="dot",
                               line_color="gray", annotation_text="Forecast start",
                               annotation_position="top right")
        fig2.update_layout(title=sel_label[:60], xaxis_title="Date", yaxis_title="Units",
                           height=380, plot_bgcolor="rgba(0,0,0,0)",
                           paper_bgcolor="rgba(0,0,0,0)",
                           legend=dict(orientation="h", yanchor="bottom", y=1.02, x=1),
                           margin=dict(l=0, r=0, t=45, b=40))
        st.plotly_chart(fig2, use_container_width=True)

    with col_stats:
        row_sum = forecast_summary[forecast_summary["article_id"] == sel_id]
        if not row_sum.empty:
            r = row_sum.iloc[0]
            prod_rev = r["total_predicted"] * (r.get("price", 0.02) * SCALING_FACTOR)
            st.markdown("**📊 Forecast Summary**")
            st.markdown(f"**Total (30d):** {int(r['total_predicted'])} units")
            st.markdown(f"**Est. Revenue:** ${prod_rev:,.2f}")
            st.markdown(f"**Daily avg:** {r['daily_avg']:.1f} units")
            cat = r.get("product_group_name", "")
            st.markdown(f"**Category:** {cat if cat else '—'}")
            st.markdown("---")
        if not fut.empty:
            st.markdown("**📅 Next 7 Days**")
            n7 = fut.head(7)[["date", "predicted_demand"]].copy()
            n7["date"] = n7["date"].dt.strftime("%b %d")
            n7.columns = ["Date", "Units"]
            st.dataframe(n7, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("### 📋 Full Forecast Table")
    show_top = st.slider("Show top N products:", 10, min(200, len(forecast_summary)),
                         25, 5, key="forecast_table_slider")
    table_df = forecast_summary.head(show_top).copy()
    table_df["Est. Revenue"] = (table_df["total_predicted"]
                                * table_df.get("price", 0.02) * SCALING_FACTOR)
    display_cols = [c for c in
                    ["article_id", "display_name", "product_group_name",
                     "total_predicted", "Est. Revenue", "daily_avg"]
                    if c in table_df.columns]
    st.dataframe(
        table_df[display_cols],
        column_config={"Est. Revenue": st.column_config.NumberColumn(format="$%.2f")},
        use_container_width=True, hide_index=True
    )
    st.download_button(
        "📥 Download Full Forecast CSV",
        data=forecast_summary.to_csv(index=False).encode(),
        file_name="forecast_summary.csv", mime="text/csv",
        key="forecast_download_btn"
    )