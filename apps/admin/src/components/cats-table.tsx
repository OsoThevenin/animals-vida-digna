import type { CatStatus } from '@avd/content/validate';
import { CatStatusBadge } from '@/components/cat-status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Rendered from cats/index.astro WITHOUT a `client:*` directive, so Astro
 * emits it as plain server HTML and no JavaScript ships for the list.
 *
 * It exists as one React component rather than shadcn Table tags written
 * directly in the .astro file because Astro wraps every child passed from
 * .astro markup into a React component in an `<astro-slot>` element — legal
 * nowhere inside `<table>`, where the parser would hoist it out and break
 * the table. Keeping the whole table in one component keeps the slot
 * boundary outside `<table>`.
 */
export interface CatsTableRow {
  id: string;
  nameCa: string;
  status: CatStatus;
  published: boolean;
  updatedAt: string;
}

export interface CatsTableProps {
  cats: CatsTableRow[];
}

export function CatsTable({ cats }: CatsTableProps) {
  if (cats.length === 0) {
    return <p className="text-muted-foreground">Encara no hi ha cap gat.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Estat</TableHead>
          <TableHead>Publicat</TableHead>
          <TableHead>Actualitzat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cats.map((cat) => (
          <TableRow key={cat.id}>
            <TableCell className="font-medium">{cat.nameCa}</TableCell>
            <TableCell>
              <CatStatusBadge status={cat.status} />
            </TableCell>
            <TableCell>{cat.published ? 'Sí' : 'No'}</TableCell>
            <TableCell className="text-muted-foreground">
              {cat.updatedAt}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
