import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards against the regression this change fixes: the Cloudflare Worker API
 * routes (src/pages/api/contact.ts, src/pages/api/adopt.ts) must never pull in
 * the Keystatic filesystem reader (or node:fs) into their bundled module graph,
 * because workerd's node:fs shim throws `fs.readFile is not implemented yet!`
 * at request time — turning every form submission into a 500.
 *
 * This walks the module graph TRANSITIVELY rather than checking direct imports
 * or a specific chunk filename. Rollup's chunk splitting is not stable across
 * builds (a small shared module may be inlined into its importers instead of
 * emitted as its own chunk), so asserting on chunk names is brittle and can
 * fail for reasons unrelated to the actual guarantee.
 *
 * Other routes in the worker bundle — notably the /keystatic admin UI, which is
 * only built in non-production mode — are legitimately allowed to use node:fs.
 * The guarantee asserted here is deliberately narrow: the contact and adopt
 * request paths specifically must stay filesystem-free.
 *
 * Requires a build to have been run first (`pnpm build`). If dist/ hasn't been
 * built, these tests skip rather than failing for an unrelated reason.
 */

const WORKER_DIR = join(process.cwd(), 'dist', '_worker.js');
const API_DIR = join(WORKER_DIR, 'pages', 'api');
const BUILT = existsSync(API_DIR);

// LOW fix: a silent describe.skip is easy to miss in CI output -- a
// vanished dist/ (a build step reordered, a clean that ran too early) would
// make this whole guard quietly stop running with no signal in the test
// report. Emit one loud, always-visible failing-shaped notice instead of a
// silent skip when the build is missing.
if (!BUILT) {
  it('SKIPPED: dist/_worker.js/pages/api not found -- run `pnpm build` first so these bundle guards actually run', () => {
    expect(BUILT, 'run `pnpm build` before `pnpm test` to exercise the worker-bundle guards').toBe(true);
  });
}

const describeIfBuilt = BUILT ? describe : describe.skip;

const FORBIDDEN = [
  { label: 'node:fs import', pattern: /from\s+['"]node:fs/ },
  { label: 'node:fs require', pattern: /require\(['"]node:fs/ },
  { label: 'Keystatic core', pattern: /@keystatic\/core/ },
];

/**
 * Collect the transitive closure of relative module imports reachable from an
 * entry file, returning every resolved file path (including the entry).
 */
function collectModuleGraph(entryPath: string): string[] {
  const visited = new Set<string>();
  const queue = [resolve(entryPath)];

  while (queue.length > 0) {
    const current = queue.pop() as string;
    if (visited.has(current) || !existsSync(current)) continue;
    visited.add(current);

    const source = readFileSync(current, 'utf-8');
    const relativeImports = [
      ...source.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g),
    ].map((match) => match[1]);

    for (const relativePath of relativeImports) {
      queue.push(resolve(dirname(current), relativePath));
    }
  }

  return [...visited];
}

describeIfBuilt('Worker API route bundles (dist/_worker.js/pages/api)', () => {
  for (const route of ['contact', 'adopt']) {
    it(`${route} route's transitive module graph is filesystem-free`, () => {
      const graph = collectModuleGraph(join(API_DIR, `${route}.astro.mjs`));

      // Sanity check: if the walk found nothing beyond the entry file, the
      // traversal itself is broken and the assertions below would be vacuous.
      expect(graph.length).toBeGreaterThan(1);

      for (const modulePath of graph) {
        const source = readFileSync(modulePath, 'utf-8');
        for (const { label, pattern } of FORBIDDEN) {
          expect(
            pattern.test(source),
            `${modulePath} must not contain ${label}`
          ).toBe(false);
        }
      }
    });
  }
});

/**
 * Companion guard for the public cats routes: now that
 * src/pages/cats/index.astro, src/pages/es/cats/index.astro,
 * src/pages/cat/[slug].astro, src/pages/es/cat/[slug].astro and
 * src/pages/sitemap-cats.xml.ts all read from D1 instead of the Keystatic
 * reader (Phase 3), their bundled module graph must stay filesystem-free --
 * a node:fs import here would risk the same class of production 500 the
 * guard above protects contact/adopt against.
 *
 * Stale-comment fix: these routes do NOT import @keystatic/core any more.
 * `donateUrl` is read from the build-time-generated
 * src/generated/settings.ts module (deliberately zero-dependency on
 * @keystatic/core or node:fs -- see that file and
 * scripts/generate-settings.ts), not from
 * `reader.singletons.settings.read()`. So @keystatic/core is asserted
 * against here too, not carved out.
 *
 * Astro's build flattens `src/pages/cats/index.astro` to
 * `dist/_worker.js/pages/cats.astro.mjs` (no `cats/index.astro.mjs`
 * subdirectory) -- confirmed against the actual build output.
 */

const CATS_ROUTE_ENTRIES = [
  ['cats/index', join(WORKER_DIR, 'pages', 'cats.astro.mjs')],
  ['es/cats/index', join(WORKER_DIR, 'pages', 'es', 'cats.astro.mjs')],
  ['cat/[slug]', join(WORKER_DIR, 'pages', 'cat', '_slug_.astro.mjs')],
  ['es/cat/[slug]', join(WORKER_DIR, 'pages', 'es', 'cat', '_slug_.astro.mjs')],
  ['sitemap-cats.xml', join(WORKER_DIR, 'pages', 'sitemap-cats.xml.astro.mjs')],
] as const;

const catsRouteBuilt = CATS_ROUTE_ENTRIES.every(([, entry]) => existsSync(entry));

if (BUILT && !catsRouteBuilt) {
  it('SKIPPED: one or more public cats route bundles not found under dist/_worker.js/pages -- rebuild before trusting this guard', () => {
    expect(
      catsRouteBuilt,
      `expected all of: ${CATS_ROUTE_ENTRIES.map(([label]) => label).join(', ')}`
    ).toBe(true);
  });
}

const describeCatsIfBuilt = BUILT && catsRouteBuilt ? describe : describe.skip;

describeCatsIfBuilt(
  'Public cats route bundles are filesystem-free and Keystatic-free (dist/_worker.js/pages)',
  () => {
    for (const [label, entry] of CATS_ROUTE_ENTRIES) {
      it(`${label} route's transitive module graph is filesystem-free and does not import @keystatic/core`, () => {
        const graph = collectModuleGraph(entry);

        expect(graph.length).toBeGreaterThan(1);

        for (const modulePath of graph) {
          const source = readFileSync(modulePath, 'utf-8');
          for (const { label: forbiddenLabel, pattern } of FORBIDDEN) {
            expect(
              pattern.test(source),
              `${modulePath} must not contain ${forbiddenLabel}`
            ).toBe(false);
          }
        }
      });
    }
  }
);
