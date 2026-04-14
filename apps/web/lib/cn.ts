import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge tailwind classes with clsx semantics. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
