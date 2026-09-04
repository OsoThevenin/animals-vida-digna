# Phase 6 — Cut-over, documentation, hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Volunteers use only the admin app to edit cats; a volunteer guide (Catalan) and a maintainer runbook (English) exist and match reality; every leftover of the git-based cat pipeline (`apps/web/scripts/sync-images.ts`, `apps/web/src/content/cats/`, the stale Payload issue-template config) is deleted; volunteers no longer hold GitHub Write access; `.planning` and the root `README.md` reflect the new architecture; an orphan-R2-image sweep script exists; and the whole-plan Definition of done (from `docs/superpowers/plans/2026-09-03-content-r2-pipeline/README.md`) is walked and recorded.

**Architecture:** This phase writes no application code beyond one small script pair (`packages/content/src/orphans.ts` + `packages/content/scripts/sweep-orphan-images.ts`) built with TDD. Everything else is documentation, deletion, and GitHub/Cloudflare account changes with verification commands. It assumes Phases 0–5 are merged: `apps/web` and `apps/admin` exist, cats live in D1 (`avd-content`), photos live in R2 (`animals-vida-digna-images`) behind `images.animalsvidadigna.org`, and `apps/admin` is live at `admin.animalsvidadigna.org` with better-auth email-code login.

**Tech Stack:** Markdown docs, `wrangler` 4.75 CLI (`d1 execute`, `d1 export`, `d1 migrations`, `r2 object delete`, `secret list`), `aws4fetch` (R2 S3-compatible API, listing only), `gh` CLI, Vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md` — read it first; the *Interface contract* section is binding.

## Global Constraints

- Free tiers only: Workers Free (3 MB compressed script, 10 ms CPU, 100k req/day), D1 Free (5M reads/100k writes per day, hard-enforced), R2 Free (10 GB), Images Free (5,000 unique transformations/month). Never add the Images binding or the Workers Paid plan.
- `astro ^5.18`, `@astrojs/cloudflare ^12.6` — use `context.locals.runtime.env`; never Astro 6 / adapter 13 APIs.
- `compatibility_flags = ["nodejs_compat"]` on both Workers.
- Biome: kebab-case filenames, single quotes, semicolons, lineWidth 80, sorted Tailwind classes.
- Tests: Vitest, flat `tests/*.test.ts` per app/package, pure-function style; TDD (failing test first) on every task.
- Lighthouse ≥ 95 on all four mobile categories for `/`, `/cats`, `/cat/<slug>` in both locales must still hold after Phase 3.
- Commit style `type(scope): summary` with scopes `monorepo`, `content`, `web`, `admin`, `images`, `docs`.
- No secrets in git. Runtime secrets via `wrangler secret put`; local copies in `.dev.vars` (gitignored).

---

## Before you start

Read `docs/superpowers/plans/2026-09-03-content-r2-pipeline/research/repo-map.md` and
`research/cloudflare-platform-facts.md`. This phase assumes the monorepo layout
from Phase 1 (`apps/web`, `apps/admin`, `packages/content`, `packages/design-system`)
and the D1/R2 resources from Phases 0–2. Every path below already includes the
post-Phase-1 prefix (`apps/web/...`, `packages/content/...`).

Two platform facts this phase relies on, confirmed against `wrangler 4.75.0
--help` and the Cloudflare R2 docs while writing this plan:

1. **`wrangler r2 object list` does not exist.** `wrangler r2 object` only has
   `get`, `put`, `delete`. Listing objects for the orphan sweep (Task 5) must
   go through the **S3-compatible API** (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`,
   `ListObjectsV2`, documented at https://developers.cloudflare.com/r2/api/s3/api/),
   signed with `aws4fetch`'s `AwsClient` using an R2 API token's Access Key
   ID/Secret (https://developers.cloudflare.com/r2/api/tokens/) — **not** the
   generic `CLOUDFLARE_API_TOKEN`. Deletion still uses `wrangler r2 object delete`,
   which does exist.
2. **`wrangler d1 export --remote --output <file>` exists** (`--local`,
   `--remote`, `--output`, `--table`, `--no-schema`, `--no-data` are real
   flags on this wrangler version) — the runbook's backup procedure (Task 2)
   uses it directly; no separate verification step is needed at execution
   time because it was verified while writing this plan.

---

### Task 1: `docs/admin-guide.md` — volunteer guide (Catalan + Spanish summary)

**Files:**
- Create: `docs/admin-guide.md`

**Interfaces:**
- Consumes: nothing (pure documentation). References `apps/admin` routes from
  the spec's *Admin routes and actions* table (`/login`, `/cats`, `/cats/new`,
  `/cats/[id]`) and the Catalan field labels from `keystatic.config.tsx`'s
  `cats` collection (kept as the terminology volunteers already know from the
  old Keystatic form, even though the admin form is now backed by D1 — see
  Task 3's note on why `keystatic-admin-setup.md` no longer covers cats).
- Produces: the volunteer-facing doc that Task 7's root `README.md` links to
  and that Task 10's Definition-of-done walk checks for existence and
  accuracy.

- [ ] **Step 1: Write `docs/admin-guide.md`**

```markdown
# Guia del panell d'administració (per a voluntaris)

Aquest panell permet gestionar les fitxes dels gats sense necessitat de
compte de GitHub ni coneixements tècnics. Els canvis que fas hi apareixen
publicats al lloc web en qüestió de segons.

Adreça del panell: **https://admin.animalsvidadigna.org**

## Iniciar sessió

El panell no fa servir contrasenyes. Cada vegada que hi entres:

1. Vés a https://admin.animalsvidadigna.org/login i escriu el teu correu
   electrònic.
2. Rebràs un correu amb un **codi de 6 xifres**. Introdueix-lo a la pantalla
   següent.
3. El codi és vàlid durant **5 minuts** i tens **3 intents** per introduir-lo
   correctament. Si s'exhaureix el temps o els intents, torna a la pantalla
   d'inici i demana un codi nou.

Només poden iniciar sessió les persones amb un correu autoritzat prèviament
pel mantenidor del lloc (secció "No rebo el codi" més avall).

## La llista de gats

En entrar veuràs la llista de tots els gats — publicats i esborranys. Cada
fila mostra la miniatura de la imatge de portada, el nom, l'estat i si està
publicat o no. Pots filtrar per estat.

## Crear un gat

Fes clic a **Nou gat**. S'obre un formulari buit. Pots desar-lo com a
esborrany (sense marcar "Publicat") per anar-lo completant més tard — no serà
visible al lloc web fins que el publiquis.

## Què vol dir cada camp

| Camp | Què hi poses |
|---|---|
| Slug (CA) / Slug (ES) | Part de la URL (`/cat/<slug>`). Es genera sol a partir del nom, però el pots editar. |
| Nom (CA) / Nom (ES) | Nom del gat en català i castellà. |
| Raça (CA) / Raza (ES) | Opcional. |
| Estat | Disponible, Adoptat, En tractament o No disponible. Controla el que veu la gent visitant el lloc. |
| Edat | En anys, opcional. |
| Gènere | Mascle o Femella. |
| Mida | Petit, Mitjà o Gran. |
| Personalitat | Selecciona totes les etiquetes que apliquin (Juganer, Tranquil, Tímid, Afectuós, Independent, Social, Curiós, Protector). |
| Es porta bé amb | Nens, Altres gats, Gossos, Gent gran — selecciona les que apliquin. |
| Estat de salut | Sa, En tractament o Necessitats especials. |
| Vacunat / Microxipat / Esterilitzat | Marca les caselles que corresponguin. |
| Pes (kg) | Opcional. |
| Data de rescat / Data d'adopció | Opcional. |
| Necessitats especials (CA/ES) | Text lliure, opcional. |
| Observacions (CA/ES) | Text lliure, opcional. |
| Descripció curta (CA/ES) | Frase que apareix a les targetes de la llista de gats. |
| Descripció (CA/ES) | Text llarg de la fitxa del gat. Admet paràgrafs normals. |
| Meta title / Meta description (CA/ES) | Per a cercadors (Google) — opcional, si el deixes buit s'utilitza el nom i la descripció curta. |
| Destacat | Si el marques, el gat pot aparèixer a la secció "Gats destacats" de la pàgina d'inici. |
| Ordre | Nombre que determina la posició del gat dins les llistes (més baix = més amunt). |
| Publicat | Mentre no ho marquis, el gat és un esborrany invisible al lloc públic. |

## Fotos

Cada gat pot tenir diverses fotos: una **imatge de portada** i una
**galeria**.

**Què passa quan puges una foto gran:** el navegador la redimensiona
automàticament abans de pujar-la — cap costat superarà els **2000 píxels**.
No cal que redimensionis res tu mateix/a abans de pujar-la; això sí, fotos
molt grans (mòbils moderns en fan de 4000 px o més) triguen uns segons més a
processar-se.

**Enquadrament recomanat:** fotos horitzontals o quadrades funcionen millor
que les verticals molt allargades, perquè el lloc web les retalla a
proporcions concretes a les targetes i la portada. Procura que el gat ocupi
bona part del quadre, amb bona llum i sense gent al voltant si és possible.

**Text alternatiu (alt) en català i castellà:** cada foto té dos camps de
text alternatiu, un per idioma. Aquest text no es veu normalment — el
llegeixen els lectors de pantalla (persones amb discapacitat visual) i els
cercadors com Google. Escriu una descripció breu i concreta de la imatge,
per exemple "En Bigotis ajagut al sofà" en comptes de "foto1" o deixar-ho
buit. És obligatori per a totes les fotos.

**Imatge de portada:** és la foto que apareix a la llista de gats i a la
capçalera de la fitxa. La pots triar entre les fotos ja pujades a la
galeria d'aquell gat.

**Ordre de la galeria:** les fotos de la galeria es poden reordenar
arrossegant-les; l'ordre que estableixis aquí és el que veuran les persones
visitants a la fitxa del gat.

## Publicar / despublicar

L'interruptor **Publicat** controla si el gat és visible al lloc web
públic. Despublicar un gat no l'esborra — només l'amaga temporalment (per
exemple, mentre acabes d'editar-lo, o si cal retirar-lo un temps).

## Esborrar

Esborrar un gat és **irreversible**: s'elimina la fitxa i totes les seves
fotos de manera definitiva, no hi ha paperera. Si dubtes, despublica en lloc
d'esborrar.

## No rebo el codi

1. Revisa la carpeta de **correu brossa / spam**.
2. Confirma que estàs escrivint exactament el correu electrònic que et va
   donar accés el mantenidor del lloc — un correu no autoritzat no rep mai
   cap codi, i el panell no ho indica per motius de seguretat.
3. Si continues sense rebre'l, contacta amb el mantenidor del lloc perquè
   comprovi que el teu correu és a la llista de persones autoritzades.

## On apareixen els canvis

Els canvis que fas i desas al panell són **immediats**, no cal cap
aprovació ni pull request. Els trobaràs a:

- La llista de gats: `https://animalsvidadigna.org/cats` (i `/es/cats` en
  castellà).
- La fitxa individual: `https://animalsvidadigna.org/cat/<slug>` (i
  `/es/cat/<slug>`).
- La pàgina d'inici, secció "Gats destacats", si el gat té marcat
  **Destacat** i està **Publicat**.

---

## Resumen en castellano

Este panel (**https://admin.animalsvidadigna.org**) permite gestionar las
fichas de los gatos sin cuenta de GitHub. Inicias sesión con tu correo: se
te envía un **código de 6 dígitos**, válido durante **5 minutos**, con **3
intentos**. Desde la lista de gatos puedes crear uno nuevo, rellenar sus
datos (nombre, estado, edad, personalidad, salud...) en catalán y castellano,
y subir fotos — el navegador las redimensiona automáticamente a un máximo de
2000 px. Cada foto necesita un texto alternativo en ambos idiomas
(accesibilidad y buscadores). El interruptor "Publicat" decide si el gato es
visible; borrarlo es irreversible, así que si tienes dudas, despublica en
lugar de borrar. Los cambios se ven al instante en `/cats`, `/cat/<slug>` y
la portada (si el gato está destacado). Si no recibes el código, revisa spam
y confirma con el mantenedor del sitio que tu correo está autorizado.
```

- [ ] **Step 2: Reviewer checklist (this task's "test")**

Since this is a documentation task, verify by reading, not by running code:

- [ ] Every route mentioned (`/login`, `/cats`, `/cat/<slug>`, `/es/cats`,
      `/es/cat/<slug>`) matches the spec's *Admin routes and actions* and
      *Public site* tables.
- [ ] Every field name in the "Què vol dir cada camp" table is the same
      field as the corresponding entry in `apps/web/keystatic.config.tsx`'s
      `cats` collection, with the diacritics the config's ASCII-only labels
      omit restored (e.g. config `Raca`/`Genere` → guide `Raça`/`Gènere`) —
      not a byte-for-byte string match — or maps to a column in the spec's
      D1 `cats` schema table.
- [ ] The 6-digit / 5-minute / 3-attempt figures match Phase 4's better-auth
      `emailOTP` configuration (cross-check `apps/admin/src/lib/auth.ts` once
      Phase 4 is merged; if Phase 4 changed these numbers, update this doc to
      match, not the other way round).
- [ ] The 2000 px figure matches `MAX_UPLOAD_EDGE` in
      `packages/content/src/image-url.ts` (spec's *Image URLs* section).
- [ ] No mention of GitHub, pull requests, or `/keystatic` remains for the
      cats workflow.

- [ ] **Step 3: Commit**

```bash
git add docs/admin-guide.md
git commit -m "docs: add volunteer guide for the admin app"
```

---

### Task 2: `docs/admin-runbook.md` — maintainer runbook

**Files:**
- Create: `docs/admin-runbook.md`

**Interfaces:**
- Consumes: the spec's *Architecture* diagram, *Cloudflare resources* table,
  *Secrets* list, and D1 schema; Task 5's sweep script (referenced, not
  duplicated); Task 8's collaborator-removal commands (referenced).
- Produces: the maintainer-facing doc Task 7's README links to and Task 10's
  Definition-of-done walk checks.

- [ ] **Step 1: Write `docs/admin-runbook.md`**

```markdown
# Admin runbook (for the maintainer)

This is the operational reference for `admin.animalsvidadigna.org` and the
D1/R2 content pipeline behind it. For how volunteers use the panel, see
`docs/admin-guide.md`. For the settings/landing/pages Keystatic flow that
still uses GitHub PRs, see `docs/keystatic-admin-setup.md`.

## Architecture

```
                 volunteer (browser)                          visitor (browser)
                        │                                             │
      https://admin.animalsvidadigna.org                https://animalsvidadigna.org
                        │                                             │
   ┌────────────────────▼────────────────────┐     ┌──────────────────▼─────────────────┐
   │ Worker: animals-vida-digna-admin        │     │ Worker: animals-vida-digna         │
   │ apps/admin (Astro, React islands)       │     │ apps/web (Astro, Preact islands)   │
   │ better-auth (emailOTP)  Astro Actions   │     │ static pages + on-demand cat pages │
   └───────┬───────────────┬────────┬────────┘     └──────────────────┬─────────────────┘
           │ D1            │ R2     │ Resend                          │ D1 (read)
   ┌───────▼───────┐ ┌─────▼──────────────┐                           │
   │ D1: avd-content│ │ R2: animals-vida-  │◄──────────────────────────┘ (images by URL)
   │ cats, cat_images│ │ digna-images       │
   │ user, session…  │ │ key cats/<cat>/<img>.webp
   └────────────────┘ └─────────┬──────────┘
                                │ custom domain
                  https://images.animalsvidadigna.org/cdn-cgi/image/width=640,format=auto,…/cats/<cat>/<img>.webp
```

Cats and their images are edited only in `apps/admin` and read from D1/R2 by
both apps. Site settings, the landing page, and static pages still go
through Keystatic + a GitHub pull request (`docs/keystatic-admin-setup.md`) —
that flow is unchanged and maintainer-only now (Task 3 of the phase-6 plan).

## Cloudflare resources

| Resource | Name | Bound as | Used by |
|---|---|---|---|
| Worker | `animals-vida-digna` | — | `apps/web`, custom domain `animalsvidadigna.org` |
| Worker | `animals-vida-digna-admin` | — | `apps/admin`, custom domain `admin.animalsvidadigna.org` |
| D1 database | `avd-content` | `DB` | web (read), admin (read/write) |
| R2 bucket | `animals-vida-digna-images` | `IMAGES_BUCKET` | admin only (writes); public reads go through the custom domain, not the binding |
| R2 custom domain | `images.animalsvidadigna.org` | — | public image reads |
| Zone setting | Images → Transformations enabled; allowed origins include `images.animalsvidadigna.org` | — | required for `/cdn-cgi/image/...` to work over the R2 custom domain |
| Workers Builds project | one per Worker, root directory `apps/web` / `apps/admin`, watch paths scoped to that directory plus `packages/*` | — | CI deploy on push to `main` |

Check the dashboard (`R2 → animals-vida-digna-images → Settings`) if any of
this drifts; nothing here should ever require the Images Paid or Workers
Paid plan — see the spec's *Constraints* section.

## Secrets

Admin Worker secrets (set with `wrangler secret put <NAME>` from
`apps/admin/`; local values mirrored in `apps/admin/.dev.vars`, which is
gitignored):

| Secret | Purpose | What breaks if wrong/missing |
|---|---|---|
| `BETTER_AUTH_SECRET` | Signs/encrypts session cookies | Every session is invalidated; all volunteers are signed out and must sign in again |
| `BETTER_AUTH_URL` | Must equal `https://admin.animalsvidadigna.org` | OAuth/redirect and cookie-domain checks fail; sign-in loops back to `/login` |
| `RESEND_API_KEY` | Sends the 6-digit email codes | Sign-in emails stop sending; volunteers can never get a code |
| `AUTH_EMAIL_FROM` | From-address on those emails | Cosmetic if wrong format is still a valid address; emails fail to send if malformed |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated allowlist | Missing an email here means that person can never sign in even with a valid code |

Rotation procedure for any of the above:

```bash
cd apps/admin
wrangler secret put BETTER_AUTH_SECRET   # paste the new value when prompted
```

Rotating `BETTER_AUTH_SECRET` signs everyone out immediately (all existing
session cookies fail signature verification on the next request) — warn
active volunteers before rotating it. Rotating `RESEND_API_KEY` or
`AUTH_EMAIL_FROM` has no visible effect until the next sign-in email is
sent. `ADMIN_ALLOWED_EMAILS` and `BETTER_AUTH_URL` are secrets here (not
`[vars]`) because the repository must not reveal who has access or the
production hostname pattern in git history — set with the same
`wrangler secret put` command from `apps/admin/`, not with a `[vars]` entry
in `wrangler.toml`.

Verify what's currently set (values are never shown, only names):

```bash
cd apps/admin
wrangler secret list
```

Expect exactly these 5 names. If any are missing, sign-in or email sending
fails at runtime, not at deploy time — Workers deploy successfully with
undefined secrets.

## Adding or removing a volunteer

**Add:**

1. Append their email to `ADMIN_ALLOWED_EMAILS` and re-run
   `wrangler secret put ADMIN_ALLOWED_EMAILS` from `apps/admin/` with the
   full updated comma-separated list (this secret is not additive — you must
   paste the whole list each time).
2. Tell them to go to `https://admin.animalsvidadigna.org/login` and sign in
   with that email; no invitation email is sent automatically.

**Remove:**

1. Remove their email from the list and re-run
   `wrangler secret put ADMIN_ALLOWED_EMAILS` with the reduced list. This
   blocks all *future* sign-ins for that email but does not end an
   already-active session.
2. To end any existing session immediately, delete their rows from D1:

```bash
wrangler d1 execute avd-content --remote --command \
  "delete from session where user_id in (select id from user where email = 'person@example.com')"
wrangler d1 execute avd-content --remote --command \
  "delete from user where email = 'person@example.com'"
```

Run the `session` delete before the `user` delete (no `ON DELETE CASCADE` is
assumed here — confirm against `packages/content/src/schema.ts`'s
better-auth table definitions from Phase 4 before relying on cascade).

## D1 migrations workflow

Schema changes live in `packages/content/src/schema.ts` (Drizzle) with SQL
migration files generated into `packages/content/migrations/` — this is the
single `migrations_dir` referenced from both `apps/web/wrangler.toml` and
`apps/admin/wrangler.toml`.

```bash
cd packages/content
npx drizzle-kit generate            # writes a new .sql file under migrations/
wrangler d1 migrations apply avd-content --local    # apply to your local dev D1 first
wrangler d1 migrations apply avd-content --remote   # then to production
```

Run `drizzle-kit generate` from `packages/content/` (it reads
`drizzle.config.ts` there); run the two `wrangler d1 migrations apply`
commands from either app's directory (`apps/web/` or `apps/admin/`) since
both `wrangler.toml` files declare the same `database_id` for `avd-content`
— the migration only needs to run once against the remote database
regardless of which app's config you run it from. `wrangler` prompts for
confirmation before `--remote` and takes an automatic backup before
applying; the prompt is skipped (but the backup still happens) in
non-interactive shells.

## Local development

| App | Port | Env file | Notes |
|---|---|---|---|
| `apps/web` | 4321 | `apps/web/.dev.vars` (only if any secrets are read at runtime there) | `pnpm --filter web dev` |
| `apps/admin` | 4322 | `apps/admin/.dev.vars` | `pnpm --filter admin dev`; must contain `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:4322`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `ADMIN_ALLOWED_EMAILS`, `AUTH_INSECURE_COOKIES=1` |

Both apps read `DB` from a **local** D1 instance (`wrangler dev` creates a
`.wrangler/state` sqlite file per app the first time it runs). Seed it once
per app with the SQL from `packages/content/scripts/seed-from-yaml.ts`'s
output (Phase 2) or by exporting from remote and importing locally:

```bash
wrangler d1 export avd-content --remote --output /tmp/avd-content-seed.sql
wrangler d1 execute avd-content --local --file /tmp/avd-content-seed.sql
```

`PUBLIC_IMAGES_ORIGIN` is a **public build-time** variable (not a secret) in
both apps, defaulting to `https://images.animalsvidadigna.org`; override it
in `.dev.vars` only if you are testing against a different R2 custom domain.
In local dev, `apps/admin`'s dev-only `GET /r2/[...key]` route
(`import.meta.env.DEV`) streams straight from the `IMAGES_BUCKET` binding so
uploaded images preview correctly without needing the public custom domain.

## Image transformation budget

Images Free plan: **5,000 unique transformations per calendar month**. Each
distinct combination of source image + transform options counts once;
`format=auto` (content negotiation) counts as one transformation regardless
of which format is actually served. At 4 widths per image
(`DEFAULT_WIDTHS = [320, 640, 960, 1280]`), that's ~1,250 new distinct
images addable per month before any single image falls back to serving its
original (`onerror=redirect` in the URL, which Cloudflare honors for
same-zone subdomains).

Check current usage: Cloudflare dashboard → your zone →
**Images → Overview** shows the transformations-this-month graph. There is
no CLI command for this figure as of wrangler 4.75. If usage approaches
5,000/month, the mitigation is documented in the spec's *Why URL
transformations rather than resizing at upload* section (the fallback is
already built in, not a new feature to add).

## Orphan image sweep

Deleting a cat or removing a gallery image removes its D1 row but not
necessarily its R2 object if a request fails partway. Run the sweep
periodically (monthly is enough at this shelter's volume) to find R2
objects under `cats/` with no matching `cat_images.r2_key` row:

```bash
cd packages/content
CLOUDFLARE_ACCOUNT_ID=<account id> \
R2_ACCESS_KEY_ID=<r2 api token access key id> \
R2_SECRET_ACCESS_KEY=<r2 api token secret> \
  npx tsx scripts/sweep-orphan-images.ts             # dry run, lists orphans only
CLOUDFLARE_ACCOUNT_ID=<account id> \
R2_ACCESS_KEY_ID=<r2 api token access key id> \
R2_SECRET_ACCESS_KEY=<r2 api token secret> \
  npx tsx scripts/sweep-orphan-images.ts --delete    # actually deletes them
```

The R2 Access Key ID/Secret come from an **R2 API token**
(dashboard → R2 → Manage API tokens — distinct from a general Cloudflare API
token), scoped to read-only S3 access on `animals-vida-digna-images` for the
dry run, or read+write if you intend to also run `--delete` without a
separate manual deletion step. See `packages/content/scripts/sweep-orphan-images.ts`
(Task 5 of this plan) for the implementation.

## Backups

```bash
wrangler d1 export avd-content --remote --output backup-$(date +%Y%m%d).sql
```

`--remote`, `--output`, `--table`, `--no-schema`, and `--no-data` are all
real flags on wrangler 4.75 (verified with `wrangler d1 export --help`
while writing this runbook — re-run that command yourself after any
wrangler upgrade, since flags are not covered by this repository's tests).
Store the resulting `.sql` file outside the repository (it contains
personal data — volunteer emails in the `user` table). R2 objects have no
equivalent single-command export; for a full image backup, use
`wrangler r2 object get` per key or the S3-compatible API's batch download
tools.

## Rollback per phase

- **Phase 6 (this phase):** revert its merge commit. This restores
  `apps/web/scripts/sync-images.ts` and any deleted files, and reverts the
  `.planning`/README changes — it does **not** restore volunteers' GitHub
  Write access or the deleted collaborator invitations, which must be redone
  manually via `gh api ... collaborators` if reverting is genuinely needed.
- **Phases 0–5:** each phase's own doc states its rollback (revert the
  merge commit; D1/R2 state from an already-merged phase is not
  automatically rolled back and must be handled per the *Rollout order and
  safety* section of the spec).

## Monitoring

Cloudflare dashboard → **Workers & Pages → animals-vida-digna-admin →
Observability → Logs** (and the equivalent for `animals-vida-digna`) shows
live request logs. Watch for:

- `ActionError` with a 500 status in the admin Worker's logs — indicates an
  uncaught exception in an Astro Action (`cats.create`, `images.upload`,
  etc.); the error message and stack are in the log line.
- R2 `put` failures during `images.upload` — surface as an `ActionError`
  with a message mentioning the bucket or key; check `IMAGES_BUCKET` is
  still bound correctly in `apps/admin/wrangler.toml` if these start
  appearing after a config change.
- A spike in `401`/`UNAUTHORIZED` action responses — normal if a volunteer's
  session expired, worth investigating if it correlates with a secret
  rotation you didn't intend (see the `BETTER_AUTH_SECRET` warning above).
```

- [ ] **Step 2: Reviewer checklist (this task's "test")**

- [ ] Every Cloudflare resource name matches the spec's *Cloudflare
      resources* table exactly (D1 `avd-content`, R2 bucket
      `animals-vida-digna-images`, Worker names).
- [ ] Every secret name matches the spec's *Secrets* list exactly (5 names:
      `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`,
      `AUTH_EMAIL_FROM`, `ADMIN_ALLOWED_EMAILS` — note `AUTH_INSECURE_COOKIES`
      is `.dev.vars`-only per the spec, not a production secret, so it is
      correctly excluded from the "5 names" count here and in Task 9).
- [ ] The `wrangler d1 export --help` flags quoted (`--local`, `--remote`,
      `--output`, `--table`, `--no-schema`, `--no-data`) match what Task 5's
      author verified with the same command (see "Before you start").
- [ ] The orphan-sweep section's command matches Task 5's actual script
      interface (env var names, `--delete` flag) once Task 5 is written —
      fix either doc if they drift during implementation.
- [ ] Ports (4321 web / 4322 admin) match `apps/web/astro.config.mjs` and
      `apps/admin/astro.config.mjs` from Phase 1/4.

- [ ] **Step 3: Commit**

```bash
git add docs/admin-runbook.md
git commit -m "docs: add maintainer runbook for admin app and D1/R2"
```

---

### Task 3: Scope `docs/keystatic-admin-setup.md` down to settings/landing/pages

**Files:**
- Modify: `docs/keystatic-admin-setup.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: a doc that no longer claims volunteers use Keystatic or need
  GitHub — Task 1's `admin-guide.md` is now the volunteer entry point for
  cats, and this doc is maintainer-only.

- [ ] **Step 1: Apply the following edits**

Change the opening framing (cats no longer live here):

```diff
-# Keystatic admin: setup and volunteer access
+# Keystatic admin: maintainer setup (settings, landing, pages)

-The site's content (cats, pages, settings) lives as files in this repository.
+The site's settings, landing page, and static pages live as files in this
+repository. **Cats no longer live here** — cat data and photos moved to D1
+and R2, edited through the separate admin app documented in
+`docs/admin-guide.md` (volunteers) and `docs/admin-runbook.md` (maintainer).
 Keystatic is the admin UI that lets people edit those files through a web form
 instead of writing Markdown by hand.

-Volunteers use it at **https://animalsvidadigna.org/keystatic**.
+Since Phase 6 of the content/R2/admin-app migration, **only the
+maintainer** uses this Keystatic UI, at
+**https://animalsvidadigna.org/keystatic**, to edit site settings, the
+landing page, and static pages. Volunteers use
+**https://admin.animalsvidadigna.org** instead — see `docs/admin-guide.md`.
```

Change the "Invite volunteers" section, since it no longer applies to the
people who edit cats — reword it as history/maintainer-only:

```diff
-### 4. Invite volunteers
+### 4. Repository collaborators
 
-Repository **Settings → Collaborators → Add people**, with the **Write** role.
-Write is required — Keystatic pushes the volunteer's branch using their own
-GitHub token, so Read access is not enough to save anything.
-
-Removing someone's collaborator access immediately revokes their admin access.
+As of Phase 6 of the content/R2/admin-app migration, no volunteer holds
+repository **Write** access. Only the maintainer (and anyone else who
+needs to review pull requests against `main`) should be a collaborator, and
+that access should stay at whatever role GitHub's PR-review workflow
+requires for them — Keystatic's GitHub-mode saves are now used exclusively
+by the maintainer, editing settings/landing/pages, so this is no longer a
+volunteer-facing permission. See `docs/admin-runbook.md` for how volunteer
+access to the *admin app* (not this repository) is managed.
```

Change the "For volunteers" section title and content to "For the
maintainer", since it described the exact workflow that is now
maintainer-only:

```diff
-## For volunteers
+## For the maintainer (settings, landing page, static pages only)
 
 1. Accept the repository invitation that arrives by email (needs a free GitHub
    account — sign up at <https://github.com/signup>).
 2. Go to <https://animalsvidadigna.org/keystatic> and click sign in with GitHub.
-3. Edit a cat, page, or setting.
+3. Edit a page or setting — the `cats` collection no longer appears in this
+   Keystatic instance's navigation (Phase 3 removed it; see the spec at
+   `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md`).
 4. Click **Save**, and choose **create a new branch** — give it a short name
    describing the change, e.g. "new cat Nala".
 5. Done. The change is queued for review and goes live once approved.
 
 If sign-in fails, the invitation was probably not accepted yet.
```

Note the leftover "new cat Nala" example in step 4 is intentionally not
rewritten to a settings example beyond the collection-removal note above —
replace it for accuracy:

```diff
 4. Click **Save**, and choose **create a new branch** — give it a short name
-   describing the change, e.g. "new cat Nala".
+   describing the change, e.g. "update donate URL".
```

- [ ] **Step 2: Reviewer checklist (this task's "test")**

- [ ] `grep -n "Volunteers use it" docs/keystatic-admin-setup.md` returns no
      match (the old apex-domain volunteer sentence is gone).
- [ ] `grep -n "cat" docs/keystatic-admin-setup.md` (case-insensitive) only
      matches the explanatory sentences added above, not workflow
      instructions implying cats are edited here.
- [ ] `grep -n "Invite volunteers" docs/keystatic-admin-setup.md` returns no
      match.

- [ ] **Step 3: Commit**

```bash
git add docs/keystatic-admin-setup.md
git commit -m "docs: scope keystatic-admin-setup.md to settings/landing/pages"
```

---

### Task 4: Delete leftovers of the git-based cat pipeline

**Files:**
- Delete: `apps/web/scripts/sync-images.ts`
- Modify: `apps/web/package.json` (remove the `sync-images` script entry)
- Delete (if still present): `apps/web/src/content/cats/`
- Delete: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Test: none (deletion + grep verification is the test)

**Interfaces:**
- Consumes: nothing.
- Produces: a repository with no dead references to the old sync/PR-per-cat
  workflow, verified by the grep commands in Step 3.

- [ ] **Step 1: Delete `apps/web/scripts/sync-images.ts` and its script entry**

```bash
git rm apps/web/scripts/sync-images.ts
```

In `apps/web/package.json`, remove this line from `"scripts"`:

```diff
     "test": "vitest run",
-    "sync-images": "npx tsx scripts/sync-images.ts"
+    "test": "vitest run"
```

(keep whichever of `test`/the line above it ends up needing the trailing
comma correctly — the point is the `"sync-images": "npx tsx
scripts/sync-images.ts"` key-value pair is removed entirely from
`apps/web/package.json`'s `scripts` object.)

- [ ] **Step 2: Confirm `apps/web/src/content/cats/` is gone**

```bash
ls apps/web/src/content/cats 2>&1
```

Expected: `No such file or directory` (Phase 3 already deleted it per the
spec's *Public site* section — "Keystatic `cats` collection and
`src/content/cats/` removed"). If the directory still exists for any
reason, delete it now:

```bash
git rm -r apps/web/src/content/cats
```

- [ ] **Step 3: Replace the stale Payload issue-template config**

```bash
git rm .github/ISSUE_TEMPLATE/config.yml
rmdir .github/ISSUE_TEMPLATE 2>/dev/null || true
```

Create `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Summary

<!-- What does this PR change and why? -->

## Checklist

- [ ] `pnpm turbo test` passes
- [ ] `pnpm turbo build` passes
- [ ] Lighthouse mobile ≥ 95 on all four categories, on any page this PR
      touches (see `docs/admin-runbook.md` for how content changes bypass
      this — this checklist is for code changes only)
- [ ] Relevant docs updated (`docs/admin-guide.md`, `docs/admin-runbook.md`,
      `docs/keystatic-admin-setup.md`, or `.planning/*` as applicable)
```

- [ ] **Step 4: Grep for leftover references**

```bash
grep -rn "sync-images" --include="*.md" --include="*.json" --include="*.ts" \
  --include="*.toml" . --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=.planning --exclude-dir=docs
grep -rn "R2 via Worker-signed" . --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=.planning --exclude-dir=docs
grep -rn "public/images/cats" . --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=.planning --exclude-dir=docs
```

Expected: no matches. `--exclude-dir=.planning --exclude-dir=docs` is
deliberate, not a loophole: `.planning/STATE.md`,
`.planning/phases/03-forms-images-media/{03-03-PLAN,03-03-SUMMARY,03-CONTEXT,03-VALIDATION,03-RESEARCH}.md`,
`.planning/research/{ARCHITECTURE,PITFALLS}.md`, and
`.planning/phases/01-foundation-cms-i18n/01-02-PLAN.md` are dated execution
records of what Phase 3 actually built at the time — rewriting them would
falsify project history. They are intentionally left alone; only the one
**live, forward-looking** requirement text this history feeds into —
`.planning/PROJECT.md`'s "Active" checklist line
`- [ ] CMS image uploads to R2 via Worker-signed URLs` — is corrected, in
Task 6's `PROJECT.md` diff below, alongside `REQUIREMENTS.md`'s IMG-02.
`docs/superpowers/plans/2026-09-03-content-r2-pipeline/research/repo-map.md`
is excluded for the same reason (a research snapshot of the pre-migration
repo). Any match inside `apps/web/`, `apps/admin/`, or `packages/` must be
fixed before committing — those are live source, not history.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json .github/PULL_REQUEST_TEMPLATE.md
git commit -m "chore(monorepo): remove git-based cat pipeline leftovers"
```

---

### Task 5: `packages/content/scripts/sweep-orphan-images.ts` (TDD)

**Files:**
- Create: `packages/content/src/orphans.ts`
- Create: `packages/content/tests/orphans.test.ts`
- Create: `packages/content/scripts/sweep-orphan-images.ts`
- Modify: `packages/content/package.json` (add `aws4fetch` dependency)

**Interfaces:**
- Consumes: nothing from earlier tasks in this phase.
- Produces: `isCatImageKey(key: string): boolean` and
  `findOrphans(r2Keys: string[], dbKeys: string[]): string[]`, referenced by
  `docs/admin-runbook.md`'s *Orphan image sweep* section (Task 2) and by the
  script this task also creates.

- [ ] **Step 1: Write the failing test**

Create `packages/content/tests/orphans.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findOrphans, isCatImageKey } from '../src/orphans';

describe('isCatImageKey', () => {
  it('accepts a well-formed cat image key', () => {
    expect(isCatImageKey('cats/abc123/img456.webp')).toBe(true);
  });

  it('rejects keys outside the cats/ prefix', () => {
    expect(isCatImageKey('settings/logo.webp')).toBe(false);
  });

  it('rejects non-webp extensions', () => {
    expect(isCatImageKey('cats/abc123/img456.png')).toBe(false);
  });

  it('rejects keys with too few path segments', () => {
    expect(isCatImageKey('cats/img456.webp')).toBe(false);
  });

  it('rejects keys with too many path segments', () => {
    expect(isCatImageKey('cats/abc123/nested/img456.webp')).toBe(false);
  });
});

describe('findOrphans', () => {
  it('returns cat image keys present in R2 but absent from the DB', () => {
    const r2Keys = [
      'cats/abc123/img1.webp',
      'cats/abc123/img2.webp',
      'cats/def456/img3.webp',
    ];
    const dbKeys = ['cats/abc123/img1.webp'];

    expect(findOrphans(r2Keys, dbKeys)).toEqual([
      'cats/abc123/img2.webp',
      'cats/def456/img3.webp',
    ]);
  });

  it('returns an empty array when every R2 key has a DB row', () => {
    const r2Keys = ['cats/abc123/img1.webp'];
    const dbKeys = ['cats/abc123/img1.webp'];

    expect(findOrphans(r2Keys, dbKeys)).toEqual([]);
  });

  it('ignores non-cat-image keys even if absent from the DB', () => {
    const r2Keys = ['settings/logo.webp', 'cats/abc123/img1.webp'];
    const dbKeys: string[] = [];

    expect(findOrphans(r2Keys, dbKeys)).toEqual(['cats/abc123/img1.webp']);
  });

  it('returns an empty array for empty input', () => {
    expect(findOrphans([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/content && pnpm vitest run tests/orphans.test.ts`
Expected: FAIL — `Cannot find module '../src/orphans'` (the module does not
exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `packages/content/src/orphans.ts`:

```ts
const CAT_IMAGE_KEY_PATTERN = /^cats\/[^/]+\/[^/]+\.webp$/;

/**
 * True when `key` matches the R2 key shape used for cat images:
 * `cats/<catId>/<imageId>.webp` (see `imageKey` in `image-url.ts`).
 */
