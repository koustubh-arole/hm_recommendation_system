import sqlite3
import pandas as pd
conn = sqlite3.connect("data/users.db")
print("--- USERS ---")
for row in conn.execute("SELECT id, username, role, customer_id FROM users"):
    print(row)
conn.close()
df = pd.read_csv("data/processed/rfm_segmented.csv", dtype={"customer_id": str})
print("--- SAMPLE CUSTOMER IDs ---")
print(df["customer_id"].head(10).tolist())
