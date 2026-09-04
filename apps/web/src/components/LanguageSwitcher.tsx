import { getAlternateUrl } from '../i18n/index';
import type { Locale } from '../i18n/index';

interface Props {
  currentUrl: string;
  currentLocale: Locale;
}

export default function LanguageSwitcher({ currentUrl, currentLocale }: Props) {
  const targetLocale: Locale = currentLocale === 'ca' ? 'es' : 'ca';
  const label = currentLocale === 'ca' ? 'Castellano' : 'Catala';
  const url = new URL(currentUrl);
  const alternateUrl = getAlternateUrl(url, targetLocale);

  return (
    <a
      href={alternateUrl}
      class="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      aria-label={`Canviar a ${label}`}
    >
      <span class="text-base" aria-hidden="true">
        {currentLocale === 'ca' ? 'ES' : 'CA'}
      </span>
      <span class="hidden sm:inline">{label}</span>
    </a>
  );
}
