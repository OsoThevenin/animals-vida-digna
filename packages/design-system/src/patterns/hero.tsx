import { Button } from '../primitives/button';

export interface CtaLink {
  label: string;
  href: string;
}

export interface HeroProps {
  title: string;
  subtitle?: string;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  imageSrc?: string;
  imageAlt?: string;
}

export function Hero({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  imageSrc,
  imageAlt,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-primary-dark py-20 text-surface sm:py-28">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 sm:px-6 lg:flex-row lg:gap-16">
        <div className="flex-1 text-center lg:text-left">
          <h1 className="font-bold font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mx-auto mt-4 max-w-xl text-lg text-surface/80 lg:mx-0">
              {subtitle}
            </p>
          ) : null}
          {primaryCta || secondaryCta ? (
            <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
              {primaryCta ? (
                <Button href={primaryCta.href}>{primaryCta.label}</Button>
              ) : null}
              {secondaryCta ? (
                <Button href={secondaryCta.href} variant="outline">
                  {secondaryCta.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {imageSrc ? (
          <div className="flex-1">
            <img
              alt={imageAlt ?? ''}
              className="mx-auto max-h-96 w-full rounded-2xl object-cover shadow-xl lg:max-h-[28rem]"
              height={448}
              src={imageSrc}
              width={1280}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
