/* ── Global shared types ──────────────────────────────────────────── */
// In frontend/types/index.ts — add these optional fields to Product
export interface Product {
  id: string;
  article_id: string;
  product_name: string;
  product_type_name: string;
  product_group_name: string;
  colour_group_name: string;
  section_name: string;
  index_name: string;
  detail_desc?: string;
  price?: number;
  score?: number;
  // ✅ Add these
  purchase_count?: number;
  cluster?: number;
}
export interface Customer {
  customer_id:  string;
  cluster:      number;
  recency:      number;
  frequency:    number;
  monetary:     number;
  segment?:     string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  price:   number;
}

// Alias used by recommendations/page.tsx — matches /api/customer/{id}/profile response
export type CustomerProfile = Customer;

// TrendingProduct — trending endpoint now returns normalised Product[],
// so this is just an alias kept for any legacy imports.
export type TrendingProduct = Product;