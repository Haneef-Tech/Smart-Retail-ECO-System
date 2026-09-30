import { Truck, Leaf, ShieldCheck, RotateCcw } from 'lucide-react'

const BENEFITS = [
  { icon: Truck, title: 'Fast Delivery', desc: 'Same-day delivery available', color: 'green' as const },
  { icon: Leaf, title: 'Fresh Products', desc: '100% quality guaranteed', color: 'emerald' as const },
  { icon: ShieldCheck, title: 'Secure Payment', desc: 'Safe & encrypted checkout', color: 'blue' as const },
  { icon: RotateCcw, title: 'Easy Returns', desc: '7-day hassle-free returns', color: 'orange' as const },
]

const TILE: Record<string, string> = {
  green: 'bg-green-100 text-[#16A34A]',
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-[#3B82F6]',
  orange: 'bg-orange-100 text-[#F59E0B]',
}

export default function BenefitsBar() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {BENEFITS.map(({ icon: Icon, title, desc, color }, i) => (
        <div
          key={title}
          className="sr-card sr-card-hover p-4 flex items-start gap-3 sr-stagger"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className={`sr-icon-tile ${TILE[color]}`}>
            <Icon size={19} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[#111827] text-sm">{title}</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
