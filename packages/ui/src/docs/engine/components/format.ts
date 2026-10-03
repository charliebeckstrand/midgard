/** Uppercase the first character; pass the rest through. */
export function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Title-case a hyphenated identifier: 'components' → 'Components', 'data-display' → 'Data Display'. */
export function titleCase(s: string): string {
	return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Write a hyphenated identifier in PascalCase, as a component name: 'copy-button' → 'CopyButton'. */
export function pascalCase(s: string): string {
	return s.replace(/(?:^|-)(\w)/g, (_, c: string) => c.toUpperCase())
}

/** Display labels for the standard size scale, keyed by token. Backs {@link valueLabel} and `SizeListbox`. */
export const sizeLabels: Record<string, string> = {
	xs: 'Extra small',
	sm: 'Small',
	md: 'Medium',
	lg: 'Large',
	xl: 'Extra large',
}

/**
 * Write an identifier as words in sentence case: `dismissOnBackdrop` →
 * `Dismiss on backdrop`, `aria-label` → `Aria label`.
 */
export function humanize(identifier: string): string {
	const words = identifier
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[-_]+/g, ' ')
		.trim()
		.toLowerCase()

	return capitalize(words)
}

/**
 * Write a prop value as a label for a reader. A size token takes its name from
 * {@link sizeLabels}, a boolean reads `On` or `Off`, and an identifier reads as
 * words in sentence case. Any other value reads as it is.
 *
 * @example
 * valueLabel('xs') // 'Extra small'
 * valueLabel(true) // 'On'
 * valueLabel('separated') // 'Separated'
 */
export function valueLabel(value: string | number | boolean): string {
	if (typeof value === 'boolean') return value ? 'On' : 'Off'

	if (typeof value === 'number') return String(value)

	return sizeLabels[value] ?? humanize(value)
}
