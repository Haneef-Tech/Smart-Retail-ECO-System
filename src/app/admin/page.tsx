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
  Clock,
  FileText,
  Sparkles,
  Database,
  Layers,
} from 'lucide-react'
import { formatPrice, formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getLiveMetrics() {
  const [products, suppliers, allOrders, purchases, storeSalesRecords] = await Promise.all([
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
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        orderItems: true,
        bill: { select: { billNumber: true, paymentStatus: true } },
      },
    }),
    db.purchase.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { supplier: true, purchaseItems: true },
    }),
    db.storeSaleRecord.count(),
  ])

  // Current Date Boundaries (Local / IST)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Today's Real Orders & Real Revenue
  const todayOrders = allOrders.filter(
    (o) => new Date(o.createdAt) >= startOfToday && o.status !== 'CANCELLED'
  )
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const todayUnitsSold = todayOrders.reduce(
    (sum, o) => sum + o.orderItems.reduce((isum, item) => isum + item.quantity, 0),
    0
  )

  // All-Time Real Store Revenue
  const confirmedOrders = allOrders.filter((o) => o.status !== 'CANCELLED')
  const allTimeRevenue = confirmedOrders.reduce((sum, o) => sum + o.total, 0)
  const pendingOrders = allOrders.filter((o) => o.status === 'PENDING')

  // Live Warehouse Inventory
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

  // Group items sold today
  const todayProductsSoldMap: Record<string, { units: number; revenue: number }> = {}
  for (const o of todayOrders) {
    for (const item of o.orderItems) {
      if (!todayProductsSoldMap[item.productName]) {
        todayProductsSoldMap[item.productName] = { units: 0, revenue: 0 }
      }
      todayProductsSoldMap[item.productName].units += item.quantity
      todayProductsSoldMap[item.productName].revenue += item.unitPrice * item.quantity + item.gstAmount
    }
  }

  const topItemsToday = Object.entries(todayProductsSoldMap)
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 5)

  return {
    totalProducts: products.length,
    totalUnits,
    totalValuation,
    lowStockItems,
    suppliersCount: suppliers.length,
    // Real Today Metrics
    todayRevenue,
    todayOrdersCount: todayOrders.length,
    todayUnitsSold,
    topItemsToday,
    // All-time Real Metrics
    allTimeRevenue,
    totalOrdersCount: allOrders.length,
    pendingOrdersCount: pendingOrders.length,
    recentOrders: allOrders.slice(0, 8),
    recentPurchases: purchases,
    historicalCsvRecordsCount: storeSalesRecords,
  }
}

