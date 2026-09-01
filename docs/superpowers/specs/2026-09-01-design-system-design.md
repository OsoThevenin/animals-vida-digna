# Design System for animals-vida-digna

Date: 2026-09-01
Status: Approved (design), pending implementation plan

## Purpose

Give the claude.ai/design agent a set of real, on-brand React components so
that any new page or screen it designs for the cat sanctuary site is made of
this project's actual UI vocabulary, and maps recognisably onto code the site
already ships.

The library is **design-time only**. The Astro site does not consume it. The
site keeps its current architecture: static `.astro` components, Preact for the
five interactive islands, zero React in the production bundle.

## Non-goals

- Refactoring the Astro site to render library components.
- Internationalisation. The Astro originals take `locale` and call `t()` /
  `getLocalizedField()`; the mirrors take plain strings.
- Mirroring every component. One-off sections the design agent would rarely
  reuse stay out.
- Publishing to a registry. The package is private and never versioned.

## Placement

A pnpm workspace package, `packages/design-system`.

    pnpm-workspace.yaml           packages: ['.', 'packages/*']
    packages/design-system/
      package.json                private, name @avd/design-system
      vite.config.ts              library mode -> dist/, react externalised
      tsconfig.json               extends root
      .storybook/main.ts          stories: ../src/**/*.stories.tsx
      src/
        tokens/tokens.css         @theme, copied from src/styles/global.css
        styles.css                @import tailwindcss + tokens
        primitives/
        patterns/
        index.ts                  barrel export

The root `biome.json` already has `files.includes: ["**"]`, so the package is
linted and formatted by the existing config with no new configuration. Two
consequences that bind implementation:

- `useFilenamingConvention` is kebab-case at error level. Files are
  `cat-card.tsx`, `stats-section.stories.tsx`. Exported component names stay
  PascalCase (`CatCard`, `StatsSection`) — design-sync derives card names from
  exports, so the design project reads correctly.
- `useSortedClasses` is on at error level for `className`, so Tailwind class
  order is enforced automatically.

`dist/` is covered by the root `.gitignore` pattern and is never committed; it
is a build input to design-sync only.

## Toolchain

**Vite in library mode** for the build. Not chosen for speed — raw esbuild is
faster — but because Storybook's React renderer already runs on Vite, so a
single `vite.config.ts` drives both the Storybook dev server and the `dist/`
build. Two configs could drift, and drift between the build and the surface a
preview is verified against is exactly what makes a verified preview lie.

**Storybook** (`@storybook/react-vite`), one story file per component. The
stories are both the local browsing surface and what design-sync
screenshot-verifies its generated previews against.

**Biome** for lint and format, via the existing root config. Biome is a
linter/formatter with no bundler and does not replace Vite.

**Tailwind v4** via `@tailwindcss/vite`, the same plugin and version the site
uses.

## Components

Primitives (`src/primitives/`) — extracted from class patterns that repeat
across the Astro components:

| Component | Notes |
|---|---|
| `Button` | variants: `primary` (accent bg, text), `outline` (surface border, used on dark), `link`. Renders `<a>` when `href` is set. |
| `Badge` | tone: `available` / `adopted` / `treatment` / `unavailable`, matching the existing `statusColors` map. Takes a `label` string. |
| `Card` | rounded-xl, `bg-surface`, `shadow-sm`, hover `shadow-md`. Optional media slot with 4:3 aspect. |
| `Input` | text / email / textarea, styled to the existing form fields. |
| `Field` | label + input + error text wrapper. |
| `Section` | page section shell: `max-w-7xl`, responsive padding, optional heading and background tone (`surface` / `primary-tint` / `primary-dark`). |

Patterns (`src/patterns/`) — mirrors of the site's composed UI:

| Component | Mirrors | Key props |
|---|---|---|
| `CatCard` | `cats/CatCard.astro` | `name`, `description`, `statusLabel`, `status`, `imageSrc`, `imageAlt`, `href` |
| `CatTraits` | `cats/CatTraits.astro` | flat display strings: `ageText`, `genderLabel`, `sizeLabel`, `healthLabel`, `personality[]`, `goodWith[]`, booleans |
| `Hero` | `landing/HeroSection.astro` | `title`, `subtitle`, `primaryCta`, `secondaryCta`, `imageSrc`, `imageAlt` |
| `Header` | `Header.astro` | `links[]`, `activeHref`, `donateLabel` |
| `Footer` | `Footer.astro` | `columns[]`, `social[]`, `note` |
| `StatsSection` | `landing/StatsSection.astro` | `title`, `items[{value,label}]` |
| `ContactCta` | `landing/ContactCtaSection.astro` | `title`, `body`, `cta` |

Images are plain `<img>`. `OptimizedImage.astro` is an Astro build-time
concern with no meaning in a React preview.

## Styling contract

`src/tokens/tokens.css` holds the `@theme` block copied verbatim from
`src/styles/global.css`: the warm palette (`--color-primary` `#8B5E3C`,
`--color-primary-dark` `#6B4226`, `--color-accent` `#E8A87C`,
`--color-surface` `#FFF8F0`, text and muted text), the sans/display font
stacks, and the `lg`/`xl` radii. A header comment names
`src/styles/global.css` as the origin of truth.

Components style themselves with Tailwind utility classes resolving to those
tokens (`bg-surface`, `text-primary`, `font-display`, `rounded-xl`) — the same
idiom the Astro components use. No CSS modules, no styled-components, no
inline style objects.

`styles.css` imports Tailwind and then the tokens, and is the single stylesheet
design-sync binds; every rendered design receives its transitive import
closure.

## Divergence

The cost of the design-time-only choice: editing `CatCard.astro` leaves
`cat-card.tsx` silently stale. Handled with the cheapest thing that works —
a README section listing each mirror against its Astro origin, plus the origin
comment in `tokens.css`. No codegen, no snapshot test coupling the two trees.
Re-running `/design-sync` after a UI change is a manual step, and that is
accepted.

## Risks

**Workspace conversion.** Adding `pnpm-workspace.yaml` makes the repo root a
workspace member and regenerates `pnpm-lock.yaml`, which the Cloudflare build
installs from. Mitigation: the workspace conversion lands as its own commit,
verified by a clean `pnpm install --frozen-lockfile` followed by `pnpm build`
before anything else is added, so it can be reverted alone if the deploy
objects.

**React version.** The library builds against React 19, matching the root
dependency. React is externalised in library mode; design-sync supplies its own
runtime copy at render time.

**Preview fidelity.** Each component's preview must render with the tokens
applied; an unstyled preview means the design agent's output will be unstyled
too. This is what the Storybook screenshot verification exists to catch.

## Verification

1. `pnpm install --frozen-lockfile` clean, `pnpm build` (site) still green.
2. `pnpm --filter @avd/design-system build` produces `dist/`.
3. `pnpm --filter @avd/design-system storybook` renders every story with the
   warm palette applied — not default browser styling.
4. `pnpm biome check .` clean across the new package.
5. `/design-sync` detects `shape: storybook`, verifies each preview against its
   story, and creates the claude.ai/design project.
