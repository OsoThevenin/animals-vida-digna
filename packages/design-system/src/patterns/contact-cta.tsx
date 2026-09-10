import { Button } from '../primitives/button';
import { Section } from '../primitives/section';
import type { CtaLink } from './hero';

export interface ContactCtaProps {
  title: string;
  subtitle?: string;
  cta?: CtaLink;
  id?: string;
}

export function ContactCta({ title, subtitle, cta, id }: ContactCtaProps) {
  return (
    <Section centered id={id} title={title} tone="dark" width="narrow">
      {subtitle ? (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-surface/80">
          {subtitle}
        </p>
      ) : null}
      {cta ? (
        <div className="mt-8">
          <Button href={cta.href} size="lg">
            {cta.label}
          </Button>
        </div>
      ) : null}
    </Section>
  );
}
