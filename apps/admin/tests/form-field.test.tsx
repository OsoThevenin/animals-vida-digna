import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FormField } from '../src/components/form-field';
import { Input } from '../src/components/ui/input';

/**
 * fix-round-1 IMPORTANT 1: FormField computed an `errorId` and used it to
 * label the error paragraph, but never wired it onto the control itself —
 * a screen-reader user tabbing into an invalid field heard nothing was
 * wrong. These assert the actual rendered attributes, not just the pure
 * `fieldAriaProps` helper's return value (covered separately in
 * tests/cat-form-ui.test.ts), so a regression in the `cloneElement` wiring
 * itself would be caught here too.
 */
describe('FormField error association', () => {
  it('does not mark the control invalid or describedby when there is no error', () => {
    const html = renderToStaticMarkup(
      <FormField id="cat-name-ca" label="Nom (CA)">
        <Input id="cat-name-ca" readOnly value="Mimi" />
      </FormField>
    );
    // Tailwind's `aria-invalid:*` variant classes legitimately appear in
    // `class="..."` on the Input component itself — only the real
    // *attribute* (with a `=`) must be absent here.
    expect(html).not.toContain('aria-describedby=');
    expect(html).not.toContain('aria-invalid=');
    expect(html).not.toContain('role="alert"');
  });

  it('wires aria-describedby on the control to the error paragraph id, and marks it invalid', () => {
    const html = renderToStaticMarkup(
      <FormField error="És obligatori" id="cat-name-ca" label="Nom (CA)">
        <Input id="cat-name-ca" readOnly value="" />
      </FormField>
    );
    expect(html).toContain('aria-describedby="cat-name-ca-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="cat-name-ca-error"');
    expect(html).toContain('role="alert"');
    // The input carries the describedby, not just the wrapping div.
    expect(html).toMatch(
      /<input[^>]*id="cat-name-ca"[^>]*aria-describedby="cat-name-ca-error"/
    );
  });
});
