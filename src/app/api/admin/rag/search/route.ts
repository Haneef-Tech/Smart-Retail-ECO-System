import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get('q') || ''
    if (!q.trim()) {
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