export function isCatImageKey(key: string): boolean {
  return CAT_IMAGE_KEY_PATTERN.test(key);
}

/**
 * Cat image keys that exist in R2 (`r2Keys`) but have no matching
 * `cat_images.r2_key` row in D1 (`dbKeys`). Pure diff, no I/O — the sweep
 * script (`scripts/sweep-orphan-images.ts`) supplies both lists.
 */
export function findOrphans(r2Keys: string[], dbKeys: string[]): string[] {
  const dbKeySet = new Set(dbKeys);
  return r2Keys.filter((key) => isCatImageKey(key) && !dbKeySet.has(key));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/content && pnpm vitest run tests/orphans.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit the pure functions**

```bash
git add packages/content/src/orphans.ts packages/content/tests/orphans.test.ts
git commit -m "test(content): add orphan cat-image key diff functions"
```

- [ ] **Step 6: Add `aws4fetch` and write the sweep script**

```bash
cd packages/content
pnpm add aws4fetch
```

Create `packages/content/scripts/sweep-orphan-images.ts`:

```ts
/**
 * sweep-orphan-images.ts
 *
 * Finds R2 objects under cats/ with no matching cat_images.r2_key row in
 * D1, and (with --delete) removes them. Dry run by default.
 *
 * Listing uses the R2 S3-compatible API (ListObjectsV2) signed with
 * aws4fetch, because `wrangler r2 object` has no `list` subcommand
 * (confirmed against wrangler 4.75.0 --help; only get/put/delete exist).
 * Deletion uses `wrangler r2 object delete`, which does exist.
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID   Cloudflare account ID
 *   R2_ACCESS_KEY_ID        R2 API token Access Key ID (S3 credentials,
 *                            NOT a general Cloudflare API token — see
 *                            https://developers.cloudflare.com/r2/api/tokens/)
 *   R2_SECRET_ACCESS_KEY    R2 API token Secret Access Key
 *
 * Usage:
 *   npx tsx scripts/sweep-orphan-images.ts             # dry run
 *   npx tsx scripts/sweep-orphan-images.ts --delete     # delete orphans
 */

import { execSync } from 'node:child_process';
import { AwsClient } from 'aws4fetch';
import { findOrphans } from '../src/orphans';

const BUCKET_NAME = 'animals-vida-digna-images';
const D1_DATABASE = 'avd-content';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Extracts every `<Key>...</Key>` value from an S3 ListObjectsV2 XML body. */
function parseObjectKeys(xml: string): string[] {
  const keys: string[] = [];
  const pattern = /<Key>([^<]+)<\/Key>/g;
  let match: RegExpExecArray | null = pattern.exec(xml);
  while (match !== null) {
    keys.push(match[1]);
    match = pattern.exec(xml);
  }
  return keys;
}

/** Lists every object under the `cats/` prefix, following pagination. */
async function listCatImageKeysInR2(): Promise<string[]> {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const client = new AwsClient({
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
  });
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const url = new URL(`${endpoint}/${BUCKET_NAME}`);
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', 'cats/');
    if (continuationToken) {
      url.searchParams.set('continuation-token', continuationToken);
    }

    const response = await client.fetch(url);
    if (!response.ok) {
      throw new Error(
        `R2 list failed: ${response.status} ${await response.text()}`
      );
    }

    const xml = await response.text();
    keys.push(...parseObjectKeys(xml));

    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)</);
    continuationToken = truncated ? tokenMatch?.[1] : undefined;
  } while (continuationToken);

  return keys;
}

/** Reads every `cat_images.r2_key` from D1 via `wrangler d1 execute --json`. */
function listCatImageKeysInD1(): string[] {
  const output = execSync(
    `npx wrangler d1 execute ${D1_DATABASE} --remote --json ` +
      `--command "select r2_key from cat_images"`,
    { encoding: 'utf-8' }
  );
  const parsed = JSON.parse(output) as Array<{
    results: Array<{ r2_key: string }>;
  }>;
  return parsed[0]?.results.map((row) => row.r2_key) ?? [];
}

function deleteFromR2(key: string): void {
  execSync(`npx wrangler r2 object delete "${BUCKET_NAME}/${key}"`, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

async function main() {
  const shouldDelete = process.argv.includes('--delete');

  console.log('Listing R2 objects under cats/...');
  const r2Keys = await listCatImageKeysInR2();
  console.log(`Found ${r2Keys.length} object(s) in R2.`);

  console.log('Listing cat_images.r2_key from D1...');
  const dbKeys = listCatImageKeysInD1();
  console.log(`Found ${dbKeys.length} row(s) in D1.`);

  const orphans = findOrphans(r2Keys, dbKeys);

  if (orphans.length === 0) {
    console.log('No orphan images found.');
    return;
  }

  console.log(`\n${orphans.length} orphan image(s):`);
  for (const key of orphans) {
    console.log(`  - ${key}`);
  }

  if (!shouldDelete) {
    console.log('\nDry run — nothing deleted. Re-run with --delete to remove them.');
    return;
  }

  console.log('\nDeleting...');
  for (const key of orphans) {
    process.stdout.write(`  Deleting ${key}... `);
    try {
      deleteFromR2(key);
      console.log('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${message}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 7: Verify the script's pure logic is exercised by the Task 5 tests**

Run: `cd packages/content && pnpm vitest run tests/orphans.test.ts`
Expected: PASS (unchanged — the script only adds I/O around the already-
tested `findOrphans`/`isCatImageKey`; there is no new pure logic to test in
`sweep-orphan-images.ts` itself, per the spec's testing constraint of
pure-function-style Vitest tests. Manually verify the script end-to-end
against production once, per the runbook's *Orphan image sweep* section,
before relying on it operationally.)

- [ ] **Step 8: Commit**

```bash
git add packages/content/scripts/sweep-orphan-images.ts packages/content/package.json packages/content/pnpm-lock.yaml
git commit -m "feat(content): add orphan R2 image sweep script"
```

---

### Task 6: `.planning` updates

**Files:**
- Modify: `.planning/REQUIREMENTS.md`
- Modify: `.planning/ROADMAP.md`
- Modify: `.planning/STATE.md`
- Modify: `.planning/PROJECT.md`

**Interfaces:**
- Consumes: nothing.
- Produces: planning docs that describe the D1/R2/admin-app architecture
  instead of the git-based Keystatic-only one, checked in Task 10's
  Definition-of-done walk.

- [ ] **Step 1: `.planning/REQUIREMENTS.md` — rewrite IMG-02, annotate CMS-02, add ADMIN-01…03**

```diff
 ### Images & Performance

 - [x] **IMG-01**: Images stored in Cloudflare R2 and served via Cloudflare CDN
-- [x] **IMG-02**: CMS image uploads via Worker-signed URLs to R2
+- [x] **IMG-02**: CMS image uploads via the admin app into R2 (browser resizes
+  to ≤2000px WebP, `apps/admin`'s `images.upload` Astro Action streams it to
+  R2 — see `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md`)
 - [x] **IMG-03**: Responsive images using Cloudflare Image Resizing (/cdn-cgi/image/) with AVIF/WebP auto-format
 - [x] **IMG-04**: Long-lived immutable cache headers on image assets
 - [x] **IMG-05**: Lazy loading for below-fold images and gallery thumbnails
```

```diff
 ### CMS Content Model

 - [ ] **CMS-01**: Site settings singleton (site name, logo, primary color, social links, donate URL, contact email, default SEO — all with CA/ES variants where applicable)
-- [ ] **CMS-02**: Cats collection with localized fields (slug, name, short/long description, SEO per locale) and non-localized fields (status, age, sex, temperament, weight, cover image, gallery)
+- [x] **CMS-02**: Cats collection with localized fields (slug, name,
+  short/long description, SEO per locale) and non-localized fields (status,
+  age, sex, temperament, weight, cover image, gallery). **Note (2026-09-03):**
+  cats no longer live in Keystatic/git — they live in D1 (`avd-content`,
+  tables `cats`/`cat_images`) and are edited in the separate `apps/admin`
+  app, not this Keystatic instance. See the content/R2/admin-app plan at
+  `docs/superpowers/plans/2026-09-03-content-r2-pipeline/README.md`.
 - [ ] **CMS-03**: Landing page sections configurable as typed blocks (hero, about, how-it-works, featured-cats, testimonials, FAQ, contact-cta) with localized fields and reorderable
 - [ ] **CMS-04**: Optional static pages collection (privacy, legal) with per-locale content and SEO
 - [ ] **CMS-05**: All image fields include alt text in both CA and ES
```

Add a new `### Admin app` section (after `### CMS Content Model`, before
`### Cats Directory`):

