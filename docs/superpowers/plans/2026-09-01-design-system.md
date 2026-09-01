# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `packages/design-system`, a React mirror of this Astro site's UI, and sync it to a claude.ai/design project so the design agent composes new pages from the sanctuary's real components.

**Architecture:** A private pnpm workspace package holding React mirrors of the site's `.astro` components, styled with Tailwind v4 utilities resolving to the site's own `@theme` tokens. Vite library mode produces `dist/`; Storybook renders one story per component and is the surface `/design-sync` screenshot-verifies previews against. The Astro site never imports this package.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (`@tailwindcss/vite`), Vite (library mode), Storybook 9 (`@storybook/react-vite`), Vitest + `react-dom/server`, Biome (root config).

**Spec:** `docs/superpowers/specs/2026-09-01-design-system-design.md`

## Global Constraints

- Package name `@avd/design-system`, `"private": true`, never versioned or published.
- **Design-time only.** Nothing under `src/` (the Astro site) may import this package. The site's production bundle stays React-free.
- **No i18n.** Components take plain display strings. Never import from `src/i18n/`.
- **Filenames are kebab-case** — Biome `useFilenamingConvention` is error-level. `cat-card.tsx`, `cat-card.stories.tsx`, `cat-card.test.tsx`. Exported component names stay PascalCase.
- **Biome formatting** (root `biome.json`): single quotes in TS, double quotes in JSX, semicolons, 2-space indent, 80-col, trailing commas `es5`, arrow parens always. `useSortedClasses` is error-level on `className` — run `pnpm biome check --write` before every commit and let it sort classes.
- **Token vocabulary is fixed.** Only these custom colors exist: `primary`, `primary-light`, `primary-dark`, `accent`, `accent-light`, `surface`, `text`, `text-muted`. Fonts: `font-sans`, `font-display`. Never invent a token; use a stock Tailwind color (as the status badges do) or an opacity modifier (`bg-primary/5`, `text-surface/80`).
- **Class strings are copied verbatim from the Astro originals.** Where this plan quotes a class list, it came from the source file named beside it. Do not "improve" them — divergence in classes is divergence in design.
- Images are plain `<img>`. Never reference `OptimizedImage.astro`.
- Every component file exports its props interface as `<Name>Props` — design-sync emits it as the `.d.ts` contract the design agent codes against.

---

### Task 1: Workspace conversion

Isolated on purpose. Converting the root into a pnpm workspace regenerates `pnpm-lock.yaml`, and the Cloudflare build installs from that lockfile. This task lands alone so it can be reverted alone.

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `packages/design-system/package.json`
- Create: `packages/design-system/tsconfig.json`

**Interfaces:**
- Consumes: nothing.
- Produces: the `@avd/design-system` package root that every later task writes into; `pnpm --filter @avd/design-system <script>` as the way to run its scripts.

- [ ] **Step 1: Create the workspace file**

`pnpm-workspace.yaml`:

```yaml
packages:
  - '.'
  - 'packages/*'
```

- [ ] **Step 2: Create the package manifest**

`packages/design-system/package.json`:

```json
{
  "name": "@avd/design-system",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./styles.css": "./src/styles.css"
  },
  "scripts": {
    "build": "vite build",
    "storybook": "storybook dev -p 6006 --no-open",
    "build-storybook": "storybook build",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Create the package tsconfig**

`packages/design-system/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "noEmit": true
  },
  "include": ["src", ".storybook", "vite.config.ts"]
}
```

- [ ] **Step 4: Install and confirm the lockfile still satisfies the site**

Run:

```bash
pnpm install
pnpm install --frozen-lockfile
```

Expected: both succeed. The second is the check that matters — it is what Cloudflare runs. If `--frozen-lockfile` fails, the workspace conversion is not safe; stop and report rather than deleting the lockfile.

- [ ] **Step 5: Confirm the site still builds**

Run: `pnpm build`
Expected: the Astro build completes exactly as before. This is the guard on the deploy pipeline.

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml packages/design-system/package.json packages/design-system/tsconfig.json
git commit -m "chore: convert repo to pnpm workspace with design-system package"
```

---

### Task 2: Toolchain — Vite, Tailwind, Vitest, Storybook

Everything the components need in order to build, render styled, and be tested. Lands as one task because none of these pieces is independently reviewable — a Vite config with no Tailwind produces unstyled output, which is the exact failure the whole design system exists to avoid.

**Files:**
- Create: `packages/design-system/vite.config.ts`
- Create: `packages/design-system/src/tokens/tokens.css`
- Create: `packages/design-system/src/styles.css`
- Create: `packages/design-system/src/index.ts`
- Create: `packages/design-system/.storybook/main.ts`
- Create: `packages/design-system/.storybook/preview.ts`
- Create: `packages/design-system/src/test-utils.tsx`
- Create: `packages/design-system/src/tokens/tokens.test.ts`

**Interfaces:**
- Consumes: the package root from Task 1.
- Produces:
  - `renderMarkup(element: ReactElement): string` from `src/test-utils.tsx` — every later task's tests use it.
  - `src/index.ts` as the library entry and barrel; later tasks append exports to it.
  - `src/styles.css` as the single stylesheet design-sync binds.

- [ ] **Step 1: Install dependencies**

```bash
pnpm --filter @avd/design-system add react react-dom
pnpm --filter @avd/design-system add -D @types/react @types/react-dom \
  @vitejs/plugin-react @tailwindcss/vite tailwindcss vite vitest \
  vite-plugin-dts storybook @storybook/react-vite
```

- [ ] **Step 2: Write the Vite config**

`packages/design-system/vite.config.ts` — one config drives the library build, the Storybook dev server, and Vitest:

```ts
/// <reference types="vitest" />
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [react(), tailwindcss(), dts({ include: ['src'] })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AvdDesignSystem',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Copy the tokens**

`packages/design-system/src/tokens/tokens.css` — the `@theme` block copied verbatim from `src/styles/global.css`, with a header naming its origin:

```css
/*
 * Design tokens for the Animals Vida Digna design system.
 *
 * ORIGIN OF TRUTH: src/styles/global.css in the Astro site.
 * These values are a copy. If the site's @theme block changes,
 * update this file and re-run /design-sync.
 */

