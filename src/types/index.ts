// Shared TypeScript types

export interface Product {
  id: string
  sku?: string
  name: string
  category: string
  brand?: string | null
  description?: string | null
  mrp: number
  sellingPrice: number
  imageUrl: string
  stock: number
  availableQuantity?: number
  reservedQuantity?: number
  damagedQuantity?: number
  reorderLevel: number
  safetyStock?: number
  leadTimeDays?: number
  unit: string
  isActive: boolean
  stockStatus: 'healthy' | 'low' | 'out'
  discountPercent: number
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  houseStreet: string
  area: string
  city: string
  state: string
  pincode: string
}

export interface CartItem {
  productId: string
  name: string
  imageUrl: string
  mrp: number
  sellingPrice: number
  unit: string
  category: string
  quantity: number
}

export interface Order {
  id: string
  customerId: string
  status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED' | string
  subtotal: number
  totalDiscount: number
  totalTax: number
  total: number
  notes?: string | null
  deliveryAddress: string
  createdAt: string
  orderItems?: OrderItem[]
  bill?: Bill | null
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  category: string
  quantity: number
  unitPrice: number
  mrp: number
  discount: number
  gstRate: number
  gstAmount: number
}

export interface Bill {
  id: string
  billNumber: string
  orderId: string
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | string
  generatedAt: string
}

export interface GstRate {
  id: string
  category: string
  rate: number
}

export interface PincodeResult {
  pincode: string
  area: string
  city: string
  state: string
}

export interface CheckoutForm {
  name: string
  phone: string
  email: string
  houseStreet: string
  area: string
  city: string
  state: string
  pincode: string
  notes?: string
}