```diff
 ### CMS Content Model

 - [ ] **CMS-01**: Site settings singleton (site name, logo, primary color, social links, donate URL, contact email, default SEO — all with CA/ES variants where applicable)
 ...
 - [ ] **CMS-05**: All image fields include alt text in both CA and ES

+### Admin app
+
+- [x] **ADMIN-01**: A dedicated admin app (`apps/admin`, `admin.animalsvidadigna.org`)
+  lets an allowlisted volunteer sign in with email + one-time code and edit
+  cats without a GitHub account or a pull request
+- [x] **ADMIN-02**: Cat edits (data and photos) are live on the public site
+  within seconds of saving, with no review step, while the code repository
+  keeps its existing pull-request review rule
+- [x] **ADMIN-03**: Volunteers hold no GitHub repository access; the admin
+  app's own allowlist (`ADMIN_ALLOWED_EMAILS`) is the sole access control
+  for cat editing
+
 ### Cats Directory
```

Update the traceability table's `CMS-02` and `IMG-02` rows and append the
new `ADMIN-*` rows:

```diff
 | CMS-01 | Phase 1 | Pending |
-| CMS-02 | Phase 1 | Pending |
+| CMS-02 | Phase 1 (superseded by content-r2-pipeline Phase 3/5) | Complete |
 | CMS-03 | Phase 1 | Pending |
 | CMS-04 | Phase 1 | Pending |
 | CMS-05 | Phase 1 | Pending |
+| ADMIN-01 | content-r2-pipeline Phase 4 | Complete |
+| ADMIN-02 | content-r2-pipeline Phase 5 | Complete |
+| ADMIN-03 | content-r2-pipeline Phase 6 | Complete |
```

