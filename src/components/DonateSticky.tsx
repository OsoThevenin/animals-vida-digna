import { useState, useEffect } from 'preact/hooks';

interface Props {
  url: string;
  text: string;
}

export default function DonateSticky({ url, text }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const threshold = 600;

    const onScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    // Check initial position
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <a
      href={url}
      target={url.startsWith('http') ? '_blank' : undefined}
      rel={url.startsWith('http') ? 'noopener noreferrer' : undefined}
      class="fixed bottom-4 right-4 z-50 rounded-lg bg-accent px-5 py-3 font-semibold text-text shadow-lg transition-transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      {text}
    </a>
  );
}
