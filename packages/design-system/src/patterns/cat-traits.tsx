import { Badge, type CatStatus } from '../primitives/badge';

export interface CatTrait {
  /** Label, already translated, e.g. "Edat". */
  term: string;
  /** Display value, already formatted, e.g. "3 anys". */
  value: string;
}

export interface MedicalFact {
  /** Already-translated label, e.g. "Vacunada". */
  label: string;
  done: boolean;
}

export interface CatTraitsProps {
  statusLabel: string;
  status?: CatStatus;
  traits: CatTrait[];
  personalityTitle?: string;
  personality?: string[];
  goodWithTitle?: string;
  goodWith?: string[];
  medical?: MedicalFact[];
  specialNeeds?: string;
}

type TagTone = 'accent' | 'green';

const TAG_TONE_CLASSES: Record<TagTone, string> = {
  accent: 'bg-accent/10 text-primary-dark',
  green: 'bg-green-50 text-green-700',
};

function TagList({
  title,
  tags,
  tone,
}: {
  title?: string;
  tags?: string[];
  tone: TagTone;
}) {
  if (!title || !tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="mb-2 font-medium text-sm text-text-muted">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            className={`rounded-full px-3 py-1 font-medium text-xs ${TAG_TONE_CLASSES[tone]}`}
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
  medical,
  specialNeeds,
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
      <TagList tags={personality} title={personalityTitle} tone="accent" />
      <TagList tags={goodWith} title={goodWithTitle} tone="green" />
      {medical && medical.length > 0 ? (
        <div className="mt-4 border-primary/10 border-t pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            {medical.map((fact) => (
              <span
                className={fact.done ? 'text-green-700' : 'text-text-muted'}
                key={fact.label}
              >
                {fact.done ? '✓' : '✗'} {fact.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {specialNeeds ? (
        <div className="mt-4 rounded-lg bg-amber-50 p-3">
          <p className="text-sm text-amber-800">{specialNeeds}</p>
        </div>
      ) : null}
    </div>
  );
}
