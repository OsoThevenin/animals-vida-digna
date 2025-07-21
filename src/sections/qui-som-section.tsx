import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function QuiSomSection() {
  return (
    <section id="qui-som" className="py-16 md:py-24">
      <div className="container">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-6 font-bold text-3xl md:text-4xl">Qui Som?</h2>
            <p className="mb-4 text-muted-foreground">
              Som una associació sense ànim de lucre dedicada al rescat,
              rehabilitació i adopció de gats abandonats a la zona de Ripoll i
              voltants.
            </p>
            <p className="mb-6 text-muted-foreground">
              La nostra missió és proporcionar una vida digna als animals,
              especialment als gats abandonats i ferals, mitjançant programes
              d&apos;esterilització, alimentació i adopció.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
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
            <div className="-bottom-6 -left-6 absolute rounded-lg bg-white p-4 shadow-lg">
              <p className="font-medium text-lg">
                &quot;Tots els animals mereixen una vida digna&quot;
              </p>
              <p className="text-muted-foreground text-sm">
                - Fundadors de l&apos;associació
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
