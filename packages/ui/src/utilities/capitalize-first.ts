/**
 * Uppercases the first letter of `value` and keeps the rest unchanged. The
 * select-family `capitalize` prop uses only this function. The trigger and the
 * option label format their display string through it at render. CSS cannot
 * do this: `::first-letter` does not apply to an `<input>`, and no
 * `text-transform` value gives sentence case.
 *
 * @param value - The resolved display string.
 * @returns `value` with its first letter uppercased.
 */
export function capitalizeFirst(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1)
}
