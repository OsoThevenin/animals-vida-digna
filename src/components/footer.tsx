import Link from 'next/link'
import {
  PawPrintIcon as Paw,
  MapPin,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Twitter,
  Clock,
} from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-muted py-12">
      <div className="container">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Paw className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Animals Vida Digna</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Associació dedicada al rescat, rehabilitació i adopció de gats abandonats.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-4">Navegació</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#qui-som" className="text-muted-foreground hover:text-primary">
                  Qui som?
                </Link>
              </li>
              <li>
                <Link href="#adopta" className="text-muted-foreground hover:text-primary">
                  Adopta&apos;m
                </Link>
              </li>
              <li>
                <Link href="#colabora" className="text-muted-foreground hover:text-primary">
                  Col·labora
                </Link>
              </li>
              <li>
                <Link href="#apadrina" className="text-muted-foreground hover:text-primary">
                  Apadrina&apos;m
                </Link>
              </li>
              <li>
                <Link href="#colonies" className="text-muted-foreground hover:text-primary">
                  Colònies felines
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Col·labora</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#fes-te-soci" className="text-muted-foreground hover:text-primary">
                  Fes-te soci
                </Link>
              </li>
              <li>
                <Link href="#teaming" className="text-muted-foreground hover:text-primary">
                  Teaming
                </Link>
              </li>
              <li>
                <Link href="#fes-te-voluntari" className="text-muted-foreground hover:text-primary">
                  Fes-te voluntari
                </Link>
              </li>
              <li>
                <Link href="#donacions" className="text-muted-foreground hover:text-primary">
                  Donacions
                </Link>
              </li>
              <li>
                <Link href="#adopta" className="text-muted-foreground hover:text-primary">
                  Gats en adopció
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Contacte</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-primary mr-2 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">
                  C/ Pablo Picasso nº 30, 17500 Ripoll, Girona
                </span>
              </li>
              <li className="flex items-start">
                <Phone className="h-5 w-5 text-primary mr-2 mt-0.5 shrink-0" />
                <span className="text-muted-foreground" />
              </li>
              <li className="flex items-start">
                <Mail className="h-5 w-5 text-primary mr-2 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">animals.vidadigna@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Associació Animals Vida Digna. Tots els drets
            reservats.
          </p>
          <div className="flex justify-center gap-4 mt-2">
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
  )
}
