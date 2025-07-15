import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image - Full width */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/images/hero_image.webp"
          alt="Gats a la protectora"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-20 text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">Animals Vida Digna</h1>
        <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto leading-relaxed text-white/90">
          Associació dedicada al rescat, rehabilitació i adopció de gats abandonats.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Adopta un gat
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-white border-white/30 hover:bg-white/10 hover:border-white/50 px-8 py-3 text-lg font-semibold backdrop-blur-sm transition-all duration-300"
          >
            Col·labora amb nosaltres
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}
