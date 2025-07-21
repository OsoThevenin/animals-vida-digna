import { Facebook, Instagram, Mail, MapPin, Twitter } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ContactSection() {
  return (
    <section id="contacte" className="py-16 md:py-24">
      <div className="container">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-6 font-bold text-3xl md:text-4xl">
              Contacta&apos;ns
            </h2>
            <div className="mb-8 space-y-4">
              <div className="flex items-start">
                <MapPin className="mt-1 mr-3 h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-bold">Adreça</h3>
                  <p className="text-muted-foreground">
                    C/ Pablo Picasso nº 30, 17500 Ripoll, Girona
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="mt-1 mr-3 h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-bold">Email</h3>
                  <p className="text-muted-foreground">
                    animals.vidadigna@gmail.com
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Link
                href="#"
                className="rounded-full bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="rounded-full bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="rounded-full bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
              >
                <Twitter className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div>
            <h2 className="mb-6 font-bold text-3xl md:text-4xl">
              Envia&apos;ns un Missatge
            </h2>
            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="font-medium text-sm">
                    Nom
                  </label>
                  <input
                    id="name"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="El teu nom"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="font-medium text-sm">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="El teu email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="font-medium text-sm">
                  Assumpte
                </label>
                <input
                  id="subject"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Assumpte del missatge"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="font-medium text-sm">
                  Missatge
                </label>
                <textarea
                  id="message"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="El teu missatge"
                />
              </div>
              <Button className="w-full bg-primary hover:bg-primary/80">
                Enviar Missatge
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
