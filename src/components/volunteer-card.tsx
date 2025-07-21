import { QuoteIcon } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import type { UIVolunteer } from '@/lib/types';
import { toUpperCase } from '@/lib/utils';

export default function VolunteerCard({
  volunteer,
}: {
  volunteer: UIVolunteer;
}) {
  // Mostra "Voluntari/a" si el rol està buit
  const displayRole = volunteer.role || 'Voluntari/a';

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={volunteer.photo.url}
          alt={volunteer.photo.alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <CardContent className="flex flex-grow flex-col p-6">
        <div className="mb-2">
          <h3 className="font-bold text-xl">{toUpperCase(volunteer.name)}</h3>
          <p className="text-muted-foreground text-sm">{displayRole}</p>
        </div>
        <div>
          <div className="relative mt-2 border-gray-200 border-t pt-3">
            <QuoteIcon className="absolute top-3 left-0 h-5 w-5 text-muted-foreground" />
            <p className="pl-7 text-muted-foreground italic">
              {volunteer.quote}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
