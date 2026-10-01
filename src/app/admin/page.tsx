import { db } from '@/lib/db'
import Link from 'next/link'
import {
  IndianRupee,
  ShoppingCart,
  Package,
  Warehouse,
  AlertTriangle,
  PackageX,
  TrendingUp,
  ArrowRight,
  Zap,
  Bot,
  Boxes,
  CircleAlert,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { KpiCard, Card, IconTile } from '@/components/ui/fresh'
import SalesOverview from '@/components/admin/SalesOverview'
import { requirePageRole } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

async function getLiveMetrics() {
  let products: any[] = []
  let suppliers: any[] = []
  let allOrders: any[] = []
  let purchases: any[] = []
  let storeSalesRecords = 0

  try {
    const res = await Promise.all([
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
    products = res[0]
    suppliers = res[1]
    allOrders = res[2]
    purchases = res[3]
    storeSalesRecords = res[4]
  } catch (err) {
    console.error('[AdminDashboard getLiveMetrics error]', err)
  }

  // Current Date Boundaries (Local / IST)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  // Today's Real Orders & Real Revenue
  const todayOrders = allOrders.filter(
    (o) => new Date(o.createdAt) >= startOfToday && o.status !== 'CANCELLED'
  )
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const todayUnitsSold = todayOrders.reduce(
    (sum, o) => sum + o.orderItems.reduce((isum, item) => isum + item.quantity, 0),
    0
  )

  // Yesterday's baseline for honest day-over-day trends (display only)
  const yesterdayOrders = allOrders.filter(
    (o) => new Date(o.createdAt) >= startOfYesterday && new Date(o.createdAt) < startOfToday && o.status !== 'CANCELLED'
  )
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.total, 0)
  const yesterdayUnits = yesterdayOrders.reduce(
    (sum, o) => sum + o.orderItems.reduce((isum, item) => isum + item.quantity, 0),
    0
  )
  const pctChange = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? 100 : 0
    return ((today - yesterday) / yesterday) * 100
  }
  const fmtTrend = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`

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

  /* ----- Display-only derivations from the same fetched data ----- */

  // Monthly revenue buckets (last 6 months) for the Sales Overview chart
  const monthlySales = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString('en-IN', { month: 'short' }),
      revenue: 0,
      orders: 0,
    }
  })
  const monthIndex = new Map(monthlySales.map((m, i) => [m.key, i]))
  for (const o of confirmedOrders) {
    const d = new Date(o.createdAt)
    const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (idx !== undefined) {
      monthlySales[idx].revenue += o.total
      monthlySales[idx].orders += 1
    }
  }

  // Inventory health counts
  const soldTodayNames = new Set(Object.keys(todayProductsSoldMap))
  let outOfStockCount = 0
  let overstockCount = 0
  let deadStockCount = 0
  const categoryUnits = new Map<string, number>()
  for (const p of products) {
    const stock = p.inventory?.availableQuantity ?? 0
    if (stock === 0) outOfStockCount += 1
    if (stock > Math.max(p.reorderLevel * 3, 30)) overstockCount += 1
    if (stock > 0 && stock >= p.reorderLevel && !soldTodayNames.has(p.name)) deadStockCount += 1
    categoryUnits.set(p.category.name, (categoryUnits.get(p.category.name) ?? 0) + stock)
  }

  // Category performance (share of stocked units, top 5)
  const categoryPerf = [...categoryUnits.entries()]
    .map(([name, units]) => ({ name, units, pct: totalUnits > 0 ? (units / totalUnits) * 100 : 0 }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)

  // Demand forecast projection from today's sales velocity (display only)
  const forecast = topItemsToday.slice(0, 4).map(([name, stat]) => ({
    name,
    projectedUnits: stat.units * 30,
  }))

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
    revenueTrend: fmtTrend(pctChange(todayRevenue, yesterdayRevenue)),
    revenueTrendUp: todayRevenue >= yesterdayRevenue,
    ordersTrend: fmtTrend(pctChange(todayOrders.length, yesterdayOrders.length)),
    ordersTrendUp: todayOrders.length >= yesterdayOrders.length,
    unitsTrend: fmtTrend(pctChange(todayUnitsSold, yesterdayUnits)),
    unitsTrendUp: todayUnitsSold >= yesterdayUnits,
    // All-time Real Metrics
    allTimeRevenue,
    totalOrdersCount: allOrders.length,
    pendingOrdersCount: pendingOrders.length,
    recentOrders: allOrders.slice(0, 8),
    recentPurchases: purchases,
    historicalCsvRecordsCount: storeSalesRecords,
    // Display derivations
    monthlySales: monthlySales.map(({ month, revenue, orders }) => ({ month, revenue, orders })),
    outOfStockCount,
    overstockCount,
    deadStockCount,
    categoryPerf,
    forecast,
  }
}

const TILE_COLORS = ['bg-green-100 text-[#16A34A]', 'bg-blue-100 text-[#3B82F6]', 'bg-purple-100 text-[#8B5CF6]', 'bg-orange-100 text-[#F59E0B]', 'bg-pink-100 text-[#EC4899]']
const BAR_COLORS = ['#16A34A', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899']

export default async function AdminDashboardPage() {
  await requirePageRole(['ADMIN', 'STAFF'])
  const data = await getLiveMetrics()

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F5132] tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Mydukur Supermarket, Kadapa, AP (516172) • {formatPrice(data.todayRevenue)} live revenue today
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/forecasting"
            className="sr-btn-primary font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
          >
            <Zap size={14} /> Autonomous Ordering
          </Link>
          <Link
            href="/admin/ai"
            className="font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 bg-[#111827] hover:bg-black text-white transition-all duration-200 active:scale-[0.97]"
          >
            <Bot size={14} /> AI Assistant
          </Link>
        </div>
      </div>

      {/* Row of 6 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard
          index={0}
          label="Today's Revenue"
          value={data.todayRevenue}
          format="price"
          icon={<IndianRupee size={19} />}
          iconColor="green"
          trend={data.revenueTrend}
          trendUp={data.revenueTrendUp}
        />
        <KpiCard
          index={1}
          label="Today's Orders"
          value={data.todayOrdersCount}
          icon={<ShoppingCart size={19} />}
          iconColor="blue"
          trend={data.ordersTrend}
          trendUp={data.ordersTrendUp}
        />
        <KpiCard
          index={2}
          label="Units Sold"
          value={data.todayUnitsSold}
          icon={<Package size={19} />}
          iconColor="purple"
          trend={data.unitsTrend}
          trendUp={data.unitsTrendUp}
        />
        <KpiCard
          index={3}
          label="Current Inventory"
          value={data.totalUnits}
          icon={<Warehouse size={19} />}
          iconColor="orange"
          trend={`${data.totalProducts} SKUs`}
          trendUp
        />
        <KpiCard
          index={4}
          label="Low Stock"
          value={data.lowStockItems.length}
          icon={<AlertTriangle size={19} />}
          iconColor="red"
          trend={data.lowStockItems.length > 0 ? 'Needs reorder' : 'Healthy'}
          trendUp={data.lowStockItems.length === 0}
        />
        <KpiCard
          index={5}
          label="Out of Stock"
          value={data.outOfStockCount}
          icon={<PackageX size={19} />}
          iconColor="pink"
          trend={data.outOfStockCount > 0 ? 'Action needed' : 'None'}
          trendUp={data.outOfStockCount === 0}
        />
      </div>

      {/* Middle row: Sales Overview + Top Selling Products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
        <div className="xl:col-span-2 sr-stagger" style={{ animationDelay: '100ms' }}>
          <SalesOverview data={data.monthlySales} />
        </div>

        <Card className="p-5 sm:p-6 sr-stagger" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-[#0F5132] text-base tracking-tight">Top Selling Products</h2>
            <Link href="/admin/sales" className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] transition-colors duration-200">
              View All →
            </Link>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">Ranked by units sold today</p>

          {data.topItemsToday.length === 0 ? (
            <div className="py-8 text-center">
              <div className="sr-skeleton h-12 mb-2" />
              <div className="sr-skeleton h-12 mb-2" />
              <div className="sr-skeleton h-12" />
              <p className="text-xs text-[#6B7280] mt-4">No sales yet today — items ordered from the store will rank here.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {data.topItemsToday.map(([name, stat], idx) => (
                <li
                  key={name}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F4FAF6]/70 border border-transparent hover:border-green-100 hover:bg-[#F4FAF6] transition-all duration-200"
                >
                  <span className="w-6 h-6 rounded-lg bg-white border border-[#E5E7EB] text-[#0F5132] font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className={`flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold shrink-0 ${TILE_COLORS[idx % TILE_COLORS.length]}`}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-[#111827] truncate">{name}</span>
                    <span className="block text-[11px] text-[#6B7280]">{formatPrice(stat.revenue)}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-[13px] font-bold text-[#111827]">{stat.units} sold</span>
                    <span className="block text-[11px] text-[#6B7280]">units</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Bottom row: 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {/* Category Performance */}
        <Card className="p-5 sm:p-6 sr-stagger" style={{ animationDelay: '200ms' }}>
          <h2 className="font-bold text-[#0F5132] text-base tracking-tight">Category Performance</h2>
          <p className="text-xs text-[#6B7280] mt-0.5 mb-5">Share of stocked units by category</p>
          {data.categoryPerf.length === 0 ? (
            <div className="space-y-3">
              <div className="sr-skeleton h-8" />
              <div className="sr-skeleton h-8" />
              <div className="sr-skeleton h-8" />
            </div>
          ) : (
            <ul className="space-y-4">
              {data.categoryPerf.map((c, idx) => (
                <li key={c.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#111827] truncate">{c.name}</span>
                    <span className="font-bold text-[#6B7280] shrink-0 ml-2">{c.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(c.pct, 3)}%`, background: BAR_COLORS[idx % BAR_COLORS.length] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Inventory Alerts */}
        <Card className="p-5 sm:p-6 sr-stagger" style={{ animationDelay: '250ms' }}>
          <h2 className="font-bold text-[#0F5132] text-base tracking-tight">Inventory Alerts</h2>
          <p className="text-xs text-[#6B7280] mt-0.5 mb-4">Live stock health signals</p>
          <ul className="space-y-2.5">
            <li>
              <Link href="/admin/forecasting" className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/70 border border-transparent hover:border-orange-200 transition-all duration-200">
                <IconTile color="orange"><AlertTriangle size={18} /></IconTile>
                <span className="flex-1 text-[13px] font-semibold text-[#111827]">Low Stock</span>
                <span className="text-sm font-bold text-[#111827]">{data.lowStockItems.length}</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/inventory" className="flex items-center gap-3 p-3 rounded-xl bg-red-50/70 border border-transparent hover:border-red-200 transition-all duration-200">
                <IconTile color="red"><PackageX size={18} /></IconTile>
                <span className="flex-1 text-[13px] font-semibold text-[#111827]">Out of Stock</span>
                <span className="text-sm font-bold text-[#111827]">{data.outOfStockCount}</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/inventory" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all duration-200">
                <IconTile color="blue"><Boxes size={18} /></IconTile>
                <span className="flex-1 text-[13px] font-semibold text-[#111827]">Overstock</span>
                <span className="text-sm font-bold text-[#111827]">{data.overstockCount}</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/reports" className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/70 border border-transparent hover:border-purple-200 transition-all duration-200">
                <IconTile color="purple"><CircleAlert size={18} /></IconTile>
                <span className="flex-1 text-[13px] font-semibold text-[#111837]">Dead Stock</span>
                <span className="text-sm font-bold text-[#111827]">{data.deadStockCount}</span>
              </Link>
            </li>
          </ul>
        </Card>

        {/* Demand Forecast */}
        <Card className="p-5 sm:p-6 sr-stagger md:col-span-2 xl:col-span-1" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#0F5132] text-base tracking-tight">Demand Forecast</h2>
            <Link href="/admin/forecasting" className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] transition-colors duration-200">
              Details →
            </Link>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5 mb-4">Next month • projected from today&apos;s velocity</p>
          {data.forecast.length === 0 ? (
            <div className="p-8 bg-[#F4FAF6] rounded-2xl text-center text-xs text-[#6B7280]">
              No sales velocity yet today. Forecast appears once orders come in.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {data.forecast.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F4FAF6]/70 border border-transparent hover:border-green-100 hover:bg-[#F4FAF6] transition-all duration-200"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-green-100 text-[#16A34A] shrink-0">
                    <TrendingUp size={16} />
                  </span>
                  <span className="flex-1 min-w-0 text-[13px] font-semibold text-[#111827] truncate">{f.name}</span>
                  <span className="text-[13px] font-bold text-[#0F5132] shrink-0">
                    {f.projectedUnits.toLocaleString('en-IN')} <span className="font-medium text-[#6B7280]">units</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/forecasting"
            className="mt-4 flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#F4FAF6] text-[#0F5132] hover:bg-green-100 border border-green-100 transition-all duration-200"
          >
            <Zap size={13} /> Open Autonomous Ordering <ArrowRight size={13} />
          </Link>
        </Card>
      </div>

      {/* Live context strip (kept from existing data, restyled) */}
      <Card className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-[#6B7280]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live database connected
        </span>
        <span>{data.totalOrdersCount} total orders • {data.pendingOrdersCount} pending</span>
        <span>All-time revenue {formatPrice(data.allTimeRevenue)}</span>
        <span className="sm:ml-auto">{data.historicalCsvRecordsCount} historical training records</span>
      </Card>
    </div>
  )
}
