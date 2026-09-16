import { db } from '@/lib/db'
import { formatPrice, formatDateTime } from '@/lib/utils'

export default async function AdminBillsPage() {
  const bills = await db.bill.findMany({
    orderBy: { generatedAt: 'desc' },
    include: { order: { include: { customer: { select: { name: true } } } } },
  })

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Bills</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Bill Number', 'Customer', 'Order Total', 'Payment', 'Generated'].map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bills.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-green-700 text-xs">{b.billNumber}</td>
                <td className="px-4 py-3">{(b as { order?: { customer?: { name: string }; total: number } }).order?.customer?.name || '—'}</td>
                <td className="px-4 py-3 font-semibold">{formatPrice((b as { order?: { total: number } }).order?.total || 0)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    b.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' :
                    b.paymentStatus === 'PENDING' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                  }`}>{b.paymentStatus}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{formatDateTime(b.generatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bills.length === 0 && <p className="text-center py-8 text-gray-400">No bills yet.</p>}
      </div>
    </div>
  )
}

