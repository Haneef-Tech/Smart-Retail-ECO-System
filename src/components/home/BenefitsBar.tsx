const BENEFITS = [
  { emoji: '🚀', title: 'Fast Delivery', desc: 'Same-day delivery available' },
  { emoji: '🌿', title: 'Fresh Products', desc: '100% quality guaranteed' },
  { emoji: '🔒', title: 'Secure Payment', desc: 'Safe & encrypted checkout' },
  { emoji: '↩️', title: 'Easy Returns', desc: '7-day hassle-free returns' },
]

export default function BenefitsBar() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {BENEFITS.map(({ emoji, title, desc }) => (
        <div key={title} className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">{emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
