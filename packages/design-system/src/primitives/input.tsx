export interface InputProps {
  id: string;
  name?: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  placeholder?: string;
  /** Textarea height; ignored for single-line inputs. */
  rows?: number;
  required?: boolean;
  defaultValue?: string;
}

const INPUT_CLASS =
  'w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none';

export function Input({
  id,
  name,
  type = 'text',
  placeholder,
  rows = 4,
  required = false,
  defaultValue,
}: InputProps) {
  if (type === 'textarea') {
    return (
      <textarea
        className={INPUT_CLASS}
        defaultValue={defaultValue}
        id={id}
        name={name ?? id}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
    );
  }

  return (
    <input
      className={INPUT_CLASS}
      defaultValue={defaultValue}
      id={id}
      name={name ?? id}
      placeholder={placeholder}
      required={required}
      type={type}
    />
  );
}
