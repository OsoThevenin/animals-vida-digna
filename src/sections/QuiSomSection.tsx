import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default function QuiSomSection() {
  return (
    <section id="qui-som" className="py-16 md:py-24">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Qui Som?</h2>
            <p className="text-muted-foreground mb-4">
              Som una associació sense ànim de lucre dedicada al rescat, rehabilitació i adopció de
              gats abandonats a la zona de Ripoll i voltants.
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
  )
}
