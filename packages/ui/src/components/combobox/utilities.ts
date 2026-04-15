const OPTION_SELECTOR = '[role="option"]:not([data-disabled])'

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

	if (!multiple && value !== undefined && displayValue) return displayValue(value as T)

	return ''
}

export function selectActiveOrSingleOption(container: HTMLElement): boolean {
	const items = container.querySelectorAll<HTMLElement>(OPTION_SELECTOR)

	if (items.length === 1) {
		items[0]?.click()

		return true
	}

	return false
}
