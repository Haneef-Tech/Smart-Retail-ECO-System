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

  // 1. Fetch Real-time Live Database Snapshot
  const [products, suppliers, uploadedSales, ragDocs] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        supplier: { select: { id: true, name: true, code: true, leadTimeDays: true, phone: true } },
        inventory: { select: { availableQuantity: true } },
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

  // Compute key sales facts from uploaded store sales
  const totalUploadedRevenue = uploadedSales.reduce((sum, r) => sum + r.totalRevenue, 0)
  const totalUploadedUnits = uploadedSales.reduce((sum, r) => sum + r.quantity, 0)

  // Compute top products by sales from uploaded data
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
    .map(([name, stat], i) => `${i + 1}. ${name} (${stat.category}): ${stat.units} units sold, Revenue: ₹${stat.revenue.toLocaleString('en-IN')}`)
    .join('\n')

  const categoryRevenueList = Object.entries(categorySalesMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, rev]) => `• ${cat}: ₹${rev.toLocaleString('en-IN')}`)
    .join('\n')

  // Available stock facts
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

  const ragSalesDocs = ragDocs
    .filter((d) => d.category === 'STORE_SALES')
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
Greet the admin warmly and naturally. Keep your response short, conversational, and helpful. Mention that you have direct access to store sales data, live inventory stock, and supplier contacts.`
  } else {
    systemPrompt = `You are the AI Assistant for SmartRetail Supermarket in Mydukur, Kadapa, AP.
You have DIRECT, REAL-TIME access to the store's database and uploaded sales data.
Speak naturally, warmly, directly, and accurately like a knowledgeable store operations manager.

--- STORE SALES DATA (FROM UPLOADED SALES) ---
Total Uploaded Sales Transactions: ${uploadedSales.length} records
Total Sales Revenue: ₹${totalUploadedRevenue.toLocaleString('en-IN')}
Total Units Sold: ${totalUploadedUnits.toLocaleString('en-IN')} units
Top Selling Products:
${topSellingList || 'No store sales records uploaded yet.'}

Category Revenue:
${categoryRevenueList || 'No category sales recorded yet.'}

RAG Sales Documents:
${ragSalesDocs || 'No RAG sales docs indexed.'}

--- LIVE STORE INVENTORY (PHYSICAL STOCK) ---
Total Active Products: ${products.length}
Total Available Units in Stock: ${totalStockUnits.toLocaleString('en-IN')}
Low Stock Items (${lowStockProducts.length}):
${lowStockProducts.map((p) => `• ${p.name}: ${p.inventory?.availableQuantity ?? 0} units (Threshold: ${p.reorderLevel}) - Supplier: ${p.supplier?.name}`).join('\n') || 'All products in healthy stock.'}

Current Product Catalog & Available Units:
${productStockList}

10 Verified Suppliers:
${supplierList}

Store Policy:
7-day return for packaged goods, 24-hour return for fresh milk, eggs, bread.

CRITICAL FORMATTING INSTRUCTIONS:
1. NEVER output asterisks (*) or double asterisks (**) anywhere in your response.
2. Do NOT use markdown bold like **word** or italic like *word*.
3. For lists, use clean bullet points (•) or dashes (-).
4. For section titles, write clean title case followed by a colon (e.g., "Store Sales Summary:" or "Live Stock Status:").
5. Answer in warm, natural, human-friendly language using the exact live numbers and facts provided above.`
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
      rawAnswer = `Hello! 👋 Welcome to SmartRetail Assistant. I am directly connected to your store sales data and live inventory. How can I help you today?`
    } else if (q.includes('sold') || q.includes('sale') || q.includes('revenue') || q.includes('top product')) {
      if (topSellingList) {
        rawAnswer = `📊 Store Sales Summary:\n• Total Sales Revenue: ₹${totalUploadedRevenue.toLocaleString('en-IN')}\n• Units Sold: ${totalUploadedUnits.toLocaleString('en-IN')} units\n\nTop Selling Products:\n${topSellingList}`
      } else {
        rawAnswer = `No store sales records have been uploaded yet. You can upload your sales CSV under Sales Upload in the admin panel to enable instant sales analysis.`
      }
    } else if (q.includes('stock') || q.includes('how many') || q.includes('available')) {
      const matched = products.find((p) => q.includes(p.name.toLowerCase()) || q.includes(p.category.name.toLowerCase()))
      if (matched) {
        rawAnswer = `📦 We currently have ${matched.inventory?.availableQuantity ?? 0} units of ${matched.name} available in stock (Price: ₹${matched.sellingPrice}, Reorder Level: ${matched.reorderLevel}).`
      } else {
        rawAnswer = `📦 Currently there are ${totalStockUnits.toLocaleString('en-IN')} total units across ${products.length} active products in stock.`
      }
    } else {
      rawAnswer = `I can look up live store sales, stock availability, low-stock alerts, and supplier details for you. What would you like to know?`
    }
  }

  // Clean all asterisks, markdown stars, and format cleanly
  const finalAnswer = cleanStarsAndMarkdown(rawAnswer)

  // Optional actionable POs for low-stock items
  const actionablePos =
    lowStockProducts.length > 0 && (q.includes('reorder') || q.includes('low stock') || q.includes('order'))
      ? lowStockProducts.slice(0, 3).map((p) => ({
          id: p.id,
          productName: p.name,
          sku: p.sku,
          suggestedQty: Math.max(15, p.reorderLevel * 2 - (p.inventory?.availableQuantity ?? 0)),
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
