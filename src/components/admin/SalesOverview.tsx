'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { formatPrice } from '@/lib/utils'

export interface MonthlyPoint {
  month: string
  revenue: number
  orders: number
}

export default function SalesOverview({ data }: { data: MonthlyPoint[] }) {
  const [range] = useState('This Year')

  return (
    <div className="sr-card p-5 sm:p-6 h-full">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-bold text-[#0F5132] text-base tracking-tight">Sales Overview</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">Revenue trend from live orders</p>
        </div>
        <label className="relative inline-flex items-center">
          <select
            value={range}
            onChange={() => {}}
            aria-label="Select year range"
            className="appearance-none text-xs font-semibold text-[#111827] bg-[#F4FAF6] border border-[#E5E7EB] rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer transition-all duration-200 hover:border-green-200 focus:border-[#16A34A]"
          >
            <option>This Year</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 text-[#6B7280] pointer-events-none" />
        </label>
      </div>

      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="srSalesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={(v: number) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
              width={52}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                boxShadow: '0 12px 32px rgba(0,0,0,0.10)',
                fontSize: 12,
              }}
              formatter={(value, name) => {
                if (name === 'revenue') return [formatPrice(Number(value || 0)), 'Revenue']
                return [Number(value || 0), 'Orders']
              }}
              labelStyle={{ fontWeight: 700, color: '#0F5132' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#16A34A"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#srSalesFill)"
              dot={false}
              activeDot={{ r: 4, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
