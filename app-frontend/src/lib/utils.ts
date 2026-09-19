import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Backend dates arrive as plain "YYYY-MM-DD" with no time component. Passing
// that straight to `new Date()` parses it as UTC midnight, which shifts to
// the previous calendar day once read back with local-time getters/formatters
// in any timezone west of UTC. Building the Date from local parts instead
// keeps the calendar day stable regardless of the viewer's timezone.
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}
