import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default function LaNostHistoria() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative bg-muted py-12 md:py-24">
        <div className="container">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">La Nostra Història</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              El camí d&apos;Animals Vida Digna, des dels seus inicis fins avui
            </p>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid gap-12 md:gap-16">
            {/* Origen */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <h2 className="text-3xl font-bold mb-4">Els Nostres Orígens</h2>
                <p className="text-muted-foreground mb-4">
                  Animals Vida Digna va néixer de la preocupació d&apos;un grup de veïns de Ripoll
                  pel creixent nombre de gats abandonats als carrers de la ciutat. Al principi, érem
                  només algunes persones que alimentàvem les colònies felines de forma individual.
                </p>
                <p className="text-muted-foreground mb-4">
                  L&apos;any 2010, vam decidir unir esforços i crear una associació formal per poder
                  treballar de manera més organitzada i efectiva, especialment en la implementació
                  del mètode CER (Captura, Esterilització i Retorn) com a solució ètica per
                  controlar la població felina.
                </p>
              </div>
              <div className="order-1 md:order-2">
                <Image
                  src="/placeholder.svg?height=400&width=600"
                  alt="Els inicis d'Animals Vida Digna"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>

            {/* Creixement */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <Image
                  src="/placeholder.svg?height=400&width=600"
                  alt="Creixement de l'associació"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-4">Creixement i Desenvolupament</h2>
                <p className="text-muted-foreground mb-4">
                  A mesura que l&apos;associació va créixer, vam començar a establir relacions amb
                  l&apos;Ajuntament de Ripoll i els veterinaris locals. La nostra xarxa de
                  voluntaris es va expandir, permetent-nos gestionar més colònies felines i
                  augmentar el nombre de gats rescatats i rehabilitats.
                </p>
                <p className="text-muted-foreground mb-4">
                  Des del 2015, hem aconseguit implementar programes d&apos;esterilització estables
                  que han reduït significativament la població de gats ferals, mentre hem millorat
                  les condicions de vida dels que encara viuen al carrer.
                </p>
              </div>
            </div>

            {/* Actualitat */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <h2 className="text-3xl font-bold mb-4">On Som Avui</h2>
                <p className="text-muted-foreground mb-4">
                  Actualment, Animals Vida Digna gestiona més de 10 colònies felines a Ripoll i
                  voltants, amb una xarxa de més de 50 voluntaris actius. Hem aconseguit que més de
                  180 gats hagin trobat una llar permanent gràcies als nostres programes
                  d&apos;adopció.
                </p>
                <p className="text-muted-foreground mb-4">
                  El nostre treball continua sent essencial per garantir el benestar dels gats
                  abandonats i ferals, així com per educar la comunitat sobre la importància de
                  l&apos;adopció responsable i el respecte cap als animals.
                </p>
                <p className="text-muted-foreground mb-4">
                  Amb el suport dels nostres socis, donants i voluntaris, seguim treballant cada dia
                  per complir la nostra missió: proporcionar una vida digna a tots els animals.
                </p>
              </div>
              <div className="order-1 md:order-2">
                <Image
                  src="/placeholder.svg?height=400&width=600"
                  alt="Animals Vida Digna avui"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <h2 className="text-3xl font-bold mb-6">Forma Part de la Nostra Història</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              La història d&apos;Animals Vida Digna continua escrivint-se cada dia amb l&apos;ajuda
              de persones com tu. Uneix-te a nosaltres i ajuda&apos;ns a construir un futur millor
              per als gats abandonats i ferals de la nostra comunitat.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-primary hover:bg-primary/80">Fes-te Voluntari</Button>
              <Button variant="outline">Fes un Donatiu</Button>
              <Button variant="secondary">Adopta un Gat</Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
