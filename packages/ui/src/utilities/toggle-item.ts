/**
 * Return a copy of `set` with `item` toggled — removed when present, added
 * otherwise. The input is left untouched, suiting `setState` updaters that
 * must not mutate prior state.
 */
export function toggleItem<T>(set: ReadonlySet<T>, item: T): Set<T> {
	const next = new Set(set)

	if (next.has(item)) next.delete(item)
	else next.add(item)

	return next
}
