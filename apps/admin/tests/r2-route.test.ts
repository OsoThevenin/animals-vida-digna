import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GET, prerender } from '../src/pages/r2/[...key]';

/**
 * Two layers of proof that `GET /r2/[...key]` cannot serve in a
 * deployed Worker:
 *
 * 1. A source-level regression guard (below) asserting the handler's
 *    gate is literally `import.meta.env.DEV` — the build-time constant
 *    Vite inlines and dead-code-eliminates in a production build — and
 *    not some runtime env var or hostname check a misconfiguration
 *    could flip. Vitest itself always runs with `import.meta.env.DEV
 *    === true` (there is no way to flip that per-test — it is inlined
 *    at transform time), so this is the only way to test the
 *    production-off behaviour of *this exact module* rather than of an
 *    extracted helper. `isDevPreviewEnabled`'s own true/false behaviour
 *    is unit-tested directly in tests/r2-preview.test.ts.
 * 2. `pnpm --filter admin build` was additionally run by hand and its
 *    output dist worker bundle was grepped to confirm the guard survives
 *    into the production artifact — see task-10-report.md.
 *
 * The functional tests below run under vitest's always-DEV=true
 * environment and exercise the request-handling logic once the gate is
 * open: bad key, missing object, and a good object all resolve
 * correctly.
 */

const routeSourcePath = fileURLToPath(
  new URL('../src/pages/r2/[...key].ts', import.meta.url)
);
const routeSource = readFileSync(routeSourcePath, 'utf-8');

describe('GET /r2/[...key] source shape', () => {
  it('never prerenders (must run per-request, not at build time)', () => {
    expect(prerender).toBe(false);
  });

  it('gates on the build-time import.meta.env.DEV constant', () => {
    expect(routeSource).toContain('isDevPreviewEnabled(import.meta.env.DEV)');
  });

  it('does not gate on a runtime env var or hostname check instead', () => {
    expect(routeSource).not.toMatch(/context\.locals\.runtime\.env\.\w*DEV/);
    expect(routeSource).not.toMatch(/request\.url\)\.hostname/);
    expect(routeSource).not.toMatch(/process\.env/);
  });
});

interface FakeR2Object {
  body: ReadableStream | null;
  httpEtag: string;
  writeHttpMetadata: (headers: Headers) => void;
}

function fakeContext(options: { key: string; object?: FakeR2Object | null }) {
  const object = options.object ?? null;
  return {
    params: { key: options.key },
    locals: {
      runtime: {
        env: {
          IMAGES_BUCKET: {
            get: async (k: string) => (k === options.key ? object : null),
          },
        },
      },
    },
    // biome-ignore lint/suspicious/noExplicitAny: minimal APIRoute context stub
  } as any;
}

describe('GET /r2/[...key] handler (DEV=true under vitest)', () => {
  it('returns 404 for a key that fails sanitisation', async () => {
    const response = await GET(fakeContext({ key: '../secrets.json' }));
    expect(response.status).toBe(404);
  });

  it('returns 404 when the object is not in the bucket', async () => {
    const response = await GET(
      fakeContext({ key: 'cats/cat_1/missing.webp', object: null })
    );
    expect(response.status).toBe(404);
  });

  it('streams the object body with its stored content type on a hit', async () => {
    const body = new ReadableStream();
    const object: FakeR2Object = {
      body,
      httpEtag: '"abc123"',
      writeHttpMetadata: (headers) => {
        headers.set('content-type', 'image/webp');
      },
    };
    const response = await GET(
      fakeContext({ key: 'cats/cat_1/img_1.webp', object })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('etag')).toBe('"abc123"');
  });
});