```diff
-| IMG-02 | Phase 3 | Complete |
+| IMG-02 | Phase 3 (superseded by content-r2-pipeline Phase 5) | Complete |
```

Update the coverage footer:

```diff
 **Coverage:**
-- v1 requirements: 45 total
-- Mapped to phases: 45
+- v1 requirements: 48 total (45 original + ADMIN-01, ADMIN-02, ADMIN-03)
+- Mapped to phases: 48
 - Unmapped: 0
```

- [ ] **Step 2: `.planning/ROADMAP.md` — fix Phase 3 wording, add Phase 5 entry**

```diff
 ### Phase 3: Forms, Images & Media
 **Goal**: Visitors can submit contact and adoption forms that deliver emails via Resend, and all images flow through the R2 storage and Cloudflare Image Resizing pipeline
 **Depends on**: Phase 2
 **Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, FORM-06, IMG-01, IMG-02, IMG-03, IMG-04, IMG-05
 **Success Criteria** (what must be TRUE):
   1. Submitting the contact form sends an email to the shelter via Resend with localized confirmation, and the adoption form pre-fills the cat name
   2. Forms validate on both client and server, reject spam via honeypot, and enforce basic rate limiting
-  3. Shelter staff can upload images through Keystatic that are stored in R2 via Worker-signed URLs
+  3. Shelter staff can upload images through the admin app (added in the
+     content-r2-pipeline milestone, Phase 5) that are stored in R2; at the
+     time this phase originally shipped (2026-03-18), image upload was via
+     Keystatic's git-backed storage, later superseded
   4. Public images are served through Cloudflare Image Resizing with responsive srcsets, AVIF/WebP auto-format, and long-lived cache headers
   5. Below-fold images and gallery thumbnails lazy-load
```

