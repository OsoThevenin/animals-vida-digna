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
