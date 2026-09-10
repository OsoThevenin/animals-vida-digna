# Keystatic admin: maintainer setup (settings, landing, pages)

The site's settings, landing page, and static pages live as files in this
repository. **Cats no longer live here** — cat data and photos moved to D1
and R2, edited through the separate admin app documented in
`docs/admin-guide.md` (volunteers) and `docs/admin-runbook.md` (maintainer).
Keystatic is the admin UI that lets people edit those files through a web
form instead of writing Markdown by hand.

Since Phase 6 of the content/R2/admin-app migration, **only the maintainer**
uses this Keystatic UI, at **https://animalsvidadigna.org/keystatic**, to
edit site settings, the landing page, and static pages. Volunteers use
**https://admin.animalsvidadigna.org** instead — see `docs/admin-guide.md`.

## How it works

Keystatic runs in **GitHub mode** in production. There is no separate user
database and no passwords to manage:

1. The maintainer signs in with their GitHub account.
2. GitHub checks they are a collaborator on this repository. If they are not,
   they get no access — that repo invite *is* the permission system.
3. When they save, Keystatic pushes their changes to a new `content/*` branch
   and opens a pull request.
4. Cloudflare Workers Builds builds a preview of that pull request so the
   change can be seen before it is live.
5. Nothing reaches the public site until the pull request is merged.

Local development is unaffected: running `astro dev` uses `local` storage and
writes straight to the filesystem, never to GitHub.
See `src/lib/keystatic-storage.ts`.

## One-time setup (maintainer)

### 1. Create the GitHub App

At <https://github.com/settings/apps> → **New GitHub App**:

| Setting | Value |
|---|---|
| Homepage URL | `https://animalsvidadigna.org` |
| Callback URL | `https://animalsvidadigna.org/api/keystatic/github/oauth/callback` |
| Request user authorization (OAuth) during installation | enabled |
| Webhook | disabled |

Repository permissions:

| Permission | Access |
|---|---|
| Contents | Read and write |
| Pull requests | Read and write |
| Metadata | Read-only |

Install the App on the `OsoThevenin/animals-vida-digna` repository, then
generate a client secret.

> **Sign-in only works on the apex domain.** GitHub Apps accept exact callback
> URLs with no wildcards, and Cloudflare gives each preview build a distinct
> `<version>-animals-vida-digna.<subdomain>.workers.dev` hostname — so a preview
> URL can never be registered here. On a preview the admin UI renders fine but
> sign-in fails with "The redirect_uri is not associated with this
> application." That is expected, not a misconfiguration.
>
> Previews are still useful for checking that `/keystatic` builds and renders;
> sign-in itself has to be verified on the live apex after merging.
>
> To test sign-in *before* deploying, create a second GitHub App for
> development with callback
> `http://127.0.0.1:4321/api/keystatic/github/oauth/callback`.

### 2. Set the secrets in Cloudflare

Keystatic reads its credentials from the Cloudflare **runtime** environment
(`locals.runtime.env`) on each request, so they are ordinary Worker secrets.
Since the monorepo move, `wrangler.toml` lives in `apps/web`, so run these
from `apps/web` (or pass `-c apps/web/wrangler.toml` from the repo root):

```sh
cd apps/web
wrangler secret put KEYSTATIC_GITHUB_CLIENT_ID
wrangler secret put KEYSTATIC_GITHUB_CLIENT_SECRET
wrangler secret put KEYSTATIC_SECRET
```

| Secret | Source |
|---|---|
| `KEYSTATIC_GITHUB_CLIENT_ID` | GitHub App → Client ID |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | GitHub App → generated client secret |
| `KEYSTATIC_SECRET` | any long random string: `openssl rand -hex 32` |

These are runtime secrets, not build variables. They are never baked into the
deployed bundle, and rotating one takes effect on the next request — no
rebuild needed.

Only the *choice* of storage mode is made at build time (`local` in
development, `github` in production); that decision needs no credentials.
See `src/lib/keystatic-storage.ts`.

### 3. Protect the `main` branch

**This step is what actually enforces review.** Keystatic's UI offers users a
"commit directly" option alongside "create a branch"; only GitHub branch
protection can refuse it.

Repository **Settings → Branches → Add branch ruleset** for `main`:

- Require a pull request before merging
- Block force pushes

Without this, whoever is signed in can publish straight to the live site.

### 4. Repository collaborators

Only the maintainer (and anyone else who needs to review pull requests
against `main`) should be a collaborator on this repository, at whatever
role GitHub's PR-review workflow requires for them — Keystatic's
GitHub-mode saves are now used exclusively by the maintainer, editing
settings/landing/pages, so this is no longer a volunteer-facing permission.

**Current state, verified 2026-09-10 by read-only `gh api` checks:** the
repository's only collaborator is the maintainer, there are no pending
collaborator invitations, and no deploy keys exist. That is the state this
step wants — but it is a snapshot of what is true today, not a record of an
action this migration performed. It is not established whether a volunteer
previously held Write access and was removed, or whether no volunteer was
ever added as a GitHub collaborator in the first place; if you know which,
note it here. Either way, before treating this as settled, run the removal
checklist yourself — see `docs/admin-runbook.md`'s "Task 8: Remove volunteer
GitHub collaborator access" section, which also covers the pending-invitation
and deploy-key checks above (a collaborator-list check alone misses an
invitation that grants Write the moment it's accepted). See that same file
for how volunteer access to the *admin app* (not this repository) is
managed.

## For the maintainer (settings, landing page, static pages only)

1. If you are not already a collaborator on this repository, accept the
   invitation that arrives by email (needs a free GitHub account — sign up
   at <https://github.com/signup>).
2. Go to <https://animalsvidadigna.org/keystatic> and click sign in with GitHub.
3. Edit a page or setting — the `cats` collection no longer appears in this
   Keystatic instance's navigation (Phase 3 removed it; see the spec at
   `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md`).
4. Click **Save**, and choose **create a new branch** — give it a short name
   describing the change, e.g. "update donate URL".
5. Done. The change is queued for review and goes live once approved.

If sign-in fails, the invitation was probably not accepted yet.
