import { Badge } from '@/components/ui/badge';

/**
 * Published/draft pill for the cats list. Mirrors CatStatusBadge's pattern:
 * a project-specific colouring on top of shadcn's Badge, backed by tokens
 * in styles/admin.css and contrast-tested in tests/a11y-contrast.test.ts.
 */
export interface PublishedBadgeProps {
  published: boolean;
}

export function PublishedBadge({ published }: PublishedBadgeProps) {
  const className = published
    ? 'border-transparent bg-status-published text-status-published-foreground'
    : 'border-transparent bg-status-draft text-status-draft-foreground';

  return (
    <Badge className={className}>{published ? 'Publicat' : 'Esborrany'}</Badge>
  );
}
