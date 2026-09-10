# Animals Vida Digna

Public website and content admin for the Animals Vida Digna cat shelter.
Bilingual (Catalan/Spanish), built on Astro and deployed to Cloudflare
Workers.

## Layout

This is a pnpm + Turborepo monorepo:

```
apps/web                   Public site (animalsvidadigna.org). Astro 5,
                            Preact islands. Static pages are prerendered;
                            cat pages render on demand from D1.
apps/admin                 Content admin app (admin.animalsvidadigna.org).
                            Astro 5, React islands, better-auth email-code
                            login. Where volunteers edit cats.
packages/content            @avd/content — Drizzle D1 schema, cat
                            repository functions, zod validation, R2 image
                            URL helpers. Shared by both apps.
packages/design-system      @avd/design-system — React component library.
                            apps/admin migrated to shadcn/ui, so this
                            package currently has zero consumers. It is
                            kept because its tokens.test.ts pins the colour
                            palette to apps/web/src/styles/global.css; its
                            future is decided in a later plan.
```

Cats (data + photos) live in Cloudflare D1 (`avd-content`) and R2
(`animals-vida-digna-images`), edited through `apps/admin`. Site settings,
the landing page, and static pages still live as files in this repository,
edited through Keystatic (`/keystatic` on the public site, maintainer-only)
with a pull-request review step — see `docs/keystatic-admin-setup.md`.

## Commands

```bash
pnpm install               # install all workspace dependencies

pnpm turbo build            # build every package/app
pnpm turbo test             # run every package's tests
pnpm turbo test:e2e         # run end-to-end tests
pnpm turbo check            # typecheck every package/app

pnpm --filter web dev       # run the public site locally (http://localhost:4321)
pnpm --filter admin dev     # run the admin app locally (http://localhost:4322)

pnpm lint                   # Biome check across the whole repo
pnpm turbo lint             # each package's own lint task (root Biome scope differs per package)
pnpm format                 # Biome format --write, across the whole repo
```

`pnpm build`, `pnpm test`, `pnpm test:e2e`, and `pnpm check` are shorthands
for the matching `pnpm turbo <task>` commands, defined as root
`package.json` scripts.

## Documentation

- [`docs/admin-guide.md`](docs/admin-guide.md) — for volunteers, in
  Catalan: how to sign in and manage cats in the admin app.
- [`docs/admin-runbook.md`](docs/admin-runbook.md) — for the maintainer:
  Cloudflare resources, secrets, D1 migrations, local dev, backups,
  monitoring.
- [`docs/keystatic-admin-setup.md`](docs/keystatic-admin-setup.md) — for
  the maintainer: setting up and using Keystatic for settings/landing/pages.
- [`docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md`](docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md)
  — the design doc for the D1/R2/admin-app architecture.
- `.planning/` — project requirements, roadmap, and state (GSD-style
  planning docs).

## Deployment

Both apps deploy as separate Cloudflare Workers via Workers Builds, one
project per app with its root directory set to `apps/web` or `apps/admin`
respectively. Pushing to `main` after a reviewed pull request triggers a
build and deploy for whichever app's files changed. There is no CI
pipeline in this repository (no `.github/workflows`) — Workers Builds
handles build and deploy directly from the Git integration.
