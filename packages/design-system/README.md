# @avd/design-system

React mirror of the Animals Vida Digna site UI, built so the
[claude.ai/design](https://claude.ai/design) agent composes new pages from the
sanctuary's real components.

**This package is design-time only.** The Astro site does not import it and
must not start: the site's production bundle stays React-free, using Preact for
its five interactive islands.

## Usage

```bash
pnpm --filter @avd/design-system storybook   # browse components
pnpm --filter @avd/design-system test        # render tests
pnpm --filter @avd/design-system build       # dist/ for design-sync
```

## No i18n

The Astro components take a `locale` and call `t()` / `getLocalizedField()`.
These mirrors take plain display strings — `statusLabel="Disponible"`, not
`status="available" locale="ca"`. Translation is the site's job.

## Keeping the mirror true

Each component copies its classes from an Astro source. Change the Astro file
and the mirror goes stale silently — there is no automatic sync. After a UI
change, update the mirror and re-run `/design-sync`.

| Mirror | Astro origin |
| --- | --- |
| `CatCard` | `src/components/cats/CatCard.astro` |
| `CatTraits` | `src/components/cats/CatTraits.astro` |
| `Hero` | `src/components/landing/HeroSection.astro` |
| `StatsSection` | `src/components/landing/StatsSection.astro` |
| `ContactCta` | `src/components/landing/ContactCtaSection.astro` |
| `Header` | `src/components/Header.astro` |
| `Footer` | `src/components/Footer.astro` |
| `Button` | CTA classes in `HeroSection.astro`, `ContactForm.tsx:162` |
| `Badge` | `statusColors` map in `CatCard.astro` |
| `Card` | card container in `CatCard.astro` |
| `Input`, `Field` | `inputClass` / `errorClass`, `ContactForm.tsx:99-100` |
| `Section` | section shells across `src/components/landing/*.astro` |
| `tokens.css` | `src/styles/global.css` — guarded by `tokens.test.ts` |

`Header` deliberately omits the mobile-menu script and the `LanguageSwitcher`
island: the design agent needs the chrome's appearance, not its behaviour.
`CatTraits` also diverges structurally: it takes a generic `medical:
MedicalFact[]` array rather than the original's three named booleans, and
`specialNeeds` is a plain string — both because the package has a no-i18n
contract and cannot carry the site's Catalan labels.
