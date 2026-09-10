import { Badge, type CatStatus } from '../primitives/badge';
import { Card } from '../primitives/card';

export interface CatCardProps {
  name: string;
  /** Short blurb, clamped to two lines. */
  description?: string;
  /** Already-translated status text, e.g. "Disponible". */
  statusLabel: string;
  status?: CatStatus;
  imageSrc?: string;
  imageAlt?: string;
  href?: string;
}

export function CatCard({
  name,
  description,
  statusLabel,
  status,
  imageSrc,
  imageAlt,
  href,
}: CatCardProps) {
  return (
    <Card href={href} imageAlt={imageAlt ?? name} imageSrc={imageSrc}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-bold font-display text-lg text-primary">{name}</h3>
        <Badge label={statusLabel} status={status} />
      </div>
      {description ? (
        <p className="line-clamp-2 text-sm text-text-muted">{description}</p>
      ) : null}
    </Card>
  );
}
