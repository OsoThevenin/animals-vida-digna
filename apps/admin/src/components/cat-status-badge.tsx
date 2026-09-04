import type { CatStatus } from '@avd/content/validate';
import { Badge } from '@/components/ui/badge';
import { CAT_STATUS_LABELS_CA } from '@/lib/cat-status-labels';

/**
 * Composition over generated code: shadcn's Badge keeps its stock variants
 * in components/ui, and the four cat-status colourings live here, as the
 * shadcn docs recommend for project-specific extensions. Each pair is a
 * token declared in styles/admin.css and contrast-tested in
 * tests/a11y-contrast.test.ts.
 */
const STATUS_CLASSES: Record<CatStatus, string> = {
  available:
    'border-transparent bg-status-available text-status-available-foreground',
  adopted:
    'border-transparent bg-status-adopted text-status-adopted-foreground',
  treatment:
    'border-transparent bg-status-treatment text-status-treatment-foreground',
  unavailable:
    'border-transparent bg-status-unavailable text-status-unavailable-foreground',
};

export interface CatStatusBadgeProps {
  status: CatStatus;
  className?: string;
}

export function CatStatusBadge({ status, className }: CatStatusBadgeProps) {
  return (
    <Badge className={`${STATUS_CLASSES[status]} ${className ?? ''}`.trim()}>
      {CAT_STATUS_LABELS_CA[status]}
    </Badge>
  );
}
