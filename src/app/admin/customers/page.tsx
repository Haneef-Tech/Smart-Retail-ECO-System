import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils'

export default async function AdminCustomersPage() {
  const customers = await db.customer.findMany({ orderBy: { createdAt: 'desc' } })
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Customers ({customers.length})</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Name', 'Email', 'Phone', 'City', 'Pincode', 'Joined'].map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                <td className="px-4 py-3">{c.city}</td>
                <td className="px-4 py-3 font-mono text-xs">{c.pincode}</td>
                <td className="px-4 py-3 text-gray-400">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p className="text-center py-8 text-gray-400">No customers yet.</p>}
      </div>
    </div>
  )
}

