import { PawPrintIcon as Paw } from 'lucide-react'

export default function ColoniesSection() {
  return (
    <section id="colonies" className="bg-muted/30 py-16 md:py-24">
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
              <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                <Paw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground">
                  Reivindiquem davant els Ajuntaments la obligatorietat que tenen de controlar les
                  colònies de gats ferals del seu municipi, segons el DECRET LEGISLATIU 2/2008.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                <Paw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground">
                  Col·laborem amb els Ajuntaments que subvencionen l&apos;aplicació del mètode CER
                  (captura, esterilització i retorn) per al control de les colònies urbanes.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                <Paw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground">
                  Vetllem per que els gats ferals disposin d&apos;aigua i menjar d&apos;acord a les
                  seves necessitats i al mateix temps evitar comportaments incívics.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                <Paw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground">
                  Fomentem la conciliació entre gats ferals i veïnatge en punts on poden sorgir
                  conflictes.
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="mt-1 bg-primary/10 p-2 rounded-full mr-4">
                <Paw className="h-5 w-5 text-primary" />
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
      </div>
    </section>
  )
}
