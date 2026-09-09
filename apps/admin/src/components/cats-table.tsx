import type { CatStatus } from '@avd/content/validate';
import { CatStatusBadge } from '@/components/cat-status-badge';
import { PublishedBadge } from '@/components/published-badge';
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
  nameEs: string;
  status: CatStatus;
  published: boolean;
  updatedAt: string;
  updatedBy: string;
  /** null when the cat has no cover image yet (the common case today). */
  coverImageUrl: string | null;
  coverImageAlt: string;
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
          <TableHead>
            <span className="sr-only">Foto</span>
          </TableHead>
          <TableHead>Nom (CA)</TableHead>
          <TableHead>Nom (ES)</TableHead>
          <TableHead>Estat</TableHead>
          <TableHead>Publicat</TableHead>
          <TableHead>Actualitzat</TableHead>
          <TableHead>
            <span className="sr-only">Accions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cats.map((cat) => (
          <TableRow key={cat.id}>
            <TableCell>
              {cat.coverImageUrl ? (
                <img
                  alt={cat.coverImageAlt}
                  className="h-16 w-16 rounded-md object-cover"
                  height={64}
                  src={cat.coverImageUrl}
                  width={64}
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-center text-[10px] text-muted-foreground">
                  Sense foto
                </div>
              )}
            </TableCell>
            <TableCell className="font-medium">{cat.nameCa}</TableCell>
            <TableCell>{cat.nameEs}</TableCell>
            <TableCell>
              <CatStatusBadge status={cat.status} />
            </TableCell>
            <TableCell>
              <PublishedBadge published={cat.published} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {cat.updatedAt} · {cat.updatedBy}
            </TableCell>
            <TableCell>
              <a
                className="font-medium text-primary text-sm hover:underline"
                href={`/cats/${cat.id}`}
              >
                Edita
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