Add a new phase entry at the end of `## Phase Details`, after Phase 4:

```diff
 - [x] 04-03-PLAN.md — Performance: font stack cleanup, manual Lighthouse 95+ verification checkpoint
 - [ ] 04-04-PLAN.md — Create missing robots.txt (gap closure)
 - [ ] 04-05-PLAN.md — Performance investigation and fixes: LCP image optimization, CLS prevention, lazy Tobii, deferred hydration (gap closure)
 - [ ] 04-06-PLAN.md — Lighthouse score confirmation checkpoint (gap closure)

+### Phase 5 (content-r2-pipeline milestone): Content admin & R2
+**Goal**: Cat data and images move out of git into Cloudflare D1/R2, edited
+through a dedicated admin app, so volunteers no longer need GitHub access
+and content changes go live without a pull request
+**Depends on**: Phase 3 (this repository's baseline — the R2 image
+pipeline Phase 3 already established) plus the content-r2-pipeline plan's
+own Phase 0–4. Independent of this repository's Phase 4
+(SEO/Accessibility/Performance), which the Progress table above shows still
+in progress (3/6 plans) — the content-r2-pipeline milestone does not wait
+on it.
+**Requirements**: IMG-02 (superseding), CMS-02 (superseding), ADMIN-01,
+ADMIN-02, ADMIN-03
+**Success Criteria** (what must be TRUE):
+  1. A volunteer with only an email address signs in at
+     `https://admin.animalsvidadigna.org`, edits a cat, uploads a photo, and
+     sees it live on the public site within seconds — no pull request
+  2. Cat pages render on demand from D1; cat images are served from R2
+     through `images.animalsvidadigna.org`
+  3. No volunteer holds GitHub repository Write access
+  4. `docs/admin-guide.md` and `docs/admin-runbook.md` exist and match
+     reality
+**Plans**: see `docs/superpowers/plans/2026-09-03-content-r2-pipeline/README.md`
+(phase-0 through phase-6 documents) — status: **Complete**, completed
+2026-09-03.
```

Update the `## Progress` table:

