import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guardRoles } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateQuery } from '@/lib/api-response'
import { searchQuerySchema } from '@/lib/validators/common'

export async function GET(req: NextRequest) {
  const { denied } = await guardRoles(['ADMIN', 'STAFF'])
  if (denied) return denied
  const limited = await checkRateLimit(req, 'standard')
  if (limited) return limited
  try {
    const parsed = validateQuery(searchQuerySchema(200), req)
    if (!parsed.ok) return parsed.response
    const q = (parsed.data.q || '').trim()
    if (!q) {
      const docs = await db.knowledgeDocument.findMany()
      return NextResponse.json({ documents: docs })
    }

    const docs = await db.knowledgeDocument.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
          { category: { contains: q } },
        ],
      },
    })

    return NextResponse.json({ query: q, documents: docs })
  } catch (error) {
    console.error('[API/admin/rag/search GET]', error)
    return NextResponse.json({ error: 'Failed to search knowledge base' }, { status: 500 })
  }
}

