import preactRenderer from '@astrojs/preact/server.js';
import { describe, expect, it } from 'vitest';
import DonateSticky from '../src/components/DonateSticky';

/**
 * H3: DonateSticky must be safe to server-side render.
 *
 * vitest's default test environment is Node (no jsdom/happy-dom configured),
 * so `window` and `document` are genuinely undefined here -- exactly like the
 * SSR pass Astro performs during `astro build`.
 *
 * This test drives the component through the *actual* `@astrojs/preact`
 * renderer (`check` / `renderToStaticMarkup`), the same functions Astro's
 * core (`renderFrameworkComponent` in `astro/dist/runtime/server/render/component.js`)
 * calls when deciding which renderer can handle a `.tsx` island and when
 * producing its SSR markup. Astro picks a renderer for an island in two
 * passes: first it asks each registered renderer's `check()` "can you render
 * this?"; only if none of them claim it does Astro fall back to guessing
 * from the file extension. `@astrojs/preact`'s `check()` renders the
 * component and treats **empty output** as "not mine" (see
 * `@astrojs/preact/dist/server.js`: `return html == "" ? false : ...`).
 *
 * DonateSticky's initial (pre-hydration) state is `visible = false`, and it
 * used to `return null` in that state -- which is exactly empty output. With
 * both `@astrojs/react` and `@astrojs/preact` registered (dev mode, before
 * `astro build` force-overrides NODE_ENV=production), neither renderer's
 * `check()` claims the component, so Astro cannot disambiguate between the
 * two matching-by-extension renderers and throws
 * "Unable to render DonateSticky!". This is the crash reported in H3.
 */
describe('DonateSticky SSR safety', () => {
  it('the @astrojs/preact renderer claims the component (does not render empty on the server)', async () => {
    // Astro calls `renderer.ssr.check.call({ result }, ...)`; `result` just
    // needs to be a stable object identity to key the renderer's internal
    // signal/context WeakMap.
    const claimed = await preactRenderer.check.call(
      { result: {} },
      DonateSticky,
      { url: '/dona', text: 'Dona' },
      {}
    );

    expect(claimed).toBe(true);
  });

  it('server-renders to non-empty, non-throwing markup without window/document', async () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');

    // Astro calls `renderer.ssr.renderToStaticMarkup.call({ result }, ...)`;
    // `result` just needs to be a stable object identity to key the
    // renderer's internal signal/context WeakMap.
    const fakeResult = {};
    const { html } = await preactRenderer.renderToStaticMarkup.call(
      { result: fakeResult },
      DonateSticky,
      { url: 'https://teaming.net/example', text: 'Dona' },
      {},
      undefined
    );

    expect(html).not.toBe('');
  });
});
