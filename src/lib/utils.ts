import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a string to uppercase
 * @param text - The text to convert
 * @returns The text in uppercase
 */
export function toUpperCase(text: string): string {
  return text.toUpperCase();
}
