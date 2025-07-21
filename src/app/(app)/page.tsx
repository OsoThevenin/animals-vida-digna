import Image from 'next/image';
import AdoptaSection from '@/sections/adopta-section';
import ColaboraSection from '@/sections/colabora-section';
import ColoniesSection from '@/sections/colonies-section';
import ContactSection from '@/sections/contact-section';
import HeroSection from '@/sections/hero-section';
import NewsletterSection from '@/sections/newsletter-section';
import QuiSomSection from '@/sections/qui-som-section';
import StatsSection from '@/sections/stats-section';

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
  );
}
