export function resolveLabel<T>({
	value,
	displayValue,
	multiple,
}: {
	value: T | T[] | undefined
	displayValue?: (value: T) => string
	multiple: boolean
}): string | undefined {
	if (multiple) {
		const arr = Array.isArray(value) ? value : []

		if (arr.length === 0) return undefined

		if (arr.length > 3) return `${arr.length} selected`

		if (displayValue) return arr.map((v) => displayValue(v as T)).join(', ')

		return `${arr.length} selected`
	}

	if (value !== undefined && displayValue) return displayValue(value as T)

	return undefined
}
