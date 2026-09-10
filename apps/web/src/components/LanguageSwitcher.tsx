import { getAlternateUrl } from '../i18n/index';
import type { Locale } from '../i18n/index';

interface Props {
  currentUrl: string;
  currentLocale: Locale;
  /**
   * The correct absolute alternate-locale URL, when the caller already knows
   * it (e.g. BaseLayout's `resolvedAlternate`, computed per-cat from
   * slug_ca/slug_es for cat pages). Takes precedence over the generic
   * `/es` path-prefix swap below, which is wrong whenever a page's CA and ES
   * slugs differ. Optional so the switcher still works on pages that don't
   * pass one (the swap is correct there).
   */
  alternateUrl?: string;
}

export default function LanguageSwitcher({
  currentUrl,
  currentLocale,
  alternateUrl,
}: Props) {
  const targetLocale: Locale = currentLocale === 'ca' ? 'es' : 'ca';
  const label = currentLocale === 'ca' ? 'Castellano' : 'Catala';
  const resolvedAlternateUrl =
    alternateUrl ?? getAlternateUrl(new URL(currentUrl), targetLocale);

  return (
    <a
      href={resolvedAlternateUrl}
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
