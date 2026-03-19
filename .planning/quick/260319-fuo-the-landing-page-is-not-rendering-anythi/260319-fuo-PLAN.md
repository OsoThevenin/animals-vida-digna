---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/content/settings/global.yaml
  - src/content/landing/home.yaml
  - src/content/landing/home/about/content-ca.mdoc
  - src/content/landing/home/about/content-es.mdoc
  - src/content/landing/home/colonies/content-ca.mdoc
  - src/content/landing/home/colonies/content-es.mdoc
  - src/content/landing/home/collaborate/content-ca.mdoc
  - src/content/landing/home/collaborate/content-es.mdoc
  - src/content/cats/misi/index.yaml
  - src/content/cats/misi/description-ca.mdoc
  - src/content/cats/misi/description-es.mdoc
  - src/content/cats/lluna/index.yaml
  - src/content/cats/lluna/description-ca.mdoc
  - src/content/cats/lluna/description-es.mdoc
  - src/content/cats/garfield/index.yaml
  - src/content/cats/garfield/description-ca.mdoc
  - src/content/cats/garfield/description-es.mdoc
autonomous: true
requirements: []
must_haves:
  truths:
    - "Landing page renders all CMS sections (hero, about, stats, colonies, adopt, collaborate, contactCta)"
    - "Cats listing page shows at least 3 demo cats with names, images, and status"
    - "Featured cats section on landing page shows cats marked as featured"
  artifacts:
    - path: "src/content/settings/global.yaml"
      provides: "Site-wide settings singleton"
    - path: "src/content/landing/home.yaml"
      provides: "Landing page sections data"
    - path: "src/content/cats/misi/index.yaml"
      provides: "First demo cat entry"
    - path: "src/content/cats/lluna/index.yaml"
      provides: "Second demo cat entry"
    - path: "src/content/cats/garfield/index.yaml"
      provides: "Third demo cat entry"
  key_links:
    - from: "src/pages/index.astro"
      to: "src/content/landing/home.yaml"
      via: "reader.singletons.landing.read()"
      pattern: "landing\\.sections"
    - from: "src/pages/cats/index.astro"
      to: "src/content/cats/*"
      via: "reader.collections.cats.list()"
      pattern: "allCatSlugs"
---

<objective>
Create seed/demo CMS content so the landing page and cats listing page render properly.

Purpose: The site is empty because no Keystatic content files exist -- only .gitkeep placeholder files. The Keystatic reader returns null/empty arrays, causing blank pages.
Output: Settings singleton, landing page sections, and 3 demo cat entries with bilingual content.
</objective>

<execution_context>
@/Users/pere/.claude/get-shit-done/workflows/execute-plan.md
@/Users/pere/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@keystatic.config.tsx (schema definitions for all content types)
@src/pages/index.astro (landing page - reads landing singleton sections)
@src/pages/cats/index.astro (cats listing - reads cats collection)
@src/components/landing/HeroSection.astro (hero section component)
@src/components/landing/FeaturedCatsSection.astro (featured cats section)
@src/i18n/content.ts (getLocalizedField and getLocalizedCat helpers)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create settings and landing page CMS content</name>
  <files>
    src/content/settings/global.yaml,
    src/content/landing/home.yaml,
    src/content/landing/home/about/content-ca.mdoc,
    src/content/landing/home/about/content-es.mdoc,
    src/content/landing/home/colonies/content-ca.mdoc,
    src/content/landing/home/colonies/content-es.mdoc,
    src/content/landing/home/collaborate/content-ca.mdoc,
    src/content/landing/home/collaborate/content-es.mdoc
  </files>
  <action>
Create Keystatic content files matching the schema in keystatic.config.tsx. The Keystatic local reader expects YAML files at the paths defined in the singleton config.

**Settings singleton** (`src/content/settings/global.yaml`):
- siteName_ca: "Animals Vida Digna"
- siteName_es: "Animals Vida Digna"
- donateUrl: "https://www.teaming.net/animalsvidadigna"
- contactEmail: "info@animalsvidadigna.org"
- social.facebook, social.instagram: use placeholder URLs like "https://facebook.com/animalsvidadigna"
- seo fields: title_ca/title_es, description_ca/description_es with appropriate animal shelter descriptions

**Landing singleton** (`src/content/landing/home.yaml`):
Create sections array with all 7 section types that the landing page switch statement handles:

1. **hero**: title_ca/es ("Doneu una llar a un gat" / "Dale un hogar a un gato"), subtitle_ca/es, ctaAdoptText_ca/es, ctaDonateText_ca/es. No image (image field can be null/omitted).
2. **about**: title_ca/es ("Qui som" / "Quienes somos"), content_ca/content_es as markdoc document references (Keystatic stores markdoc in separate .mdoc files). Write content about being a cat rescue organization in Catalunya.
3. **stats**: title_ca/es ("En xifres" / "En cifras"), items array with 3-4 stats like cats rescued, adoptions, volunteers.
4. **colonies**: title_ca/es ("Colonies felines" / "Colonias felinas"), content_ca/content_es as markdoc references describing feral cat colony management.
5. **adopt**: title_ca/es ("Adopta un gat" / "Adopta un gato"), subtitle_ca/es.
6. **collaborate**: title_ca/es ("Col-labora" / "Colabora"), content_ca/content_es as markdoc references, ctaText_ca/es.
7. **contactCta**: title_ca/es ("Contacta'ns" / "Contactanos"), subtitle_ca/es, ctaText_ca/es.

For markdoc fields, Keystatic stores them as separate .mdoc files referenced from the YAML. Check how Keystatic serializes markdoc fields -- they appear as objects with a reference. Create the corresponding .mdoc files with realistic bilingual content about the shelter.

