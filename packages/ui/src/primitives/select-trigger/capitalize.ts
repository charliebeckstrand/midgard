/**
 * Controls first-word capitalization (first letter only) of a select-family
 * field. `true`/`false` toggles both surfaces at once; the object form targets
 * the trigger's `displayValue` and the option list independently.
 *
 * @see {@link resolveCapitalize}
 */
export type SelectCapitalize = boolean | { displayValue?: boolean; options?: boolean }

/**
 * Normalizes a {@link SelectCapitalize} prop into the per-surface flags the
 * trigger and panel consume. A bare boolean applies to both surfaces; in the
 * object form each omitted key independently defaults to `true`, matching the
 * prop's `true` default.
 *
 * @param capitalize - The `capitalize` prop value.
 * @returns Resolved `displayValue`/`options` flags.
 * @internal
 */
export function resolveCapitalize(capitalize: SelectCapitalize = true): {
	displayValue: boolean
	options: boolean
} {
	if (typeof capitalize === 'boolean') return { displayValue: capitalize, options: capitalize }

	return { displayValue: capitalize.displayValue ?? true, options: capitalize.options ?? true }
}

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
