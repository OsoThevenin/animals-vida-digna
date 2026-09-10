/**
 * Global Vitest setup file: wires `@testing-library/jest-dom` matchers
 * onto `expect` and registers Testing Library's automatic
 * `afterEach(cleanup)`.
 *
 * Loaded for every test file (`test.setupFiles` in vitest.config.ts), not
 * just the jsdom ones — `@testing-library/react`'s `cleanup` is a no-op
 * when nothing has rendered, and the jest-dom matcher extensions don't
 * require a DOM to be registered, so this is safe to load under the
 * `node` environment too (see tests/verification-row-allowlist.test.ts
 * and friends, which need real Miniflare via `getPlatformProxy`).
 */
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
