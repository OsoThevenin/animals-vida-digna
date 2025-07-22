import type { Media, Volunteer } from '@payload-types';
import VolunteerCard from '@/components/volunteer-card';
import type { UIVolunteer } from '@/lib/types';
import { getVolunteers } from '@/queries';

export default async function ConeixEquip() {
  // Obtenir voluntaris del CMS
  const volunteersData = await getVolunteers();

  // Adaptació de dades al tipus UIVolunteer
  const volunteers: UIVolunteer[] = volunteersData.map((volunteer) => {
    const volAsPV = volunteer as unknown as Volunteer;
    const photoData = volAsPV.photo as unknown as Media;

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
    };
  });

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative bg-muted py-12 md:py-24">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-6 font-bold text-4xl md:text-5xl">
              Coneix el Nostre Equip
            </h1>
            <p className="mx-auto max-w-3xl text-muted-foreground text-xl">
              Un grup de persones dedicades a cuidar, protegir i donar una vida
              digna als gats abandonats
            </p>
          </div>
        </div>
      </section>

      {/* Team Members Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          {volunteers.length === 0 ? (
            <div className="text-center">
              <p className="text-muted-foreground">
                No s&apos;han trobat voluntaris
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 font-bold text-3xl md:text-4xl">
              Uneix-te al Nostre Equip
            </h2>
            <p className="mb-8 text-muted-foreground">
              Estàs interessat en ajudar als gats abandonats i ferals? Estem
              buscant persones compromeses per unir-se a la nostra família de
              voluntaris. Junts podem marcar la diferència!
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="#voluntariat"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 font-medium text-primary-foreground text-sm ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Fes-te Voluntari
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
