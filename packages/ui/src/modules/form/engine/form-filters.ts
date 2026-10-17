import type { FormStateValue } from '../../../primitives/form/context'

/**
 * True when a field value counts as set: not `undefined`, `null`, `''`, or an
 * empty array.
 *
 * @remarks
 * An explicit `false` counts as set, so a Checkbox or Switch filter toggled off
 * stays in the payload and in the active count. This is deliberate, because an
 * explicit "no" is a filter. It reads against the rule that drops empty fields.
 *
 * @internal
 */
export function isFilterActive(value: unknown): boolean {
	if (value === undefined || value === null || value === '') return false

	if (Array.isArray(value) && value.length === 0) return false

	return true
}

/**
 * Writes one slot of a filter record. A value that is not set removes the key,
 * so the record holds only the active filters.
 *
 * @returns A new record. The argument does not change.
 * @internal
 */
export function writeFilter<T extends Record<string, unknown>>(
	record: T | undefined,
	name: string,
	value: unknown,
): T {
	const next: Record<string, unknown> = { ...record }

	if (isFilterActive(value)) {
		next[name] = value
	} else {
		delete next[name]
	}

	return next as T
}

/**
 * Counts the slots of a filter record that hold a set value.
 *
 * @internal
 */
export function countActiveFilters(record: Record<string, unknown>): number {
	return Object.values(record).filter(isFilterActive).length
}

/**
 * The text that announces the active count of a filter bar.
 *
 * @internal
 */
export function formatActiveFilters(count: number): string {
	return `${count} ${count === 1 ? 'filter' : 'filters'} active`
}

// A filter has no validation, touch, or baseline, so these maps stay empty.
const NO_ERRORS: FormStateValue['errors'] = {}

const NO_FLAGS: Record<string, boolean> = {}

/**
 * The form state of a filter bar, from its record. A control in the bar binds
 * the slot that its `name` gives, as it binds a field of a `Form`. A filter has
 * no validation, touch, or baseline, so the bar is always valid and clean.
 *
 * @internal
 */
export function filtersFormState(record: Record<string, unknown>): FormStateValue {
	return {
		values: record,
		errors: NO_ERRORS,
		touchedFields: NO_FLAGS,
		dirtyFields: NO_FLAGS,
		dirty: false,
		valid: true,
		submitting: false,
	}
}
