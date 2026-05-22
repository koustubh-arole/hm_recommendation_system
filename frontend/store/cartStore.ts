import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types";

interface CartItem { product: Product; quantity: number; }
interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  count: number;
  total: number;
}

const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      get count() { return get().items.reduce((s, i) => s + i.quantity, 0); },
      get total() { return get().items.reduce((s, i) => s + (i.product.price ?? 29.99) * i.quantity, 0); },
      addItem: (product: Product) => {
  const items = get().items;
  const idx = items.findIndex((i) => i.product.article_id === product.article_id);
  if (idx >= 0) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
    set({ items: updated });
  } else {
    set({ items: [...items, { product, quantity: 1 }] });
  }
},
      removeItem: (id: string) => set({ items: get().items.filter((i) => i.product.article_id !== id) }),
      updateQuantity: (id: string, qty: number) => {
        if (qty <= 0) { get().removeItem(id); return; }
        set({ items: get().items.map((i) => i.product.article_id === id ? { ...i, quantity: qty } : i) });
      },
      clearCart: () => set({ items: [] }),
    }),
    { name: "hm-cart" }
  )
);
export default useCartStore;
