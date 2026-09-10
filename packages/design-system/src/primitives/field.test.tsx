import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Field } from './field';
import { Input } from './input';

describe('Field', () => {
  it('links the label to the control', () => {
    const html = renderMarkup(
      <Field id="name" label="Nom">
        <Input id="name" />
      </Field>
    );
    expect(html).toContain('for="name"');
    expect(html).toContain('Nom');
  });

  it('renders no error text by default', () => {
    const html = renderMarkup(
      <Field id="name" label="Nom">
        <Input id="name" />
      </Field>
    );
    expect(html).not.toContain('text-red-600');
  });

  it('renders the error when given one', () => {
    const html = renderMarkup(
      <Field error="Camp obligatori" id="name" label="Nom">
        <Input id="name" />
      </Field>
    );
    expect(html).toContain('Camp obligatori');
    expect(html).toContain('text-red-600');
  });
});
