import Link from 'next/link'

export default function HeroBanner() {
  return (
    <div className="bg-gradient-to-br from-green-700 to-green-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium">
              🚀 Fast Delivery Available
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Fresh Groceries &<br />
              <span className="text-green-200">Daily Essentials</span>
            </h1>
            <p className="text-green-100 text-base sm:text-lg max-w-md">
              Shop from 1000+ products. Fresh dairy, crispy snacks, personal care, and more — all at your doorstep.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors shadow-sm"
              >
                Shop Now
              </Link>
              <Link
                href="/categories/Grocery"
                className="border border-white/50 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Browse Categories
              </Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              {[
                { emoji: '🥛', label: 'Dairy', bg: 'bg-white/10' },
                { emoji: '🛒', label: 'Grocery', bg: 'bg-white/10' },
                { emoji: '🧴', label: 'Personal Care', bg: 'bg-white/10' },
                { emoji: '🍪', label: 'Snacks', bg: 'bg-white/10' },
              ].map(({ emoji, label, bg }) => (
                <Link
                  key={label}
                  href={`/categories/${label}`}
                  className={`${bg} backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center gap-2 hover:bg-white/20 transition-colors`}
                >
                  <span className="text-4xl">{emoji}</span>
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
