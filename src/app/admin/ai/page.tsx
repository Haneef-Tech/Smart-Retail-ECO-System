'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Building2,
  Trash2,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  AlertTriangle,
  Database,
  Layers,
} from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  actionablePos?: Array<{
    id: string
    productName: string
    sku: string
    suggestedQty: number
    supplierName: string
  }>
  time: string
}

function stripStars(text: string): string {
  if (!text) return ''
  return text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^(\s*)\*+\s+/gm, '$1• ')
    .replace(/\*/g, '')
    .trim()
}

function FormattedMessageContent({ text }: { text: string }) {
  const clean = stripStars(text)
  const lines = clean.split('\n')

  return (
    <div className="space-y-1.5 text-xs sm:text-sm font-normal">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />
        }

        // Section Title: Ends with a colon
        if (
          trimmed.endsWith(':') &&
          !trimmed.startsWith('•') &&
          !trimmed.startsWith('-') &&
          trimmed.length < 60
        ) {
          return (
            <p key={idx} className="font-bold text-gray-900 pt-2.5 pb-0.5 text-xs sm:text-sm border-b border-gray-100/80">
              {trimmed}
            </p>
          )
        }

        // Bullet point line
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          const bulletContent = trimmed.replace(/^[•-]\s*/, '')
          const colonIdx = bulletContent.indexOf(':')

          if (colonIdx > 0 && colonIdx < 35) {
            const label = bulletContent.slice(0, colonIdx).trim()
            const rest = bulletContent.slice(colonIdx + 1).trim()
            return (
              <div key={idx} className="flex items-start gap-2 py-0.5 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span className="text-gray-700 leading-snug">
                  <strong className="text-gray-900 font-semibold">{label}:</strong> {rest}
                </span>
              </div>
            )
          }

          return (
            <div key={idx} className="flex items-start gap-2 py-0.5 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-gray-700 leading-snug">{bulletContent}</span>
            </div>
          )
        }

        // Standard narrative text paragraph
        return (
          <p key={idx} className="text-gray-800 leading-relaxed">
            {line}
          </p>
        )
      })}
    </div>
  )
}

const QUICK_PROMPTS = [
  { label: "Today's Live Sales & Orders", query: "Show me today sales and real orders" },
  { label: "Current Live Revenue", query: "What is our current live store revenue?" },
  { label: "Low Stock Reorder Alerts", query: "Which products are low on stock and need reorders?" },
  { label: "Historical Patterns & Prediction", query: "Predict sales patterns and growth trends from historical data" },
  { label: "Supplier Delivery Lead Times", query: "Who are our suppliers and what are their delivery lead times?" },
]

export default function AdminAiPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `admin-session-${Date.now()}`)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [executedSuccess, setExecutedSuccess] = useState<string | null>(null)

  const chatContainerRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Hello! 👋 I am your SmartRetail Store Assistant.\n\nI am directly connected to your Live Operational Database (for Today's Orders, Real Revenue, and Active Stock) and the Historical CSV RAG Engine (to discover patterns, seasonality, and demand predictions).\n\nAsk me anything naturally, or tap a quick query below:\n• Show me today's sales and real orders\n• What is our current live store revenue?\n• How many units of rice or milk do we have in stock?\n• Which products are running low on stock and need reorders?\n• Predict sales patterns and growth trends from historical CSV data`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const sendQuery = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: textToSend, time: now }])
    setQuery('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend, sessionId }),
      })
      const data = await res.json()

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: stripStars(data.answer || 'I could not retrieve an answer at this moment.'),
        actionablePos: data.actionablePos,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: 'Unable to reach the Store Assistant. Please verify server connection and try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    sendQuery(query)
  }

  // 1-Click PO execution from inside the chat
  const handleExecutePO = async (productId: string, qty: number) => {
    setExecutingId(productId)
    setExecutedSuccess(null)
    try {
      const res = await fetch('/api/admin/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: qty }),
      })
      const data = await res.json()
      if (res.ok) {
        setExecutedSuccess(data.message)
        setMessages((prev) => [
          ...prev,
          {
            id: `exec-${Date.now()}`,
            sender: 'ai',
            text: `Purchase Order Approved: ${data.message}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      } else {
        alert(data.error || 'Execution failed')
      }
    } catch {
      alert('Execution request failed')
    } finally {
      setExecutingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
            <Bot size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-gray-900 leading-tight truncate">
                AI Store Assistant
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                Live DB Connected
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              🟢 Live Orders &amp; Stock • 📚 Historical RAG Patterns &amp; Predictions
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([])}
          className="text-xs font-semibold text-gray-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1 transition-colors shrink-0"
          title="Clear Conversation"
        >
          <Trash2 size={14} /> <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </div>

      {/* Success Notification */}
      {executedSuccess && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{executedSuccess}</span>
        </div>
      )}

      {/* Message Stream */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 scroll-smooth min-h-0"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 sm:p-5 shadow-2xs ${
                m.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-100/90 rounded-bl-none'
              }`}
            >
              {/* Header inside Bubble */}
              <div className="flex items-center gap-1.5 mb-2 opacity-80 text-[11px]">
                {m.sender === 'user' ? (
                  <>
                    <User size={13} />
                    <span className="font-semibold">You</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="text-emerald-600" />
                    <span className="font-bold text-gray-800">SmartRetail AI</span>
                  </>
                )}
              </div>

              {/* Message Content */}
              {m.sender === 'user' ? (
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
              ) : (
                <FormattedMessageContent text={m.text} />
              )}

              {/* Actionable Restock PO Card inside AI Bubble */}
              {m.actionablePos && m.actionablePos.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Actionable Restock Recommendations:
                  </p>
                  <div className="space-y-2">
                    {m.actionablePos.map((rec) => (
                      <div
                        key={rec.id}
                        className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                            {rec.productName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Building2 size={11} className="text-gray-400" />
                              {rec.supplierName}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Order +{rec.suggestedQty} units
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleExecutePO(rec.id, rec.suggestedQty)}
                          disabled={executingId === rec.id}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                        >
                          {executingId === rec.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <ShoppingCart size={12} />
                          )}
                          Approve PO
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Time Stamp */}
            <span className="text-[10px] text-gray-400 mt-1 px-1">{m.time}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-gray-500 bg-white border border-gray-100 p-3.5 rounded-2xl w-fit shadow-2xs">
            <RefreshCw size={14} className="animate-spin text-emerald-600" />
            <span className="font-medium">AI Assistant is querying live database and historical RAG patterns...</span>
          </div>
        )}
      </div>

      {/* Quick Prompt Suggestion Chips */}
      <div className="py-2 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => sendQuery(p.query)}
            disabled={loading}
            className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 hover:border-emerald-200 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 shadow-2xs"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Bottom Input Bar */}
      <form onSubmit={handleSend} className="flex gap-2 shrink-0 pt-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about today's live sales, inventory units, or historical demand patterns..."
          className="flex-1 px-4 py-3.5 border border-gray-200 rounded-2xl text-xs sm:text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white shadow-2xs font-normal text-gray-800 placeholder:text-gray-400"
          autoFocus
        />

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 py-3.5 rounded-2xl flex items-center gap-2 transition-colors text-xs sm:text-sm shadow-xs shrink-0"
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </form>
    </div>
  )
}
