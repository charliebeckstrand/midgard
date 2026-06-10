/**
 * Return a copy of `array` with the item at index `from` moved to index `to`.
 * Returns `null` when `from` is out of range.
 */
export function moveItem<T>(array: readonly T[], from: number, to: number): T[] | null {
	const next = [...array]

	const [item] = next.splice(from, 1)

	if (item === undefined) return null

	next.splice(to, 0, item)

	return next
}
