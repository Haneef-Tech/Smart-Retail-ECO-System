import Link from 'next/link'
import { Phone, Mail, MapPin, Globe, Share2, MessageCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SR</span>
              </div>
              <span className="text-white font-bold text-xl">SmartRetail</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your one-stop supermarket for groceries, daily essentials, and more — delivered to your door in Mydukur & Kadapa.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" aria-label="Website" className="p-2 rounded-lg bg-gray-800 hover:bg-green-600 transition-colors text-white"><Globe size={16} /></a>
              <a href="#" aria-label="Share" className="p-2 rounded-lg bg-gray-800 hover:bg-green-600 transition-colors text-white"><Share2 size={16} /></a>
              <a href="#" aria-label="Contact" className="p-2 rounded-lg bg-gray-800 hover:bg-green-600 transition-colors text-white"><MessageCircle size={16} /></a>
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
                  <Link href={href} className="hover:text-green-400 transition-colors">{label}</Link>
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
                  <Link href={`/categories/${encodeURIComponent(cat)}`} className="hover:text-green-400 transition-colors">{cat}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={15} className="text-green-400 mt-0.5 shrink-0" />
                <span>Main Road, Mydukur, Kadapa, Andhra Pradesh — 516172</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={15} className="text-green-400 shrink-0" />
                <a href="tel:9392951463" className="hover:text-green-400 transition-colors">+91 9392951463</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} className="text-green-400 shrink-0" />
                <a href="mailto:aluruhaneef1@gmail.com" className="hover:text-green-400 transition-colors">aluruhaneef1@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} SmartRetail. All rights reserved.</p>
          <p>Serving Mydukur, Kadapa, Andhra Pradesh - 516172</p>
        </div>
      </div>
    </footer>
  )
}
