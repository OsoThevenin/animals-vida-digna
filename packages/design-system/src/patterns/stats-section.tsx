import { Section } from '../primitives/section';

export interface Stat {
  /** The number itself, pre-formatted, e.g. "120" or "1.2k". */
  value: string;
  label: string;
}

export interface StatsSectionProps {
  title?: string;
  items: Stat[];
  id?: string;
}

export function StatsSection({ title, items, id }: StatsSectionProps) {
  return (
    <Section id={id} title={title} tone="tint">
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div className="text-center" key={item.label}>
            <p className="font-bold font-display text-4xl text-primary-dark sm:text-5xl">
              {item.value}
            </p>
            <p className="mt-2 font-medium text-sm text-text-muted sm:text-base">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
