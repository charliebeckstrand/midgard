/**
 * Uppercases the first letter of `value`, leaving the rest untouched — the
 * single mechanism behind the select-family `capitalize` prop. Every surface
 * (trigger display string, option label) formats its display string through
 * this at render; CSS can't express it (`::first-letter` never forms on an
 * `<input>`, and no `text-transform` value is sentence-case).
 *
 * @param value - The resolved display string.
 * @returns `value` with its first letter uppercased.
 * @internal
 */
export function capitalizeFirst(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1)
}
