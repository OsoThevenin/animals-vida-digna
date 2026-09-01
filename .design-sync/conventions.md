# Animals Vida Digna — building with this design system

A React mirror of the Animals Vida Digna cat-sanctuary site (Catalan/Spanish charity).
Warm, low-contrast, editorial: brown and peach on a cream ground.

## No provider, no wrapper

Components need **no** context provider, theme provider, or root wrapper. Import a
component and render it. The only requirement is that `styles.css` is loaded — it
`@import`s the compiled component CSS, which defines the tokens on `:root`.

## The styling idiom: pre-compiled utilities only

Components are styled with Tailwind utility classes, **but Tailwind does not run here.**
The shipped CSS contains only the utilities this library already uses. A class you
invent — `bg-primary-light`, `p-7`, `gap-x-3` — resolves to nothing and renders unstyled.

Two safe ways to style your own layout glue:

1. **Reuse a class that exists.** Verified present in the shipped CSS:
   - surfaces: `bg-surface` `bg-primary` `bg-primary-dark` `bg-accent` `bg-transparent`
   - text: `text-text` `text-text-muted` `text-primary` `text-primary-dark` `text-surface`
   - borders: `border-primary` `border-surface` `border-t` `border-b` `border-2`
   - radii: `rounded-lg` `rounded-xl` `rounded-2xl` `rounded-full`
   - status tints (used by Badge): `bg-green-100`/`text-green-800`, `bg-blue-100`/`text-blue-800`,
     `bg-amber-100`/`text-amber-800`, `bg-gray-100`/`text-gray-600`
2. **Use the CSS variables directly** for anything else. These are defined on `:root`:
   `--color-primary` `#8b5e3c`, `--color-primary-dark` `#6b4226`, `--color-accent` `#e8a87c`,
   `--color-accent-light` `#f0c4a8`, `--color-surface` `#fff8f0`, `--color-text` `#2d1b0e`,
   `--color-text-muted` `#6b5b4f`, `--radius-lg` `.75rem`, `--radius-xl` `1rem`.
   e.g. `style={{ background: 'var(--color-surface)', padding: '2rem' }}`.

Opacity modifiers (`bg-primary/5`, `text-surface/80`) work only where the library already
uses them. When unsure, prefer a variable in an inline style.

## No translation layer

Every component takes **plain display strings**, already translated. There is no `locale`
prop and no i18n. Pass `statusLabel="Disponible"`, not `status="available" locale="ca"`.
Sample copy in this system is Catalan; Spanish is equally valid.

## Where the truth is

Read `_ds/<folder>/styles.css` and the CSS it imports before styling anything — it is the
authoritative list of what exists. Each component has its own `.d.ts` (the exact props) and
`.prompt.md` (usage) under `components/`.

## Components

Primitives: `Button` `Badge` `Card` `Section` `Input` `Field`
Patterns: `Header` `Hero` `CatCard` `CatTraits` `StatsSection` `ContactCta` `Footer`

`Card` note: passing either `imageSrc` or `imageAlt` renders the media slot — with
`imageSrc` the image, without it a placeholder. Omit both for no media area.

## An idiomatic page

```jsx
<>
  <Header
    links={[{ label: 'Qui som', href: '#qui-som' }, { label: 'Gats', href: '#gats' }]}
    donate={{ label: 'Fes un donatiu', href: '#donatiu' }}
    localeLabel="CA"
  />
  <Hero
    title="Una vida digna per a cada gat"
    subtitle="Rescatem, cuidem i busquem llar per als gats abandonats."
    primaryCta={{ label: "Adopta'm", href: '#gats' }}
    secondaryCta={{ label: 'Fes un donatiu', href: '#donatiu' }}
  />
  <Section title="Els nostres gats" tone="tint" id="gats">
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <CatCard name="Mia" statusLabel="Disponible" status="available"
               description="Tranquil·la i afectuosa." href="#" />
    </div>
  </Section>
  <ContactCta title="Vols saber-ne més?" cta={{ label: 'Contacta', href: '#' }} />
  <Footer links={[{ label: 'Contacte', href: '#' }]} navTitle="Navegació"
          copyright="© 2026 Animals Vida Digna." />
</>
```

`Section` supplies the page shell (max width, padding, heading). Use `tone="tint"` or
`tone="dark"` to alternate bands, exactly as the real site does.
