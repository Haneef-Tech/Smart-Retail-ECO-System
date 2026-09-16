interface Props {
  status: 'healthy' | 'low' | 'out'
}

const CONFIG = {
  healthy: { label: '● In Stock', className: 'text-green-600 bg-green-50' },
  low: { label: '● Low Stock', className: 'text-amber-600 bg-amber-50' },
  out: { label: '● Out of Stock', className: 'text-red-500 bg-red-50' },
}

export default function StockBadge({ status }: Props) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}

