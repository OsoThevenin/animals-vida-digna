/**
 * Framework-free helpers for the `cat-form.tsx` island: list-toggle state
 * updates, the name→slug auto-fill wiring, and the Markdoc preview
 * fallback. None of it touches React or the DOM, so it is unit-testable
 * without a jsdom environment (this app has none — see vitest.config.ts).
 */

import { slugify } from '@avd/content/validate';
import { type CatFormState, deriveSlugs } from '@/lib/cat-form';
import { renderPreview } from '@/lib/markdoc-preview';

/** Adds `value` to `list` if absent, removes it if present. */
export function toggleListValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function safeSlugify(value: string): string {
  try {
    return slugify(value);
  } catch {
    return '';
  }
}

/**
 * Applies a `nameCa`/`nameEs` edit and re-derives both slugs through
 * `deriveSlugs`, which itself respects `slugsEditedManually` — this
 * wrapper exists so cat-form.tsx never has to remember to call both.
 *
 * `deriveSlugs` calls `slugify()` on both names unconditionally when
 * unedited, and `slugify('')` throws `SlugifyError` (Task 3's own test
 * suite never exercises this — a volunteer types the CA name first, so
 * the very first keystroke hits it with `nameEs` still blank). Fall back
 * to deriving each language independently so one still-empty name
 * doesn't stop the other's slug from filling in; a name that is itself
 * blank gets an empty slug rather than a thrown error reaching React.
 */
export function applyNameChange(
  state: CatFormState,
  key: 'nameCa' | 'nameEs',
  value: string
): CatFormState {
  const next = { ...state, [key]: value };
  if (next.slugsEditedManually) return next;
  try {
    const slugs = deriveSlugs(next.nameCa, next.nameEs, {
      slugCa: next.slugCa,
      slugEs: next.slugEs,
      slugsEditedManually: next.slugsEditedManually,
    });
    return { ...next, ...slugs };
  } catch {
    return {
      ...next,
      slugCa: safeSlugify(next.nameCa),
      slugEs: safeSlugify(next.nameEs),
    };
  }
}

const PREVIEW_UNAVAILABLE_MESSAGE =
  "No s'ha pogut previsualitzar aquest text. Revisa la sintaxi Markdoc.";

/**
 * Wraps `renderPreview` with an explanation for a volunteer typing bad
 * Markdoc. `renderPreview` swallows a parse error by returning ''; a
 * *recognized-but-invalid* tag doesn't throw at all — Markdoc just drops
 * it, so the article wrapper survives with nothing inside
 * ("<article></article>"). Both shapes read as "nothing rendered" to a
 * volunteer, so both get the same fallback message: only the empty-input
 * case (nothing typed yet) stays a silent ''.
 */
export function previewOrFallback(src: string): string {
  const html = renderPreview(src);
  if (src.trim() === '') return html;
  const hasVisibleContent = html.replace(/<[^>]*>/g, '').trim() !== '';
  return hasVisibleContent ? html : PREVIEW_UNAVAILABLE_MESSAGE;
}

export interface FieldAriaProps {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/**
 * Computes the `aria-describedby`/`aria-invalid` pair a form control needs
 * to be programmatically associated with its error text, given that
 * error's id. Shared by `FormField` (which injects this into whatever
 * control it wraps) and the two Markdoc textareas in `cat-form.tsx`
 * (which render their own error paragraph instead of going through
 * `FormField`) so both paths compute the association the same way
 * (fix-round-1 IMPORTANT 1: `FormField` previously computed an `errorId`
 * and used it only on the error `<p>`, never on the control itself, and
 * the two Markdoc textareas' error `<p>` had no `id` at all).
 */
export function fieldAriaProps(
  errorId: string,
  hasError: boolean
): FieldAriaProps {
  return hasError ? { 'aria-describedby': errorId, 'aria-invalid': true } : {};
}
