/** Uppercase the first character of a string, leaving the rest as typed. */
export function ucfirst(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
