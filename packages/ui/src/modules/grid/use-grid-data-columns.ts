'use client'

import { type RefObject, useCallback, useMemo } from 'react'
import { announce } from '../../core'
import { useControllable } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { DensityLevel } from '../../providers/density'
import { describeColumnVisibility, describePin } from './engine/grid-announcements'
import { columnLabel } from './engine/grid-column/label'
import {
	isGroupableColumnId,
	resolveDetailExpansion,
	resolveGroupingGates,
	resolveGroupingMode,
} from './engine/grid-group/resolve'
import { applyPinOverrides, type PinSide, toPinOverrides } from './engine/grid-pin/overrides'
import { implyVirtualize } from './engine/grid-table/guards'
import {
	seedColumnManager,
	seedColumnOrder,
	seedColumnSizing,
	seedPinning,
} from './engine/grid-table/seeds'
import {
	resolveInfiniteScroll,
	resolveSortable,
	resolveVirtualization,
} from './grid-data-resolvers'
import type { GridDataProps, GridPinningState } from './grid-data-types'
import { useGridColumns } from './use-grid-columns'
import { useGridExpansion } from './use-grid-expansion'
import { useGridGroup } from './use-grid-group'
import { useGridRowGrouping } from './use-grid-row-grouping'

/**
 * The column phase of {@link GridData}. It folds the preferences into the column
 * bindings and applies the menu pin state. It resolves row grouping and
 * master-detail, and the gates that grouping sets on the cursor, the window, and
 * pagination. It also holds the column groups, the column order and visibility,
 * and the narration of a pin or a visibility change.
 *
 * @internal
 */
