# Keystatic admin: setup and volunteer access

The site's content (cats, pages, settings) lives as files in this repository.
Keystatic is the admin UI that lets people edit those files through a web form
instead of writing Markdown by hand.

Volunteers use it at **https://animalsvidadigna.org/keystatic**.

## How it works

Keystatic runs in **GitHub mode** in production. There is no separate user
database and no passwords to manage:

1. A volunteer signs in with their GitHub account.
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

### 2. Set the secrets in Cloudflare

Keystatic reads its credentials from the Cloudflare **runtime** environment
(`locals.runtime.env`) on each request, so they are ordinary Worker secrets:

```sh
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

Without this, a volunteer can publish straight to the live site.

### 4. Invite volunteers

Repository **Settings → Collaborators → Add people**, with the **Write** role.
Write is required — Keystatic pushes the volunteer's branch using their own
GitHub token, so Read access is not enough to save anything.

Removing someone's collaborator access immediately revokes their admin access.

## For volunteers

1. Accept the repository invitation that arrives by email (needs a free GitHub
   account — sign up at <https://github.com/signup>).
2. Go to <https://animalsvidadigna.org/keystatic> and click sign in with GitHub.
3. Edit a cat, page, or setting.
4. Click **Save**, and choose **create a new branch** — give it a short name
   describing the change, e.g. "new cat Nala".
5. Done. The change is queued for review and goes live once approved.

If sign-in fails, the invitation was probably not accepted yet.
