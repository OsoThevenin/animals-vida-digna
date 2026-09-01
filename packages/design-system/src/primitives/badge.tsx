export type CatStatus =
  | 'available'
  | 'adopted'
  | 'treatment'
  | 'unavailable';

export interface BadgeProps {
  /** Already-translated status text. */
  label: string;
  status?: CatStatus;
  size?: 'sm' | 'md';
}

const STATUS_COLORS: Record<CatStatus, string> = {
  available: 'bg-green-100 text-green-800',
  adopted: 'bg-blue-100 text-blue-800',
  treatment: 'bg-amber-100 text-amber-800',
  unavailable: 'bg-gray-100 text-gray-600',
};

const FALLBACK = 'bg-gray-100 text-gray-600';

export function Badge({ label, status, size = 'sm' }: BadgeProps) {
  const color = status ? STATUS_COLORS[status] : FALLBACK;
  const sizing =
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-block shrink-0 rounded-full font-medium ${sizing} ${color}`}
    >
      {label}
    </span>
  );
}
