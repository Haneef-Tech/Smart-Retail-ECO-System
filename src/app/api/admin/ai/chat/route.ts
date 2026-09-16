import { NextRequest, NextResponse } from 'next/server'
import { runAgent } from '@/lib/ai/agent'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, sessionId } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
    }

    const activeSessionId = (sessionId && typeof sessionId === 'string' ? sessionId : 'default-admin-session').trim()

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