export default async function AdminDashboardPage() {
  const data = await getLiveMetrics()

  return (
    <div className="space-y-8">
      {/* Top Banner: Store Status & Live Pulse */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Database Connected • Real-Time Store Operations
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Operational Command Center
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Mydukur Supermarket, Kadapa, AP (516172) • Real revenue, live customer orders &amp; autonomous restocking
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/forecasting"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Zap size={15} /> Autonomous Ordering
            </Link>
            <Link
              href="/admin/ai"
              className="bg-gray-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Bot size={15} /> AI Assistant
            </Link>
            <Link
              href="/admin/orders"
              className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-2xs transition-colors"
            >
              <CheckCircle2 size={15} className="text-blue-600" />
              Orders ({data.totalOrdersCount})
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Today's Real Revenue */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-emerald-100 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Today&apos;s Live Sales
            </span>
            <TrendingUp size={20} className="text-white" />
          </div>
          <p className="text-3xl sm:text-4xl font-black tracking-tight mt-3">
            {formatPrice(data.todayRevenue)}
          </p>
          <div className="flex items-center justify-between text-xs text-emerald-100 font-medium mt-3 pt-3 border-t border-white/15">
            <span>{data.todayOrdersCount} orders placed today</span>
            <span>{data.todayUnitsSold} units sold</span>
          </div>
        </div>

        {/* All-Time Confirmed Revenue */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              All-Time Live Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShoppingBag size={18} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-2">
            {formatPrice(data.allTimeRevenue)}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium mt-3 pt-3 border-t border-gray-100">
            <span>{data.totalOrdersCount} total customer orders</span>
            <span className="text-blue-600 font-bold">{data.pendingOrdersCount} pending</span>
          </div>
        </div>

        {/* Physical Stock in Warehouse */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Warehouse Stock Units
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Warehouse size={18} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-2">
            {data.totalUnits.toLocaleString('en-IN')}{' '}
            <span className="text-sm font-bold text-gray-400">units</span>
          </p>
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium mt-3 pt-3 border-t border-gray-100">
            <span>{data.totalProducts} active SKUs</span>
            <span>Valuation: {formatPrice(data.totalValuation)}</span>
          </div>
        </div>

        {/* Reorder Alerts */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Autonomous Reorder Alerts
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight mt-2">
            {data.lowStockItems.length}{' '}
            <span className="text-sm font-bold text-amber-700/70">items</span>
          </p>
          <div className="flex items-center justify-between text-xs text-amber-700/80 font-medium mt-3 pt-3 border-t border-gray-100">
            <span>At or below safe threshold</span>
            <Link href="/admin/forecasting" className="font-black underline text-amber-900">
              1-Click PO →
            </Link>
          </div>
        </div>
      </div>

      {/* Dual Column: Real-Time Live Orders & Today's Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Order Stream (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Clock size={16} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">Real-Time Live Orders Feed</h2>
                <p className="text-xs text-gray-400">Actual customer checkouts recorded in live database</p>
              </div>
            </div>
            <Link href="/admin/orders" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
              View All ({data.totalOrdersCount}) →
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-2xl">
              <ShoppingBag size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-700">No live customer orders yet</p>
              <p className="text-xs text-gray-400 mt-1">
                When you place a sample order at checkout, it will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                  <tr>
                    <th className="p-3 rounded-l-xl">Order ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Items Ordered</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 rounded-r-xl text-right">Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-gray-900">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-gray-900">{o.customer?.name || 'Customer'}</p>
                        <p className="text-[10px] text-gray-400">{o.customer?.phone || o.customer?.email}</p>
                      </td>
                      <td className="p-3 text-gray-600 max-w-xs truncate">
                        {o.orderItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700">
                        {formatPrice(o.total)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            o.status === 'CONFIRMED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : o.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : o.status === 'CANCELLED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-400 font-medium">
                        {formatDateTime(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Today's Sales Highlights & System Architecture (1 Column) */}
        <div className="space-y-6">
          {/* Items sold today card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-emerald-600" />
              <h3 className="font-bold text-gray-900 text-sm">Today&apos;s Sold Products</h3>
            </div>
            {data.topItemsToday.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center bg-gray-50 rounded-2xl">
                No products sold yet today. Items ordered from the store will rank here.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.topItemsToday.map(([name, stat], idx) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-gray-900 truncate">{name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-gray-900">{stat.units} sold</span>
                      <span className="text-[10px] text-gray-400 block">{formatPrice(stat.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ground Truth vs Pattern RAG Info Box */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-3xl p-5 text-xs text-blue-950 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <Database size={16} />
              <span>Two-Tier Data Architecture</span>
            </div>
            <div className="space-y-2 text-[11px] text-blue-900/80 leading-relaxed">
              <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100/60">
                <strong className="text-blue-950 block">🟢 Live Operational Database:</strong>
                Tracks current reality — real customer orders, today&apos;s revenue ({formatPrice(data.todayRevenue)}), and physical units in warehouse.
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100/60">
                <strong className="text-indigo-950 block">📚 Historical CSV &amp; RAG Engine:</strong>
                Stores {data.historicalCsvRecordsCount} training records exclusively to learn seasonal patterns, discover demand correlations, and forecast future reorders.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Autonomous Reorder Triggers Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/40">
          <div>
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-500 shrink-0" />
              <h2 className="font-bold text-gray-900 text-base">
                Autonomous Restocking &amp; Safety Thresholds
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              AI continuously analyzes warehouse stock vs supplier lead times to trigger replenishment
            </p>
          </div>
          <Link
            href="/admin/forecasting"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-colors"
          >
            Open Autonomous Ordering System <ArrowRight size={13} />
          </Link>
        </div>

        {data.lowStockItems.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-xs">
            🎉 All product inventory levels are healthy! No items currently below safe reorder thresholds.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-center">Current Warehouse Stock</th>
                  <th className="p-4 text-center">Reorder Threshold</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 text-right">AI Recommended Order</th>
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
                    <td className="p-4 text-center text-gray-500 font-semibold">
                      {item.reorderLevel} units
                    </td>
                    <td className="p-4 font-medium text-gray-700">{item.supplierName}</td>
                    <td className="p-4 text-right font-black text-emerald-700">
                      +{item.suggestedUnits} units
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        href="/admin/forecasting"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-2xs transition-colors"
                      >
                        <Zap size={11} /> 1-Click PO
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier & Delivery Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">Verified Suppliers ({data.suppliersCount})</h3>
            </div>
            <Link href="/admin/suppliers" className="text-xs text-blue-600 font-bold hover:underline">
              View All Suppliers →
            </Link>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Top national FMCG manufacturers with direct supply contracts for Mydukur supermarket.
          </p>
          <div className="space-y-2">
            {[
              { name: 'Amul Dairy Federation', code: 'S001', lead: '1 day', rating: 4.9 },
              { name: 'ITC Limited', code: 'S002', lead: '2 days', rating: 4.8 },
              { name: 'Britannia Wholesale', code: 'S003', lead: '1 day', rating: 4.7 },
              { name: 'Hindustan Unilever (HUL)', code: 'S004', lead: '2 days', rating: 4.9 },
            ].map((s) => (
              <div
                key={s.code}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl text-xs"
              >
                <div>
                  <span className="font-bold text-gray-900">{s.name}</span>
                  <span className="ml-2 font-mono text-[10px] text-gray-400">[{s.code}]</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 font-medium">
                  <span>Lead: {s.lead}</span>
                  <span className="text-amber-600 font-bold">⭐ {s.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-purple-600" />
              <h3 className="font-bold text-gray-900 text-sm">Inbound Purchase Shipments</h3>
            </div>
            <Link href="/admin/purchases" className="text-xs text-purple-600 font-bold hover:underline">
              Track Deliveries →
            </Link>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Track deliveries from approved autonomous POs. When orders arrive at store, click &quot;Receive Stock&quot; to credit inventory.
          </p>

          {data.recentPurchases.length === 0 ? (
            <div className="p-8 bg-gray-50 rounded-2xl text-center text-xs text-gray-400">
              No active supplier shipments. Generate purchase orders in Autonomous Ordering.
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentPurchases.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl text-xs"
                >
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
