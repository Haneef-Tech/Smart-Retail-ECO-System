import { db } from '@/lib/db'
import Link from 'next/link'
import {
  Package,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Building2,
  Truck,
  Zap,
  Bot,
  ArrowRight,
  CheckCircle2,
  Warehouse,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getLiveMetrics() {
  const [products, suppliers, orders, purchases] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        supplier: { select: { name: true, leadTimeDays: true } },
        inventory: true,
      },
      orderBy: { name: 'asc' },
    }),
    db.supplier.findMany({
      include: { _count: { select: { products: true, purchases: true } } },
      orderBy: { code: 'asc' },
    }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: true, orderItems: true },
    }),
    db.purchase.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { supplier: true, purchaseItems: true },
    }),
  ])

  let totalUnits = 0
  let totalValuation = 0
  const lowStockItems: Array<{
    id: string
    name: string
    category: string
    currentStock: number
    reorderLevel: number
    supplierName: string
    suggestedUnits: number
  }> = []

  products.forEach((p) => {
    const stock = p.inventory?.availableQuantity ?? 0
    totalUnits += stock
    totalValuation += stock * p.sellingPrice

    if (stock <= p.reorderLevel) {
      lowStockItems.push({
        id: p.id,
        name: p.name,
        category: p.category.name,
        currentStock: stock,
        reorderLevel: p.reorderLevel,
        supplierName: p.supplier?.name || 'Primary Supplier',
        suggestedUnits: Math.max(15, p.reorderLevel * 2 - stock),
      })
    }
  })

  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'DELIVERED')
  const pendingOrders = orders.filter((o) => o.status === 'PENDING')
  const realRevenue = confirmedOrders.reduce((sum, o) => sum + o.total, 0)
  const pendingPurchases = purchases.filter((p) => p.status !== 'DELIVERED')

  return {
    totalProducts: products.length,
    totalUnits,
    totalValuation,
    lowStockItems,
    suppliersCount: suppliers.length,
    totalOrders: orders.length,
    pendingOrdersCount: pendingOrders.length,
    realRevenue,
    recentOrders: orders,
    pendingPurchasesCount: pendingPurchases.length,
    recentPurchases: purchases,
  }
}

export default async function AdminDashboardPage() {
  const data = await getLiveMetrics()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Store Operational Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Realtime database telemetry • Store: Mydukur, Kadapa, AP (516172)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/forecasting"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Zap size={14} /> Autonomous Reorder
          </Link>
          <Link
            href="/admin/ai"
            className="bg-gray-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Bot size={14} /> AI Assistant
          </Link>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Active SKUs</span>
            <Package size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{data.totalProducts}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Catalogued in database</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Available Stock</span>
            <Warehouse size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{data.totalUnits.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Valuation: {formatPrice(data.totalValuation)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Low Stock Alerts</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{data.lowStockItems.length}</p>
          <p className="text-xs text-amber-700/80 mt-1 font-medium">Items need replenishment</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Confirmed Revenue</span>
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-green-700">{formatPrice(data.realRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">{data.totalOrders} total store orders</p>
        </div>
      </div>

      {/* Fast Operational Routing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <Link
          href="/admin/orders"
          className="bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-100 rounded-2xl p-5 hover:border-blue-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-full border border-blue-200">
              {data.pendingOrdersCount} Pending
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-700 transition-colors">
            Confirm Customer Orders
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Review customer orders and confirm status with 1-click database update.
          </p>
          <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-4">
            Manage Orders <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/admin/inventory"
          className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-100 rounded-2xl p-5 hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Warehouse size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-full border border-emerald-200">
              {data.totalProducts} Products
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">
            Inventory Entry &amp; Stock Edit
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Quickly adjust available units, add new products, and track stock ledger.
          </p>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-4">
            Open Inventory <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/admin/forecasting"
          className="bg-gradient-to-br from-purple-50 to-pink-50/40 border border-purple-100 rounded-2xl p-5 hover:border-purple-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Zap size={20} />
            </div>
            <span className="text-xs font-bold text-purple-700 bg-white px-2.5 py-1 rounded-full border border-purple-200">
              AI Powered
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-base group-hover:text-purple-700 transition-colors">
            Autonomous Ordering
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            AI calculates exact units to reorder; admin 1-click approves POs to suppliers.
          </p>
          <div className="flex items-center gap-1 text-xs font-bold text-purple-600 mt-4">
            Review Recommendations <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Critical Stock Alerts Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              Stock Health &amp; Autonomous Reorder Triggers
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Products where available stock is below safe reorder threshold
            </p>
          </div>
          <Link
            href="/admin/forecasting"
            className="text-xs font-bold text-green-700 hover:text-green-800 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            Approve in Reorder Center <ArrowRight size={12} />
          </Link>
        </div>

        {data.lowStockItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            🎉 All product stocks are healthy! No items currently below reorder levels.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[650px]">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
                <tr>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-center">Available Units</th>
                  <th className="p-4 text-center">Reorder Threshold</th>
                  <th className="p-4">Primary Supplier</th>
                  <th className="p-4 text-right">AI Suggested Order</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{item.name}</td>
                    <td className="p-4 text-gray-600">{item.category}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-md font-black bg-amber-100 text-amber-900">
                        {item.currentStock} units
                      </span>
                    </td>
                    <td className="p-4 text-center text-gray-500 font-semibold">{item.reorderLevel} units</td>
                    <td className="p-4 font-medium text-gray-700">{item.supplierName}</td>
                    <td className="p-4 text-right font-bold text-green-700">
                      +{item.suggestedUnits} units
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        href="/admin/forecasting"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-[11px] shadow-2xs"
                      >
                        <Zap size={11} /> Approve PO
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier & Delivery Status Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={17} className="text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">Verified Suppliers ({data.suppliersCount})</h3>
            </div>
            <Link href="/admin/suppliers" className="text-xs text-blue-600 font-bold hover:underline">
              View All 10 Suppliers →
            </Link>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Top national FMCG vendors with direct delivery agreements to Mydukur supermarket.
          </p>
          <div className="space-y-2">
            {[
              { name: 'Amul Dairy Federation', code: 'S001', lead: '1 day', rating: 4.9 },
              { name: 'ITC Limited', code: 'S002', lead: '2 days', rating: 4.8 },
              { name: 'Britannia Wholesale', code: 'S003', lead: '1 day', rating: 4.7 },
              { name: 'Hindustan Unilever (HUL)', code: 'S004', lead: '2 days', rating: 4.9 },
            ].map((s) => (
              <div key={s.code} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-gray-900">{s.name}</span>
                  <span className="ml-2 font-mono text-[10px] text-gray-500">[{s.code}]</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 font-medium">
                  <span>Lead: {s.lead}</span>
                  <span className="text-amber-600 font-bold">⭐ {s.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck size={17} className="text-purple-600" />
              <h3 className="font-bold text-gray-900 text-sm">Inbound Supplier Deliveries</h3>
            </div>
            <Link href="/admin/purchases" className="text-xs text-purple-600 font-bold hover:underline">
              View Deliveries →
            </Link>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Track shipments from vendors. When orders arrive, click &quot;Receive Stock&quot; to auto-credit inventory.
          </p>

          {data.recentPurchases.length === 0 ? (
            <div className="p-6 bg-gray-50 rounded-xl text-center text-xs text-gray-400">
              No active supplier purchase shipments pending. You can generate orders in Autonomous Ordering.
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentPurchases.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{p.invoiceNumber}</span>
                    <span className="text-gray-500 block text-[11px]">{p.supplier?.name}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md font-bold text-[10px] bg-blue-100 text-blue-800">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
