import type { Row } from '@tanstack/react-table'
import type { GridGroupHeaderRow } from '../../grid-data-types'
import { compareSmart } from '../grid-sort/utilities'

/**
 * One run of the manual grouped body: a group-header row (with its
 * {@link GridGroupHeaderRow} descriptor) followed by the leaf rows positionally
 * associated with it — or, for leaves preceding any header, a headerless run
 * that always renders expanded.
 *
 * @internal
 */
export type GridManualGroupSegment<T> = {
	/** The group-header engine row, or `null` for a leading headerless run. */
	header: Row<T> | null
	/** The header's descriptor, resolved once; `null` alongside a `null` header. */
	info: GridGroupHeaderRow | null
	/** The leaf rows under this header, in supplied order. */
	leaves: Row<T>[]
}

/**
 * Splits the manual display rows into {@link GridManualGroupSegment}s by
 * position: each group-header row (per the binding's `groupRow` resolver)
 * opens a segment collecting the leaves after it, up to the next header. Leaves
 * before any header collect into a leading headerless segment. Pure, so the
 * positional-association contract is unit-testable on its own.
 *
 * @internal
 */
export function segmentManualGroupRows<T>(
	rows: Row<T>[],
	groupRow: (row: T) => GridGroupHeaderRow | null,
): GridManualGroupSegment<T>[] {
	const segments: GridManualGroupSegment<T>[] = []

	let current: GridManualGroupSegment<T> | null = null

	for (const row of rows) {
		const info = groupRow(row.original)

		if (info) {
			current = { header: row, info, leaves: [] }

			segments.push(current)

			continue
		}

		if (!current) {
			current = { header: null, info: null, leaves: [] }

			segments.push(current)
		}

		current.leaves.push(row)
	}

	return segments
}

/**
 * Orders manual group {@link GridManualGroupSegment}s for a sort on the grouped
 * column: the header segments sort by their group `value` through
 * {@link compareSmart} (negated for descending), while a leading headerless run
 * — leaves before any header — stays at the front. The leaves within each
 * segment keep their supplied (backend) order — only the group blocks move, so
 * children never leave their header. Returns the segments untouched when no
 * group sort is active. Pure, so the group-sort contract is unit-testable.
 *
 * @internal
 */
export function orderManualGroupSegments<T>(
	segments: GridManualGroupSegment<T>[],
	direction: 'asc' | 'desc' | null,
): GridManualGroupSegment<T>[] {
	if (!direction) return segments

	const factor = direction === 'asc' ? 1 : -1

	const headerless = segments.filter((segment) => segment.header === null)

	const headed = segments
		.filter((segment) => segment.header !== null)
		.sort((a, b) => factor * compareSmart(a.info?.value, b.info?.value))

	return [...headerless, ...headed]
}
