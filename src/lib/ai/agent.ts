import { db } from '@/lib/db'
import { askGroq, GroqMessage } from './groq'

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface StructuredAgentResponse {
  answer: string
  actionablePos?: Array<{
    id: string
    productName: string
    sku: string
    suggestedQty: number
    supplierName: string
  }>
}

// Conversation Session Memory (In-Memory Map)
const sessionStore = new Map<string, AgentMessage[]>()

export function getSessionHistory(sessionId: string): AgentMessage[] {
  return sessionStore.get(sessionId) || []
}

export function saveSessionMessage(sessionId: string, msg: AgentMessage): void {
  const history = getSessionHistory(sessionId)
  history.push(msg)
  if (history.length > 10) history.shift()
  sessionStore.set(sessionId, history)
}

export async function runAgent(
  sessionId: string,
  userQuery: string
): Promise<StructuredAgentResponse> {
  const q = userQuery.toLowerCase().trim()

  saveSessionMessage(sessionId, {
    role: 'user',
    content: userQuery,
    timestamp: new Date().toISOString(),
  })

  // 1. Fetch Real-time Live Database Snapshot (Orders, Products, Stock, Suppliers)
  // and Historical CSV & RAG Engine data
  const [liveOrders, products, suppliers, uploadedSales, ragDocs] = await Promise.all([
    db.order.findMany({
      include: {
        orderItems: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        bill: { select: { billNumber: true, paymentStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        supplier: { select: { id: true, name: true, code: true, leadTimeDays: true, phone: true } },
        inventory: { select: { availableQuantity: true, reservedQuantity: true } },
      },
      orderBy: { name: 'asc' },
    }),
    db.supplier.findMany({
      orderBy: { code: 'asc' },
    }),
    db.storeSaleRecord.findMany({
      orderBy: { date: 'desc' },
      take: 100,
    }),
    db.knowledgeDocument.findMany({
      take: 8,
    }),
  ])

  // === LIVE DATABASE METRICS (TODAY'S ACTUAL REALITY) ===
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const todayOrders = liveOrders.filter(
    (o) => new Date(o.createdAt) >= startOfToday && o.status !== 'CANCELLED'
  )
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const todayUnits = todayOrders.reduce(
    (sum, o) => sum + o.orderItems.reduce((isum, item) => isum + item.quantity, 0),
    0
  )

  // Items sold today in real live customer orders
  const todayItemMap: Record<string, { units: number; revenue: number; category: string }> = {}
  for (const o of todayOrders) {
    for (const item of o.orderItems) {
      if (!todayItemMap[item.productName]) {
        todayItemMap[item.productName] = { units: 0, revenue: 0, category: item.category }
      }
      todayItemMap[item.productName].units += item.quantity
      todayItemMap[item.productName].revenue += item.unitPrice * item.quantity + item.gstAmount
    }
  }

  const todayItemsList = Object.entries(todayItemMap)
    .map(
      ([name, stat]) =>
        `• ${name} (${stat.category}): ${stat.units} units sold, Revenue: ₹${Math.round(stat.revenue).toLocaleString('en-IN')}`
    )
    .join('\n')

  // All-time real store orders
  const confirmedLiveOrders = liveOrders.filter((o) => o.status !== 'CANCELLED')
  const totalLiveRevenue = confirmedLiveOrders.reduce((sum, o) => sum + o.total, 0)
  const totalLiveOrdersCount = liveOrders.length

  const recentLiveOrdersSummary = liveOrders
    .slice(0, 5)
    .map((o) => {
      const itemsStr = o.orderItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ')
      return `• Order #${o.id.slice(0, 8).toUpperCase()} by ${o.customer?.name || 'Store Customer'}: ₹${o.total.toLocaleString('en-IN')} (${itemsStr}) [${o.status}] - Bill: ${o.bill?.billNumber || 'Pending'}`
    })
    .join('\n')

  // Live Warehouse Inventory
  const lowStockProducts = products.filter(
    (p) => (p.inventory?.availableQuantity ?? 0) <= p.reorderLevel
  )
  const totalStockUnits = products.reduce((acc, p) => acc + (p.inventory?.availableQuantity ?? 0), 0)

  const productStockList = products
    .map(
      (p) =>
        `• ${p.name}: Available ${p.inventory?.availableQuantity ?? 0} units | Price: ₹${p.sellingPrice} | Reorder Level: ${p.reorderLevel} | Supplier: ${p.supplier?.name || 'N/A'}`
    )
    .join('\n')

  const supplierList = suppliers
    .map(
      (s) =>
        `• [${s.code}] ${s.name}: ${s.categories || 'All'} | Lead: ${s.leadTimeDays} days | Rating: ⭐${s.rating} | Contact: ${s.contactName} (${s.phone})`
    )
    .join('\n')

  // === HISTORICAL CSV & RAG DATA (ONLY FOR PATTERNS, PREDICTIONS & RELATIONSHIPS) ===
  const totalUploadedRevenue = uploadedSales.reduce((sum, r) => sum + r.totalRevenue, 0)
  const totalUploadedUnits = uploadedSales.reduce((sum, r) => sum + r.quantity, 0)

  const productSalesMap: Record<string, { units: number; revenue: number; category: string }> = {}
  const categorySalesMap: Record<string, number> = {}

  for (const s of uploadedSales) {
    if (!productSalesMap[s.productName]) {
      productSalesMap[s.productName] = { units: 0, revenue: 0, category: s.category || 'General' }
    }
    productSalesMap[s.productName].units += s.quantity
    productSalesMap[s.productName].revenue += s.totalRevenue

    const cat = s.category || 'General'
    categorySalesMap[cat] = (categorySalesMap[cat] || 0) + s.totalRevenue
  }

  const topSellingList = Object.entries(productSalesMap)
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 10)
    .map(
      ([name, stat], i) =>
        `${i + 1}. ${name} (${stat.category}): ${stat.units} units sold, Benchmark Revenue: ₹${stat.revenue.toLocaleString('en-IN')}`
    )
    .join('\n')

  const categoryRevenueList = Object.entries(categorySalesMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, rev]) => `• ${cat}: ₹${rev.toLocaleString('en-IN')}`)
    .join('\n')

  const ragSalesDocs = ragDocs
    .filter((d) => d.category === 'STORE_SALES' || d.category === 'OPERATIONS')
    .map((d) => `${d.title}:\n${d.content}`)
    .join('\n\n')

  // Construct context-specific system prompt based on user query
  let systemPrompt = ''

  if (
    q === 'hi' ||
    q === 'hii' ||
    q === 'hello' ||
    q === 'hey' ||
    q.startsWith('hi ') ||
    q.startsWith('hello ') ||
    q.includes('who are you') ||
    q.includes('what can you do')
  ) {
    systemPrompt = `You are the friendly, intelligent AI Supermarket Assistant for SmartRetail in Mydukur, AP.
Greet the admin warmly and naturally. Keep your response short, conversational, and helpful. Mention that you have direct access to today's live orders & revenue, current warehouse stock, and the historical CSV RAG engine for sales patterns and future predictions.`
  } else {
    systemPrompt = `You are the AI Assistant for SmartRetail Supermarket in Mydukur, Kadapa, AP.
Speak naturally, warmly, directly, and accurately like an experienced store operations manager.

==================================================
1. LIVE STORE DATABASE (TODAY'S ACTUAL ORDERS & CURRENT INVENTORY)
==================================================
*THIS IS THE ABSOLUTE GROUND TRUTH FOR CURRENT STORE OPERATIONS*
Date: ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
• Today's Actual Live Revenue: ₹${todayRevenue.toLocaleString('en-IN')}
• Today's Actual Live Orders: ${todayOrders.length} orders placed
• Today's Physical Units Sold: ${todayUnits} units
• Products Sold in Today's Orders:
${todayItemsList || 'No orders placed yet today.'}

• All-Time Real Live Store Orders: ${totalLiveOrdersCount} orders
• All-Time Real Live Store Revenue: ₹${totalLiveRevenue.toLocaleString('en-IN')}

• Recent Real Live Orders:
${recentLiveOrdersSummary || 'No live customer orders recorded yet.'}

• Live Warehouse Physical Stock:
Total Active Products: ${products.length}
Total Available Units in Stock: ${totalStockUnits.toLocaleString('en-IN')} units
Low Stock Alert Items (${lowStockProducts.length}):
${lowStockProducts.map((p) => `• ${p.name}: ${p.inventory?.availableQuantity ?? 0} units left (Reorder threshold: ${p.reorderLevel}) - Supplier: ${p.supplier?.name}`).join('\n') || 'All products in healthy stock.'}

Current Product Catalog & Available Units:
${productStockList}

10 Verified Suppliers:
${supplierList}

==================================================
2. HISTORICAL CSV & RAG ENGINE (ONLY FOR PATTERNS, PREDICTIONS & RELATIONSHIPS)
==================================================
*THIS DATA IS USED EXCLUSIVELY FOR LEARNING PATTERNS AND PREDICTING FUTURE DEMAND*
*IT IS NOT TODAY'S LIVE SALES*
• Total Historical Training Records: ${uploadedSales.length} records
• Historical Training Revenue Benchmark: ₹${totalUploadedRevenue.toLocaleString('en-IN')}
• Historical Training Units: ${totalUploadedUnits.toLocaleString('en-IN')} units
• High-Velocity Products in Historical Patterns:
${topSellingList || 'No store sales records uploaded yet.'}

• Historical Category Sales Distribution:
${categoryRevenueList || 'No category sales recorded yet.'}

• RAG Knowledge Documents:
${ragSalesDocs || 'No RAG sales docs indexed.'}

Store Policy:
7-day return for packaged goods, 24-hour return for fresh milk, eggs, bread.

==================================================
CRITICAL OPERATING RULES:
==================================================
1. When asked about "today's sales", "latest revenue", "orders today", "who bought today", or "current stock", ALWAYS cite the LIVE STORE DATABASE figures. Mention today's exact live revenue (₹${todayRevenue.toLocaleString('en-IN')}) and today's orders (${todayOrders.length}).
2. When asked about "patterns", "future predictions", "demand forecasting", "growth", or "relationships", explain that you are using the CSV RAG system to discover demand trends and predictions.
3. NEVER output asterisks (*) or double asterisks (**) anywhere in your response. Do NOT use markdown bold like **word** or italic like *word*.
4. For lists, use clean bullet points (•) or dashes (-).
5. For section titles, write clean title case followed by a colon (e.g., "Today's Live Sales:" or "Historical Patterns & Prediction:").
6. Answer warmly and concisely in professional Indian retail terminology.`
  }

  // Session history (last 4 turns)
  const history = getSessionHistory(sessionId).slice(-4)
  const groqMessages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
  ]

  // Call Groq LLM
  const groqAnswer = await askGroq(groqMessages)

  // Natural fallback if API is unreachable
  let rawAnswer = groqAnswer
  if (!rawAnswer) {
    if (q === 'hi' || q === 'hello' || q === 'hii') {
      rawAnswer = `Hello! 👋 Welcome to SmartRetail Assistant. I am directly connected to your live database orders, today's real-time revenue, active warehouse inventory, and the CSV RAG system for sales patterns. How can I help you today?`
    } else if (
      q.includes('today') ||
      q.includes('live') ||
      q.includes('current revenue') ||
      q.includes('today sales') ||
      q.includes('todays sales') ||
      q.includes('order today') ||
      q.includes('latest order')
    ) {
      if (todayOrders.length > 0) {
        rawAnswer = `Today's Live Store Performance:\n• Today's Orders: ${todayOrders.length} orders\n• Today's Live Revenue: ₹${todayRevenue.toLocaleString('en-IN')}\n• Units Sold Today: ${todayUnits} units\n\nItems Sold Today:\n${todayItemsList}\n\nRecent Orders:\n${recentLiveOrdersSummary}`
      } else {
        rawAnswer = `Today's Live Sales Status:\n• Today's Orders: 0 orders so far today\n• Today's Revenue: ₹0\n• All-Time Real Store Revenue: ₹${totalLiveRevenue.toLocaleString('en-IN')} (${totalLiveOrdersCount} orders)\n\nLive orders placed by customers at checkout will appear here in real time.`
      }
    } else if (
      q.includes('pattern') ||
      q.includes('predict') ||
      q.includes('future') ||
      q.includes('growth') ||
      q.includes('csv') ||
      q.includes('trend') ||
      q.includes('forecast')
    ) {
      if (topSellingList) {
        rawAnswer = `Historical Sales Patterns & Predictions (from RAG & CSV Training Data):\n• Benchmark Training Revenue: ₹${totalUploadedRevenue.toLocaleString('en-IN')}\n• Total Training Units: ${totalUploadedUnits.toLocaleString('en-IN')} units\n\nTop Selling Products in Historical Patterns:\n${topSellingList}\n\nCategory Distribution:\n${categoryRevenueList}`
      } else {
        rawAnswer = `No historical CSV sales data has been uploaded yet. Upload your sales CSV under Sales Upload to enable predictive pattern analysis.`
      }
    } else if (q.includes('sale') || q.includes('revenue')) {
      rawAnswer = `Live Store Revenue Overview:\n• Today's Live Revenue: ₹${todayRevenue.toLocaleString('en-IN')} (${todayOrders.length} orders)\n• All-Time Live Revenue: ₹${totalLiveRevenue.toLocaleString('en-IN')} (${totalLiveOrdersCount} orders)\n\nHistorical CSV Training Data (Used for Patterns & Predictions):\n• Benchmark Revenue: ₹${totalUploadedRevenue.toLocaleString('en-IN')} (${uploadedSales.length} historical records)`
    } else if (q.includes('stock') || q.includes('how many') || q.includes('available')) {
      const matched = products.find(
        (p) => q.includes(p.name.toLowerCase()) || q.includes(p.category.name.toLowerCase())
      )
      if (matched) {
        rawAnswer = `We currently have ${matched.inventory?.availableQuantity ?? 0} units of ${matched.name} available in stock (Price: ₹${matched.sellingPrice}, Reorder Level: ${matched.reorderLevel}).`
      } else {
        rawAnswer = `Currently there are ${totalStockUnits.toLocaleString('en-IN')} total units across ${products.length} active products in warehouse stock.\n• Low Stock Alert Items: ${lowStockProducts.length}`
      }
    } else if (q.includes('supplier') || q.includes('vendor')) {
      rawAnswer = `Verified Store Suppliers (10 FMCG Vendors):\n${supplierList}`
    } else {
      rawAnswer = `I can look up today's live sales (₹${todayRevenue.toLocaleString('en-IN')}), current warehouse stock, low-stock reorder alerts, and historical CSV patterns & forecasts. What would you like to know?`
    }
  }

  // Clean all asterisks, markdown stars, and format cleanly
  const finalAnswer = cleanStarsAndMarkdown(rawAnswer)

  // Optional actionable POs for low-stock items
  const actionablePos =
    lowStockProducts.length > 0 &&
    (q.includes('reorder') || q.includes('low stock') || q.includes('order'))
      ? lowStockProducts.slice(0, 3).map((p) => ({
          id: p.id,
          productName: p.name,
          sku: p.sku,
          suggestedQty: Math.max(
            15,
            p.reorderLevel * 2 - (p.inventory?.availableQuantity ?? 0)
          ),
          supplierName: p.supplier?.name || 'Primary Supplier',
        }))
      : undefined

  saveSessionMessage(sessionId, {
    role: 'assistant',
    content: finalAnswer,
    timestamp: new Date().toISOString(),
  })

  return {
    answer: finalAnswer,
    actionablePos,
  }
}

/**
 * Remove asterisks (*) and raw markdown symbols cleanly from AI responses
 */
export function cleanStarsAndMarkdown(text: string): string {
  if (!text) return ''
  return text
    // Replace triple asterisks ***text*** -> text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    // Replace double asterisks **text** -> text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Replace single asterisks *text* -> text
    .replace(/\*([^*\n]+)\*/g, '$1')
    // Replace markdown bullets * item -> • item
    .replace(/^(\s*)\*+\s+/gm, '$1• ')
    // Remove any remaining asterisks
    .replace(/\*/g, '')
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
