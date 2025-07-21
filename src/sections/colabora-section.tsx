import { DollarSign, Heart, PawPrintIcon as Paw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ColaboraSection() {
  return (
    <section id="colabora" className="bg-muted/30 py-16 md:py-24">
      <div className="container">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <h2 className="mb-6 font-bold text-3xl">Fes-te Voluntari</h2>
            <p className="mb-6 text-muted-foreground">
              Els nostres voluntaris són el cor d&apos;Animals Vida Digna.
              Uneix-te al nostre equip i ajuda a fer una diferència en la vida
              dels gats necessitats.
            </p>
            <div className="mb-6 space-y-4">
              <div className="flex items-start">
                <div className="mt-1 mr-4 rounded-full bg-primary/10 p-2">
                  <Paw className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Cura i Socialització</h3>
                  <p className="text-muted-foreground text-sm">
                    Ajuda a alimentar, cuidar i socialitzar els nostres gats
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-1 mr-4 rounded-full bg-primary/10 p-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Esdeveniments d&apos;Adopció</h3>
                  <p className="text-muted-foreground text-sm">
                    Ajuda a organitzar i gestionar esdeveniments d&apos;adopció
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-1 mr-4 rounded-full bg-primary/10 p-2">
                  <Paw className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Transport</h3>
                  <p className="text-muted-foreground text-sm">
                    Ajuda a transportar gats a les visites veterinàries
                  </p>
                </div>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/80">
              Fes-te voluntari
            </Button>
          </div>
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <h2 className="mb-6 font-bold text-3xl">
              Col·labora amb la Nostra Missió
            </h2>
            <p className="mb-6 text-muted-foreground">
              Les teves donacions ens ajuden a proporcionar menjar, refugi,
              atenció mèdica i amor als gats necessitats.
            </p>
            <div className="mb-6 space-y-4">
              <div className="flex items-start">
                <div className="mt-1 mr-4 rounded-full bg-primary/10 p-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Donació Puntual</h3>
                  <p className="text-muted-foreground text-sm">
                    Fes una contribució puntual de qualsevol quantitat
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-1 mr-4 rounded-full bg-primary/10 p-2">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Donació Mensual</h3>
                  <p className="text-muted-foreground text-sm">
                    Fes-te soci i col·labora amb aportacions mensuals
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-1 mr-4 rounded-full bg-primary/10 p-2">
                  <Paw className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Apadrina un Gat</h3>
                  <p className="text-muted-foreground text-sm">
                    Cobreix les despeses d&apos;un gat específic
                  </p>
                </div>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/80">
              Fes un donatiu
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
