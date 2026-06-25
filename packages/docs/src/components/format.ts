/** Uppercase the first character; pass the rest through. */
export function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1)
}
