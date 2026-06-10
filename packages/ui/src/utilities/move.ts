/**
 * Return a copy of `array` with the item at index `from` moved to index `to`.
 * Returns `null` when `from` is out of range, letting callers skip committing
 * an unchanged result.
 */
export function moveItem<T>(array: readonly T[], from: number, to: number): T[] | null {
	// Range-check the index rather than the spliced value: a stored `undefined`
	// element is a legitimate item, and a negative `from` would make `splice`
	// read from the end instead of failing per the contract.
	if (from < 0 || from >= array.length) return null

	const next = [...array]

	const [item] = next.splice(from, 1)

	next.splice(to, 0, item as T)

	return next
}
