/** Uppercase the first character; pass the rest through. */
export function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Title-case a hyphenated identifier: 'components' → 'Components', 'data-display' → 'Data Display'. */
export function titleCase(s: string): string {
	return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
