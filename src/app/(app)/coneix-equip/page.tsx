import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { QuoteIcon } from 'lucide-react'
import { getVolunteers } from '@/volunteers'
import type { Media, Volunteer } from '@payload-types'

// Tipus específic pels voluntaris a mostrar a la UI
type UIVolunteer = {
  id: string
  name: string
  role: string
  quote: string
  photo: {
    url: string
    alt: string
    width: number
    height: number
  }
}

export default async function ConeixEquip() {
  // Obtenir voluntaris del CMS
  const volunteersData = await getVolunteers()

  // Adaptació de dades al tipus UIVolunteer
  const volunteers: UIVolunteer[] = volunteersData.map((volunteer) => {
    const volAsPV = volunteer as unknown as Volunteer
    const photoData = volAsPV.photo as unknown as Media

    return {
      id: String(volunteer.id),
      name: volunteer.name,
      role: volunteer.role || '',
      quote: volunteer.quote,
      photo: {
        url: photoData?.url || '/placeholder.svg?height=400&width=300',
        alt: volunteer.name,
        width: 300,
        height: 400,
      },
    }
  })

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative bg-muted py-12 md:py-24">
        <div className="container">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Coneix el Nostre Equip</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Un grup de persones dedicades a cuidar, protegir i donar una vida digna als gats
              abandonats
            </p>
          </div>
        </div>
      </section>

      {/* Team Members Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          {volunteers.length === 0 ? (
            <div className="text-center">
              <p className="text-muted-foreground">No s&apos;han trobat voluntaris</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {volunteers.map((volunteer) => (
                <VolunteerCard key={volunteer.id} volunteer={volunteer} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Join Us Section */}
      <section className="bg-primary/10 py-16 md:py-24">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Uneix-te al Nostre Equip</h2>
            <p className="text-muted-foreground mb-8">
              Estàs interessat en ajudar als gats abandonats i ferals? Estem buscant persones
              compromeses per unir-se a la nostra família de voluntaris. Junts podem marcar la
              diferència!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#voluntariat"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Fes-te Voluntari
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function VolunteerCard({ volunteer }: { volunteer: UIVolunteer }) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg h-full flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={volunteer.photo.url}
          alt={volunteer.photo.alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <CardContent className="p-6 flex-grow flex flex-col">
        <div className="mb-3">
          <h3 className="text-xl font-bold">{volunteer.name}</h3>
          <p className="text-sm text-muted-foreground">{volunteer.role}</p>
        </div>
        <div className="mt-auto">
          <div className="relative mt-4 pt-4 border-t">
            <QuoteIcon className="h-5 w-5 text-muted-foreground absolute top-4 left-0" />
            <p className="italic text-muted-foreground pl-7">{volunteer.quote}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
