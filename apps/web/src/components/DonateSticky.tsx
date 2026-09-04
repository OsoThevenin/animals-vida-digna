import { useEffect, useState } from 'preact/hooks';

interface Props {
  url: string;
  text: string;
}

export default function DonateSticky({ url, text }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const threshold = 600;

    const onScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    // Check initial position
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Always render the element (never `null`) so the server produces real
  // markup: Astro's `@astrojs/preact` renderer treats empty SSR output as
  // "this isn't a Preact component" and, with `@astrojs/react` also
  // registered in dev, that ambiguity crashes the build. Visibility is
  // toggled purely via CSS/attributes and only takes effect client-side.
  return (
    <a
      href={url}
      target={url.startsWith('http') ? '_blank' : undefined}
      rel={url.startsWith('http') ? 'noopener noreferrer' : undefined}
      hidden={!visible}
      aria-hidden={!visible}
      class="fixed right-4 bottom-4 z-50 rounded-lg bg-accent px-5 py-3 font-semibold text-text shadow-lg transition-transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      {text}
    </a>
  );
}
