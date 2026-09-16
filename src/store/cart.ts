import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types'

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  increaseQty: (productId: string) => void
  decreaseQty: (productId: string) => void
  deleteItem: (productId: string) => void
  clearCart: () => void
  itemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const existing = get().items.find((i) => i.productId === product.productId)
        if (existing) {
          set((state) => ({
            items: state.items.map((i) =>
              i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i
            ),
          }))
        } else {
          set((state) => ({ items: [...state.items, { ...product, quantity: 1 }] }))
        }
      },

      removeItem: (productId) => {
        const existing = get().items.find((i) => i.productId === productId)
        if (!existing) return
        if (existing.quantity <= 1) {
          set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }))
        } else {
          set((state) => ({
            items: state.items.map((i) =>
              i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
            ),
          }))
        }
      },

      increaseQty: (productId) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }))
      },

      decreaseQty: (productId) => {
        const existing = get().items.find((i) => i.productId === productId)
        if (!existing) return
        if (existing.quantity <= 1) {
          set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }))
        } else {
          set((state) => ({
            items: state.items.map((i) =>
              i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
            ),
          }))
        }
      },

      deleteItem: (productId) => {
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }))
      },

      clearCart: () => set({ items: [] }),

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'smart-retail-cart',
    }
  )
)