```diff
 | Phase | Plans Complete | Status | Completed |
 |-------|----------------|--------|-----------|
 | 1. Foundation, CMS & i18n | 3/3 | Complete    | 2026-03-18 |
 | 2. Public Pages & Cats Directory | 2/2 | Complete    | 2026-03-18 |
 | 3. Forms, Images & Media | 4/4 | Complete   | 2026-03-18 |
 | 4. SEO, Accessibility & Performance | 3/6 | In progress | - |
+| 5. Content admin & R2 (content-r2-pipeline) | 7/7 (phase-0..phase-6) | Complete | 2026-09-03 |
```

- [ ] **Step 3: `.planning/STATE.md` — record the new milestone**

```diff
 ---
 gsd_state_version: 1.0
 milestone: v1.0
 milestone_name: milestone
 status: unknown
-stopped_at: Completed 04-06-PLAN.md
-last_updated: "2026-03-20T08:41:37.893Z"
+stopped_at: Completed content-r2-pipeline phase-6-cutover-docs.md
+last_updated: "2026-09-03T00:00:00.000Z"
 progress:
   total_phases: 4
   completed_phases: 4
   total_plans: 15
   completed_plans: 15
+  content_r2_pipeline_phases: 7
+  content_r2_pipeline_phases_completed: 7
 ---
```

