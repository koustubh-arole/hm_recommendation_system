import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
import { normaliseProduct } from "@/lib/normaliseProduct";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_RETRIES = 2;
const RETRY_DELAY = 800;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 45000,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("hm_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as AxiosRequestConfig & { _retryCount?: number };
    if (err.response?.status === 401) {
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        localStorage.removeItem("hm_token");
        localStorage.removeItem("hm_user");
        window.location.href = "/login";
      }
      return Promise.reject(err);
    }
    if (!err.response || err.response.status >= 500) {
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY * config._retryCount!));
        return api(config);
      }
    }
    return Promise.reject(err);
  }
);

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

export const authAPI = {
  login: (username: string, password: string) =>
    api.post("/auth/login", { username, password }).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  register: (payload: Record<string, unknown>) =>
    api.post("/auth/register", payload).then((r) => r.data),
  listUsers: () => api.get("/auth/users").then((r) => r.data),
  deleteUser: (id: number) => api.delete(`/auth/users/${id}`).then((r) => r.data),
};

export const recsAPI = {
  /** Personalised recs for a customer — enriched + normalised. */
  forCustomer: (customerId: string) =>
    api.get(`/api/recommendations/${customerId}`).then((r) => ({
      ...r.data,
      recommendations: (r.data.recommendations ?? []).map(
        (p: Record<string, unknown>) => normaliseProduct(p)
      ),
    })),

  /** Globally trending products — normalised. */
  trending: (window = "7d") =>
    api.get(`/api/trending/${window}`).then((r) => ({
      ...r.data,
      products: (r.data.products ?? []).map(
        (p: Record<string, unknown>) => normaliseProduct(p)
      ),
    })),

  /** Semantic search results — normalised. */
  search: (q: string, n = 10) =>
    api.get("/api/search", { params: { q, n } }).then((r) => ({
      ...r.data,
      results: (r.data.results ?? []).map(
        (p: Record<string, unknown>) => normaliseProduct(p)
      ),
    })),

  profile: (customerId: string) =>
    api.get(`/api/customer/${customerId}/profile`).then((r) => r.data),
};

export const adminAPI = {
  clusterStats: () => api.get("/api/admin/cluster-stats").then((r) => r.data),

  /** Cluster recs — normalised. */
  clusterRecs: () =>
    api.get("/api/admin/cluster-recommendations").then((r) => {
      const raw: Record<string, unknown>[] = Array.isArray(r.data) ? r.data : [];
      return raw.map((p) => normaliseProduct(p));
    }),

  coPurchase: () => api.get("/api/admin/co-purchase").then((r) => r.data),
  retrain: (pipeline = "full") =>
    api.post("/api/admin/retrain", null, { params: { pipeline } }).then((r) => r.data),
  users: () => api.get("/api/admin/users").then((r) => r.data),
  forecast: () => api.get("/api/admin/forecast").then((r) => r.data),
  systemHealth: () => safe(() => api.get("/api/admin/health").then((r) => r.data)),
};

export const productsAPI = {
  list: (params?: { category?: string; page?: number; per_page?: number }) =>
    safe(() =>
      api.get("/api/products", { params }).then((r) => {
        const items: Record<string, unknown>[] = Array.isArray(r.data)
          ? r.data
          : r.data?.products ?? [];
        return items.map((p) => normaliseProduct(p));
      })
    ),
  get: (articleId: string) =>
    safe(() =>
      api.get(`/api/products/${articleId}`).then((r) =>
        normaliseProduct(r.data as Record<string, unknown>)
      )
    ),
};

export default api;