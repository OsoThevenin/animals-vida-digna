import preactRenderer from '@astrojs/preact/server.js';
import { describe, expect, it } from 'vitest';
import LanguageSwitcher from '../src/components/LanguageSwitcher';

/**
 * Fix 1 (LanguageSwitcher redirect trap): cats have genuinely different CA
 * and ES slugs (slug_ca / slug_es), so the generic `/es` path-prefix swap
 * `getAlternateUrl()` does is wrong for cat pages -- it produces a URL that
 * matches no cat and 404s. BaseLayout.astro already computes the correct,
 * per-cat `resolvedAlternate` for its <link rel="alternate"> tag; this test
 * asserts LanguageSwitcher renders that value directly when supplied,
 * instead of recomputing (and getting wrong) its own target URL.
 *
 * Rendered via the real @astrojs/preact SSR renderer (as
 * tests/donate-sticky-ssr.test.ts does for DonateSticky), because the
 * server-rendered HTML is what crawlers and no-JS visitors see -- Preact
 * islands do not hydrate under `astro dev` in this repo (see
 * playwright.config.ts's comment on the React/Preact Fast-Refresh preamble
 * collision), so a hydration-only assertion would not catch this bug.
 */
async function renderSwitcher(props: {
  currentUrl: string;
  currentLocale: 'ca' | 'es';
  alternateUrl?: string;
}): Promise<string> {
  const { html } = await preactRenderer.renderToStaticMarkup.call(
    { result: {} },
    LanguageSwitcher,
    props,
    {},
    undefined
  );
  return html;
}

describe('LanguageSwitcher', () => {
  it('renders the supplied alternateUrl directly (per-cat slug), not the generic /es swap', async () => {
    const html = await renderSwitcher({
      currentUrl: 'https://animalsvidadigna.org/cat/lluna',
      currentLocale: 'ca',
      alternateUrl: 'https://animalsvidadigna.org/es/cat/luna',
    });

    expect(html).toContain('href="https://animalsvidadigna.org/es/cat/luna"');
    // Must NOT fall back to the generic (wrong, 404-ing) path-prefix swap.
    expect(html).not.toContain('href="/es/cat/lluna"');
  });

  it('renders the supplied alternateUrl for the ES -> CA direction too', async () => {
    const html = await renderSwitcher({
      currentUrl: 'https://animalsvidadigna.org/es/cat/luna',
      currentLocale: 'es',
      alternateUrl: 'https://animalsvidadigna.org/cat/lluna',
    });

    expect(html).toContain('href="https://animalsvidadigna.org/cat/lluna"');
  });

  it('falls back to getAlternateUrl() when no alternateUrl is supplied (non-cat pages)', async () => {
    const html = await renderSwitcher({
      currentUrl: 'https://animalsvidadigna.org/cats',
      currentLocale: 'ca',
    });

    expect(html).toContain('href="/es/cats"');
  });

  it('falls back correctly for the ES -> CA direction with no alternateUrl', async () => {
    const html = await renderSwitcher({
      currentUrl: 'https://animalsvidadigna.org/es/cats',
      currentLocale: 'es',
    });

    expect(html).toContain('href="/cats"');
  });
});
