// types/index.ts

export interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "user";
  customer_id?: string;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role: "admin" | "user";
  customer_id?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
  customer_id?: string;
}

// Product / Recommendation types
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
  purchase_count?: number;
  cluster?: number;
}

export interface Recommendation {
  customer_id: string;
  recommendations: Product[];
  cluster: number;
  total: number;
}

export interface TrendingProduct {
  article_id: string;
  product_name: string;
  purchase_count: number;
  product_type_name?: string;
  rank: number;
}

export interface SearchResult {
  results: Product[];
  query: string;
  total: number;
}

export interface CustomerProfile {
  customer_id: string;
  cluster: number;
  recency: number;
  frequency: number;
  monetary: number;
  segment?: string;
  total_purchases?: number;
  last_purchase?: string;
}

// Admin types
export interface ClusterStats {
  n_clusters: number;
  total_customers: number;
  avg_recency: number;
  avg_frequency: number;
  avg_monetary: number;
  clusters: ClusterDetail[];
}

export interface ClusterDetail {
  cluster: number;
  size: number;
  percentage: number;
  avg_recency: number;
  avg_frequency: number;
  avg_monetary: number;
  label?: string;
}

export interface KPICard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  color?: string;
}

export interface ForecastData {
  date: string;
  demand: number;
  predicted?: number;
  article_id?: string;
}

export interface PipelineStatus {
  name: string;
  status: "idle" | "running" | "success" | "error";
  lastRun?: string;
  duration?: string;
}

export interface SystemHealth {
  api: "healthy" | "degraded" | "down";
  database: "healthy" | "degraded" | "down";
  chromadb: "healthy" | "degraded" | "down";
  model: "healthy" | "degraded" | "down";
  uptime?: string;
  version?: string;
}

// Cart types (User dashboard)
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

// UI types
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  roles?: ("admin" | "user")[];
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}
