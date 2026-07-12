import { isDataColumn } from '../../../../utilities'
import type { SortState } from '../../context'
import type { GridGroupHeaderRow } from '../../grid-data-types'
import type { GridGroupByContextValue } from '../../grid-group-by-button'
import type { GridRowsProps } from '../../grid-row'
import type { GridColumn, GridPagination } from '../../types'
import type { GridExpansionResult } from '../../use-grid-expansion'
import type { GridGroupHeader, GridGroupResult } from '../../use-grid-group'
import type { GridColumnPinning } from '../../use-grid-table'
import { isManualPagination } from '../grid-pagination-utilities'

/** Whether `id` names a groupable column — a present data column (not selection / actions / drag-handle). @internal */
export function isGroupableColumnId<T>(columns: GridColumn<T>[], id: string | number): boolean {
	return columns.some((col) => col.id === id && isDataColumn(col))
}

/**
 * Resolves which row-grouping mode is active from the binding slice: client
 * grouping (the engine computes the groups), manual grouping (the consumer's
 * rows carry them — which needs the `groupRow` contract), either (`active`),
 * and the grouping id the engine receives — client mode only, since manual
 * grouping keeps the engine ungrouped. Kept out of {@link GridData} for its
 * complexity budget.
 *
 * @internal
 */
export function resolveGroupingMode<T>(args: {
	manual: boolean
	grouping: (string | number) | null
	groupRow: ((row: T) => GridGroupHeaderRow | null) | undefined
}): {
	groupingActive: boolean
	manualGroupingActive: boolean
	active: boolean
	engineGrouping: (string | number) | null
} {
	const groupingActive = !args.manual && args.grouping != null

	const manualGroupingActive = args.manual && args.grouping != null && args.groupRow != null

	return {
		groupingActive,
		manualGroupingActive,
		active: groupingActive || manualGroupingActive,
		engineGrouping: groupingActive ? args.grouping : null,
	}
}

/**
 * The engine's manual group-header predicate — rows the binding's `groupRow`
 * contract marks — or `null` outside manual grouping. Split out so the branch
 * lives here, off {@link GridData}'s complexity budget.
 *
 * @internal
 */
export function manualGroupPredicate<T>(
	active: boolean,
	groupRow: ((row: T) => GridGroupHeaderRow | null) | undefined,
): ((row: T) => boolean) | null {
	if (!active || !groupRow) return null

	return (row) => groupRow(row) != null
}

/**
 * Manual-grouping body wiring for {@link GridBody} — the group-header resolver,
 * the expanded key set, and the toggle — or `null` outside manual grouping.
 * Kept off {@link GridData}'s complexity budget.
 *
 * @internal
 */
export function resolveManualGroupBody<T>(args: {
	active: boolean
	groupRow: ((row: T) => GridGroupHeaderRow | null) | undefined
	expanded: ReadonlySet<string | number>
	toggle: (key: string | number) => void
}): {
	groupRow: (row: T) => GridGroupHeaderRow | null
	expanded: ReadonlySet<string | number>
	toggle: (key: string | number) => void
} | null {
	if (!args.active || !args.groupRow) return null

	return { groupRow: args.groupRow, expanded: args.expanded, toggle: args.toggle }
}

/**
 * The grouped column's active sort direction under manual grouping, or `null`
 * when the grid isn't manually grouped or its grouped column isn't sorted — what
 * {@link GridBody} reorders the manual group blocks by. Kept off
 * {@link GridData}'s complexity budget.
 *
 * @internal
 */
export function manualGroupSortDirection(args: {
	active: boolean
	sort: SortState[]
	grouping: (string | number) | null
}): 'asc' | 'desc' | null {
	if (!args.active) return null

	return args.sort.find((entry) => entry.column === args.grouping)?.direction ?? null
}

/**
 * The group-by context value the header buttons read, or `null` while the
 * `groupBy.groupButton` flag is off — the buttons then render nothing. Kept off
 * {@link GridData}'s complexity budget.
 *
 * @internal
 */
export function resolveGroupByContext(args: {
	groupButton: boolean
	grouping: (string | number) | null
	setGrouping: (next: (string | number) | null) => void
	hasData: boolean
}): GridGroupByContextValue | null {
	if (!args.groupButton) return null

	return {
		grouping: args.grouping,
		setGrouping: args.setGrouping,
		enabled: args.hasData,
	}
}

/**
 * Zeroes the grid features that a self-rendering body stands over. Grouping —
 * client or manual — renders its own plain body, so it stands the navigable
 * cursor and virtualization down; client grouping (a whole-set body) also
 * stands pagination down, while manual grouping keeps *manual* pagination (the
 * backend pages the grouped sequence) and drops only a client one, whose
 * arbitrary slice boundaries would tear children from their group headers.
 * Master-detail interleaves auto-height detail rows into the flat body, so it
 * stands the cursor and virtualization down (a window assumes uniform row
 * heights) but keeps pagination — the two compose. Each flag passes through
 * when none is active. Split out so {@link GridData} stays within its
 * complexity budget.
 *
 * @internal
 */
export function resolveGroupingGates(args: {
	groupingActive: boolean
	manualGroupingActive: boolean
	expandableActive: boolean
	navigable: boolean
	virtualize: boolean
	pagination: GridPagination | undefined
}): { navigable: boolean; virtualize: boolean; pagination: GridPagination | undefined } {
	// Any self-rendering body stands the cursor and virtualization down.
	const ownBody = args.groupingActive || args.manualGroupingActive || args.expandableActive

	const pagination = args.manualGroupingActive
		? isManualPagination(args.pagination)
			? args.pagination
			: undefined
		: args.groupingActive
			? undefined
			: args.pagination

	return {
		navigable: ownBody ? false : args.navigable,
		virtualize: ownBody ? false : args.virtualize,
		pagination,
	}
}

/**
 * Resolves the master-detail hook into what {@link GridData} threads onward:
 * whether it's active (grouping renders its own body, so expansion stands down
 * under it) and the body wiring the flat rows read — the expanded set, the
 * per-row predicate, the toggle, and the detail renderer — or `null` when
 * inactive. Kept off {@link GridData}'s complexity budget.
 *
 * @internal
 */
export function resolveDetailExpansion<T>(
	expansion: GridExpansionResult<T>,
	groupingActive: boolean,
): { active: boolean; body: GridRowsProps<T>['expansion'] } {
	const active = expansion.active && !groupingActive

	if (!active || !expansion.render) return { active: false, body: null }

	return {
		active: true,
		body: {
			expanded: expansion.expanded,
			rowExpandable: expansion.rowExpandable,
			toggle: expansion.toggle,
			render: expansion.render,
		},
	}
}

/**
 * Resolves the column-group band row for the rendered columns: the
 * {@link GridGroupHeader} spans (from the visible column ids and their pin
 * sides) and whether any band actually spans columns. Kept out of
 * {@link GridData} so its branch doesn't weigh on the component's complexity.
 *
 * @internal
 */
export function resolveGroupHeaderRow<T>(
	group: GridGroupResult,
	visibleColumns: GridColumn<T>[],
	pinning: GridColumnPinning | null,
): { header: GridGroupHeader | null; hasGroupRow: boolean } {
	if (!group.hasGroups) return { header: null, hasGroupRow: false }

	const header = group.resolveHeader(
		visibleColumns.map((c) => c.id),
		(id) => pinning?.side(id),
	)

	return { header, hasGroupRow: header.spans.some((span) => span.kind === 'group') }
}
