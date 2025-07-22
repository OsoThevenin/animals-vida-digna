import { CatCard } from '@/components/cat-card';
import { Button } from '@/components/ui/button';
import type { Cat } from '@/types/payload-types';
import { getPayloadClient } from '../lib/payload';

export default async function AdoptaSection() {
  let cats: Cat[] = [];

  try {
    const payload = await getPayloadClient();

    const catsResponse = await payload.find({
      collection: 'cats',
      where: {
        status: {
          equals: 'available',
        },
      },
      sort: 'order',
      limit: 6,
    });

    cats = catsResponse.docs as Cat[];
  } catch (error) {
    // Fallback for build time or when database is not available
    console.log('Could not fetch cats from database:', error);
  }

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

        {cats.length > 0 ? (
          <>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {cats.map((cat) => (
                <CatCard key={cat.id} cat={cat} />
              ))}
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
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-lg text-muted-foreground">
              Actualment no hi ha gats disponibles per adopció.
            </p>
            <p className="mt-2 text-muted-foreground">
              Torna a visitar-nos aviat per conèixer els nostres nous amics!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
