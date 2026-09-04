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
const describeIfBuilt = existsSync(API_DIR) ? describe : describe.skip;

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
