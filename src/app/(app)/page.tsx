import Image from 'next/image'
import HeroSection from '@/sections/HeroSection'
import StatsSection from '@/sections/StatsSection'
import QuiSomSection from '@/sections/QuiSomSection'
import ColoniesSection from '@/sections/ColoniesSection'
import AdoptaSection from '@/sections/AdoptaSection'
import ColaboraSection from '@/sections/ColaboraSection'
import ContactSection from '@/sections/ContactSection'
import NewsletterSection from '@/sections/NewsletterSection'

export default function AnimalsVidaDignaLanding() {
  return (
    <main className="flex-1">
      <HeroSection />
      <StatsSection />
      <QuiSomSection />
      <ColoniesSection />
      <AdoptaSection />
      <ColaboraSection />
      <ContactSection />
      <NewsletterSection />

      <Image
        src="/images/logo.webp"
        alt="Logo de la protectora"
        width={150}
        height={150}
        className="mx-auto my-4"
      />
    </main>
  )
}
