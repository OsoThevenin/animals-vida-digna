import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  /** Renders the whole card as a link. */
  href?: string;
  /** Supplying either imageSrc or imageAlt renders the media slot: with imageSrc it renders the image, without it a placeholder icon. Omitting both renders no media area. */
  imageSrc?: string;
  /** Supplying either imageSrc or imageAlt renders the media slot: with imageSrc it renders the image, without it a placeholder icon. Omitting both renders no media area. */
  imageAlt?: string;
}

function Media({ src, alt }: { src?: string; alt?: string }) {
  if (src) {
    return (
      <div className="aspect-[4/3] overflow-hidden">
        <img
          alt={alt ?? ''}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          src={src}
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center bg-primary/5">
      <svg
        className="h-16 w-16 text-primary/20"
        fill="currentColor"
        role="presentation"
        viewBox="0 0 24 24"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    </div>
  );
}

export function Card({ children, href, imageSrc, imageAlt }: CardProps) {
  const className =
    'group block overflow-hidden rounded-xl bg-surface shadow-sm transition-shadow hover:shadow-md';
  const hasMedia = imageSrc !== undefined || imageAlt !== undefined;
  const content = (
    <>
      {hasMedia ? <Media alt={imageAlt} src={imageSrc} /> : null}
      <div className="p-4">{children}</div>
    </>
  );

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}
