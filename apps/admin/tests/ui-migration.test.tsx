import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatStatusBadge } from '../src/components/cat-status-badge';
import { CatsTable } from '../src/components/cats-table';
import { LOGIN_LABELS, LoginForm } from '../src/components/login-form';
import { Badge } from '../src/components/ui/badge';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Label } from '../src/components/ui/label';

/**
 * Behavioural cover for the @avd/design-system -> shadcn/ui swap. These
 * assert the markup a volunteer actually gets (labelled controls, a real
 * submit button, the status vocabulary), so a regression in the component
 * layer fails here rather than in a browser.
 */

describe('shadcn primitives render usable markup', () => {
  it('Button renders a real <button> carrying the primary tokens', () => {
    const html = renderToStaticMarkup(<Button type="submit">Entra</Button>);
    expect(html).toMatch(/^<button/);
    expect(html).toContain('type="submit"');
    expect(html).toContain('bg-primary');
    expect(html).toContain('text-primary-foreground');
    expect(html).toContain('Entra');
  });

  it('Button honours disabled so a busy form cannot double-submit', () => {
    const html = renderToStaticMarkup(<Button disabled>Enviant…</Button>);
    expect(html).toContain('disabled=""');
  });

  it('Label + Input are associated by id, not by nesting', () => {
    const html = renderToStaticMarkup(
      <>
        <Label htmlFor="email">Correu</Label>
        <Input id="email" name="email" type="email" />
      </>
    );
    expect(html).toContain('for="email"');
    expect(html).toContain('id="email"');
    expect(html).toContain('name="email"');
  });

  it('Badge renders a span with the shadcn data-slot hook', () => {
    const html = renderToStaticMarkup(<Badge>Nou</Badge>);
    expect(html).toContain('data-slot="badge"');
  });
});

describe('CatStatusBadge', () => {
  it('labels each status in Catalan with its own token pair', () => {
    const cases = [
      ['available', 'Disponible'],
      ['adopted', 'Adoptat'],
      ['treatment', 'En tractament'],
      ['unavailable', 'No disponible'],
    ] as const;
    for (const [status, label] of cases) {
      const html = renderToStaticMarkup(<CatStatusBadge status={status} />);
      expect(html).toContain(label);
      expect(html).toContain(`bg-status-${status}`);
      expect(html).toContain(`text-status-${status}-foreground`);
    }
  });
});

describe('LoginForm', () => {
  const html = renderToStaticMarkup(<LoginForm />);

  it('starts on the email step with a labelled email input', () => {
    expect(html).toContain(LOGIN_LABELS.emailLabel);
    expect(html).toContain('type="email"');
    expect(html).toContain(`placeholder="${LOGIN_LABELS.emailPlaceholder}"`);
    expect(html).toContain('required=""');
  });

  it('renders the send-code submit button, not the OTP step', () => {
    expect(html).toContain(LOGIN_LABELS.sendCode);
    expect(html).not.toContain(LOGIN_LABELS.codeLabel);
  });

  it('associates its label with the email control', () => {
    expect(html).toContain('for="email"');
    expect(html).toContain('id="email"');
  });
});

describe('CatsTable', () => {
  const cats = [
    {
      id: 'a1',
      nameCa: 'Lluna',
      status: 'available',
      published: true,
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'b2',
      nameCa: 'Misi',
      status: 'treatment',
      published: false,
      updatedAt: '2026-09-02T10:00:00Z',
    },
  ] as const;

  const table = renderToStaticMarkup(<CatsTable cats={[...cats]} />);

  it('renders one row per cat inside a real <table>', () => {
    expect(table).toMatch(/<table/);
    // header row + one per cat
    expect(table.match(/data-slot="table-row"/g)).toHaveLength(3);
    expect(table).toContain('Lluna');
    expect(table).toContain('Misi');
  });

  it('renders the Catalan status label for each row', () => {
    expect(table).toContain('Disponible');
    expect(table).toContain('En tractament');
  });

  it('distinguishes published from draft cats', () => {
    expect(table).toContain('Sí');
    expect(table).toContain('No');
  });

  it('renders an empty state instead of a table when there are no cats', () => {
    const empty = renderToStaticMarkup(<CatsTable cats={[]} />);
    expect(empty).not.toMatch(/<table/);
    expect(empty).toContain('Encara no hi ha cap gat.');
  });
});
