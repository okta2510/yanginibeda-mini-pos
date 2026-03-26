import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Category = 'comic' | 'merchandise'

export type PaymentMethod = 'Cash' | 'QRIS' | 'Transfer' | 'Other'

export interface Item {
  id: string
  name: string
  price: number
  category: Category
  image: string
  stock: number
  description?: string
}

export interface OrderItem {
  item: Item
  quantity: number
}

export interface Order {
  id: string
  items: OrderItem[]
  total: number
  paymentMethod?: PaymentMethod
  status: 'pending' | 'paid' | 'cancelled'
  createdAt: string
  paidAt?: string
  customerName?: string
  customerPhone?: string
  notes?: string
}

interface StoreState {
  // Auth
  isAuthenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void

  // Items
  items: Item[]
  addItem: (item: Omit<Item, 'id'>) => void
  updateItem: (id: string, item: Partial<Item>) => void
  deleteItem: (id: string) => void

  // Current Order (Cart)
  currentOrder: OrderItem[]
  addToOrder: (item: Item, quantity?: number) => void
  removeFromOrder: (itemId: string) => void
  updateOrderItemQuantity: (itemId: string, quantity: number) => void
  clearCurrentOrder: () => void

  // Orders History
  orders: Order[]
  createOrder: (paymentMethod: PaymentMethod, customerName?: string, customerPhone?: string, notes?: string) => Order | null
  updateOrderStatus: (orderId: string, status: Order['status']) => void
  deleteOrder: (orderId: string) => void

  // Dashboard stats
  getTodayStats: () => { sales: number; orders: number; items: number }
}

const generateId = () => Math.random().toString(36).substring(2, 15)

// Initial dummy items
/**
 * Initial seed data for the product catalog.
 *
 * This constant is set immediately when the module is loaded/evaluated
 * (i.e., at application startup when `store.ts` is first imported).
 */
const initialItems: Item[] = [
  {
    id: '1',
    name: 'Komik Santo Fransiskus',
    price: 45000,
    category: 'comic',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop',
    stock: 25,
    description: 'Komik tentang kehidupan Santo Fransiskus dari Assisi'
  },
  {
    id: '2',
    name: 'Komik Santo Yohanes Bosco',
    price: 42000,
    category: 'comic',
    image: 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=300&fit=crop',
    stock: 30,
    description: 'Kisah inspiratif Santo Yohanes Bosco'
  },
  {
    id: '3',
    name: 'Komik Santa Teresa dari Kalkuta',
    price: 48000,
    category: 'comic',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop',
    stock: 20,
    description: 'Perjalanan hidup Bunda Teresa'
  },
  {
    id: '4',
    name: 'Rosario Kayu Premium',
    price: 75000,
    category: 'merchandise',
    image: 'https://images.unsplash.com/photo-1515552726023-7125c8d07fb3?w=400&h=300&fit=crop',
    stock: 15,
    description: 'Rosario kayu berkualitas tinggi'
  },
  {
    id: '5',
    name: 'Kaos Sanctory Store',
    price: 120000,
    category: 'merchandise',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop',
    stock: 50,
    description: 'Kaos katun premium dengan desain eksklusif'
  },
  {
    id: '6',
    name: 'Gantungan Kunci Santo',
    price: 25000,
    category: 'merchandise',
    image: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=300&fit=crop',
    stock: 100,
    description: 'Gantungan kunci dengan gambar santo pelindung'
  },
  {
    id: '7',
    name: 'Komik Santa Maria Goretti',
    price: 45000,
    category: 'comic',
    image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=300&fit=crop',
    stock: 18,
    description: 'Kisah Santa Maria Goretti yang menginspirasi'
  },
  {
    id: '8',
    name: 'Stiker Pack Santo',
    price: 15000,
    category: 'merchandise',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    stock: 200,
    description: 'Paket stiker bergambar para santo'
  },
  {
    id: '9',
    name: 'Komik Santo Ignatius Loyola',
    price: 47000,
    category: 'comic',
    image: 'https://images.unsplash.com/photo-1511108690759-009324a90311?w=400&h=300&fit=crop',
    stock: 22,
    description: 'Komik tentang perjalanan pertobatan Santo Ignatius Loyola'
  },
  {
    id: '10',
    name: 'Komik Santa Theresia Lisieux',
    price: 46000,
    category: 'comic',
    image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=300&fit=crop',
    stock: 24,
    description: 'Kisah Santa Theresia Lisieux dan jalan kecilnya'
  },
  {
    id: '11',
    name: 'Salib Meja Kayu',
    price: 68000,
    category: 'merchandise',
    image: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&h=300&fit=crop',
    stock: 35,
    description: 'Salib meja dari kayu dengan desain elegan'
  },
  {
    id: '12',
    name: 'Lilin Doa Aromaterapi',
    price: 39000,
    category: 'merchandise',
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&h=300&fit=crop',
    stock: 60,
    description: 'Lilin doa dengan aroma menenangkan untuk saat teduh'
  },
  {
    id: '13',
    name: 'Komik Santo Padre Pio',
    price: 49000,
    category: 'comic',
    image: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=300&fit=crop',
    stock: 19,
    description: 'Cerita hidup Santo Padre Pio yang penuh mukjizat'
  },
  {
    id: '14',
    name: 'Notebook Rohani',
    price: 32000,
    category: 'merchandise',
    image: 'https://images.unsplash.com/photo-1531346680769-a1d79b57de5c?w=400&h=300&fit=crop',
    stock: 80,
    description: 'Buku catatan rohani untuk doa dan refleksi harian'
  },
  {
    id: '15',
    name: 'Komik Santo Paulus',
    price: 44000,
    category: 'comic',
    image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=300&fit=crop',
    stock: 27,
    description: 'Kisah pertobatan dan perjalanan misi Santo Paulus'
  },
]

