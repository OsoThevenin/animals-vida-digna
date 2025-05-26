import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  PawPrintIcon as Paw,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Users,
  DollarSign,
  Instagram,
  Facebook,
  Twitter,
} from 'lucide-react'

export default function AnimalsVidaDignaLanding() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/70 to-secondary/50 z-10" />
        <Image
          src="/images/hero_image.webp"
          alt="Gats a la protectora"
          width={1200}
          height={600}
          className="w-full h-[600px] object-cover"
          priority
        />
        <div className="container relative z-20 flex flex-col items-center justify-center h-[600px] text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Animals Vida Digna</h1>
          <p className="text-lg md:text-xl max-w-2xl mb-8">
            Associació dedicada al rescat, rehabilitació i adopció de gats abandonats.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/80">
              Adopta un gat
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-white border-white hover:bg-white/20"
            >
              Col·labora amb nosaltres
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-orange-50 py-12">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-orange-500">250+</span>
              <span className="text-sm text-muted-foreground">Gats rescatats</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-orange-500">180+</span>
              <span className="text-sm text-muted-foreground">Adopcions</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-orange-500">50+</span>
              <span className="text-sm text-muted-foreground">Voluntaris</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-orange-500">10+</span>
              <span className="text-sm text-muted-foreground">Colònies felines</span>
            </div>
          </div>
        </div>
      </section>

      {/* Qui Som Section */}
      <section id="qui-som" className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Qui Som?</h2>
              <p className="text-muted-foreground mb-4">
                Som una associació sense ànim de lucre dedicada al rescat, rehabilitació i adopció
                de gats abandonats a la zona de Ripoll i voltants.
              </p>
              <p className="text-muted-foreground mb-6">
                La nostra missió és proporcionar una vida digna als animals, especialment als gats
                abandonats i ferals, mitjançant programes d&apos;esterilització, alimentació i
                adopció.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="bg-primary hover:bg-primary/80" asChild>
                  <Link href="/la-nostra-historia">La nostra història</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/coneix-equip">Coneix l&apos;equip</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <Image
                src="/placeholder.svg?height=400&width=600"
                alt="Animals Vida Digna protectora"
                width={600}
                height={400}
                className="rounded-lg shadow-lg"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-lg shadow-lg">
                <p className="text-lg font-medium">
                  &quot;Tots els animals mereixen una vida digna&quot;
                </p>
                <p className="text-sm text-muted-foreground">- Fundadors de l&apos;associació</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Colònies Felines Section */}
      <section id="colonies" className="bg-orange-50 py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Colònies de Gats Ferals</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Treballem pel control ètic de les colònies felines urbanes mitjançant el mètode CER
              (Captura, Esterilització i Retorn).
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
            <h3 className="text-xl font-bold mb-4">La nostra tasca amb les colònies felines</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                  <Paw className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-muted-foreground">
                    Reivindiquem davant els Ajuntaments la obligatorietat que tenen de controlar les
                    colònies de gats ferals del seu municipi, segons el DECRET LEGISLATIU 2/2008.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                  <Paw className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-muted-foreground">
                    Col·laborem amb els Ajuntaments que subvencionen l&apos;aplicació del mètode CER
                    (captura, esterilització i retorn) per al control de les colònies urbanes.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                  <Paw className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-muted-foreground">
                    Vetllem per que els gats ferals disposin d&apos;aigua i menjar d&apos;acord a
                    les seves necessitats i al mateix temps evitar comportaments incívics.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                  <Paw className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-muted-foreground">
                    Fomentem la conciliació entre gats ferals i veïnatge en punts on poden sorgir
                    conflictes.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                  <Paw className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-muted-foreground">
                    Fomentem entre els veïns i en especial entre les noves generacions el respecte i
                    l&apos;empatia envers els gats que malviuen i moren al carrer.
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <div className="text-center">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600">
              Saber-ne més sobre les colònies
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Cats Section */}
      <section id="adopta" className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Gats en Adopció</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Aquests gatets adorables estan buscant una llar per sempre. Podries ser tu la seva
              família perfecta?
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Gat 1 */}
            <Card className="overflow-hidden transition-all hover:shadow-lg">
              <div className="relative">
                <Image
                  src="/placeholder.svg?height=300&width=400"
                  alt="Whiskers"
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover"
                />
                <Badge className="absolute top-4 right-4 bg-orange-500">Adult</Badge>
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold">Missi</h3>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="h-4 w-4 mr-1" /> 3 anys
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">
                  En Missi és un gat tabby dolç i afectuós que li encanta jugar i fer moxaines.
                </p>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  Coneix en Missi
                </Button>
              </CardContent>
            </Card>

            {/* Gat 2 */}
            <Card className="overflow-hidden transition-all hover:shadow-lg">
              <div className="relative">
                <Image
                  src="/placeholder.svg?height=300&width=400"
                  alt="Luna"
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover"
                />
                <Badge className="absolute top-4 right-4 bg-orange-500">Cadell</Badge>
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold">Lluna</h3>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="h-4 w-4 mr-1" /> 6 mesos
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">
                  La Lluna és una gateta negra juganera amb una personalitat curiosa i li encanta
                  explorar.
                </p>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  Coneix la Lluna
                </Button>
              </CardContent>
            </Card>

            {/* Gat 3 */}
            <Card className="overflow-hidden transition-all hover:shadow-lg">
              <div className="relative">
                <Image
                  src="/placeholder.svg?height=300&width=400"
                  alt="Oliver"
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover"
                />
                <Badge className="absolute top-4 right-4 bg-orange-500">Sènior</Badge>
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold">Oriol</h3>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="h-4 w-4 mr-1" /> 8 anys
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">
                  L&apos;Oriol és un gat taronja distingit a qui li agrada prendre el sol i les
                  carícies suaus.
                </p>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  Coneix l&apos;Oriol
                </Button>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-12">
            <Button
              size="lg"
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-50"
            >
              Veure tots els gats
            </Button>
          </div>
        </div>
      </section>

      {/* Colabora Section */}
      <section id="colabora" className="bg-orange-50 py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h2 className="text-3xl font-bold mb-6">Fes-te Voluntari</h2>
              <p className="text-muted-foreground mb-6">
                Els nostres voluntaris són el cor d&apos;Animals Vida Digna. Uneix-te al nostre
                equip i ajuda a fer una diferència en la vida dels gats necessitats.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start">
                  <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                    <Paw className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">Cura i Socialització</h3>
                    <p className="text-sm text-muted-foreground">
                      Ajuda a alimentar, cuidar i socialitzar els nostres gats
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                    <Users className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">Esdeveniments d&apos;Adopció</h3>
                    <p className="text-sm text-muted-foreground">
                      Ajuda a organitzar i gestionar esdeveniments d&apos;adopció
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                    <MapPin className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">Transport</h3>
                    <p className="text-sm text-muted-foreground">
                      Ajuda a transportar gats a les visites veterinàries
                    </p>
                  </div>
                </div>
              </div>
              <Button className="bg-orange-500 hover:bg-orange-600">Fes-te voluntari</Button>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h2 className="text-3xl font-bold mb-6">Col·labora amb la Nostra Missió</h2>
              <p className="text-muted-foreground mb-6">
                Les teves donacions ens ajuden a proporcionar menjar, refugi, atenció mèdica i amor
                als gats necessitats.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start">
                  <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                    <DollarSign className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">Donació Puntual</h3>
                    <p className="text-sm text-muted-foreground">
                      Fes una contribució puntual de qualsevol quantitat
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                    <Heart className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">Donació Mensual</h3>
                    <p className="text-sm text-muted-foreground">
                      Fes-te soci i col·labora amb aportacions mensuals
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mt-1 bg-orange-100 p-2 rounded-full mr-4">
                    <Paw className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold">Apadrina un Gat</h3>
                    <p className="text-sm text-muted-foreground">
                      Cobreix les despeses d&apos;un gat específic
                    </p>
                  </div>
                </div>
              </div>
              <Button className="bg-orange-500 hover:bg-orange-600">Fes un donatiu</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacte" className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Contacta&apos;ns</h2>
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-orange-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-bold">Adreça</h3>
                    <p className="text-muted-foreground">
                      C/ Pablo Picasso nº 30, 17500 Ripoll, Girona
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-orange-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-bold">Email</h3>
                    <p className="text-muted-foreground">animals.vidadigna@gmail.com</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <Link
                  href="#"
                  className="bg-orange-100 p-2 rounded-full text-orange-500 hover:bg-orange-200 transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </Link>
                <Link
                  href="#"
                  className="bg-orange-100 p-2 rounded-full text-orange-500 hover:bg-orange-200 transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </Link>
                <Link
                  href="#"
                  className="bg-orange-100 p-2 rounded-full text-orange-500 hover:bg-orange-200 transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Envia&apos;ns un Missatge</h2>
              <form className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Nom
                    </label>
                    <input
                      id="name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="El teu nom"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="El teu email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium">
                    Assumpte
                  </label>
                  <input
                    id="subject"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Assumpte del missatge"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Missatge
                  </label>
                  <textarea
                    id="message"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="El teu missatge"
                  />
                </div>
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  Enviar Missatge
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="bg-orange-500 rounded-lg p-8 md:p-12 text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Mantén-te Informat</h2>
                <p className="mb-0">
                  Subscriu-te al nostre butlletí per rebre actualitzacions sobre gats en adopció,
                  esdeveniments i notícies de la protectora.
                </p>
              </div>
              <div>
                <form className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="La teva adreça de correu"
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button className="bg-white text-orange-500 hover:bg-orange-100">
                    Subscriu-te
                  </Button>
                </form>
                <p className="text-sm mt-2">
                  Respectem la teva privacitat. Cancel·la la subscripció en qualsevol moment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