IMPORTANT: Study how Keystatic's local reader serializes `fields.blocks()` and `fields.markdoc()` to YAML. The sections field uses `fields.blocks()` which serializes each block as `{ discriminant: "hero", value: {...} }`. The markdoc fields serialize as inline content references. If unsure of exact format, run `npx astro dev` briefly and create a test entry via the Keystatic admin UI at `/keystatic` to see the file format, then replicate it.
  </action>
  <verify>
    <automated>cd /Users/pere/code/animals-vida-digna && node -e "const {createReader} = require('@keystatic/core/reader'); const config = require('./keystatic.config.tsx'); const r = createReader(process.cwd(), config.default); r.singletons.landing.read().then(d => { if (!d || !d.sections || d.sections.length < 5) { console.error('FAIL: landing has', d?.sections?.length || 0, 'sections, need >= 5'); process.exit(1); } console.log('OK: landing has', d.sections.length, 'sections'); });" 2>&1 || echo "Verify by running: npx astro build 2>&1 | grep -E '(error|index.html)'"</automated>
  </verify>
  <done>Settings singleton loads with site name and donate URL. Landing singleton loads with 7 sections. Build succeeds and /index.html is generated with section content.</done>
</task>

<task type="auto">
  <name>Task 2: Create demo cat entries for the cats collection</name>
  <files>
    src/content/cats/misi/index.yaml,
    src/content/cats/misi/description-ca.mdoc,
    src/content/cats/misi/description-es.mdoc,
    src/content/cats/lluna/index.yaml,
    src/content/cats/lluna/description-ca.mdoc,
    src/content/cats/lluna/description-es.mdoc,
    src/content/cats/garfield/index.yaml,
    src/content/cats/garfield/description-ca.mdoc,
    src/content/cats/garfield/description-es.mdoc
  </files>
  <action>
Create 3 demo cat entries in the Keystatic cats collection format. Each cat lives in `src/content/cats/{slug}/` with an `index.yaml` and markdoc description files.

The cats collection schema (from keystatic.config.tsx) requires these fields:

**Cat 1 - "misi"** (featured, available):
- slug_ca: "misi", slug_es: "misi"
- name_ca: "Misi", name_es: "Misi"
- race_ca: "Europeu", race_es: "Europeo"
- status: "available", age: 3, gender: "female", size: "medium"
- personality: ["affectionate", "calm"]
- goodWith: ["children", "other-cats"]
- healthStatus: "healthy", vaccinated: true, microchipped: true, sterilized: true
- weight: 4.2
- shortDescription_ca: "Una gata dolca i tranquil-la...", shortDescription_es: "Una gata dulce y tranquila..."
- description_ca/description_es: markdoc files with 2-3 paragraphs about the cat
- featured: true, order: 1
- coverImage: omit or set src to null (no actual images yet)

**Cat 2 - "lluna"** (featured, available):
- name_ca: "Lluna", name_es: "Luna"
- status: "available", age: 1, gender: "female", size: "small"
- personality: ["playful", "curious", "social"]
- featured: true, order: 2
- Fill remaining fields appropriately

**Cat 3 - "garfield"** (not featured, treatment):
- name_ca: "Garfield", name_es: "Garfield"
- status: "treatment", age: 5, gender: "male", size: "large"
- personality: ["calm", "independent"]
- featured: false, order: 3
- Fill remaining fields appropriately

IMPORTANT: Match the exact Keystatic serialization format for `fields.markdoc()` -- these are stored as separate .mdoc files. The YAML references them. Check the Keystatic source or create a test entry via admin UI to confirm the exact YAML structure for markdoc fields and `fields.image()` objects within `bilingualImage()`.

For coverImage (bilingualImage object): Since no actual images exist, either omit the field or set src to null. The CatCard and CatFilters components should handle missing images gracefully.
  </action>
  <verify>
    <automated>cd /Users/pere/code/animals-vida-digna && npx astro build 2>&1 | tail -20</automated>
  </verify>
  <done>Three cat entries exist and are readable by Keystatic. Build succeeds. /cats/index.html renders with cat data. /cat/misi/index.html and other detail pages are generated. At least 2 cats appear in the featured cats section on the landing page.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Seed CMS content for the landing page (settings + 7 landing sections) and cats listing (3 demo cats with bilingual content)</what-built>
  <how-to-verify>
    1. Run `npx astro dev` and visit http://localhost:4321/
    2. Verify the landing page shows: hero section with title/CTA buttons, about section, stats, colonies, adopt CTA, collaborate section, contact CTA, and featured cats (Misi and Lluna)
    3. Visit http://localhost:4321/cats/ -- verify 3 cats appear with names and status badges
    4. Visit http://localhost:4321/es/ -- verify Spanish translations render
    5. Visit http://localhost:4321/es/cats/ -- verify Spanish cat names appear
    6. Click on a cat card to verify the detail page loads
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues to fix</resume-signal>
</task>

</tasks>

<verification>
- `npx astro build` completes without errors
- Landing page HTML contains section content (hero title, about text, stats numbers)
- Cats listing HTML contains cat names (Misi, Lluna, Garfield)
- Both /ca and /es locale variants render content
</verification>

<success_criteria>
- Landing page renders all 7 CMS sections with bilingual content
- Cats listing shows 3 demo cats with correct data
- Featured cats section on landing shows Misi and Lluna
- Build succeeds for both locale variants
- No runtime errors when browsing pages
</success_criteria>

<output>
After completion, create `.planning/quick/260319-fuo-the-landing-page-is-not-rendering-anythi/260319-fuo-SUMMARY.md`
</output>
