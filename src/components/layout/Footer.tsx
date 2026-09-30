import Link from 'next/link'
import { Phone, Mail, MapPin, Globe, Share2, MessageCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#0F5132] text-green-50/90 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow [background:linear-gradient(135deg,#16A34A,#22C55E)]">
                <span className="text-white font-bold text-sm">SR</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">SmartRetail</span>
            </div>
            <p className="text-sm text-green-100/70 leading-relaxed">
              Your one-stop supermarket for groceries, daily essentials, and more — delivered to your door in Mydukur & Kadapa.
            </p>
            <div className="flex gap-2.5 mt-4">
              <a href="#" aria-label="Website" className="p-2 rounded-xl bg-white/10 hover:bg-[#16A34A] transition-all duration-200 text-white"><Globe size={16} /></a>
              <a href="#" aria-label="Share" className="p-2 rounded-xl bg-white/10 hover:bg-[#16A34A] transition-all duration-200 text-white"><Share2 size={16} /></a>
              <a href="#" aria-label="Contact" className="p-2 rounded-xl bg-white/10 hover:bg-[#16A34A] transition-all duration-200 text-white"><MessageCircle size={16} /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[
                ['Home', '/'],
                ['Products', '/products'],
                ['Cart', '/cart'],
                ['My Orders', '/orders'],
                ['Profile', '/profile'],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-green-100/70 hover:text-white transition-colors duration-200">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-4">Categories</h3>
            <ul className="space-y-2 text-sm">
              {['Grocery', 'Dairy', 'Snacks', 'Beverages', 'Personal Care', 'Home', 'Stationery'].map((cat) => (
                <li key={cat}>
                  <Link href={`/categories/${encodeURIComponent(cat)}`} className="text-green-100/70 hover:text-white transition-colors duration-200">{cat}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm text-green-100/70">
              <li className="flex items-start gap-2">
                <MapPin size={15} className="text-green-300 mt-0.5 shrink-0" />
                <span>Main Road, Mydukur, Kadapa, Andhra Pradesh — 516172</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={15} className="text-green-300 shrink-0" />
                <a href="tel:9392951463" className="hover:text-white transition-colors duration-200">+91 9392951463</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} className="text-green-300 shrink-0" />
                <a href="mailto:aluruhaneef1@gmail.com" className="hover:text-white transition-colors duration-200">aluruhaneef1@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-green-100/60">
          <p>© {new Date().getFullYear()} SmartRetail. All rights reserved.</p>
          <p>Serving Mydukur, Kadapa, Andhra Pradesh - 516172</p>
        </div>
      </div>
    </footer>
  )
}