// Dummy credentials
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Auth
      isAuthenticated: false,
      login: (username, password) => {
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          set({ isAuthenticated: true })
          return true
        }
        return false
      },
      logout: () => set({ isAuthenticated: false }),

      items: initialItems,

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, id: generateId() }],
        })),

      updateItem: (id, updatedItem) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updatedItem } : item
          ),
        })),

      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      currentOrder: [],

      addToOrder: (item, quantity = 1) =>
        set((state) => {
          const existing = state.currentOrder.find((o) => o.item.id === item.id)
          if (existing) {
            return {
              currentOrder: state.currentOrder.map((o) =>
                o.item.id === item.id
                  ? { ...o, quantity: o.quantity + quantity }
                  : o
              ),
            }
          }
          return {
            currentOrder: [...state.currentOrder, { item, quantity }],
          }
        }),

      removeFromOrder: (itemId) =>
        set((state) => ({
          currentOrder: state.currentOrder.filter((o) => o.item.id !== itemId),
        })),

      updateOrderItemQuantity: (itemId, quantity) =>
        set((state) => ({
          currentOrder:
            quantity <= 0
              ? state.currentOrder.filter((o) => o.item.id !== itemId)
              : state.currentOrder.map((o) =>
                  o.item.id === itemId ? { ...o, quantity } : o
                ),
        })),

      clearCurrentOrder: () => set({ currentOrder: [] }),

      orders: [],

      createOrder: (paymentMethod, customerName, customerPhone, notes) => {
        const state = get()
        if (state.currentOrder.length === 0) return null

        const total = state.currentOrder.reduce(
          (sum, o) => sum + o.item.price * o.quantity,
          0
        )

        const newOrder: Order = {
          id: generateId(),
          items: [...state.currentOrder],
          total,
          paymentMethod,
          status: 'paid',
          createdAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          customerName,
          customerPhone,
          notes,
        }

        // Update stock
        const updatedItems = state.items.map((item) => {
          const orderItem = state.currentOrder.find((o) => o.item.id === item.id)
          if (orderItem) {
            return { ...item, stock: Math.max(0, item.stock - orderItem.quantity) }
          }
          return item
        })

        set({
          orders: [newOrder, ...state.orders],
          currentOrder: [],
          items: updatedItems,
        })

        return newOrder
      },

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status,
                  paidAt: status === 'paid' ? new Date().toISOString() : order.paidAt,
                }
              : order
          ),
        })),

      deleteOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== orderId),
        })),

      getTodayStats: () => {
        const state = get()
        const today = new Date().toDateString()
        const todayOrders = state.orders.filter(
          (order) =>
            new Date(order.createdAt).toDateString() === today &&
            order.status === 'paid'
        )
        return {
          sales: todayOrders.reduce((sum, order) => sum + order.total, 0),
          orders: todayOrders.length,
          items: todayOrders.reduce(
            (sum, order) =>
              sum + order.items.reduce((s, i) => s + i.quantity, 0),
            0
          ),
        }
      },
    }),
    {
      name: 'sanctory-store',
    }
  )
)
