import { defineConfig, devices } from '@playwright/test';

// Deliberately not port 4321 (Astro's default): other Astro projects on this
// machine bind that same port, and a stray process there silently answers
// requests meant for this site (404s that look like a broken app instead of
// a broken test setup). Picking an unusual port avoids the collision.
const PORT = 4875;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// `wrangler dev` is served over plain HTTP against a loopback address, and
// binds no remote Cloudflare resource (its KV/rate-limit bindings run
// locally, per `wrangler.toml`) — nothing here talks to the network.

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  // `astro build && wrangler dev`, NOT `astro dev`: `astro dev` starts
  // faster, but with both @astrojs/react and @astrojs/preact registered
  // (Keystatic needs React; the public site's own islands are Preact) it
  // hits a real dev-mode bug — Vite injects each framework's React-Fast-
  // Refresh preamble once per page, and the second one throws
  // `SyntaxError: Identifier 'prevRefreshReg' has already been declared`,
  // which silently kills hydration for every Preact island (CatFilters,
  // LanguageSwitcher, ContactForm, ...). Confirmed by hand: under
  // `astro dev` the cats filter select updates its own value but never
  // narrows the list; under `astro build && wrangler dev` it works.
  // `astro preview` isn't an option either — the Cloudflare adapter
  // explicitly doesn't support it ("The @astrojs/cloudflare adapter does
  // not support the preview command"). `wrangler dev` also exercises the
  // real Worker (Cloudflare KV sessions, the FORM_RATE_LIMITER binding)
  // instead of Vite's dev server, closer to what actually ships.
  webServer: {
    command: `pnpm exec astro build && pnpm exec wrangler dev --port ${PORT} --ip 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