@theme {
  --color-primary: #8b5e3c;
  --color-primary-light: #a67c5b;
  --color-primary-dark: #6b4226;
  --color-accent: #e8a87c;
  --color-accent-light: #f0c4a8;
  --color-surface: #fff8f0;
  --color-text: #2d1b0e;
  --color-text-muted: #6b5b4f;
  --font-family-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-family-display: system-ui, -apple-system, "Segoe UI", Roboto,
    sans-serif;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

- [ ] **Step 4: Write the stylesheet**

`packages/design-system/src/styles.css`. The `@source` line is load-bearing: without it Tailwind v4 may not scan the component files from a library context, and every preview renders unstyled.

```css
@import "tailwindcss";
@import "./tokens/tokens.css";

@source "./";

@layer base {
  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 5: Create the empty barrel**

`packages/design-system/src/index.ts`:

```ts
export {};
```

- [ ] **Step 6: Write the Storybook config**

`packages/design-system/.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

`packages/design-system/.storybook/preview.ts` — importing `styles.css` here is what makes stories render with the warm palette:

```ts
import type { Preview } from '@storybook/react-vite';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: '#fff8f0' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
```

- [ ] **Step 7: Write the test helper**

`packages/design-system/src/test-utils.tsx`:

```tsx
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Renders a component to static HTML so tests can assert on the
 * markup and class vocabulary without a DOM.
 */
export function renderMarkup(element: ReactElement): string {
  return renderToStaticMarkup(element);
}
```

- [ ] **Step 8: Write the failing tokens test**

`packages/design-system/src/tokens/tokens.test.ts` — this is the guard against silent token drift from the site:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const tokensCss = readFileSync(
  join(__dirname, 'tokens.css'),
  'utf8'
);
const siteCss = readFileSync(
  join(__dirname, '../../../../src/styles/global.css'),
  'utf8'
);

function themeColors(css: string): Record<string, string> {
  const colors: Record<string, string> = {};
  const pattern = /--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g;
  let match = pattern.exec(css);
  while (match !== null) {
    colors[match[1]] = match[2].toLowerCase();
    match = pattern.exec(css);
  }
  return colors;
}

describe('design tokens', () => {
  it('matches the palette in the site global.css', () => {
    expect(themeColors(tokensCss)).toEqual(themeColors(siteCss));
  });
});
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm --filter @avd/design-system test`
Expected: PASS. If it fails, the copy in Step 3 diverged from `src/styles/global.css` — fix the copy, not the test.

- [ ] **Step 10: Verify Storybook boots**

Run: `pnpm --filter @avd/design-system storybook`
Expected: it starts on port 6006 and reports no stories yet. Stop it with Ctrl-C.

- [ ] **Step 11: Format, lint, commit**

```bash
pnpm biome check --write packages/design-system
git add packages/design-system pnpm-lock.yaml
git commit -m "chore(design-system): add vite, tailwind, storybook and test tooling"
```

---

### Task 3: Button and Badge

The two primitives every later component depends on. Classes come from `src/components/landing/HeroSection.astro` (accent and outline CTAs), `src/components/forms/ContactForm.tsx:162` (the solid submit), and the `statusColors` map in `src/components/cats/CatCard.astro`.

**Files:**
- Create: `packages/design-system/src/primitives/button.tsx`
- Create: `packages/design-system/src/primitives/button.test.tsx`
- Create: `packages/design-system/src/primitives/button.stories.tsx`
- Create: `packages/design-system/src/primitives/badge.tsx`
- Create: `packages/design-system/src/primitives/badge.test.tsx`
- Create: `packages/design-system/src/primitives/badge.stories.tsx`
- Modify: `packages/design-system/src/index.ts`

**Interfaces:**
- Consumes: `renderMarkup` from `src/test-utils.tsx`.
- Produces:
  - `Button` with `ButtonProps { children: ReactNode; variant?: 'accent' | 'primary' | 'outline'; size?: 'sm' | 'md'; href?: string; type?: 'button' | 'submit'; disabled?: boolean; fullWidth?: boolean; }`
  - `Badge` with `BadgeProps { label: string; status?: CatStatus; size?: 'sm' | 'md'; }`
  - `type CatStatus = 'available' | 'adopted' | 'treatment' | 'unavailable'` — Task 6 imports this from `./badge`.

- [ ] **Step 1: Write the failing Button test**

`packages/design-system/src/primitives/button.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Button } from './button';

