'use client';

import { Calendar, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Cat } from '@/types/payload-types';

interface CatCardProps {
  cat: Cat;
  className?: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'available':
      return { label: 'Disponible', variant: 'default' as const };
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

export function CatCard({ cat, className }: CatCardProps) {
  const statusBadge = getStatusBadge(cat.status);
  const ageLabel = getAgeLabel(cat.age);
  const photoUrl =
    typeof cat.photo === 'object' && cat.photo?.url
      ? cat.photo.url
      : '/placeholder.svg?height=300&width=400';

  return (
    <Card
      className={`group overflow-hidden transition-all hover:shadow-lg ${className}`}
    >
      <Link href={`/gats/${cat.id}`} className="block">
        <div className="relative">
          <Image
            src={photoUrl}
            alt={cat.givenName}
            width={400}
            height={300}
            className="h-64 w-full object-cover transition-transform group-hover:scale-105"
          />
          <Badge
            className="absolute top-4 right-4"
            variant={statusBadge.variant}
          >
            {statusBadge.label}
          </Badge>
          {cat.featured && (
            <div className="absolute top-4 left-4">
              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            </div>
          )}
        </div>
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-xl">{cat.givenName}</h3>
            <span className="flex items-center text-muted-foreground text-sm">
              <Calendar className="mr-1 h-4 w-4" /> {ageLabel}
            </span>
          </div>
          {cat.race && (
            <p className="mb-2 text-muted-foreground text-sm">{cat.race}</p>
          )}
          {cat.personality && cat.personality.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {cat.personality.slice(0, 3).map((trait) => (
                <Badge key={trait} variant="outline" className="text-xs">
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
          )}
          <Button className="w-full bg-primary hover:bg-primary/80">
            Coneix {cat.givenName}
          </Button>
        </CardContent>
      </Link>
    </Card>
  );
}
