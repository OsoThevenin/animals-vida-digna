import { Button } from '@/components/ui/button'
import { Heart, PawPrintIcon as Paw, Users, DollarSign } from 'lucide-react'

export default function ColaboraSection() {
  return (
    <section id="colabora" className="bg-muted/30 py-16 md:py-24">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-3xl font-bold mb-6">Fes-te Voluntari</h2>
            <p className="text-muted-foreground mb-6">
              Els nostres voluntaris són el cor d&apos;Animals Vida Digna. Uneix-te al nostre equip
              i ajuda a fer una diferència en la vida dels gats necessitats.
            </p>
            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                  <Paw className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Cura i Socialització</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajuda a alimentar, cuidar i socialitzar els nostres gats
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Esdeveniments d&apos;Adopció</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajuda a organitzar i gestionar esdeveniments d&apos;adopció
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                  <Paw className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Transport</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajuda a transportar gats a les visites veterinàries
                  </p>
                </div>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/80">Fes-te voluntari</Button>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-3xl font-bold mb-6">Col·labora amb la Nostra Missió</h2>
            <p className="text-muted-foreground mb-6">
              Les teves donacions ens ajuden a proporcionar menjar, refugi, atenció mèdica i amor
              als gats necessitats.
            </p>
            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Donació Puntual</h3>
                  <p className="text-sm text-muted-foreground">
                    Fes una contribució puntual de qualsevol quantitat
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Donació Mensual</h3>
                  <p className="text-sm text-muted-foreground">
                    Fes-te soci i col·labora amb aportacions mensuals
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                  <Paw className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Apadrina un Gat</h3>
                  <p className="text-sm text-muted-foreground">
                    Cobreix les despeses d&apos;un gat específic
                  </p>
                </div>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/80">Fes un donatiu</Button>
          </div>
        </div>
      </div>
    </section>
  )
}