describe('Button', () => {
  it('renders an anchor when href is set', () => {
    const html = renderMarkup(<Button href="/adopt">Adopt</Button>);
    expect(html).toContain('<a');
    expect(html).toContain('href="/adopt"');
    expect(html).toContain('Adopt');
  });

  it('renders a button element without href', () => {
    const html = renderMarkup(<Button type="submit">Send</Button>);
    expect(html).toContain('<button');
    expect(html).toContain('type="submit"');
  });

  it('uses the accent background by default', () => {
    const html = renderMarkup(<Button href="#">Donate</Button>);
    expect(html).toContain('bg-accent');
  });

  it('uses surface borders for the outline variant', () => {
    const html = renderMarkup(
      <Button href="#" variant="outline">
        Donate
      </Button>
    );
    expect(html).toContain('border-surface/30');
    expect(html).not.toContain('bg-accent');
  });

  it('opens external links safely in a new tab', () => {
    const html = renderMarkup(
      <Button href="https://example.org/donate">Donate</Button>
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test button`
Expected: FAIL — cannot resolve `./button`.

- [ ] **Step 3: Implement Button**

`packages/design-system/src/primitives/button.tsx`:

```tsx
import type { ReactNode } from 'react';

export type ButtonVariant = 'accent' | 'primary' | 'outline';

export interface ButtonProps {
  children: ReactNode;
  /** Accent is the site's main CTA; outline sits on dark backgrounds. */
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  /** Renders an anchor instead of a button. */
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  accent:
    'bg-accent text-text transition-colors hover:bg-accent-light',
  primary:
    'bg-primary text-surface transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60',
  outline:
    'border-2 border-surface/30 bg-transparent text-surface transition-colors hover:border-surface hover:bg-surface/10',
};

const SIZES = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3',
};

export function Button({
  children,
  variant = 'accent',
  size = 'md',
  href,
  type = 'button',
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const className = [
    'inline-block rounded-lg font-semibold',
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? 'w-full text-center' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    const isExternal = href.startsWith('http');
    return (
      <a
        className={className}
        href={href}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        target={isExternal ? '_blank' : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <button className={className} disabled={disabled} type={type}>
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test button`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing Badge test**

`packages/design-system/src/primitives/badge.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders the label', () => {
    const html = renderMarkup(<Badge label="Disponible" />);
    expect(html).toContain('Disponible');
  });

  it('colours each status distinctly', () => {
    const available = renderMarkup(
      <Badge label="Disponible" status="available" />
    );
    const adopted = renderMarkup(<Badge label="Adoptat" status="adopted" />);
    expect(available).toContain('bg-green-100');
    expect(adopted).toContain('bg-blue-100');
  });

  it('falls back to grey for an unknown status', () => {
    const html = renderMarkup(<Badge label="?" />);
    expect(html).toContain('bg-gray-100');
  });
});
```

- [ ] **Step 6: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test badge`
Expected: FAIL — cannot resolve `./badge`.

- [ ] **Step 7: Implement Badge**

`packages/design-system/src/primitives/badge.tsx`:

```tsx
export type CatStatus =
  | 'available'
  | 'adopted'
  | 'treatment'
  | 'unavailable';

export interface BadgeProps {
  /** Already-translated status text. */
  label: string;
  status?: CatStatus;
  size?: 'sm' | 'md';
}

const STATUS_COLORS: Record<CatStatus, string> = {
  available: 'bg-green-100 text-green-800',
  adopted: 'bg-blue-100 text-blue-800',
  treatment: 'bg-amber-100 text-amber-800',
  unavailable: 'bg-gray-100 text-gray-600',
};

const FALLBACK = 'bg-gray-100 text-gray-600';

export function Badge({ label, status, size = 'sm' }: BadgeProps) {
  const color = status ? STATUS_COLORS[status] : FALLBACK;
  const sizing =
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-block shrink-0 rounded-full font-medium ${sizing} ${color}`}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 8: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test badge`
Expected: PASS, 3 tests.

- [ ] **Step 9: Write the stories**

`packages/design-system/src/primitives/button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Accent: Story = {
  args: { children: "Adopta'm", href: '#adopt' },
};

export const Primary: Story = {
  args: { children: 'Envia el missatge', variant: 'primary', type: 'submit' },
};

export const Outline: Story = {
  args: { children: 'Fes un donatiu', variant: 'outline', href: '#donate' },
  parameters: { backgrounds: { default: 'dark' } },
  decorators: [
    (Story) => (
      <div className="bg-primary-dark p-8">
        <Story />
      </div>
    ),
  ],
};
```

`packages/design-system/src/primitives/badge.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Available: Story = {
  args: { label: 'Disponible', status: 'available' },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge label="Disponible" status="available" />
      <Badge label="Adoptat" status="adopted" />
      <Badge label="En tractament" status="treatment" />
      <Badge label="No disponible" status="unavailable" />
    </div>
  ),
};
```

- [ ] **Step 10: Export from the barrel**

Replace the contents of `packages/design-system/src/index.ts`:

```ts
export { Badge, type BadgeProps, type CatStatus } from './primitives/badge';
export {
  Button,
  type ButtonProps,
  type ButtonVariant,
} from './primitives/button';
```

- [ ] **Step 11: Verify the stories render styled**

Run: `pnpm --filter @avd/design-system storybook`
Expected: Button and Badge stories appear. The accent button is peach `#E8A87C` with dark brown text, not a default grey browser button. **If it renders unstyled, stop** — the `@source` directive or the `preview.ts` stylesheet import is wrong, and every downstream preview will inherit the fault. Stop it with Ctrl-C.

- [ ] **Step 12: Format, lint, commit**

```bash
pnpm biome check --write packages/design-system
pnpm --filter @avd/design-system test
git add packages/design-system
git commit -m "feat(design-system): add Button and Badge primitives"
```

---

### Task 4: Card and Section

Layout shells. `Card` generalises the cat card's container from `src/components/cats/CatCard.astro`; `Section` generalises the page-section wrapper repeated across `src/components/landing/*.astro`.

**Files:**
- Create: `packages/design-system/src/primitives/card.tsx`
- Create: `packages/design-system/src/primitives/card.test.tsx`
- Create: `packages/design-system/src/primitives/card.stories.tsx`
- Create: `packages/design-system/src/primitives/section.tsx`
- Create: `packages/design-system/src/primitives/section.test.tsx`
- Create: `packages/design-system/src/primitives/section.stories.tsx`
- Modify: `packages/design-system/src/index.ts`

**Interfaces:**
- Consumes: `renderMarkup` from `src/test-utils.tsx`.
- Produces:
  - `Card` with `CardProps { children: ReactNode; href?: string; imageSrc?: string; imageAlt?: string; }` — Task 6 composes `CatCard` from it.
  - `Section` with `SectionProps { children: ReactNode; title?: string; id?: string; tone?: 'surface' | 'tint' | 'dark'; width?: 'wide' | 'narrow'; centered?: boolean; }` — Task 7 builds `StatsSection` and `ContactCta` on it.
  - `type SectionTone = 'surface' | 'tint' | 'dark'`.

- [ ] **Step 1: Write the failing Card test**

`packages/design-system/src/primitives/card.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Card } from './card';

describe('Card', () => {
  it('renders children inside a surface panel', () => {
    const html = renderMarkup(<Card>Content</Card>);
    expect(html).toContain('Content');
    expect(html).toContain('bg-surface');
    expect(html).toContain('rounded-xl');
  });

  it('becomes a link when href is set', () => {
    const html = renderMarkup(<Card href="/cat/mia">Mia</Card>);
    expect(html).toContain('<a');
    expect(html).toContain('href="/cat/mia"');
  });

  it('renders the image in a 4:3 frame', () => {
    const html = renderMarkup(
      <Card imageAlt="Mia" imageSrc="/mia.webp">
        Mia
      </Card>
    );
    expect(html).toContain('aspect-[4/3]');
    expect(html).toContain('src="/mia.webp"');
    expect(html).toContain('alt="Mia"');
  });

  it('shows a placeholder when there is no image', () => {
    const html = renderMarkup(<Card imageAlt="">Mia</Card>);
    expect(html).toContain('bg-primary/5');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test card`
Expected: FAIL — cannot resolve `./card`.

- [ ] **Step 3: Implement Card**

`packages/design-system/src/primitives/card.tsx`:

```tsx
import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  /** Renders the whole card as a link. */
  href?: string;
  imageSrc?: string;
  imageAlt?: string;
}

function Media({ src, alt }: { src?: string; alt?: string }) {
  if (src) {
    return (
      <div className="aspect-[4/3] overflow-hidden">
        <img
          alt={alt ?? ''}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          src={src}
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center bg-primary/5">
      <svg
        className="h-16 w-16 text-primary/20"
        fill="currentColor"
        role="presentation"
        viewBox="0 0 24 24"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    </div>
  );
}

export function Card({ children, href, imageSrc, imageAlt }: CardProps) {
  const className =
    'group block overflow-hidden rounded-xl bg-surface shadow-sm transition-shadow hover:shadow-md';
  const hasMedia = imageSrc !== undefined || imageAlt !== undefined;
  const content = (
    <>
      {hasMedia ? <Media alt={imageAlt} src={imageSrc} /> : null}
      <div className="p-4">{children}</div>
    </>
  );

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test card`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing Section test**

`packages/design-system/src/primitives/section.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Section } from './section';

describe('Section', () => {
  it('renders a heading when given a title', () => {
    const html = renderMarkup(<Section title="Els nostres gats">Body</Section>);
    expect(html).toContain('<h2');
    expect(html).toContain('Els nostres gats');
    expect(html).toContain('font-display');
  });

  it('omits the heading when there is no title', () => {
    const html = renderMarkup(<Section>Body</Section>);
    expect(html).not.toContain('<h2');
  });

  it('inverts text colour on the dark tone', () => {
    const html = renderMarkup(<Section tone="dark">Body</Section>);
    expect(html).toContain('bg-primary-dark');
    expect(html).toContain('text-surface');
  });

  it('uses a tinted background for the tint tone', () => {
    const html = renderMarkup(<Section tone="tint">Body</Section>);
    expect(html).toContain('bg-primary/5');
  });

  it('sets the anchor id', () => {
    const html = renderMarkup(<Section id="gats">Body</Section>);
    expect(html).toContain('id="gats"');
  });
});
```

- [ ] **Step 6: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test section`
Expected: FAIL — cannot resolve `./section`.

- [ ] **Step 7: Implement Section**

`packages/design-system/src/primitives/section.tsx`:

```tsx
import type { ReactNode } from 'react';

export type SectionTone = 'surface' | 'tint' | 'dark';

export interface SectionProps {
  children: ReactNode;
  /** Section heading, already translated. */
  title?: string;
  id?: string;
  tone?: SectionTone;
  width?: 'wide' | 'narrow';
  centered?: boolean;
}

const TONES: Record<SectionTone, string> = {
  surface: 'bg-surface',
  tint: 'bg-primary/5',
  dark: 'bg-primary-dark text-surface',
};

export function Section({
  children,
  title,
  id,
  tone = 'surface',
  width = 'wide',
  centered = false,
}: SectionProps) {
  const inner = width === 'wide' ? 'max-w-7xl' : 'max-w-4xl';
  const heading =
    tone === 'dark'
      ? 'font-display text-3xl font-bold sm:text-4xl'
      : 'font-display text-3xl font-bold text-primary sm:text-4xl';

  return (
    <section className={`py-16 sm:py-24 ${TONES[tone]}`} id={id}>
      <div
        className={`mx-auto px-4 sm:px-6 ${inner} ${centered ? 'text-center' : ''}`}
      >
        {title ? <h2 className={`mb-12 text-center ${heading}`}>{title}</h2> : null}
        {children}
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test section`
Expected: PASS, 5 tests.

- [ ] **Step 9: Write the stories**

`packages/design-system/src/primitives/card.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './card';

const meta: Meta<typeof Card> = {
  title: 'Primitives/Card',
  component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

export const WithPlaceholder: Story = {
  args: {
    imageAlt: '',
    children: <p className="text-text">Una targeta sense imatge</p>,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export const Linked: Story = {
  args: {
    href: '#',
    imageAlt: '',
    children: <p className="text-text">Tota la targeta és un enllaç</p>,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};
```

`packages/design-system/src/primitives/section.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from './section';

const meta: Meta<typeof Section> = {
  title: 'Primitives/Section',
  component: Section,
};

export default meta;
type Story = StoryObj<typeof Section>;

export const Tinted: Story = {
  args: {
    title: 'Les nostres colònies',
    tone: 'tint',
    children: <p className="text-center text-text-muted">Contingut</p>,
  },
};

export const Dark: Story = {
  args: {
    title: 'Contacta amb nosaltres',
    tone: 'dark',
    width: 'narrow',
    children: <p className="text-center text-surface/80">Contingut</p>,
  },
};
```

- [ ] **Step 10: Export from the barrel**

Add to `packages/design-system/src/index.ts`:

```ts
export { Card, type CardProps } from './primitives/card';
export {
  Section,
  type SectionProps,
  type SectionTone,
} from './primitives/section';
```

- [ ] **Step 11: Format, lint, commit**

```bash
pnpm biome check --write packages/design-system
pnpm --filter @avd/design-system test
git add packages/design-system
git commit -m "feat(design-system): add Card and Section primitives"
```

---

### Task 5: Input and Field

Form primitives. Classes come from `inputClass` and `errorClass` at `src/components/forms/ContactForm.tsx:99-100` and the label at line 118.

**Files:**
- Create: `packages/design-system/src/primitives/input.tsx`
- Create: `packages/design-system/src/primitives/input.test.tsx`
- Create: `packages/design-system/src/primitives/field.tsx`
- Create: `packages/design-system/src/primitives/field.test.tsx`
- Create: `packages/design-system/src/primitives/field.stories.tsx`
- Modify: `packages/design-system/src/index.ts`

**Interfaces:**
- Consumes: `renderMarkup` from `src/test-utils.tsx`.
- Produces:
  - `Input` with `InputProps { id: string; name?: string; type?: 'text' | 'email' | 'tel' | 'textarea'; placeholder?: string; rows?: number; required?: boolean; defaultValue?: string; }`
  - `Field` with `FieldProps { id: string; label: string; error?: string; children: ReactNode; }`

- [ ] **Step 1: Write the failing Input test**

`packages/design-system/src/primitives/input.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Input } from './input';

describe('Input', () => {
  it('renders a text input by default', () => {
    const html = renderMarkup(<Input id="name" />);
    expect(html).toContain('<input');
    expect(html).toContain('type="text"');
    expect(html).toContain('id="name"');
  });

  it('renders a textarea when asked', () => {
    const html = renderMarkup(<Input id="message" rows={5} type="textarea" />);
    expect(html).toContain('<textarea');
    expect(html).toContain('rows="5"');
  });

  it('carries the shared field styling', () => {
    const html = renderMarkup(<Input id="email" type="email" />);
    expect(html).toContain('border-primary/20');
    expect(html).toContain('bg-surface');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test input`
Expected: FAIL — cannot resolve `./input`.

- [ ] **Step 3: Implement Input**

`packages/design-system/src/primitives/input.tsx`:

```tsx
export interface InputProps {
  id: string;
  name?: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  placeholder?: string;
  /** Textarea height; ignored for single-line inputs. */
  rows?: number;
  required?: boolean;
  defaultValue?: string;
}

const INPUT_CLASS =
  'w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none';

export function Input({
  id,
  name,
  type = 'text',
  placeholder,
  rows = 4,
  required = false,
  defaultValue,
}: InputProps) {
  if (type === 'textarea') {
    return (
      <textarea
        className={INPUT_CLASS}
        defaultValue={defaultValue}
        id={id}
        name={name ?? id}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
    );
  }

  return (
    <input
      className={INPUT_CLASS}
      defaultValue={defaultValue}
      id={id}
      name={name ?? id}
      placeholder={placeholder}
      required={required}
      type={type}
    />
  );
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test input`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing Field test**

`packages/design-system/src/primitives/field.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Field } from './field';
import { Input } from './input';

describe('Field', () => {
  it('links the label to the control', () => {
    const html = renderMarkup(
      <Field id="name" label="Nom">
        <Input id="name" />
      </Field>
    );
    expect(html).toContain('for="name"');
    expect(html).toContain('Nom');
  });

  it('renders no error text by default', () => {
    const html = renderMarkup(
      <Field id="name" label="Nom">
        <Input id="name" />
      </Field>
    );
    expect(html).not.toContain('text-red-600');
  });

  it('renders the error when given one', () => {
    const html = renderMarkup(
      <Field error="Camp obligatori" id="name" label="Nom">
        <Input id="name" />
      </Field>
    );
    expect(html).toContain('Camp obligatori');
    expect(html).toContain('text-red-600');
  });
});
```

- [ ] **Step 6: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test field`
Expected: FAIL — cannot resolve `./field`.

- [ ] **Step 7: Implement Field**

`packages/design-system/src/primitives/field.tsx`:

```tsx
import type { ReactNode } from 'react';

export interface FieldProps {
  /** Must match the id of the control passed as children. */
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="mb-5">
      <label
        className="mb-1 block font-medium text-sm text-text"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-red-600 text-xs">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 8: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test field`
Expected: PASS, 3 tests.

- [ ] **Step 9: Write the story**

`packages/design-system/src/primitives/field.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Field } from './field';
import { Input } from './input';

const meta: Meta<typeof Field> = {
  title: 'Primitives/Field',
  component: Field,
};

export default meta;
type Story = StoryObj<typeof Field>;

export const ContactForm: Story = {
  render: () => (
    <form className="max-w-md">
      <Field id="contact-name" label="Nom">
        <Input id="contact-name" required />
      </Field>
      <Field id="contact-email" label="Correu electrònic">
        <Input id="contact-email" required type="email" />
      </Field>
      <Field
        error="El missatge és obligatori"
        id="contact-message"
        label="Missatge"
      >
        <Input id="contact-message" rows={4} type="textarea" />
      </Field>
      <Button fullWidth type="submit" variant="primary">
        Envia
      </Button>
    </form>
  ),
};
```

- [ ] **Step 10: Export from the barrel**

Add to `packages/design-system/src/index.ts`:

```ts
export { Field, type FieldProps } from './primitives/field';
export { Input, type InputProps } from './primitives/input';
```

- [ ] **Step 11: Format, lint, commit**

```bash
pnpm biome check --write packages/design-system
pnpm --filter @avd/design-system test
git add packages/design-system
git commit -m "feat(design-system): add Input and Field primitives"
```

---

### Task 6: CatCard and CatTraits

The first patterns. Mirrors `src/components/cats/CatCard.astro` and `src/components/cats/CatTraits.astro`. Where the Astro originals call `t(locale, ...)` these take the resulting display string.

**Files:**
- Create: `packages/design-system/src/patterns/cat-card.tsx`
- Create: `packages/design-system/src/patterns/cat-card.test.tsx`
- Create: `packages/design-system/src/patterns/cat-card.stories.tsx`
- Create: `packages/design-system/src/patterns/cat-traits.tsx`
- Create: `packages/design-system/src/patterns/cat-traits.test.tsx`
- Create: `packages/design-system/src/patterns/cat-traits.stories.tsx`
- Modify: `packages/design-system/src/index.ts`

**Interfaces:**
- Consumes: `Card`/`CardProps` from `../primitives/card`; `Badge` and `CatStatus` from `../primitives/badge`.
- Produces:
  - `CatCard` with `CatCardProps { name: string; description?: string; statusLabel: string; status?: CatStatus; imageSrc?: string; imageAlt?: string; href?: string; }`
  - `CatTraits` with `CatTraitsProps { statusLabel: string; status?: CatStatus; traits: Array<{ term: string; value: string }>; personalityTitle?: string; personality?: string[]; goodWithTitle?: string; goodWith?: string[]; }`

- [ ] **Step 1: Write the failing CatCard test**

`packages/design-system/src/patterns/cat-card.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { CatCard } from './cat-card';

describe('CatCard', () => {
  it('renders the name and status', () => {
    const html = renderMarkup(
      <CatCard name="Mia" status="available" statusLabel="Disponible" />
    );
    expect(html).toContain('Mia');
    expect(html).toContain('Disponible');
    expect(html).toContain('bg-green-100');
  });

  it('styles the name as a display heading', () => {
    const html = renderMarkup(<CatCard name="Mia" statusLabel="Disponible" />);
    expect(html).toContain('<h3');
    expect(html).toContain('font-display');
    expect(html).toContain('text-primary');
  });

  it('clamps the description to two lines', () => {
    const html = renderMarkup(
      <CatCard
        description="Una gata molt caristosa"
        name="Mia"
        statusLabel="Disponible"
      />
    );
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('Una gata molt caristosa');
  });

  it('omits the description paragraph when absent', () => {
    const html = renderMarkup(<CatCard name="Mia" statusLabel="Disponible" />);
    expect(html).not.toContain('line-clamp-2');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test cat-card`
Expected: FAIL — cannot resolve `./cat-card`.

- [ ] **Step 3: Implement CatCard**

`packages/design-system/src/patterns/cat-card.tsx`:

```tsx
import { Badge, type CatStatus } from '../primitives/badge';
import { Card } from '../primitives/card';

export interface CatCardProps {
  name: string;
  /** Short blurb, clamped to two lines. */
  description?: string;
  /** Already-translated status text, e.g. "Disponible". */
  statusLabel: string;
  status?: CatStatus;
  imageSrc?: string;
  imageAlt?: string;
  href?: string;
}

export function CatCard({
  name,
  description,
  statusLabel,
  status,
  imageSrc,
  imageAlt,
  href,
}: CatCardProps) {
  return (
    <Card href={href} imageAlt={imageAlt ?? name} imageSrc={imageSrc}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-bold font-display text-lg text-primary">{name}</h3>
        <Badge label={statusLabel} status={status} />
      </div>
      {description ? (
        <p className="line-clamp-2 text-sm text-text-muted">{description}</p>
      ) : null}
    </Card>
  );
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test cat-card`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing CatTraits test**

`packages/design-system/src/patterns/cat-traits.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { CatTraits } from './cat-traits';

const traits = [
  { term: 'Raça', value: 'Comú europeu' },
  { term: 'Edat', value: '3 anys' },
];

describe('CatTraits', () => {
  it('renders each trait as a term and value pair', () => {
    const html = renderMarkup(
      <CatTraits statusLabel="Disponible" traits={traits} />
    );
    expect(html).toContain('<dt');
    expect(html).toContain('Raça');
    expect(html).toContain('Comú europeu');
    expect(html).toContain('3 anys');
  });

  it('renders personality tags in accent pills', () => {
    const html = renderMarkup(
      <CatTraits
        personality={['Juganera', 'Tranquil·la']}
        personalityTitle="Personalitat"
        statusLabel="Disponible"
        traits={traits}
      />
    );
    expect(html).toContain('bg-accent/10');
    expect(html).toContain('Juganera');
    expect(html).toContain('Personalitat');
  });

  it('omits the personality block when the list is empty', () => {
    const html = renderMarkup(
      <CatTraits
        personality={[]}
        personalityTitle="Personalitat"
        statusLabel="Disponible"
        traits={traits}
      />
    );
    expect(html).not.toContain('Personalitat');
  });
});
```

- [ ] **Step 6: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test cat-traits`
Expected: FAIL — cannot resolve `./cat-traits`.

- [ ] **Step 7: Implement CatTraits**

`packages/design-system/src/patterns/cat-traits.tsx`:

```tsx
import { Badge, type CatStatus } from '../primitives/badge';

export interface CatTrait {
  /** Label, already translated, e.g. "Edat". */
  term: string;
  /** Display value, already formatted, e.g. "3 anys". */
  value: string;
}

export interface CatTraitsProps {
  statusLabel: string;
  status?: CatStatus;
  traits: CatTrait[];
  personalityTitle?: string;
  personality?: string[];
  goodWithTitle?: string;
  goodWith?: string[];
}

function TagList({ title, tags }: { title?: string; tags?: string[] }) {
  if (!title || !tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="mb-2 font-medium text-sm text-text-muted">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            className="rounded-full bg-accent/10 px-3 py-1 font-medium text-primary-dark text-xs"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CatTraits({
  statusLabel,
  status,
  traits,
  personalityTitle,
  personality,
  goodWithTitle,
  goodWith,
}: CatTraitsProps) {
  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm">
      <div className="mb-4">
        <Badge label={statusLabel} size="md" status={status} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {traits.map((trait) => (
          <div className="contents" key={trait.term}>
            <dt className="font-medium text-text-muted">{trait.term}</dt>
            <dd className="text-text">{trait.value}</dd>
          </div>
        ))}
      </dl>
      <TagList tags={personality} title={personalityTitle} />
      <TagList tags={goodWith} title={goodWithTitle} />
    </div>
  );
}
```

- [ ] **Step 8: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test cat-traits`
Expected: PASS, 3 tests.

- [ ] **Step 9: Write the stories**

`packages/design-system/src/patterns/cat-card.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CatCard } from './cat-card';

const meta: Meta<typeof CatCard> = {
  title: 'Patterns/CatCard',
  component: CatCard,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CatCard>;

export const Available: Story = {
  args: {
    name: 'Mia',
    description:
      'Una gata tranquil·la que busca una llar on prendre el sol cada tarda.',
    statusLabel: 'Disponible',
    status: 'available',
    href: '#',
  },
};

export const Adopted: Story = {
  args: {
    name: 'Nil',
    description: 'Ja ha trobat una família.',
    statusLabel: 'Adoptat',
    status: 'adopted',
    href: '#',
  },
};

export const Grid: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-5xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <CatCard name="Mia" status="available" statusLabel="Disponible" />
      <CatCard name="Nil" status="adopted" statusLabel="Adoptat" />
      <CatCard name="Lluna" status="treatment" statusLabel="En tractament" />
    </div>
  ),
};
```

`packages/design-system/src/patterns/cat-traits.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CatTraits } from './cat-traits';

const meta: Meta<typeof CatTraits> = {
  title: 'Patterns/CatTraits',
  component: CatTraits,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CatTraits>;

export const FullProfile: Story = {
  args: {
    statusLabel: 'Disponible',
    status: 'available',
    traits: [
      { term: 'Raça', value: 'Comú europeu' },
      { term: 'Edat', value: '3 anys' },
      { term: 'Sexe', value: 'Femella' },
      { term: 'Mida', value: 'Mitjana' },
      { term: 'Pes', value: '4 kg' },
      { term: 'Salut', value: 'Sana' },
    ],
    personalityTitle: 'Personalitat',
    personality: ['Juganera', 'Tranquil·la', 'Afectuosa'],
    goodWithTitle: 'Compatible amb',
    goodWith: ['Nens', 'Altres gats'],
  },
};
```

- [ ] **Step 10: Export from the barrel**

Add to `packages/design-system/src/index.ts`:

```ts
export { CatCard, type CatCardProps } from './patterns/cat-card';
export {
  CatTraits,
  type CatTrait,
  type CatTraitsProps,
} from './patterns/cat-traits';
```

- [ ] **Step 11: Format, lint, commit**

```bash
pnpm biome check --write packages/design-system
pnpm --filter @avd/design-system test
git add packages/design-system
git commit -m "feat(design-system): add CatCard and CatTraits patterns"
```

---

### Task 7: Hero, StatsSection and ContactCta

The landing-page sections the design agent will reach for most. Mirrors `src/components/landing/HeroSection.astro`, `StatsSection.astro` and `ContactCtaSection.astro`.

**Files:**
- Create: `packages/design-system/src/patterns/hero.tsx`
- Create: `packages/design-system/src/patterns/hero.test.tsx`
- Create: `packages/design-system/src/patterns/hero.stories.tsx`
- Create: `packages/design-system/src/patterns/stats-section.tsx`
- Create: `packages/design-system/src/patterns/stats-section.test.tsx`
- Create: `packages/design-system/src/patterns/stats-section.stories.tsx`
- Create: `packages/design-system/src/patterns/contact-cta.tsx`
- Create: `packages/design-system/src/patterns/contact-cta.test.tsx`
- Create: `packages/design-system/src/patterns/contact-cta.stories.tsx`
- Modify: `packages/design-system/src/index.ts`

**Interfaces:**
- Consumes: `Button` from `../primitives/button`; `Section` from `../primitives/section`.
- Produces:
  - `Hero` with `HeroProps { title: string; subtitle?: string; primaryCta?: CtaLink; secondaryCta?: CtaLink; imageSrc?: string; imageAlt?: string; }`
  - `type CtaLink = { label: string; href: string }` — exported from `hero.tsx`, imported by `contact-cta.tsx`.
  - `StatsSection` with `StatsSectionProps { title?: string; items: Array<{ value: string; label: string }>; }`
  - `ContactCta` with `ContactCtaProps { title: string; subtitle?: string; cta?: CtaLink; id?: string; }`

- [ ] **Step 1: Write the failing Hero test**

`packages/design-system/src/patterns/hero.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Hero } from './hero';

describe('Hero', () => {
  it('renders the title as an h1 on the dark band', () => {
    const html = renderMarkup(<Hero title="Una vida digna" />);
    expect(html).toContain('<h1');
    expect(html).toContain('Una vida digna');
    expect(html).toContain('bg-primary-dark');
    expect(html).toContain('text-surface');
  });

  it('renders both calls to action', () => {
    const html = renderMarkup(
      <Hero
        primaryCta={{ label: "Adopta'm", href: '#gats' }}
        secondaryCta={{ label: 'Fes un donatiu', href: 'https://example.org' }}
        title="Una vida digna"
      />
    );
    expect(html).toContain("Adopta'm");
    expect(html).toContain('bg-accent');
    expect(html).toContain('Fes un donatiu');
    expect(html).toContain('border-surface/30');
  });

  it('renders the image when given one', () => {
    const html = renderMarkup(
      <Hero imageAlt="Gats al refugi" imageSrc="/hero.webp" title="Hola" />
    );
    expect(html).toContain('src="/hero.webp"');
    expect(html).toContain('alt="Gats al refugi"');
  });

  it('omits the subtitle paragraph when absent', () => {
    const html = renderMarkup(<Hero title="Hola" />);
    expect(html).not.toContain('text-surface/80');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test hero`
Expected: FAIL — cannot resolve `./hero`.

- [ ] **Step 3: Implement Hero**

`packages/design-system/src/patterns/hero.tsx`:

```tsx
import { Button } from '../primitives/button';

export interface CtaLink {
  label: string;
  href: string;
}

export interface HeroProps {
  title: string;
  subtitle?: string;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  imageSrc?: string;
  imageAlt?: string;
}

export function Hero({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  imageSrc,
  imageAlt,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-primary-dark py-20 text-surface sm:py-28">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 sm:px-6 lg:flex-row lg:gap-16">
        <div className="flex-1 text-center lg:text-left">
          <h1 className="font-bold font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mx-auto mt-4 max-w-xl text-lg text-surface/80 lg:mx-0">
              {subtitle}
            </p>
          ) : null}
          {primaryCta || secondaryCta ? (
            <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
              {primaryCta ? (
                <Button href={primaryCta.href}>{primaryCta.label}</Button>
              ) : null}
              {secondaryCta ? (
                <Button href={secondaryCta.href} variant="outline">
                  {secondaryCta.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {imageSrc ? (
          <div className="flex-1">
            <img
              alt={imageAlt ?? ''}
              className="mx-auto max-h-96 w-full rounded-2xl object-cover shadow-xl lg:max-h-[28rem]"
              src={imageSrc}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test hero`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing StatsSection test**

`packages/design-system/src/patterns/stats-section.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { StatsSection } from './stats-section';

const items = [
  { value: '120', label: 'Gats rescatats' },
  { value: '85', label: 'Adopcions' },
];

describe('StatsSection', () => {
  it('renders every stat value and label', () => {
    const html = renderMarkup(<StatsSection items={items} />);
    expect(html).toContain('120');
    expect(html).toContain('Gats rescatats');
    expect(html).toContain('85');
    expect(html).toContain('Adopcions');
  });

  it('renders values large in the display font', () => {
    const html = renderMarkup(<StatsSection items={items} />);
    expect(html).toContain('font-display');
    expect(html).toContain('text-4xl');
    expect(html).toContain('text-primary-dark');
  });

  it('sits on the tinted background', () => {
    const html = renderMarkup(<StatsSection items={items} />);
    expect(html).toContain('bg-primary/5');
  });
});
```

- [ ] **Step 6: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test stats-section`
Expected: FAIL — cannot resolve `./stats-section`.

- [ ] **Step 7: Implement StatsSection**

`packages/design-system/src/patterns/stats-section.tsx`:

```tsx
import { Section } from '../primitives/section';

export interface Stat {
  /** The number itself, pre-formatted, e.g. "120" or "1.2k". */
  value: string;
  label: string;
}

export interface StatsSectionProps {
  title?: string;
  items: Stat[];
  id?: string;
}

export function StatsSection({ title, items, id }: StatsSectionProps) {
  return (
    <Section id={id} title={title} tone="tint">
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div className="text-center" key={item.label}>
            <p className="font-bold font-display text-4xl text-primary-dark sm:text-5xl">
              {item.value}
            </p>
            <p className="mt-2 font-medium text-sm text-text-muted sm:text-base">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 8: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test stats-section`
Expected: PASS, 3 tests.

- [ ] **Step 9: Write the failing ContactCta test**

`packages/design-system/src/patterns/contact-cta.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { ContactCta } from './contact-cta';

describe('ContactCta', () => {
  it('renders on the dark band with an accent button', () => {
    const html = renderMarkup(
      <ContactCta
        cta={{ label: 'Contacta', href: '/contact' }}
        title="Parlem"
      />
    );
    expect(html).toContain('bg-primary-dark');
    expect(html).toContain('Parlem');
    expect(html).toContain('bg-accent');
    expect(html).toContain('Contacta');
  });

  it('sets the anchor id for in-page navigation', () => {
    const html = renderMarkup(<ContactCta id="contacte" title="Parlem" />);
    expect(html).toContain('id="contacte"');
  });

  it('renders without a call to action', () => {
    const html = renderMarkup(<ContactCta title="Parlem" />);
    expect(html).not.toContain('<a');
  });
});
```

- [ ] **Step 10: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test contact-cta`
Expected: FAIL — cannot resolve `./contact-cta`.

- [ ] **Step 11: Implement ContactCta**

`packages/design-system/src/patterns/contact-cta.tsx`:

```tsx
import { Button } from '../primitives/button';
import { Section } from '../primitives/section';
import type { CtaLink } from './hero';

export interface ContactCtaProps {
  title: string;
  subtitle?: string;
  cta?: CtaLink;
  id?: string;
}

export function ContactCta({ title, subtitle, cta, id }: ContactCtaProps) {
  return (
    <Section centered id={id} title={title} tone="dark" width="narrow">
      {subtitle ? (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-surface/80">
          {subtitle}
        </p>
      ) : null}
      {cta ? (
        <div className="mt-8">
          <Button href={cta.href}>{cta.label}</Button>
        </div>
      ) : null}
    </Section>
  );
}
```

- [ ] **Step 12: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test contact-cta`
Expected: PASS, 3 tests.

- [ ] **Step 13: Write the stories**

`packages/design-system/src/patterns/hero.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hero } from './hero';

const meta: Meta<typeof Hero> = {
  title: 'Patterns/Hero',
  component: Hero,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Hero>;

export const Landing: Story = {
  args: {
    title: 'Una vida digna per a cada gat',
    subtitle:
      'Rescatem, cuidem i busquem llar per als gats abandonats de la comarca.',
    primaryCta: { label: "Adopta'm", href: '#gats' },
    secondaryCta: { label: 'Fes un donatiu', href: '#donatiu' },
  },
};

export const TextOnly: Story = {
  args: {
    title: 'Col·labora amb nosaltres',
    subtitle: 'Cada ajuda compta, per petita que sigui.',
  },
};
```

`packages/design-system/src/patterns/stats-section.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatsSection } from './stats-section';

const meta: Meta<typeof StatsSection> = {
  title: 'Patterns/StatsSection',
  component: StatsSection,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof StatsSection>;

export const Landing: Story = {
  args: {
    title: 'La nostra feina en xifres',
    items: [
      { value: '312', label: 'Gats rescatats' },
      { value: '248', label: 'Adopcions' },
      { value: '14', label: 'Colònies cuidades' },
      { value: '40', label: 'Voluntaris' },
    ],
  },
};
```

`packages/design-system/src/patterns/contact-cta.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContactCta } from './contact-cta';

const meta: Meta<typeof ContactCta> = {
  title: 'Patterns/ContactCta',
  component: ContactCta,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ContactCta>;

export const Landing: Story = {
  args: {
    id: 'contacte',
    title: 'Vols saber-ne més?',
    subtitle:
      'Escriu-nos i et respondrem tan aviat com puguem. Sempre busquem mans que ajudin.',
    cta: { label: 'Contacta amb nosaltres', href: '/contact' },
  },
};
```

- [ ] **Step 14: Export from the barrel**

Add to `packages/design-system/src/index.ts`:

```ts
export { ContactCta, type ContactCtaProps } from './patterns/contact-cta';
export { Hero, type CtaLink, type HeroProps } from './patterns/hero';
export {
  StatsSection,
  type Stat,
  type StatsSectionProps,
} from './patterns/stats-section';
```

- [ ] **Step 15: Format, lint, commit**

```bash
pnpm biome check --write packages/design-system
pnpm --filter @avd/design-system test
git add packages/design-system
git commit -m "feat(design-system): add Hero, StatsSection and ContactCta patterns"
```

---

### Task 8: Header and Footer

The page chrome. Mirrors `src/components/Header.astro` and `src/components/Footer.astro`.

The Astro header ships a `<script>` that toggles the mobile menu, and mounts `LanguageSwitcher` as an island. Neither is mirrored: the design agent needs the header's *appearance*, not its behaviour. The mobile menu button renders as a static button, and the language switcher becomes a plain `localeLabel` string.

**Files:**
- Create: `packages/design-system/src/patterns/header.tsx`
- Create: `packages/design-system/src/patterns/header.test.tsx`
- Create: `packages/design-system/src/patterns/header.stories.tsx`
- Create: `packages/design-system/src/patterns/footer.tsx`
- Create: `packages/design-system/src/patterns/footer.test.tsx`
- Create: `packages/design-system/src/patterns/footer.stories.tsx`
- Modify: `packages/design-system/src/index.ts`

**Interfaces:**
- Consumes: `Button` from `../primitives/button`; `CtaLink` from `./hero`.
- Produces:
  - `NavLink = { label: string; href: string }` — exported from `header.tsx`.
  - `Header` with `HeaderProps { brand?: string; logoSrc?: string; homeHref?: string; links: NavLink[]; donate?: CtaLink; localeLabel?: string; }`
  - `Footer` with `FooterProps { brand?: string; logoSrc?: string; homeHref?: string; tagline?: string; navTitle?: string; links: NavLink[]; socialTitle?: string; donate?: CtaLink; copyright?: string; }`

- [ ] **Step 1: Write the failing Header test**

`packages/design-system/src/patterns/header.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Header } from './header';

const links = [
  { label: 'Qui som', href: '/#qui-som' },
  { label: 'Gats', href: '/#gats' },
];

describe('Header', () => {
  it('sticks to the top with a translucent surface', () => {
    const html = renderMarkup(<Header links={links} />);
    expect(html).toContain('sticky');
    expect(html).toContain('bg-surface/80');
    expect(html).toContain('backdrop-blur-md');
  });

  it('renders every navigation link', () => {
    const html = renderMarkup(<Header links={links} />);
    expect(html).toContain('Qui som');
    expect(html).toContain('href="/#gats"');
  });

  it('renders the donate button in accent', () => {
    const html = renderMarkup(
      <Header donate={{ label: 'Donatiu', href: '#' }} links={links} />
    );
    expect(html).toContain('Donatiu');
    expect(html).toContain('bg-accent');
  });

  it('renders the brand name', () => {
    const html = renderMarkup(<Header brand="Animals Vida Digna" links={links} />);
    expect(html).toContain('Animals Vida Digna');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test header`
Expected: FAIL — cannot resolve `./header`.

- [ ] **Step 3: Implement Header**

`packages/design-system/src/patterns/header.tsx`:

```tsx
import { Button } from '../primitives/button';
import type { CtaLink } from './hero';

export interface NavLink {
  label: string;
  href: string;
}

export interface HeaderProps {
  brand?: string;
  logoSrc?: string;
  homeHref?: string;
  links: NavLink[];
  donate?: CtaLink;
  /** Static label standing in for the language switcher, e.g. "CA". */
  localeLabel?: string;
}

export function Header({
  brand = 'Animals Vida Digna',
  logoSrc = '/images/logo.webp',
  homeHref = '/',
  links,
  donate,
  localeLabel,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-primary/10 border-b bg-surface/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <a className="flex items-center gap-2" href={homeHref}>
          <img alt={brand} className="h-10 w-auto" src={logoSrc} />
          <span className="hidden font-bold font-display text-lg text-primary sm:inline">
            {brand}
          </span>
        </a>

        <ul className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                className="font-medium text-sm text-text-muted transition-colors hover:text-primary"
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {donate ? (
            <Button href={donate.href} size="sm">
              {donate.label}
            </Button>
          ) : null}
          {localeLabel ? (
            <span className="font-medium text-sm text-text-muted">
              {localeLabel}
            </span>
          ) : null}
          <button
            aria-label="Menu"
            className="inline-flex items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:text-primary md:hidden"
            type="button"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              role="presentation"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test header`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing Footer test**

`packages/design-system/src/patterns/footer.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Footer } from './footer';

const links = [
  { label: 'Qui som', href: '/#qui-som' },
  { label: 'Contacte', href: '/#contacte' },
];

describe('Footer', () => {
  it('renders dark with surface text', () => {
    const html = renderMarkup(<Footer links={links} />);
    expect(html).toContain('bg-primary-dark');
    expect(html).toContain('text-surface');
  });

  it('renders the navigation links', () => {
    const html = renderMarkup(<Footer links={links} navTitle="Navegació" />);
    expect(html).toContain('Navegació');
    expect(html).toContain('Qui som');
    expect(html).toContain('href="/#contacte"');
  });

  it('renders the tagline and copyright', () => {
    const html = renderMarkup(
      <Footer
        copyright="© 2026 Animals Vida Digna"
        links={links}
        tagline="Refugi de gats"
      />
    );
    expect(html).toContain('Refugi de gats');
    expect(html).toContain('© 2026 Animals Vida Digna');
  });

  it('brightens the logo against the dark background', () => {
    const html = renderMarkup(<Footer links={links} />);
    expect(html).toContain('brightness-200');
  });
});
```

- [ ] **Step 6: Run it to make sure it fails**

Run: `pnpm --filter @avd/design-system test footer`
Expected: FAIL — cannot resolve `./footer`.

- [ ] **Step 7: Implement Footer**

`packages/design-system/src/patterns/footer.tsx`:

```tsx
import { Button } from '../primitives/button';
import type { CtaLink } from './hero';
import type { NavLink } from './header';

export interface FooterProps {
  brand?: string;
  logoSrc?: string;
  homeHref?: string;
  tagline?: string;
  navTitle?: string;
  links: NavLink[];
  socialTitle?: string;
  donate?: CtaLink;
  copyright?: string;
}

const COLUMN_TITLE =
  'mb-3 font-semibold text-sm text-surface/50 uppercase tracking-wider';

export function Footer({
  brand = 'Animals Vida Digna',
  logoSrc = '/images/logo.webp',
  homeHref = '/',
  tagline,
  navTitle,
  links,
  socialTitle,
  donate,
  copyright,
}: FooterProps) {
  return (
    <footer className="border-primary/10 border-t bg-primary-dark text-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <a className="flex items-center gap-2" href={homeHref}>
              <img
                alt={brand}
                className="h-10 w-auto brightness-200"
                src={logoSrc}
              />
              <span className="font-bold font-display text-lg">{brand}</span>
            </a>
            {tagline ? (
              <p className="mt-3 text-sm text-surface/70">{tagline}</p>
            ) : null}
            {donate ? (
              <div className="mt-4">
                <Button href={donate.href} size="sm">
                  {donate.label}
                </Button>
              </div>
            ) : null}
          </div>

          <div>
            {navTitle ? <h3 className={COLUMN_TITLE}>{navTitle}</h3> : null}
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    className="text-sm text-surface/70 transition-colors hover:text-accent-light"
                    href={link.href}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {socialTitle ? (
              <h3 className={COLUMN_TITLE}>{socialTitle}</h3>
            ) : null}
            <div className="flex gap-4">
              <a
                aria-label="Facebook"
                className="text-surface/50 transition-colors hover:text-accent-light"
                href="#"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  role="presentation"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                aria-label="Instagram"
                className="text-surface/50 transition-colors hover:text-accent-light"
                href="#"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  role="presentation"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {copyright ? (
          <div className="mt-8 border-surface/10 border-t pt-6 text-center text-surface/40 text-xs">
            {copyright}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
```

- [ ] **Step 8: Run the tests and make sure they pass**

Run: `pnpm --filter @avd/design-system test footer`
Expected: PASS, 4 tests.

- [ ] **Step 9: Write the stories**

`packages/design-system/src/patterns/header.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './header';

const meta: Meta<typeof Header> = {
  title: 'Patterns/Header',
  component: Header,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Landing: Story = {
  args: {
    links: [
      { label: 'Qui som', href: '/#qui-som' },
      { label: 'Gats', href: '/#gats' },
      { label: 'Colònies', href: '/#colonies' },
      { label: 'Col·labora', href: '/#colabora' },
      { label: 'Contacte', href: '/#contacte' },
    ],
    donate: { label: 'Fes un donatiu', href: '#donatiu' },
    localeLabel: 'CA',
  },
};
```

`packages/design-system/src/patterns/footer.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Footer } from './footer';

const meta: Meta<typeof Footer> = {
  title: 'Patterns/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const Landing: Story = {
  args: {
    tagline: 'Refugi de gats a la comarca.',
    navTitle: 'Navegació',
    links: [
      { label: 'Qui som', href: '/#qui-som' },
      { label: 'Gats', href: '/#gats' },
      { label: 'Col·labora', href: '/#colabora' },
      { label: 'Contacte', href: '/#contacte' },
    ],
    socialTitle: 'Xarxes socials',
    donate: { label: 'Fes un donatiu', href: '#donatiu' },
    copyright: '© 2026 Animals Vida Digna. Tots els drets reservats.',
  },
};
```

- [ ] **Step 10: Export from the barrel**

Add to `packages/design-system/src/index.ts`:

```ts
export { Footer, type FooterProps } from './patterns/footer';
export { Header, type HeaderProps, type NavLink } from './patterns/header';
```

- [ ] **Step 11: Verify the library builds**

Run: `pnpm --filter @avd/design-system build`
Expected: `dist/index.js` and `dist/index.d.ts` are produced with no errors. React must not be inlined — check with:

```bash
grep -c "react" packages/design-system/dist/index.js
```

Expected: the import of `react/jsx-runtime` appears, not React's source.

- [ ] **Step 12: Format, lint, commit**

```bash
pnpm biome check --write packages/design-system
pnpm --filter @avd/design-system test
git add packages/design-system
git commit -m "feat(design-system): add Header and Footer patterns"
```

---

### Task 9: README, divergence table, and the design sync

Closes the library and runs the sync that was the point of all of it.

**Files:**
- Create: `packages/design-system/README.md`
- Create: `.design-sync/conventions.md` (authored during the sync, per the design-sync skill)

**Interfaces:**
- Consumes: every component exported from `src/index.ts`.
- Produces: a claude.ai/design project containing the synced system, and `.design-sync/config.json` pinning it.

- [ ] **Step 1: Write the README with the divergence table**

`packages/design-system/README.md`:

````markdown
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
````

- [ ] **Step 2: Commit the README**

```bash
pnpm biome check --write packages/design-system
git add packages/design-system/README.md
git commit -m "docs(design-system): add README with Astro divergence table"
```

- [ ] **Step 3: Full verification before syncing**

Run each and confirm:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @avd/design-system test
pnpm --filter @avd/design-system build
pnpm biome check .
```

Expected: all clean. The site build passing is the guard that the design system never leaked into the deploy.

- [ ] **Step 4: Confirm every story renders styled**

Run: `pnpm --filter @avd/design-system storybook`

Walk all 13 components. Each must show the warm palette — brown `#8B5E3C` headings, peach `#E8A87C` buttons, cream `#FFF8F0` surfaces. A story rendering in default browser styling is a blocking failure: design-sync would verify a broken preview and every design the agent builds would inherit it. Stop it with Ctrl-C.

- [ ] **Step 5: Run the sync**

Run `/design-sync` and follow that skill. Expected route: no `.design-sync/config.json` exists, so it is a first-time import into a newly created project, on the incremental upload path. It will detect `shape: storybook` from `packages/design-system/.storybook/main.ts`.

- [ ] **Step 6: Record the sync config**

The skill writes `.design-sync/config.json` (with `projectId` and `shape`) and `.design-sync/NOTES.md`, and you author `.design-sync/conventions.md` — the conventions header describing the token vocabulary, the no-i18n contract, and one idiomatic composition snippet.

```bash
git add .design-sync
git commit -m "chore(design-sync): record design system sync config and conventions"
```

- [ ] **Step 7: Confirm the result**

Open the project URL the sync reports. Every component appears as a card with a preview that matches its Storybook render. Report the URL.

---

## Done when

- `packages/design-system` builds, tests pass, Storybook renders 13 components with the site's palette.
- `pnpm install --frozen-lockfile` and `pnpm build` (the site) are unaffected.
- A claude.ai/design project holds the synced system, pinned in `.design-sync/config.json`.
- Nothing under `src/` imports the package.
