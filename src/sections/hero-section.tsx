import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background Image - Full width */}
      <div className="absolute inset-0 h-full w-full">
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
      <div className="relative z-20 mx-auto max-w-4xl px-4 text-center text-white sm:px-6 lg:px-8">
        <h1 className="mb-6 font-bold text-5xl leading-tight md:text-7xl">
          Animals Vida Digna
        </h1>
        <p className="mx-auto mb-10 max-w-3xl text-white/90 text-xl leading-relaxed md:text-2xl">
          Associació dedicada al rescat, rehabilitació i adopció de gats
          abandonats.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-primary px-8 py-3 font-semibold text-lg text-white shadow-lg transition-all duration-300 hover:bg-primary/90 hover:shadow-xl"
          >
            Adopta un gat
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/30 px-8 py-3 font-semibold text-lg text-white backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white/10"
          >
            Col·labora amb nosaltres
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="-translate-x-1/2 absolute bottom-8 left-1/2 transform animate-bounce">
        <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white/30">
          <div className="mt-2 h-3 w-1 animate-pulse rounded-full bg-white/60" />
        </div>
      </div>
    </section>
  );
}
