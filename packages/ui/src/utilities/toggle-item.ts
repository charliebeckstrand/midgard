/**
 * Return a copy of `set` with `item` toggled: removed when present, added
 * otherwise. Does not mutate the input.
 */
export function toggleItem<T>(set: ReadonlySet<T>, item: T): Set<T> {
	const next = new Set(set)

	if (next.has(item)) next.delete(item)
	else next.add(item)

	return next
}

/**
 * Return a copy of `list` with `item` toggled: removed when present, added at
 * the end otherwise. Does not mutate the input.
 */
export function toggleListItem<T>(list: readonly T[], item: T): T[] {
	return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]
}
