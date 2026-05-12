/** Uppercase the first character; pass the rest through. */
export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
