import { Button } from '../primitives/button';
import type { CtaLink } from './hero';

export interface NavLink {
  label: string;
  href: string;
}

export interface HeaderProps {
  brand?: string;
  logoSrc?: string;
  homeHref?: string;
  links: NavLink[];
  donate?: CtaLink;
  /** Static label standing in for the language switcher, e.g. "CA". */
  localeLabel?: string;
}

export function Header({
  brand = 'Animals Vida Digna',
  logoSrc = '/images/logo.webp',
  homeHref = '/',
  links,
  donate,
  localeLabel,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-primary/10 border-b bg-surface/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <a className="flex items-center gap-2" href={homeHref}>
          <img
            alt={brand}
            className="h-10 w-auto"
            height="40"
            src={logoSrc}
            width="40"
          />
          <span className="hidden font-bold font-display text-lg text-primary sm:inline">
            {brand}
          </span>
        </a>

        <ul className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                className="font-medium text-sm text-text-muted transition-colors hover:text-primary"
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {donate ? (
            <Button href={donate.href} size="sm">
              {donate.label}
            </Button>
          ) : null}
          {localeLabel ? (
            <span className="font-medium text-sm text-text-muted">
              {localeLabel}
            </span>
          ) : null}
          <button
            aria-label="Menu"
            className="inline-flex items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:text-primary md:hidden"
            type="button"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              role="presentation"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
}
