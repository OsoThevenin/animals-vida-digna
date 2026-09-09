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
 * Minimal stand-in for astro's real `ActionError`
 * (astro/dist/actions/runtime/shared.js) — just enough for handler-level
 * tests (e.g. tests/actions-images-upload.test.ts) to assert a specific
 * `code` was thrown, mirroring the real class's shape closely enough
 * that `instanceof ActionError` and `.code` both work as expected.
 */
export class ActionError extends Error {
  type = 'AstroActionError' as const;
  code: string;
  constructor(params: { code: string; message?: string }) {
    super(params.message);
    this.code = params.code;
  }
}

/**
 * Minimal stand-in for astro's real `defineAction`
 * (astro/dist/actions/runtime/server.js) — enough to let a test call
 * `server.someAction.orThrow.call(fakeContext, input)` and exercise the
 * real handler directly, without booting Astro's Vite plugin. For
 * `accept: 'form'` actions, mirrors the real behaviour of converting the
 * FormData into a plain object before validating it against the Zod
 * schema (real astro also unwraps optional/nullable/default field
 * shapes; this project's `accept: 'form'` action has no such fields, so
 * a plain `Object.fromEntries` is sufficient here).
 */
export function defineAction<Input, Output>({
  accept,
  input: inputSchema,
  handler,
}: {
  accept?: 'form' | 'json';
  input?: {
    safeParseAsync: (
      value: unknown
    ) => Promise<
      { success: true; data: Input } | { success: false; error: unknown }
    >;
  };
  handler: (input: Input, context: unknown) => Promise<Output>;
}) {
  async function run(unparsedInput: unknown, context: unknown) {
    let parsedInput: unknown = unparsedInput;
    if (accept === 'form') {
      if (!(unparsedInput instanceof FormData)) {
        throw new ActionError({
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'This action only accepts FormData.',
        });
      }
      parsedInput = Object.fromEntries(unparsedInput.entries());
    }
    if (inputSchema) {
      const parsed = await inputSchema.safeParseAsync(parsedInput);
      if (!parsed.success) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'Invalid input.',
        });
      }
      parsedInput = parsed.data;
    }
    return handler(parsedInput as Input, context);
  }
  return {
    orThrow(this: unknown, unparsedInput: unknown) {
      return run(unparsedInput, this);
    },
  };
}

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
