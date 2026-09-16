import { db } from '@/lib/db'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { TrendingUp, ShoppingBag, DollarSign, CreditCard } from 'lucide-react'

export default async function AdminSalesPage() {
  const sales = await db.sale.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      order: { select: { id: true, customer: { select: { name: true, email: true } } } },
      saleItems: { include: { product: { select: { name: true, sku: true } } } },
    },
  })

  const totalRevenue = sales.reduce((s, item) => s + item.totalAmount, 0)
  const totalTax = sales.reduce((s, item) => s + item.taxAmount, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Fulfillment Ledger</h1>
          <p className="text-sm text-gray-500">Track all completed retail sales and tax breakdowns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <DollarSign size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Total Sales Revenue</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <CreditCard size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Total Tax Collected</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatPrice(totalTax)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <ShoppingBag size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Sales Count</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{sales.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-600">
            <tr>
              <th className="p-3">Sale ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Items</th>
              <th className="p-3">Tax</th>
              <th className="p-3">Total</th>
              <th className="p-3">Mode</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-gray-700">
            {sales.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="p-3 font-mono font-bold text-green-700 text-xs">#{s.id.slice(0, 8).toUpperCase()}</td>
                <td className="p-3 font-medium">{(s as { order?: { customer?: { name: string } } }).order?.customer?.name || 'Customer'}</td>
                <td className="p-3 text-xs text-gray-500">{s.saleItems.length} items</td>
                <td className="p-3 text-xs text-gray-500">{formatPrice(s.taxAmount)}</td>
                <td className="p-3 font-bold text-gray-900">{formatPrice(s.totalAmount)}</td>
                <td className="p-3 text-xs font-semibold text-blue-600">{s.paymentMode}</td>
                <td className="p-3 text-xs text-gray-400">{formatDateTime(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && <p className="text-center py-8 text-gray-400">No sales transactions logged yet.</p>}
      </div>
    </div>
  )
}

