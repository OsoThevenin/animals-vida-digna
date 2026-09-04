import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

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
  return (
    <div className="mb-5 grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
