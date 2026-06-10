import { OPTION_SELECTOR } from './combobox-constants'

export function resolveInputDisplay<T>({
	editing,
	query,
	value,
	displayValue,
	multiple,
}: {
	editing: boolean
	query: string
	value: T | T[] | undefined
	displayValue?: (value: T) => string
	multiple: boolean
}): string {
	if (editing) return query

	if (!multiple && value !== undefined && !Array.isArray(value) && displayValue) {
		return displayValue(value)
	}

	return ''
}

/**
 * Enter convenience: when the list has narrowed to a single option, selects it
 * even if nothing is highlighted. The roving hook's activation key, not this
 * function, selects the *active* (highlighted) option.
 */
export function selectSoleOption(container: HTMLElement): boolean {
	const items = container.querySelectorAll<HTMLElement>(OPTION_SELECTOR)

	if (items.length === 1) {
		items[0]?.click()

		return true
	}

	return false
}
