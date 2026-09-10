import type { ReactNode } from 'react';

export type SectionTone = 'surface' | 'tint' | 'dark';

export interface SectionProps {
  children: ReactNode;
  /** Section heading, already translated. */
  title?: string;
  id?: string;
  tone?: SectionTone;
  width?: 'wide' | 'narrow';
  centered?: boolean;
}

const TONES: Record<SectionTone, string> = {
  surface: 'bg-surface',
  tint: 'bg-primary/5',
  dark: 'bg-primary-dark text-surface',
};

export function Section({
  children,
  title,
  id,
  tone = 'surface',
  width = 'wide',
  centered = false,
}: SectionProps) {
  const inner = width === 'wide' ? 'max-w-7xl' : 'max-w-4xl';
  const heading =
    tone === 'dark'
      ? 'font-display text-3xl font-bold sm:text-4xl'
      : 'mb-12 text-center font-display text-3xl font-bold text-primary sm:text-4xl';

  return (
    <section className={`py-16 sm:py-24 ${TONES[tone]}`} id={id}>
      <div
        className={`mx-auto px-4 sm:px-6 ${inner} ${centered ? 'text-center' : ''}`}
      >
        {title ? <h2 className={heading}>{title}</h2> : null}
        {children}
      </div>
    </section>
  );
}
