import type { GridRowGroup, GridRowGroups, GridRowManagerGroup } from '../../grid-row-group-types'
import { groupValueLabel } from '../grid-column/label'
import { groupKeyOf } from '../grid-items/items'
import type { GridGroup } from './tree'

/** Unwraps the {@link GridRowGroups} binding: the array shorthand seeds `defaultValue`. @internal */
export function normalizeRowGroups(config: GridRowGroups | undefined): {
	value?: GridRowGroup[]
	defaultValue?: GridRowGroup[]
	onValueChange?: (groups: GridRowGroup[]) => void
} {
	if (Array.isArray(config)) return { defaultValue: config }

	return config ?? {}
}

/**
 * Reorders keyed `items` to lead in `order`, appending any not listed in their
 * original relative order — the stable reconcile behind the manual group order.
 * Returns `items` untouched for an empty order.
 *
 * @internal
 */
export function applyRowKeyOrder<I>(
	items: I[],
	order: (string | number)[] | undefined,
	keyOf: (item: I) => string | number,
): I[] {
	if (!order || order.length === 0) return items

	const byKey = new Map(items.map((item) => [String(keyOf(item)), item]))

	const ordered = order.map((key) => byKey.get(String(key))).filter((item) => item != null)

	const listed = new Set(order.map(String))

	const rest = items.filter((item) => !listed.has(String(keyOf(item))))

	return [...ordered, ...rest]
}

/**
 * Builds the row manager's natural-order view model from the groups. There is
 * one entry per group: its shared value, formatted label, and leaf count. Empty
 * outside client grouping. The overlay's color and ordering are layered on
 * later by {@link useGridRowManager}.
 *
 * @internal
 */
export function buildRowManagerGroups<T>(groups: GridGroup<T>[] | null): GridRowManagerGroup[] {
	return (groups ?? []).map((group) => {
		return {
			key: groupKeyOf(group),
			label: groupValueLabel(group.value),
			count: group.leaves.length,
		}
	})
}
