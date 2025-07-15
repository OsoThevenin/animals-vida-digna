import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'

export default function AdoptaSection() {
  return (
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
              <Badge className="absolute top-4 right-4 bg-primary">Adult</Badge>
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
              <Button className="w-full bg-primary hover:bg-primary/80">Coneix en Missi</Button>
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
              <Badge className="absolute top-4 right-4 bg-primary">Cadell</Badge>
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
              <Button className="w-full bg-primary hover:bg-primary/80">Coneix la Lluna</Button>
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
              <Badge className="absolute top-4 right-4 bg-primary">Sènior</Badge>
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
              <Button className="w-full bg-primary hover:bg-primary/80">Coneix l&apos;Oriol</Button>
            </CardContent>
          </Card>
        </div>
        <div className="text-center mt-12">
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
  )
}
