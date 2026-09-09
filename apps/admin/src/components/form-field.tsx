import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Label } from '@/components/ui/label';
import { fieldAriaProps } from '@/lib/cat-form-ui';

/**
 * shadcn/ui's classic registry has no label+control+error wrapper (its
 * `form` component is a react-hook-form binding this app does not use —
 * Astro Actions validate server-side with zod and the islands hold plain
 * useState). This is the project-level composition the shadcn docs point
 * to for that gap, and it keeps the prop shape of the `Field` primitive
 * apps/admin used before the migration, so a caller only changes the
 * import.
 */
export interface FormFieldProps {
  /** Must match the id of the control passed as children. */
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ id, label, error, children }: FormFieldProps) {
  const errorId = `${id}-error`;
  // Injects aria-describedby/aria-invalid into the single child control
  // so the error is programmatically associated with it, not merely
  // rendered nearby (fix-round-1 IMPORTANT 1: errorId was computed and
  // used to label the error paragraph, but never actually wired onto the
  // control). See fieldAriaProps in @/lib/cat-form-ui.
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<Record<string, unknown>>,
        fieldAriaProps(errorId, Boolean(error)) as Record<string, unknown>
      )
    : children;
  return (
    <div className="mb-5 grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {control}
      {error ? (
        <p className="text-destructive text-xs" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
