import pandas as pd

print("=== cluster_recommendations.csv ===")
recs = pd.read_csv('data/processed/cluster_recommendations.csv', dtype=str, nrows=5)
print("Columns:", recs.columns.tolist())
print(recs.head(3).to_string())

print("\n=== articles.csv (first 3 cols) ===")
arts = pd.read_csv('data/raw/articles.csv', dtype=str, nrows=3)
print("Columns:", arts.columns.tolist()[:10])
print("Sample article_id:", arts['article_id'].head(3).tolist())

print("\n=== Testing join ===")
recs2 = pd.read_csv('data/processed/cluster_recommendations.csv', dtype=str)
arts2 = pd.read_csv('data/raw/articles.csv', dtype=str,
    usecols=['article_id','prod_name','product_type_name','colour_group_name'])

print("recs article_id sample:", recs2['article_id'].head(3).tolist())
print("arts article_id sample:", arts2['article_id'].head(3).tolist())

# Try join as-is
merged = recs2.merge(arts2, on='article_id', how='left')
matched = merged['prod_name'].notna().sum()
print(f"\nJoin as-is: {matched}/{len(merged)} rows matched")

# Try stripping zeros
recs2['article_id'] = recs2['article_id'].str.lstrip('0')
arts2['article_id'] = arts2['article_id'].str.lstrip('0')
merged2 = recs2.merge(arts2, on='article_id', how='left')
matched2 = merged2['prod_name'].notna().sum()
print(f"Join after lstrip('0'): {matched2}/{len(merged2)} rows matched")

print("\nSample result:")
print(merged2[['article_id','prod_name','product_type_name']].head(5).to_string())