```diff
 **Core value:** Visitors can discover adoptable cats and take action (adopt, donate, contact) in their language, with all content managed by non-technical shelter staff through Keystatic.
-**Current focus:** Phase 04 — seo-accessibility-performance
+**Current focus:** content-r2-pipeline milestone complete — cats now managed
+through the `apps/admin` app (D1/R2), not Keystatic; settings/landing/pages
+remain in Keystatic
```

```diff
 ## Current Position

-Phase: 04 (seo-accessibility-performance) — EXECUTING
-Plan: 1 of 6
+Phase: 04 (seo-accessibility-performance) — status unchanged by this
+milestone (see gap-closure plans 04-04..04-06 for its own status)
+content-r2-pipeline: Phase 6 (cutover-docs) — COMPLETE, all 7 phase
+documents (phase-0 through phase-6) executed
```

Append a decision to the "Recent decisions affecting current work" list
under `### Decisions`:

```diff
 - [Phase 04]: Auto-approved Lighthouse checkpoint per auto_advance config (build successful, all 04-05 fixes in place)
+- [content-r2-pipeline Phase 1]: Converted to pnpm + Turborepo monorepo (`apps/web`, `apps/admin`, `packages/content`, `packages/design-system`)
+- [content-r2-pipeline Phase 3]: Cats moved from Keystatic/git (`src/content/cats/`) to D1 (`avd-content`, tables `cats`/`cat_images`); public cat pages render on demand (`prerender = false`)
+- [content-r2-pipeline Phase 4/5]: New `apps/admin` Astro app with better-auth `emailOTP` login (allowlist-based) and Astro Actions for cat CRUD and R2 image upload
+- [content-r2-pipeline Phase 6]: Volunteers' GitHub collaborator access removed; Keystatic retained, maintainer-only, for settings/landing/pages
```

- [ ] **Step 4: `.planning/PROJECT.md` — update Constraints, Active list, and Key Decisions**

Fix the "Active" requirements checklist first — this is the live line the
history files in Task 4's excluded `.planning` grep are not allowed to
rewrite, but this current-state line must match reality:

```diff
 - [ ] Full localized SEO (hreflang, OG, structured data, sitemap)
-- [ ] CMS image uploads to R2 via Worker-signed URLs
+- [x] CMS image uploads to R2 via the admin app's `images.upload` Astro
+  Action (superseded the original Worker-signed-URL approach; see
+  `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md`)
 - [ ] Cloudflare Image Resizing for responsive/optimized delivery
```

```diff
 ## Constraints

 - **Tech stack**: Astro + Keystatic + TailwindCSS + Cloudflare (Workers + R2) — non-negotiable per project brief
 - **Localization**: Catalan default at root (/), Spanish under /es — path-based, no auto-redirect
 - **Email**: Resend for transactional email (contact/adoption forms)
 - **Images**: R2 storage + Cloudflare Image Resizing — no other CDN or image service
 - **Performance**: Lighthouse >= 95 on all four categories (mobile) in both locales
-- **CMS**: Git-backed Keystatic — no database dependency for content
+- **CMS**: Keystatic for site settings, landing page, and static pages
+  (git-backed, PR-reviewed). Cats live in Cloudflare D1 (`avd-content`) and
+  are edited through a dedicated admin app (`apps/admin`,
+  `admin.animalsvidadigna.org`) with no PR step — see
+  `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md`.
 - **Accessibility**: WCAG AA minimum
```

Append to the Key Decisions table:

```diff
 | Localized fields in single entity | cats collection uses slug_ca/slug_es, name_ca/name_es pattern — avoids content duplication across locale collections | — Pending |
 | Path-based i18n (not subdomain) | Simpler DNS, single deployment, standard for bilingual sites | — Pending |
+| Cats moved from git/Keystatic to D1/R2 (2026-09-03) | Weekly content changes forced a PR + maintainer review each time; the repository's branch-protection ruleset must stay for code but must not gate routine cat edits | Complete |
+| Separate `apps/admin` Astro app rather than `/admin` routes in the site | Independent deploy/failure domain; public Worker keeps zero auth code; cookies scoped to `admin.` subdomain | Complete |
+| better-auth `emailOTP` rather than Cloudflare Access for admin login | Keeps login inside the app, no Zero Trust dependency, room for roles later; both are free at this scale | Complete |
+| Cloudflare Images URL transformations rather than the Images binding | The binding requires the Paid plan; URL transformations are free (5,000/month) and work over the R2 custom domain | Complete |
```

- [ ] **Step 5: Commit**

```bash
git add .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md .planning/PROJECT.md
git commit -m "docs: update planning docs for D1/R2 content admin architecture"
```

---

### Task 7: Root `README.md`

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: the workspace layout from Phase 1 (`pnpm-workspace.yaml`
  `packages: ['apps/*', 'packages/*']`), `turbo.json`'s task names
  (`build`, `test`, `lint`, `check`), and Tasks 1–2's doc paths.
- Produces: the top-level entry point for anyone new to the repository —
  checked in Task 10's Definition-of-done walk.

- [ ] **Step 1: Write `README.md`**

```markdown
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
packages/design-system      @avd/design-system — shared React component
                            library (buttons, cards, form fields).
```

Cats (data + photos) live in Cloudflare D1 (`avd-content`) and R2
(`animals-vida-digna-images`), edited through `apps/admin`. Site settings,
the landing page, and static pages still live as files in this repository,
edited through Keystatic (`/keystatic` on the public site) with a
pull-request review step — see `docs/keystatic-admin-setup.md`.

## Commands

