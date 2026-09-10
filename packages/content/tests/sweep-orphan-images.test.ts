import { describe, expect, it } from 'vitest';
import { buildDeleteArgs } from '../scripts/sweep-orphan-images';

/**
 * Regression guard for the Important-1 defect from the phase-6 whole-branch
 * review: `wrangler r2 object delete` defaults to `--local` when neither
 * `--local` nor `--remote` is passed (wrangler 4.75.0's bundled cli.js,
 * `isLocal(args, defaultValue = true)`). Without `--remote`, the sweep
 * script's `--delete` mode would delete from the Miniflare store under
 * `.wrangler/state` and print "done" for every key while every orphan
 * stayed in production R2. This cannot be verified against real
 * infrastructure from this sandbox, so the test asserts the built command
 * itself, which is the only thing under this repository's control.
 */
describe('buildDeleteArgs', () => {
  it('includes --remote so the delete targets production R2, not local state', () => {
    const args = buildDeleteArgs('cats/abc123/img456.webp');
    expect(args).toContain('--remote');
  });

  it('targets the exact bucket/key path as one argv element', () => {
    const args = buildDeleteArgs('cats/abc123/img456.webp');
    expect(args).toContain('animals-vida-digna-images/cats/abc123/img456.webp');
  });

  it('never places --local anywhere in the built command', () => {
    const args = buildDeleteArgs('cats/abc123/img456.webp');
    expect(args).not.toContain('--local');
  });

  it('is passed as argv (execFile-style), not a single interpolated shell string', () => {
    // A shell-string build would produce one element containing spaces
    // around the key; argv-style produces multiple discrete elements.
    const args = buildDeleteArgs('cats/abc123/img456.webp');
    expect(args).toEqual([
      'wrangler',
      'r2',
      'object',
      'delete',
      'animals-vida-digna-images/cats/abc123/img456.webp',
      '--remote',
    ]);
  });

  it('does not corrupt argv when the key contains shell-meaningful characters', () => {
    // isCatImageKey's [^/]+ segments permit characters like $ and ` that
    // would be dangerous if interpolated into a shell string. Since this
    // function returns argv (consumed by execFileSync with no shell),
    // such characters just become part of one argv element, not shell
    // syntax.
    const args = buildDeleteArgs('cats/abc$(whoami)/img`id`.webp');
    expect(args).toHaveLength(6);
    expect(args[4]).toBe(
      'animals-vida-digna-images/cats/abc$(whoami)/img`id`.webp'
    );
  });
});
