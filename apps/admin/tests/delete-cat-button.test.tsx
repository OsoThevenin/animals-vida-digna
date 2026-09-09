import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DeleteCatButton from '../src/components/delete-cat-button';

/**
 * `astro:actions` is stubbed (tests/support/astro-actions-shim.ts, aliased
 * in vitest.config.ts) purely so this module resolves — there is no jsdom
 * environment configured in this app (see vitest.config.ts), so no test
 * here dispatches a click event. Radix's `AlertDialog.Content` only
 * mounts once the dialog is open (`defaultOpen` is false), so the dialog
 * interior — the title naming the cat, the "cannot be undone" copy, the
 * Cancel/confirm pair — is not present in this closed-state server
 * markup; these assertions instead cover the trigger, which is what's
 * actually renderable here, and confirm it names the cat via
 * `aria-label` rather than a bare icon or ambiguous "Delete" text.
 * The interior dialog (open state, cancel, confirm, and the delete →
 * redirect-to-/cats flow) was verified interactively under
 * `wrangler dev` against a scratch page removed before commit — see
 * task-10-report.md.
 */

describe('DeleteCatButton', () => {
  const html = renderToStaticMarkup(
    <DeleteCatButton catId="cat_1" catName="Lluna" />
  );

  it('renders a trigger button, not a bare confirm() call', () => {
    expect(html).toContain('Elimina el gat');
    expect(html).toContain('type="button"');
  });

  it('names the cat being deleted via the trigger accessible name', () => {
    expect(html).toContain('aria-label="Elimina el gat «Lluna»"');
  });

  it('uses the destructive visual/semantic variant, not a default button', () => {
    expect(html).toContain('data-variant="destructive"');
  });

  it('is a real AlertDialog trigger (accessible, focus-trapped), not window.confirm', () => {
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('data-slot="alert-dialog-trigger"');
  });

  it('starts closed', () => {
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-state="closed"');
  });

  it('does not render a raw error message when there is none', () => {
    expect(html).not.toContain('role="alert"');
  });
});
