import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI } from "@/services/api";

interface User { id: number; username: string; email: string; role: "admin" | "user"; customer_id?: string; created_at?: string; }
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const data = await authAPI.login(username, password);
          const user: User = { id: 0, username: data.username, email: "", role: data.role, customer_id: data.customer_id };
          if (typeof window !== "undefined") localStorage.setItem("hm_token", data.access_token);
          set({ user, token: data.access_token, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        if (typeof window !== "undefined") localStorage.removeItem("hm_token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("hm_token") : null;
        if (!token) { set({ isAuthenticated: false, user: null, token: null, isLoading: false }); return; }

        // Decode JWT to check if it's a customer-ID direct login
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.customer_id && payload.role === "user") {
            set({
              user: {
                id: 0,
                username: payload.sub,
                email: "",
                role: "user",
                customer_id: payload.customer_id,
              },
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }
        } catch { /* not a customer login, fall through */ }

        // Normal DB login — verify via /me
        try {
          const user = await authAPI.me();
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch {
          get().logout();
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "hm-auth",
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);
export default useAuthStore;