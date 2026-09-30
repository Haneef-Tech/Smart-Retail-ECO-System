import { NextRequest, NextResponse } from 'next/server'
import { runAgent } from '@/lib/ai/agent'
import { guardRoles } from '@/lib/auth-guard'
import { readJsonBody, validate } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'
import { chatSchema } from '@/lib/validators/ai'

export async function POST(req: NextRequest) {
  const { denied, requester } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  if (!requester) {
    return NextResponse.json({ error: 'Unauthorized: sign-in required' }, { status: 401 })
  }
  try {
    // 20 chats/min per user
    const limited = await checkRateLimit(req, 'aiChat', requester.uid)
    if (limited) return limited

    const raw = await readJsonBody(req)
    if (!raw.ok) return raw.response
    const parsed = validate(chatSchema, raw.body)
    if (!parsed.ok) return parsed.response
    const { query, sessionId } = parsed.data

    const activeSessionId = (sessionId || 'default-admin-session').trim() || 'default-admin-session'

    // Execute Autonomous Agent Orchestrator with memory & security checks
    const agentResponse = await runAgent(activeSessionId, query)

    return NextResponse.json(agentResponse)
  } catch (error) {
    console.error('[API/admin/ai/chat POST]', error)
    return NextResponse.json(
      { error: 'AI Agent execution failed: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
