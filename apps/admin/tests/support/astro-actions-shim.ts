/**
 * `astro:actions` is a virtual module Astro's Vite plugin only provides
 * inside an Astro dev/build context — Vitest never loads that plugin, so
 * importing it directly fails with "Cannot find module 'astro:actions'".
 *
 * Components under test only need `actions.foo.bar(...)` to resolve at
 * import time (no test here dispatches a real click, since there is no
 * jsdom environment configured — see vitest.config.ts); a Proxy that
 * returns an always-resolving async no-op for any nested property covers
 * that without hand-writing a stub per action.
 */
function actionStub(): unknown {
  return new Proxy(
    () => Promise.resolve({ data: undefined, error: undefined }),
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        return actionStub();
      },
      apply() {
        return Promise.resolve({ data: undefined, error: undefined });
      },
    }
  );
}

export const actions = actionStub();

/**
 * Mirrors astro's real `isInputError` (astro/dist/actions/runtime/shared.js)
 * exactly, including its `'issues' in error && Array.isArray(error.issues)`
 * check (fix-round-1 MINOR 6: an earlier version of this shim only checked
 * `error.type`, which made it accept objects the real guard would reject —
 * more permissive than production). cat-form tests only need it to resolve
 * and behave like the real guard against a plain object shape — no test
 * here dispatches a real submit (no jsdom — see vitest.config.ts), so this
 * never needs to see a real ActionError.
 */
export function isInputError(error: unknown): error is {
  type: 'AstroActionInputError';
  fields: Record<string, string[]>;
  issues: { path: (string | number)[]; message: string }[];
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    (error as { type: unknown }).type === 'AstroActionInputError' &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown }).issues)
  );
}