export function useGridDataColumns<T>({
	columns,
	rowCount,
	preferences,
	columnOrder: columnOrderConfigProp,
	pinning: pinningConfigProp,
	columnManager: columnManagerConfigProp,
	columnSizing: columnSizingConfigProp,
	columnGroups: groupsConfig,
	onCollapsedChange,
	groupBy: groupByConfig,
	expandable: expandableConfig,
	navigable,
	virtualize,
	infiniteScroll: infiniteScrollConfig,
	pagination: paginationConfig,
	density,
	wrapperRef,
}: Pick<
	GridDataProps<T>,
	| 'columns'
	| 'preferences'
	| 'columnOrder'
	| 'pinning'
	| 'columnManager'
	| 'columnSizing'
	| 'columnGroups'
	| 'onCollapsedChange'
	| 'groupBy'
	| 'expandable'
	| 'virtualize'
	| 'infiniteScroll'
	| 'pagination'
> & {
	/** The number of source rows. */
	rowCount: number
	navigable: boolean
	density: DensityLevel
	/** The grid's root, read for its direction when a pin change is narrated. */
	wrapperRef: RefObject<HTMLDivElement | null>
}) {
	// Fold the `preferences` snapshot into each column binding as its default,
	// unless the consumer bound that dimension explicitly (an explicit
	// value/defaultValue wins). This is the single seed the four bindings share;
	// changes still flow out through each binding's own callbacks. An empty order
	// is treated as absent so it can't defeat the declaration-order fallback.
	const columnOrderConfig = seedColumnOrder(columnOrderConfigProp, preferences)

	const pinningConfig = seedPinning(pinningConfigProp, preferences)

	const columnSizingConfig = seedColumnSizing(columnSizingConfigProp, preferences)

	// `columnManager={false}` is the feature's off switch: the seed flattens it to
	// no bindings at all, and the menu actions read the switch off the raw prop.
	const columnManagerConfig = seedColumnManager(columnManagerConfigProp, preferences)

	const {
		enabled: virtualizeEnabled,
		estimateSize,
		overscan,
	} = resolveVirtualization(implyVirtualize(virtualize, infiniteScrollConfig), density)

	// Columns sort by default; bake that into each data column that doesn't set
	// its own `sortable`, so head and engine read one resolved flag.
	const resolvedColumns = useMemo(() => resolveSortable(columns), [columns])

	// Menu-applied pin changes, layered over the static `pinned` flags. Folding
	// them into the columns here lets the column and engine hooks read one
	// `pinned` flag whether it came from the definition or the menu. The state
	// is controllable through the `pinning` binding so consumers can persist it;
	// unbound, it stays internal exactly as before.
	const onPinningChange = pinningConfig?.onValueChange

	const [pinningState, setPinningState] = useControllable<GridPinningState>({
		value: pinningConfig?.value,
		defaultValue: pinningConfig?.defaultValue,
		// Coalesced to a concrete object, matching the other bindings' non-nullable callbacks.
		onValueChange: (next) => onPinningChange?.(next ?? {}),
	})

	const pinOverrides = useMemo(() => toPinOverrides(pinningState), [pinningState])

	const pinnedColumns = useMemo(
		() => applyPinOverrides(resolvedColumns, pinOverrides),
		[resolvedColumns, pinOverrides],
	)

	// Row grouping: resolve the `groupBy` binding to a groupable data column (a
	// stray id leaves the grid ungrouped), plus the expansion state — the engine's
	// under client grouping, the binding's key set under manual. Grouping renders
	// its own body, so it stands down the cursor and pagination below. Manual
	// grouping also stands virtualization down.
	const isGroupableColumn = useCallback(
		(id: string | number) => isGroupableColumnId(pinnedColumns, id),
		[pinnedColumns],
	)

	const rowGrouping = useGridRowGrouping<T>(groupByConfig, isGroupableColumn)

	const { grouping, manual: groupingManual, groupRow } = rowGrouping

	// Client grouping computes groups on the engine; manual grouping renders the
	// consumer-supplied header/children sequence and needs the row contract.
	const groupingMode = resolveGroupingMode({ manual: groupingManual, grouping, groupRow })

	// Master-detail: the expanded-key set, per-row toggle, and detail renderer,
	// resolved to whether it's active (grouping takes precedence, so it stands
	// down under grouping) and the body wiring the flat rows read.
	const detail = resolveDetailExpansion(useGridExpansion<T>(expandableConfig), groupingMode.active)

	// Manual grouping stands the cursor down. Client grouping and master-detail
	// give the cursor an order of rows. Manual grouping also stands virtualization
	// down, and the other two keep an explicit `virtualize`. Client grouping stands
	// pagination down, manual grouping keeps a manual one, and master-detail keeps
	// any (see `resolveGroupingGates`).
	const gated = resolveGroupingGates({
		groupingActive: groupingMode.groupingActive,
		manualGroupingActive: groupingMode.manualGroupingActive,
		expandableActive: detail.active,
		navigable,
		virtualize: virtualizeEnabled,
		virtualizeProp: virtualize,
		pagination: paginationConfig,
	})

	// Infinite scroll layers on the flat virtualized window, so it stands down
	// under a self-rendering body (`gated.infiniteScroll`). Its `threshold`
	// defaults to the window's `overscan`, so the fetch leads the viewport by that
	// margin; the source `rows` length derives `hasMore` when a `totalRows` is supplied.
	const infiniteScroll = gated.infiniteScroll
		? resolveInfiniteScroll(infiniteScrollConfig, overscan, rowCount)
		: null

	// Resolves a column's display label at call time, read by the stable `pinColumn`
	// and the visibility handler so they can narrate the change without closing over
	// (and re-creating on) the columns.
	const labelOfColumn = useStableEvent((id: string | number) => {
		const column = pinnedColumns.find((candidate) => candidate.id === id)

		return column ? columnLabel(column) : String(id)
	})

	const pinColumn = useCallback(
		(id: string | number, side: PinSide | false) => {
			const key = String(id)

			setPinningState((prev) => ({ ...prev, [key]: side === false ? 'none' : side }))

			// Narrate the pin change; the header gives no visible text cue (WCAG 4.1.3).
			// The words name the physical edge, so they read the grid's direction.
			const rtl =
				wrapperRef.current !== null && getComputedStyle(wrapperRef.current).direction === 'rtl'

			announce(describePin(labelOfColumn(id), side, rtl))
		},
		[setPinningState, labelOfColumn, wrapperRef],
	)

	// Column groups: the controllable binding, collapse state, the ids collapsed
	// groups hide from the engine, and the band-row resolver.
	const group = useGridGroup(groupsConfig, onCollapsedChange)

	const columnState = useGridColumns<T>({
		columns: pinnedColumns,
		columnOrderConfig,
		columnManagerConfig,
		groups: group.groups,
		forcedHidden: group.collapsedHidden,
	})

	const { hiddenColumns, setHiddenColumns } = columnState

	// Narrate column show/hide from the manager (WCAG 4.1.3): the incoming hidden
	// set is concrete (the visibility hook resolves the manager's updater first), so
	// diff it against the current one to name the column the toggle moved.
	const handleHiddenChange = useStableEvent((next: Set<string | number>) => {
		for (const id of next) {
			if (!hiddenColumns.has(id)) announce(describeColumnVisibility(labelOfColumn(id), true))
		}

		for (const id of hiddenColumns) {
			if (!next.has(id)) announce(describeColumnVisibility(labelOfColumn(id), false))
		}

		setHiddenColumns(next)
	})

	return {
		columnOrderConfig,
		columnSizingConfig,
		columnManagerConfig,
		virtualizeEnabled,
		estimateSize,
		overscan,
		pinnedColumns,
		pinColumn,
		rowGrouping,
		groupingMode,
		detail,
		gated,
		infiniteScroll,
		group,
		columnState,
		handleHiddenChange,
	}
}
