# design-sync notes — @avd/design-system

## Setup
- Shape: storybook. Storybook lives at `packages/design-system/.storybook`; build the
  reference from **inside `packages/design-system`** with an absolute `-o`. Running
  `npx storybook build` from the repo root fails: npx fetches a fresh storybook that
  cannot resolve the `@storybook/react-vite` preset.
- Converter invocation:
  `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules packages/design-system/node_modules --out ./ds-bundle --entry packages/design-system/dist/index.js --storybook-static .design-sync/sb-reference`
- `--entry` is required: this is the DS's own source repo, so `node_modules/@avd/design-system`
  does not exist.

## Findings carried forward
- `[CSS_FROM_STORYBOOK]` fires every build and is EXPECTED. The Vite library build emits no
  stylesheet (Tailwind is compiled by the consumer), so the converter substitutes storybook's
  compiled `iframe-*.css`. That file is the real Tailwind output for this library, so the
  substitution is correct — not a defect to chase.
- **The shipped CSS is pre-compiled and Tailwind does NOT run at design time.** Only utilities
  the library already uses exist. `--color-primary-light` was tree-shaken out entirely — the
  token is declared in `tokens.css` but no component uses it, so neither the utility nor the
  variable reaches the bundle. Do not document `bg-primary-light` as available.
- **`font-display` is inert, in the mirror AND on the real site.** `src/styles/global.css`
  declares `--font-family-display`, but Tailwind v4 derives `font-*` utilities from `--font-*`.
  `.font-display` therefore compiles to zero CSS. Harmless today (both stacks are identical
  `system-ui`); the moment a real display face is set, every `font-display` heading will
  silently ignore it. Fix in the SITE by renaming the tokens to `--font-sans` / `--font-display`.
- The brand logo is embedded as a base64 data URI (`src/assets/logo.ts`) and is the default
  `logoSrc` for Header and Footer. Before this, both panels showed a broken image and the
  compare graded it "match" because both sides failed identically — the same trap the skill
  warns about for fonts. Re-embed from `public/images/logo.webp` if the logo changes.
- `Input` needs its own `input.stories.tsx`. Without it the converter finds only 12 components:
  Input is exercised inside the Field story, which registers under `Primitives/Field`.

## Re-sync risks
- Re-verify that `font-display` is still inert (or fixed) before trusting typography grades.
- Rebuild `.design-sync/sb-reference` whenever stories or DS source change; a stale reference
  silently grades against the old design.
- The repo's root `biome.json` is broken (schema 2.0.0 vs CLI 2.4.7; unknown
  `nursery.noSecrets`), so `pnpm biome check` exits 1 on every path. Unrelated to this package.
