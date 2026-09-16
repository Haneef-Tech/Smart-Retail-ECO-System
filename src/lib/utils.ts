export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getDiscountPercent(mrp: number, sellingPrice: number): number {
  if (mrp <= 0) return 0
  return Math.round(((mrp - sellingPrice) / mrp) * 100)
}

export function getStockStatus(stock: number, reorderLevel: number): 'healthy' | 'low' | 'out' {
  if (stock === 0) return 'out'
  if (stock <= reorderLevel) return 'low'
  return 'healthy'
}

export function generateBillNumber(): string {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timePart = now.getTime().toString().slice(-6)
  return `BILL-${datePart}-${timePart}`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
