import { isDataColumn } from '../../../../utilities'
import type { GridSortState } from '../../context'
import type { GridGroupHeaderRow, GridVirtualize } from '../../grid-data-types'
import type { GridGroupByContextValue } from '../../grid-group-by-button'
import type { GridRowsProps } from '../../grid-row'
import type { GridColumn, GridPagination } from '../../types'
import type { GridExpansionResult } from '../../use-grid-expansion'
import type { GridGroupHeader, GridGroupResult } from '../../use-grid-group'
import type { GridColumnPinning } from '../../use-grid-table'
import { isManualPagination } from '../grid-pagination-utilities'

/** Whether `id` names a groupable column — a present data column, not one of the non-data columns (selection, actions, drag handle, expander). @internal */
export function isGroupableColumnId<T>(columns: GridColumn<T>[], id: string | number): boolean {
	return columns.some((col) => col.id === id && isDataColumn(col))
}

/**
 * Resolves which row-grouping mode is active from the binding slice:
 *
 * - client grouping, where the engine computes the groups;
 * - manual grouping, where the consumer's rows carry them, which needs the
 *   `groupRow` contract;
 * - either of the two (`active`);
 * - the grouping id the engine receives.
 *
 * The grouping id is client mode only, since manual grouping keeps the engine
 * ungrouped. Kept out of {@link GridData} for its complexity budget.
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
 * when the grid isn't manually grouped or its grouped column isn't sorted. It is
 * what {@link GridBody} reorders the manual group blocks by. Kept off
 * {@link GridData}'s complexity budget.
 *
 * @internal
 */
export function manualGroupSortDirection(args: {
	active: boolean
	sort: GridSortState[]
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
 * Zeroes the grid features that a self-rendering body stands over. Grouping,
 * client or manual, renders its own body, and so does master-detail. Client
 * grouping and master-detail keep the navigable cursor. Their bodies give the
 * cursor an order of rows (see `useGridCursorOrder`). Manual grouping stands
 * the cursor down, because its segment keys are positional.
 *
 * Client grouping and master-detail keep `virtualize` when the consumer sets
 * it. Their bodies then window a list of items through the measured path of
 * `useVirtualWindow`. A group header, a leaf, a total, and a detail panel do
 * not share one height. Manual grouping stands virtualization down.
 * Its segment keys are positional, so they do not give each row a stable key.
 * Infinite scroll implies `virtualize`, but an implied window does not lift
 * the gate. A grouped or master-detail grid thus renders as before unless the
 * consumer sets `virtualize` itself.
 *
 * Infinite scroll runs only over the flat window. It reads the last data row
 * of the window, and a self-rendering body has no such index.
 *
 * Client grouping is a whole-set body, so it also stands pagination down.
 * Manual grouping keeps *manual* pagination, where the backend pages the
 * grouped sequence. It drops only a client one, whose arbitrary slice
 * boundaries would tear children from their group headers. Master-detail keeps
 * pagination, because the two compose. Each flag passes through when no
 * self-rendering body is active. Split out so {@link GridData} stays within
 * its complexity budget.
 *
 * @internal
 */
export function resolveGroupingGates(args: {
	groupingActive: boolean
	manualGroupingActive: boolean
	expandableActive: boolean
	navigable: boolean
	/** The resolved window flag, which infinite scroll can imply. */
	virtualize: boolean
	/** The consumer's own `virtualize` prop, before infinite scroll implies it. */
	virtualizeProp: GridVirtualize | undefined
	pagination: GridPagination | undefined
}): {
	navigable: boolean
	virtualize: boolean
	infiniteScroll: boolean
	pagination: GridPagination | undefined
} {
	// Any self-rendering body stands infinite scroll down.
	const ownBody = args.groupingActive || args.manualGroupingActive || args.expandableActive

	// Client grouping and master-detail window only on an explicit request.
	const requested = args.virtualizeProp != null && args.virtualizeProp !== false

	const virtualize = args.manualGroupingActive
		? false
		: ownBody
			? args.virtualize && requested
			: args.virtualize

	const pagination = args.manualGroupingActive
		? isManualPagination(args.pagination)
			? args.pagination
			: undefined
		: args.groupingActive
			? undefined
			: args.pagination

	return {
		navigable: args.manualGroupingActive ? false : args.navigable,
		virtualize,
		infiniteScroll: virtualize && !ownBody,
		pagination,
	}
}

/**
 * Resolves the master-detail hook into what {@link GridData} threads onward.
 * That is whether it's active, plus the body wiring the flat rows read. The
 * wiring is the expanded set, the per-row predicate, the toggle, and the detail
 * renderer. Grouping renders its own body, so expansion stands down under it.
 * The result is `null` when inactive. Kept off {@link GridData}'s complexity
 * budget.
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
 * Resolves the column-group band row for the rendered columns. It returns the
 * {@link GridGroupHeader} spans, from the visible column ids and their pin
 * sides, and whether any band actually spans columns. Kept out of
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
		(id) => pinning?.column(id)?.side,
	)

	return { header, hasGroupRow: header.spans.some((span) => span.kind === 'group') }
}