```bash
pnpm install              # install all workspace dependencies

pnpm turbo test            # run every package's tests
pnpm turbo build           # build every package/app

pnpm --filter web dev      # run the public site locally (http://localhost:4321)
pnpm --filter admin dev    # run the admin app locally (http://localhost:4322)

pnpm lint                  # biome check . (root-only, not a turbo task)
pnpm format                # biome format --write .
```

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
build and deploy for whichever app's files changed.
```

- [ ] **Step 2: Reviewer checklist (this task's "test")**

- [ ] Ports match `docs/admin-runbook.md`'s Local development table (4321
      web, 4322 admin).
- [ ] Every doc link resolves to a file that exists after Tasks 1–3 of this
      phase.
- [ ] `pnpm-workspace.yaml` (Phase 1) actually lists `apps/*` and
      `packages/*` as shown.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add root README with monorepo layout and doc links"
```

---

### Task 8: Remove volunteer GitHub collaborator access

**Files:** none (GitHub account changes only; this task is a checklist, not
a code/doc change).

**Interfaces:**
- Consumes: nothing.
- Produces: a GitHub repository state Task 10's Definition-of-done walk
  checks (`docs/superpowers/plans/2026-09-03-content-r2-pipeline/README.md`'s
  "no volunteer holds Write access" item).

- [ ] **Step 1: List current collaborators**

```bash
gh api repos/OsoThevenin/animals-vida-digna/collaborators --jq '.[].login'
```

- [ ] **Step 2: Identify volunteers vs. maintainer(s)**

Cross-reference the list against who needs ongoing repository access for
code review (the maintainer, and anyone else who reviews pull requests
against `main`). Everyone else on the list — anyone who was invited solely
to edit cats through the old Keystatic GitHub-mode flow — is a volunteer to
remove.

- [ ] **Step 3: Remove each volunteer**

```bash
gh api -X DELETE repos/OsoThevenin/animals-vida-digna/collaborators/<login>
```

Repeat per volunteer login identified in Step 2.

- [ ] **Step 4: Confirm the branch-protection ruleset is unchanged**

```bash
gh api repos/OsoThevenin/animals-vida-digna/rulesets/22118349 --jq '.rules[].type'
```

Expected output includes `deletion`, `non_fast_forward`, `pull_request` (the
spec's Non-goals section states explicitly: "Changing the GitHub ruleset" is
out of scope for this whole migration — this step is a negative check that
nothing altered it as a side effect of the collaborator removal).

- [ ] **Step 5: Re-list collaborators to confirm**

```bash
gh api repos/OsoThevenin/animals-vida-digna/collaborators --jq '.[].login'
```

Expected: only the maintainer (and any other code reviewers) remain.

No commit for this task — it changes GitHub account state, not repository
files.

---

### Task 9: Verify secrets are set and none are leaked in git

**Files:** none (verification checklist only).

**Interfaces:**
- Consumes: the 5 secret names from `docs/admin-runbook.md` (Task 2).
- Produces: confirmation recorded in Task 10's `phase-6-results.md`.

- [ ] **Step 1: Confirm all 5 admin secrets are set**

```bash
cd apps/admin
wrangler secret list
```

Expected: exactly 5 entries — `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `ADMIN_ALLOWED_EMAILS`. (Values are
never shown by this command, only names — that is expected, not a bug.)

- [ ] **Step 2: Confirm no Resend API key is committed**

```bash
git grep -nE 're_[A-Za-z0-9]{20,}'
```

Expected: no output. Resend API keys follow the `re_...` prefix pattern;
any match here is a leaked secret that must be rotated (via
`wrangler secret put RESEND_API_KEY` from `apps/admin/`) and removed from
git history before this task can pass.

- [ ] **Step 3: Confirm `BETTER_AUTH_SECRET` only appears as a name, never a value**

```bash
git grep -n BETTER_AUTH_SECRET
```

Expected: matches only in documentation or example files (`docs/admin-
runbook.md`, `.dev.vars.example` if one exists, `wrangler.toml` referencing
it as a secret name) — never inside a value assignment like
`BETTER_AUTH_SECRET=<actual random string>`. If `.dev.vars` itself appears
in this grep's output, stop: it means `.dev.vars` is tracked by git, which
must never happen — check `.gitignore` for a `.dev.vars` entry and remove
the file from tracking (`git rm --cached apps/admin/.dev.vars`) before
continuing.

No commit for this task — it is a verification checklist only. Record its
results in Task 10's `phase-6-results.md`.

---

### Task 10: Final verification walk and results record

**Files:**
- Create: `docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-6-results.md`

**Interfaces:**
- Consumes: every prior task in this phase, plus the whole-plan Definition
  of done from `docs/superpowers/plans/2026-09-03-content-r2-pipeline/README.md`.
- Produces: the final record for this phase and the whole plan.

- [ ] **Step 1: Run the automated checks**

```bash
pnpm turbo test
pnpm turbo build
```

Both must exit 0. Record the commands' exit status in the results file
(Step 4).

- [ ] **Step 2: Lighthouse mobile on the four required URLs**

Use the same Chrome DevTools Lighthouse flow this repository used for
Phase 4's own verification checkpoint
(`.planning/phases/04-seo-accessibility-performance/04-06-PLAN.md`):

1. Open Chrome, navigate to the URL under test.
2. Open DevTools (F12 or Cmd+Opt+I) → **Lighthouse** tab.
3. Settings: Mode = "Navigation", Device = "Mobile", Categories = all four.
4. Click **Analyze page load** and record the four scores.

Repeat for all four URLs:

- `https://animalsvidadigna.org/`
- `https://animalsvidadigna.org/cats`
- `https://animalsvidadigna.org/cat/<any published slug>`
- `https://animalsvidadigna.org/es/cats`

As a CLI alternative (e.g. for scripting or CI), use the `lighthouse` npm
package directly:

```bash
npx lighthouse https://animalsvidadigna.org/cats \
  --form-factor=mobile --screenEmulation.mobile \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=./lh-cats.json
jq '.categories[].score' ./lh-cats.json
```

Repeat with `--output-path` renamed per URL (e.g. `./lh-home.json`,
`./lh-cat-slug.json`, `./lh-es-cats.json`). `jq` reports each category's
score as a 0–1 fraction; multiply by 100 for the percentage figure the
results table expects.

Each must score ≥ 95 on Performance, Accessibility, Best Practices, and SEO
(the spec's Global Constraints line and the plan README's Definition of
done both require this). Record the four scores × four categories in the
results file.

- [ ] **Step 3: Timed volunteer-style end-to-end walkthrough**

Time, in seconds, a real pass through the volunteer flow:

1. Go to `https://admin.animalsvidadigna.org/login`, sign in with a test
   allowlisted email (start the timer here).
2. Open an existing cat, change its `status`.
3. Upload a new photo to its gallery.
4. Save.
5. Open `https://animalsvidadigna.org/cats` (or the cat's own page) in a
   private/incognito window and confirm the status change and new photo are
   visible (stop the timer here).

Record the total elapsed time and confirm it required no pull request, no
GitHub sign-in, and no manual deploy step.

- [ ] **Step 4: Walk every item in the plan README's Definition of done**

Open `docs/superpowers/plans/2026-09-03-content-r2-pipeline/README.md`'s
*Definition of done (whole plan)* section and, for each checkbox, run the
literal command/URL it names and record PASS/FAIL with evidence:

1. Volunteer end-to-end flow — Step 3 above.
2. `git ls-files apps/web/public/images` — run it, confirm output is only
   `hero_image.webp` and `logo.webp`.
3. Cloudflare billing screen — confirm no Images Paid / Workers Paid
   subscription line item.
4. `pnpm turbo test && pnpm turbo build` — Step 1 above.
5. Lighthouse ×4 URLs ×4 categories — Step 2 above.
6. `gh api repos/OsoThevenin/animals-vida-digna/rulesets/22118349 --jq '.rules[].type'`
   and `gh api repos/OsoThevenin/animals-vida-digna/collaborators --jq '.[].login'`
   — Task 8's Steps 4–5.
7. Existence and accuracy of `docs/admin-guide.md` and
   `docs/admin-runbook.md` — Tasks 1–2's reviewer checklists.

- [ ] **Step 5: Write the results file**

Create `docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-6-results.md`:

```markdown
# Phase 6 — Cut-over verification results

Date: <fill in — date this verification was actually run>
Verified by: <fill in>

## Automated checks

| Command | Result |
|---|---|
| `pnpm turbo test` | <PASS/FAIL, exit code> |
| `pnpm turbo build` | <PASS/FAIL, exit code> |

## Lighthouse (mobile)

| URL | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | | | | |
| `/cats` | | | | |
| `/cat/<slug used>` | | | | |
| `/es/cats` | | | | |

## Volunteer end-to-end timing

Steps: sign in → edit status → upload photo → save → confirm live.
Elapsed: <fill in> seconds.
No pull request / no GitHub sign-in / no manual deploy: <confirm>.

## Whole-plan Definition of done

| Item | Command/URL run | Result |
|---|---|---|
| Volunteer flow, no PR | (Step 3 above) | |
| `git ls-files apps/web/public/images` → only hero_image.webp, logo.webp | | |
| No Images/Workers Paid subscription | Cloudflare dashboard → Billing | |
| `pnpm turbo test && pnpm turbo build` | | |
| Lighthouse ≥ 95 ×4 ×4 | (table above) | |
| GitHub ruleset unchanged | `gh api .../rulesets/22118349 --jq '.rules[].type'` | |
| No volunteer holds Write access | `gh api .../collaborators --jq '.[].login'` | |
| `docs/admin-guide.md` exists and matches reality | | |
| `docs/admin-runbook.md` exists and matches reality | | |

## Secrets verification (Task 9)

| Check | Result |
|---|---|
| `wrangler secret list` shows exactly 5 names | |
| `git grep -nE 're_[A-Za-z0-9]{20,}'` — no matches | |
| `git grep -n BETTER_AUTH_SECRET` — docs/examples only | |

## Outcome

<PASS — every item above is confirmed / FAIL — list open items>
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-6-results.md
git commit -m "docs: record cut-over verification"
```
