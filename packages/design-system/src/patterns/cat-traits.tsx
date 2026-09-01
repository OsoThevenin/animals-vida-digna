import { Badge, type CatStatus } from '../primitives/badge';

export interface CatTrait {
  /** Label, already translated, e.g. "Edat". */
  term: string;
  /** Display value, already formatted, e.g. "3 anys". */
  value: string;
}

export interface CatTraitsProps {
  statusLabel: string;
  status?: CatStatus;
  traits: CatTrait[];
  personalityTitle?: string;
  personality?: string[];
  goodWithTitle?: string;
  goodWith?: string[];
}

function TagList({ title, tags }: { title?: string; tags?: string[] }) {
  if (!title || !tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="mb-2 font-medium text-sm text-text-muted">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            className="rounded-full bg-accent/10 px-3 py-1 font-medium text-primary-dark text-xs"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CatTraits({
  statusLabel,
  status,
  traits,
  personalityTitle,
  personality,
  goodWithTitle,
  goodWith,
}: CatTraitsProps) {
  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm">
      <div className="mb-4">
        <Badge label={statusLabel} size="md" status={status} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {traits.map((trait) => (
          <div className="contents" key={trait.term}>
            <dt className="font-medium text-text-muted">{trait.term}</dt>
            <dd className="text-text">{trait.value}</dd>
          </div>
        ))}
      </dl>
      <TagList tags={personality} title={personalityTitle} />
      <TagList tags={goodWith} title={goodWithTitle} />
    </div>
  );
}
