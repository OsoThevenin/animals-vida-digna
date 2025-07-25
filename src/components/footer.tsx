import {
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  PawPrintIcon as Paw,
  Phone,
  Twitter,
} from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-muted py-12">
      <div className="container">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Paw className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Animals Vida Digna</span>
            </div>
            <p className="mb-4 text-muted-foreground text-sm">
              Associació dedicada al rescat, rehabilitació i adopció de gats
              abandonats.
            </p>
            <div className="flex gap-4">
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary"
              >
                <Twitter className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div>
            <h3 className="mb-4 font-bold">Navegació</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="#qui-som"
                  className="text-muted-foreground hover:text-primary"
                >
                  Qui som?
                </Link>
              </li>
              <li>
                <Link
                  href="#adopta"
                  className="text-muted-foreground hover:text-primary"
                >
                  Adopta&apos;m
                </Link>
              </li>
              <li>
                <Link
                  href="#colabora"
                  className="text-muted-foreground hover:text-primary"
                >
                  Col·labora
                </Link>
              </li>
              <li>
                <Link
                  href="#apadrina"
                  className="text-muted-foreground hover:text-primary"
                >
                  Apadrina&apos;m
                </Link>
              </li>
              <li>
                <Link
                  href="#colonies"
                  className="text-muted-foreground hover:text-primary"
                >
                  Colònies felines
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 font-bold">Col·labora</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="#fes-te-soci"
                  className="text-muted-foreground hover:text-primary"
                >
                  Fes-te soci
                </Link>
              </li>
              <li>
                <Link
                  href="#teaming"
                  className="text-muted-foreground hover:text-primary"
                >
                  Teaming
                </Link>
              </li>
              <li>
                <Link
                  href="#fes-te-voluntari"
                  className="text-muted-foreground hover:text-primary"
                >
                  Fes-te voluntari
                </Link>
              </li>
              <li>
                <Link
                  href="#donacions"
                  className="text-muted-foreground hover:text-primary"
                >
                  Donacions
                </Link>
              </li>
              <li>
                <Link
                  href="#adopta"
                  className="text-muted-foreground hover:text-primary"
                >
                  Gats en adopció
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 font-bold">Contacte</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <MapPin className="mt-0.5 mr-2 h-5 w-5 shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  C/ Pablo Picasso nº 30, 17500 Ripoll, Girona
                </span>
              </li>
              <li className="flex items-start">
                <Phone className="mt-0.5 mr-2 h-5 w-5 shrink-0 text-primary" />
                <span className="text-muted-foreground" />
              </li>
              <li className="flex items-start">
                <Mail className="mt-0.5 mr-2 h-5 w-5 shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  animals.vidadigna@gmail.com
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-border border-t pt-8 text-center text-muted-foreground text-sm">
          <p>
            &copy; {new Date().getFullYear()} Associació Animals Vida Digna.
            Tots els drets reservats.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="#" className="hover:underline">
              Política de privacitat
            </Link>
            <Link href="#" className="hover:underline">
              Avís legal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
