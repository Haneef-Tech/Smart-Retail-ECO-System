import Link from 'next/link'

const CATEGORIES = [
  { name: 'Grocery', emoji: '🌾', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { name: 'Dairy', emoji: '🥛', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { name: 'Bakery', emoji: '🍞', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { name: 'Beverages', emoji: '🧃', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { name: 'Snacks', emoji: '🍿', color: 'bg-red-50 text-red-700 border-red-200' },
  { name: 'Personal Care', emoji: '🧴', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { name: 'Home', emoji: '🏠', color: 'bg-green-50 text-green-700 border-green-200' },
  { name: 'Stationery', emoji: '✏️', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { name: 'Accessories', emoji: '🎒', color: 'bg-teal-50 text-teal-700 border-teal-200' },
]

export default function CategoryGrid() {
  return (
    <section>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Shop by Category</h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
        {CATEGORIES.map(({ name, emoji, color }) => (
          <Link
            key={name}
            href={`/categories/${encodeURIComponent(name)}`}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${color} hover:shadow-md hover:-translate-y-0.5 transition-all`}
          >
            <span className="text-2xl sm:text-3xl">{emoji}</span>
            <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">{name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
