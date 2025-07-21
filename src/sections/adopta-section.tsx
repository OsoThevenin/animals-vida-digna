import { Calendar } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AdoptaSection() {
  return (
    <section id="adopta" className="py-16 md:py-24">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-bold text-3xl md:text-4xl">
            Gats en Adopció
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Aquests gatets adorables estan buscant una llar per sempre. Podries
            ser tu la seva família perfecta?
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Gat 1 */}
          <Card className="overflow-hidden transition-all hover:shadow-lg">
            <div className="relative">
              <Image
                src="/placeholder.svg?height=300&width=400"
                alt="Whiskers"
                width={400}
                height={300}
                className="h-64 w-full object-cover"
              />
              <Badge className="absolute top-4 right-4 bg-primary">Adult</Badge>
            </div>
            <CardContent className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-xl">Missi</h3>
                <span className="flex items-center text-muted-foreground text-sm">
                  <Calendar className="mr-1 h-4 w-4" /> 3 anys
                </span>
              </div>
              <p className="mb-4 text-muted-foreground">
                En Missi és un gat tabby dolç i afectuós que li encanta jugar i
                fer moxaines.
              </p>
              <Button className="w-full bg-primary hover:bg-primary/80">
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
                className="h-64 w-full object-cover"
              />
              <Badge className="absolute top-4 right-4 bg-primary">
                Cadell
              </Badge>
            </div>
            <CardContent className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-xl">Lluna</h3>
                <span className="flex items-center text-muted-foreground text-sm">
                  <Calendar className="mr-1 h-4 w-4" /> 6 mesos
                </span>
              </div>
              <p className="mb-4 text-muted-foreground">
                La Lluna és una gateta negra juganera amb una personalitat
                curiosa i li encanta explorar.
              </p>
              <Button className="w-full bg-primary hover:bg-primary/80">
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
                className="h-64 w-full object-cover"
              />
              <Badge className="absolute top-4 right-4 bg-primary">
                Sènior
              </Badge>
            </div>
            <CardContent className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-xl">Oriol</h3>
                <span className="flex items-center text-muted-foreground text-sm">
                  <Calendar className="mr-1 h-4 w-4" /> 8 anys
                </span>
              </div>
              <p className="mb-4 text-muted-foreground">
                L&apos;Oriol és un gat taronja distingit a qui li agrada prendre
                el sol i les carícies suaus.
              </p>
              <Button className="w-full bg-primary hover:bg-primary/80">
                Coneix l&apos;Oriol
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="mt-12 text-center">
          <Button
            size="lg"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            Veure tots els gats
          </Button>
        </div>
      </div>
    </section>
  );
}
