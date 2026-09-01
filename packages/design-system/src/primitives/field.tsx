import type { ReactNode } from 'react';

export interface FieldProps {
  /** Must match the id of the control passed as children. */
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="mb-5">
      <label
        className="mb-1 block font-medium text-sm text-text"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-red-600 text-xs">{error}</p> : null}
    </div>
  );
}
