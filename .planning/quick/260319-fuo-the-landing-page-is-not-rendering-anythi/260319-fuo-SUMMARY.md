---
phase: quick
plan: 260319-fuo
subsystem: cms-content
tags: [keystatic, astro, bilingual, yaml, markdoc, seed-data]

# Dependency graph
requires: []
provides:
  - "Settings singleton with site name, donate URL, social links, SEO"
  - "Landing page with 7 bilingual sections (hero, about, stats, colonies, adopt, collaborate, contactCta)"
  - "3 demo cat entries (misi, lluna, garfield) with bilingual markdoc descriptions"
affects: [landing-page, cats-listing, featured-cats]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Keystatic outer dataLocation: flat YAML (slug.yaml) with markdoc in subdirectories (slug/field.mdoc)"
    - "Keystatic blocks field serialization: discriminant/value pairs in YAML array"
    - "Keystatic markdoc in blocks: sections/{arrayIndex}/value/content_{locale}.mdoc"

key-files:
  created:
    - src/content/settings/global.yaml
    - src/content/landing/home.yaml
    - src/content/landing/home/sections/1/value/content_ca.mdoc
    - src/content/landing/home/sections/1/value/content_es.mdoc
    - src/content/landing/home/sections/3/value/content_ca.mdoc
    - src/content/landing/home/sections/3/value/content_es.mdoc
    - src/content/landing/home/sections/5/value/content_ca.mdoc
    - src/content/landing/home/sections/5/value/content_es.mdoc
    - src/content/cats/misi.yaml
    - src/content/cats/misi/description_ca.mdoc
    - src/content/cats/misi/description_es.mdoc
    - src/content/cats/lluna.yaml
    - src/content/cats/lluna/description_ca.mdoc
    - src/content/cats/lluna/description_es.mdoc
    - src/content/cats/garfield.yaml
    - src/content/cats/garfield/description_ca.mdoc
    - src/content/cats/garfield/description_es.mdoc
  modified: []

key-decisions:
  - "Used flat YAML format (slug.yaml) for cats, not directory index format (slug/index.yaml), matching Keystatic path config src/content/cats/* which produces outer dataLocation"
  - "Markdoc content fields in blocks use path pattern sections/{arrayIndex}/value/content_{locale}.mdoc based on Keystatic reader source code analysis"

patterns-established:
  - "Keystatic content file placement: Always check path config trailing slash to determine index vs outer dataLocation"
  - "Bilingual markdoc: Set YAML field to null, place .mdoc files at path derived from field name with locale suffix"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-03-19
---

# Quick Task 260319-fuo: Seed CMS Content Summary

**Bilingual settings, 7-section landing page, and 3 demo cat entries populating previously blank Keystatic-powered pages**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-19T10:28:16Z
- **Completed:** 2026-03-19T10:43:00Z
- **Tasks:** 3 (2 auto + 1 auto-approved checkpoint)
- **Files modified:** 17

## Accomplishments
- Settings singleton with site name, donate URL, social links, and bilingual SEO metadata
- Landing page with 7 sections (hero, about, stats, colonies, adopt, collaborate, contactCta) rendering bilingual content including markdoc body text
- 3 demo cats (Misi, Lluna, Garfield) with full schema data, bilingual descriptions, and correct featured/status flags
- Build succeeds generating all CA and ES locale pages including individual cat detail pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Create settings and landing page CMS content** - `ff79031` (feat)
2. **Task 2: Create demo cat entries for the cats collection** - `b3fcd14` (feat)
3. **Task 3: Human verification checkpoint** - auto-approved (no commit)

**Plan metadata:** [pending] (docs: complete 260319-fuo plan)

## Files Created/Modified
- `src/content/settings/global.yaml` - Site-wide settings singleton (name, donate URL, social, SEO)
- `src/content/landing/home.yaml` - Landing page 7 sections as Keystatic blocks array
- `src/content/landing/home/sections/{1,3,5}/value/content_{ca,es}.mdoc` - Markdoc body content for about, colonies, collaborate sections
- `src/content/cats/misi.yaml` - Featured, available female European cat, age 3
- `src/content/cats/lluna.yaml` - Featured, available female Siamese cat, age 1
- `src/content/cats/garfield.yaml` - Non-featured, treatment-status male Persian cat, age 5
- `src/content/cats/{misi,lluna,garfield}/description_{ca,es}.mdoc` - Bilingual markdoc descriptions (2-3 paragraphs each)

## Decisions Made
- Used flat YAML format (slug.yaml) instead of directory index format (slug/index.yaml) for cats collection, because Keystatic config `path: 'src/content/cats/*'` (no trailing slash) produces `dataLocation: 'outer'` which expects flat files
- Markdoc fields inside blocks arrays use internal Keystatic path resolution: `sections/{arrayIndex}/value/{fieldName}.mdoc` -- determined by reading Keystatic reader source code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed cat YAML file placement from index to outer format**
- **Found during:** Task 2 (Create demo cat entries)
- **Issue:** Plan specified `src/content/cats/misi/index.yaml` (directory/index format), but Keystatic config `path: 'src/content/cats/*'` computes `dataLocation: 'outer'`, meaning it looks for `src/content/cats/misi.yaml` (flat file). The reader's `listCollection` function filters for files (not directories) in outer mode, causing `reader.collections.cats.list()` to return `[]`.
- **Fix:** Moved YAML data files from `{slug}/index.yaml` to `{slug}.yaml` while keeping markdoc `.mdoc` files in subdirectories
- **Files modified:** `src/content/cats/{misi,lluna,garfield}.yaml` (created as flat files instead of index files)
- **Verification:** `reader.collections.cats.list()` returns `['garfield', 'lluna', 'misi']`, `reader.collections.cats.read('misi')` returns full entry with markdoc content
- **Committed in:** b3fcd14 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed markdoc file paths for landing blocks array**
- **Found during:** Task 1 (Create landing page content)
- **Issue:** Initial markdoc file placement used semantic paths (e.g., `home/about/content-ca.mdoc`) but Keystatic reader resolves markdoc fields using `pathWithArrayFieldSlugs` which produces numeric array index paths (e.g., `sections/1/value/content_ca.mdoc`)
- **Fix:** Traced through Keystatic reader source to determine exact path resolution, created files at `sections/{arrayIndex}/value/content_{locale}.mdoc`
- **Files modified:** `src/content/landing/home/sections/{1,3,5}/value/content_{ca,es}.mdoc`
- **Verification:** `reader.singletons.landing.read()` returns all 7 sections with markdoc content resolved
- **Committed in:** ff79031 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary for Keystatic reader to find content. No scope creep.

## Issues Encountered
- Keystatic's file format for collections depends on whether the configured path ends with `/` (trailing slash = index/directory format, no trailing slash = outer/flat format). This is not obvious from the config and required reading Keystatic reader source code to debug.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CMS content populated, all pages render with bilingual content
- Images are null/missing (coverImage.src: null) -- future task needed to add actual cat photos
- Newsletter and FAQ sections not included in landing (schema exists but not added to seed data)

---
*Phase: quick*
*Completed: 2026-03-19*

## Self-Check: PASSED
- All 11 key files verified present on disk
- Both task commits (ff79031, b3fcd14) verified in git log
