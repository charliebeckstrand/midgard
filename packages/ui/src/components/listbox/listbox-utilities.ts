import { capitalizeFirst } from '../../utilities'

/**
 * The label of the trigger. With `capitalize`, each selected value takes a
 * capital first letter, as each option label does.
 */
export function resolveLabel<T>({
	value,
	displayValue,
	multiple,
	capitalize = false,
}: {
	value: T | T[] | undefined
	displayValue?: (value: T) => string
	multiple: boolean
	capitalize?: boolean
}): string | undefined {
	const display =
		displayValue && capitalize ? (item: T) => capitalizeFirst(displayValue(item)) : displayValue

	if (multiple) {
		const arr = Array.isArray(value) ? value : []

		if (arr.length === 0) return undefined

		if (display && arr.length <= 3) return arr.map(display).join(', ')

		return `${arr.length} selected`
	}

	if (value !== undefined && !Array.isArray(value) && display) return display(value)

	return undefined
}
