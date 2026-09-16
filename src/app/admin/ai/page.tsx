'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Send,
  Trash2,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  Building2,
  PackageCheck,
  User,
} from 'lucide-react'

interface ActionablePo {
  id: string
  productName: string
  sku: string
  suggestedQty: number
  supplierName: string
}

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  actionablePos?: ActionablePo[]
  time: string
}

/**
 * Remove all asterisks (*), markdown stars, and unwanted symbols from text
 */
function stripStars(text: string): string {
  if (!text) return ''
  return text
    // Replace triple asterisks ***text*** -> text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    // Replace double asterisks **text** -> text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Replace single asterisks *text* -> text
    .replace(/\*([^*\n]+)\*/g, '$1')
    // Convert bullet asterisks at line starts to bullets: * item -> • item
    .replace(/^(\s*)\*+\s+/gm, '$1• ')
    // Remove any leftover stray asterisks
    .replace(/\*/g, '')
    // Clean excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Clean, elegant component to render AI answers with beautiful typography and structure
 */
function FormattedAIResponse({ text }: { text: string }) {
  const cleaned = stripStars(text)
  const lines = cleaned.split('\n')

  return (
    <div className="space-y-2 text-xs sm:text-sm text-gray-800 leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim()
        if (!line) {
          return <div key={idx} className="h-1.5" />
        }

        // Header / Section title (e.g., lines ending with ":" or starting with an emoji header)
        const isHeader =
          (line.endsWith(':') && line.length < 60 && !line.startsWith('•') && !line.startsWith('-')) ||
          (line.startsWith('📊') || line.startsWith('📦') || line.startsWith('🏷️') || line.startsWith('✅'))

        if (isHeader) {
          return (
            <div
              key={idx}
              className="font-bold text-gray-900 text-xs sm:text-sm pt-2 pb-0.5 border-b border-gray-100 flex items-center gap-1.5"
            >
              <span>{line}</span>
            </div>
          )
        }

        // Bullet point lines (starting with • or - or numbered 1., 2.)
        const isBullet = line.startsWith('•') || line.startsWith('-') || /^\d+\.\s/.test(line)
        if (isBullet) {
          const bulletContent = line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '')
          // Check if bullet has a Key: Value structure
          const colonIdx = bulletContent.indexOf(':')
          if (colonIdx > 0 && colonIdx < 35) {
            const keyPart = bulletContent.substring(0, colonIdx)
            const valuePart = bulletContent.substring(colonIdx + 1)
            return (
              <div key={idx} className="flex items-start gap-2 py-0.5 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <div className="flex-1 leading-snug">
                  <span className="font-semibold text-gray-900">{keyPart}:</span>
                  <span className="text-gray-700 ml-1">{valuePart}</span>
                </div>
              </div>
            )
          }

          return (
            <div key={idx} className="flex items-start gap-2 py-0.5 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
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
      text: `Hello! 👋 I am your SmartRetail Store Assistant.\n\nI am directly connected to your live inventory, uploaded store sales records, and supplier directory. Ask me anything naturally, such as:\n• Which product sold the most in our uploaded sales?\n• How many units of shampoo or rice do we have in stock?\n• Which products are running low on stock and need reorders?\n• Who are our suppliers and what are their delivery lead times?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const textToSend = query.trim()
    if (!textToSend || loading) return

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
      {/* Clean, Polished Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
            <Bot size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 leading-tight truncate">AI Store Assistant</h1>
              <span className="bg-green-100 text-green-800 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                Connected
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              Live Inventory • Uploaded Sales • Suppliers
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
        <div className="mb-3 p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <span>{executedSuccess}</span>
        </div>
      )}

      {/* Message Stream */}
      <div
        ref={chatContainerRef}
        className="flex-1 bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-xs overflow-y-auto space-y-5 mb-3"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender Label */}
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-semibold text-gray-400">
              {m.sender === 'user' ? (
                <>
                  <span>Store Admin</span>
                  <User size={12} className="text-green-600" />
                </>
              ) : (
                <>
                  <Bot size={13} className="text-green-600" />
                  <span className="text-green-700 font-bold">Store AI Assistant</span>
                </>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-2xl rounded-2xl p-4 sm:p-5 shadow-xs ${
                m.sender === 'user'
                  ? 'bg-green-700 text-white rounded-tr-none font-medium text-xs sm:text-sm leading-relaxed'
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-200/90 shadow-2xs space-y-4'
              }`}
            >
              {m.sender === 'user' ? (
                <p className="whitespace-pre-line">{stripStars(m.text)}</p>
              ) : (
                <FormattedAIResponse text={m.text} />
              )}

              {/* Actionable Purchase Orders Card (only when low stock is detected) */}
              {m.actionablePos && m.actionablePos.length > 0 && (
                <div className="pt-3 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <PackageCheck size={14} className="text-green-600" />
                      Recommended Supplier Restocks:
                    </p>
                    <span className="text-[10px] text-gray-400">1-Click Approval</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {m.actionablePos.map((rec) => (
                      <div
                        key={rec.id}
                        className="bg-gray-50/90 hover:bg-gray-50 p-3 rounded-xl border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                            {rec.productName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Building2 size={11} className="text-gray-400" />
                              {rec.supplierName}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                              Order +{rec.suggestedQty} units
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleExecutePO(rec.id, rec.suggestedQty)}
                          disabled={executingId === rec.id}
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs"
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
          <div className="flex items-center gap-2.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 p-3 rounded-xl w-fit">
            <RefreshCw size={14} className="animate-spin text-green-600" />
            <span className="font-medium">AI Assistant is analyzing store database and sales records...</span>
          </div>
        )}
      </div>

      {/* Clean Bottom Input Bar */}
      <form onSubmit={handleSend} className="flex gap-2 shrink-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about sales records, stock levels, or suppliers..."
          className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white shadow-2xs font-normal text-gray-800 placeholder:text-gray-400"
          autoFocus
        />

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-5 py-3.5 rounded-xl flex items-center gap-2 transition-colors text-xs sm:text-sm shadow-xs shrink-0"
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </form>
    </div>
  )
}
