import Link from 'next/link'
import Image from 'next/image'

export default function HeroBanner() {
  return (
    <section className="sr-hero-gradient rounded-2xl border border-green-100 shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden sr-page-enter">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-6 sm:p-10">
        {/* Left copy */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight text-[#0F5132] tracking-tight">
            Fresh Products,
            <br />
            Smart Choices
          </h1>
          <p className="text-[#6B7280] text-sm sm:text-base max-w-md leading-relaxed">
            Quality Essentials for a Better Tomorrow at Your Fingertips
          </p>
          <div className="pt-1">
            <Link
              href="/products"
              className="sr-btn-primary inline-flex items-center gap-2 font-semibold px-7 py-3 text-sm sm:text-base"
            >
              Shop Now
            </Link>
          </div>
        </div>

        {/* Right visual — fresh groceries collage built from real product photos.
            To use a single banner photo instead, replace the block below with:
            <Image src="/hero-groceries.png" alt="Fresh groceries" width={560} height={380} className="rounded-2xl object-cover w-full h-auto" priority /> */}
        <div className="relative hidden md:block">
          <div className="grid grid-cols-3 gap-3 max-w-md ml-auto">
            <div className="bg-white/80 backdrop-blur rounded-2xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white rotate-[-3deg] transition-transform duration-300 hover:rotate-0">
              <Image src="/products/P001.webp" alt="Fresh product" width={160} height={160} className="rounded-xl object-contain w-full h-28 bg-[#F4FAF6]" unoptimized />
              <p className="text-[11px] font-semibold text-[#0F5132] mt-2 text-center">Farm Fresh</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-2xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white mt-6 transition-transform duration-300 hover:-translate-y-1">
              <Image src="/products/P005.webp" alt="Fresh product" width={160} height={160} className="rounded-xl object-contain w-full h-28 bg-[#F4FAF6]" unoptimized />
              <p className="text-[11px] font-semibold text-[#0F5132] mt-2 text-center">Daily Dairy</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-2xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white rotate-[3deg] transition-transform duration-300 hover:rotate-0">
              <Image src="/products/P010.webp" alt="Fresh product" width={160} height={160} className="rounded-xl object-contain w-full h-28 bg-[#F4FAF6]" unoptimized />
              <p className="text-[11px] font-semibold text-[#0F5132] mt-2 text-center">Smart Snacks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Carousel dots */}
      <div className="flex items-center justify-center gap-1.5 pb-4" aria-hidden="true">
        <span className="w-6 h-1.5 rounded-full bg-[#16A34A]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]/30" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]/30" />
      </div>
    </section>
  )
}
