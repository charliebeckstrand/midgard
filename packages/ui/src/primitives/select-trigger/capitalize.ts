/**
 * Controls the `capitalize` text-transform applied to a select-family field.
 * `true`/`false` toggles both surfaces at once; the object form targets the
 * trigger's `displayValue` and the option list independently.
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
