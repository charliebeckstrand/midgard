/**
 * Returns a copy of `items` with the item at `from` moved to index `to`. Does
 * not mutate the input.
 *
 * The caller must give indexes inside the list. Matches dnd-kit's `arrayMove`
 * for such indexes, without a runtime `@dnd-kit` import.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
	const next = items.slice()

	next.splice(to, 0, ...next.splice(from, 1))

	return next
}
