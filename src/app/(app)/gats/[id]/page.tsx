import { Calendar, Heart, PawPrint } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPayloadClient } from '@/lib/payload';
import { getCat } from '@/queries';
import type { Cat } from '@/types/payload-types';

interface CatPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: CatPageProps) {
  const payload = await getPayloadClient();

  try {
    const cat = await payload.findByID({
      collection: 'cats',
      id: params.id,
    });

    if (!cat) {
      return {
        title: 'Gat no trobat - Animals Vida Digna',
      };
    }

    return {
      title: `${cat.givenName} - Adopció - Animals Vida Digna`,
      description: `${cat.givenName} és un gat de ${cat.age} anys${cat.race ? ` de raça ${cat.race}` : ''} que busca una llar. Coneix la seva història i personalitat.`,
      openGraph: {
        title: `${cat.givenName} - Adopció - Animals Vida Digna`,
        description: `${cat.givenName} és un gat de ${cat.age} anys${cat.race ? ` de raça ${cat.race}` : ''} que busca una llar.`,
        images: [
          {
            url:
              typeof cat.photo === 'object' && cat.photo?.url
                ? cat.photo.url
                : '/images/logo.webp',
            width: 1200,
            height: 630,
            alt: cat.givenName,
          },
        ],
      },
    };
  } catch (error) {
    return {
      title: 'Gat no trobat - Animals Vida Digna',
    };
  }
}

export default async function CatPage({ params }: CatPageProps) {
  const cat = await getCat(params.id);

  if (!cat) {
    notFound();
  }

  const photoUrl =
    typeof cat.photo === 'object' && cat.photo?.url
      ? cat.photo.url
      : '/placeholder.svg?height=600&width=800';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return { label: 'Disponible per Adopció', variant: 'default' as const };
      case 'adopted':
        return { label: 'Adoptat', variant: 'secondary' as const };
      case 'treatment':
        return { label: 'En Tractament', variant: 'destructive' as const };
      case 'unavailable':
        return { label: 'No Disponible', variant: 'outline' as const };
      default:
        return { label: 'Desconegut', variant: 'outline' as const };
    }
  };

  const getAgeLabel = (age: number) => {
    if (age < 1) {
      return `${Math.round(age * 12)} mesos`;
    }
    if (age === 1) {
      return '1 any';
    }
    return `${age} anys`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ca-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const statusBadge = getStatusBadge(cat.status);
  const ageLabel = getAgeLabel(cat.age);

  return (
    <div className="container py-8 md:py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Imatge */}
        <div className="space-y-4">
          <div className="relative">
            <Image
              src={photoUrl}
              alt={cat.givenName}
              width={800}
              height={600}
              className="w-full rounded-lg object-cover"
              priority
            />
            <Badge
              className="absolute top-4 right-4"
              variant={statusBadge.variant}
            >
              {statusBadge.label}
            </Badge>
            {cat.featured && (
              <div className="absolute top-4 left-4">
                <Heart className="h-6 w-6 fill-red-500 text-red-500" />
              </div>
            )}
          </div>

          {/* Fotos addicionals */}
          {cat.additionalPhotos && cat.additionalPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {cat.additionalPhotos.map((photoItem, index) => {
                const additionalPhotoUrl =
                  typeof photoItem.photo === 'object' && photoItem.photo?.url
                    ? photoItem.photo.url
                    : '/placeholder.svg?height=200&width=200';

                return (
                  <Image
                    key={index}
                    src={additionalPhotoUrl}
                    alt={`${cat.givenName} - Foto ${index + 2}`}
                    width={200}
                    height={200}
                    className="h-24 w-full rounded-lg object-cover"
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Informació */}
        <div className="space-y-6">
          <div>
            <h1 className="mb-2 font-bold text-4xl">{cat.givenName}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {ageLabel}
              </span>
              {cat.race && (
                <span className="flex items-center">
                  <PawPrint className="mr-1 h-4 w-4" />
                  {cat.race}
                </span>
              )}
            </div>
          </div>

          {/* Personalitat */}
          {cat.personality && cat.personality.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personalitat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {cat.personality.map((trait) => (
                    <Badge key={trait} variant="outline">
                      {trait === 'playful' && 'Juganer'}
                      {trait === 'calm' && 'Tranquil'}
                      {trait === 'shy' && 'Timid'}
                      {trait === 'affectionate' && 'Afectuós'}
                      {trait === 'independent' && 'Independent'}
                      {trait === 'social' && 'Sociable'}
                      {trait === 'curious' && 'Curiós'}
                      {trait === 'protective' && 'Protector'}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Es porta bé amb */}
          {cat.goodWith && cat.goodWith.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Es porta bé amb</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {cat.goodWith.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item === 'children' && 'Nens'}
                      {item === 'other-cats' && 'Altres gats'}
                      {item === 'dogs' && 'Gossos'}
                      {item === 'elderly' && 'Persones grans'}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informació mèdica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informació Mèdica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span>Vacunat:</span>
                  <Badge variant={cat.vaccinated ? 'default' : 'outline'}>
                    {cat.vaccinated ? 'Sí' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Microxipat:</span>
                  <Badge variant={cat.microchipped ? 'default' : 'outline'}>
                    {cat.microchipped ? 'Sí' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Esterilitzat:</span>
                  <Badge variant={cat.sterilized ? 'default' : 'outline'}>
                    {cat.sterilized ? 'Sí' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estat de salut:</span>
                  <Badge variant="outline">
                    {cat.healthStatus === 'healthy' && 'Sà'}
                    {cat.healthStatus === 'treatment' && 'En Tractament'}
                    {cat.healthStatus === 'special-needs' &&
                      'Necessitats Especials'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Història</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Data de rescat:</span>
                <span className="font-medium">
                  {formatDate(cat.rescueDate)}
                </span>
              </div>
              {cat.adoptionDate && (
                <div className="flex justify-between">
                  <span>Data d'adopció:</span>
                  <span className="font-medium">
                    {formatDate(cat.adoptionDate)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Necessitats especials */}
          {cat.specialNeeds && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Necessitats Especials</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{cat.specialNeeds}</p>
              </CardContent>
            </Card>
          )}

          {/* Observacions */}
          {cat.observations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observacions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{cat.observations}</p>
              </CardContent>
            </Card>
          )}

          {/* Botó d'adopció */}
          {cat.status === 'available' && (
            <div className="space-y-4">
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/80"
              >
                Adopta {cat.givenName}
              </Button>
              <p className="text-center text-muted-foreground text-sm">
                Contacta amb nosaltres per més informació sobre l'adopció
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
