'use client'

import type { Row } from '@tanstack/react-table'
import { type ComponentProps, type TransitionEvent, useMemo, useRef } from 'react'
import type { PaletteColor } from '../../core/recipe'
import type { DensityLevel } from '../../providers/density'
import {
	type GridGroupedWindowItem,
	groupedWindowItems,
	leafItemKey,
	totalItemKey,
} from './engine/grid-items/items'
import { ariaRowIndex } from './engine/grid-row/shell'
import type { GridGroupBy } from './grid-data-types'
import { GridGroupLeafRow } from './grid-group-leaf-row'
import { GridGroupRow } from './grid-group-row'
import type { GridRowsProps } from './grid-row'
import { GridTotalRow } from './grid-total-row'
import { GridWindowBody } from './grid-window-body'
import {
	type GridItemWindowOptions,
	type GridWindowView,
	NO_WINDOW_RECORD,
	useGridItemWindow,
} from './use-grid-item-window'
import type { GridRowGroupPresentation } from './use-grid-row-manager'
import {
	type GridMotionChange,
	type GridMotionSource,
	useGridWindowMotion,
} from './use-grid-window-motion'

/** The expansion of the groups at one render: the group ids and whether each is open. @internal */
type GroupExpansion = { ids: string[]; open: boolean[] }

/** The open keys of a group's rows, in display order: its leaves, then its total. @internal */
function rowKeysOf<T>(group: Row<T>, totalled: boolean): string[] {
	const keys = group.subRows.map((leaf) => leafItemKey(leaf.id))

	if (totalled) keys.push(totalItemKey(group.id))

	return keys
}

/**
 * Adds one group's toggle to `change`. An expand opens the group's rows, and
 * the rows that fit in one viewport enter. A collapse keeps each row in view
 * as a closing row, with its height.
 *
 * @internal
 */
function groupToggle<T>(
	group: Row<T>,
	open: boolean,
	change: GridMotionChange<string>,
	context: {
		view: () => GridWindowView
		reducedMotion: boolean
		totalled: boolean
		rowHeight: number
	},
): void {
	const { view, reducedMotion } = context

	const keys = rowKeysOf(group, context.totalled)

	if (open) {
		change.opened.push(...keys)

		if (reducedMotion || view().edge(`group:${group.id}`) === 'above') return

		// The rows that fit in one viewport. Only these animate open.
		const bound = Math.ceil(view().viewport / Math.max(context.rowHeight, 1))

		change.entering.push(...keys.slice(0, bound))

		return
	}

	if (reducedMotion) return

	for (const key of keys) {
		const size = view().size(key)

		if (size !== undefined && view().edge(key) === 'in') change.closing.push([key, size])
	}
}

/**
 * The toggle mapping of the grouped body, for {@link useGridWindowMotion}.
 *
 * - A collapse keeps the group's rows in view as closing rows. Every other row
 *   leaves at once, and the start anchor holds the rows in view still.
 * - An expand makes the first rows that fit in one viewport enter, unless the
 *   group's header ends above the view. Those rows are above the view, so they
 *   do not animate.
 * - Reduced motion keeps no closing row and makes no row enter.
 *
 * @internal
 */
function groupMotionSource<T>(
	totalled: boolean,
	rowHeight: number,
): GridMotionSource<Row<T>[], GroupExpansion, string> {
	return {
		capture: (groups) => ({
			ids: groups.map((group) => group.id),
			open: groups.map((group) => group.getIsExpanded()),
		}),
		same: (captured, groups) => {
			if (captured.ids.length !== groups.length) return false

			for (let index = 0; index < groups.length; index++) {
				const group = groups[index] as Row<T>

				if (captured.ids[index] !== group.id) return false

				if (captured.open[index] !== group.getIsExpanded()) return false
			}

			return true
		},
		toggle: (previous, groups, context) => {
			const change: GridMotionChange<string> = { opened: [], closing: [], entering: [] }

			const was = new Map(previous.ids.map((id, index) => [id, previous.open[index]]))

			for (const group of groups) {
				const open = group.getIsExpanded()

				const before = was.get(group.id)

				if (before !== undefined && before !== open) {
					groupToggle(group, open, change, { ...context, totalled, rowHeight })
				}
			}

			return change
		},
	}
}

/** Props for {@link GridVirtualizedGroupedBody}. @internal */
type GridVirtualizedGroupedBodyProps<T> = {
	rowsProps: GridRowsProps<T>
	/** The group rows, in display order. */
	groups: Row<T>[]
	columnId: string | number
	renderHeader: GridGroupBy['renderHeader']
	/** Whether each group shows a total row. */
	totalled: boolean
	density: DensityLevel
	/** The row-manager overlay presentation (per-group color), or `null` when off. */
	presentation: GridRowGroupPresentation | null
	/** The leaf row props from the shared body wiring. */
	leafProps: (
		leaf: Row<T>,
		expanded: boolean,
		color: PaletteColor | undefined,
	) => ComponentProps<typeof GridGroupLeafRow<T>>
	window: GridItemWindowOptions
}

/**
 * The client-grouped body over a measured window. It flattens the groups into
 * one item list of headers, leaves, and totals, and renders only the items in
 * view plus overscan. Each row measures its own height.
 *
 * @remarks A collapsed group gives no leaf items. A collapse keeps the group's
 * rows in view as items until their reveal lands. Each takes a virtual key of
 * its own meanwhile, so the open height stays cached. The React key stays the
 * open key, so each row keeps its node and its transition. Every other row of
 * the group leaves at once. The start anchor of the window holds the rows in
 * view still, for a removal and for an insert above them.
 *
 * An expand makes only the rows that fit in one viewport mount closed and open
 * over the transition. The other rows mount open. Reduced motion keeps no
 * closing rows and makes no row enter.
 *
 * Each exposed row carries `aria-rowindex` over the item list. A closing row is
 * hidden from assistive tech, and it carries no index.
 *
 * @internal
 */
export function GridVirtualizedGroupedBody<T>({
	rowsProps,
	groups,
	columnId,
	renderHeader,
	totalled,
	density,
	presentation,
	leafProps,
	window,
}: GridVirtualizedGroupedBodyProps<T>) {
	const { visibleColumns: columns, pinning, gridSemantics, rowIndexOffset } = rowsProps

	// The last commit's window, which the motion reads when a group toggles.
	const record = useRef(NO_WINDOW_RECORD)

	const source = useMemo(
		() => groupMotionSource<T>(totalled, window.estimateSize),
		[totalled, window.estimateSize],
	)

	const { motions, captured, release } = useGridWindowMotion(
		groups,
		source,
		record,
		window.scrollRef,
	)

	// The engine can keep the group rows when a group toggles, so the list also
	// rebuilds on each new expansion snapshot.
	const items = useMemo(() => {
		void captured

		return groupedWindowItems(groups, { totalled, motions })
	}, [groups, totalled, motions, captured])

	const { bodyRef, revealEndItem, virtualItems, topSpacer, bottomSpacer, measureRef } =
		useGridItemWindow(items, window, record)

	const colorOf = (group: Row<T>) =>
		presentation?.color(group.getGroupingValue(String(columnId)) as string | number)

	const onTransitionEnd = (event: TransitionEvent<HTMLTableSectionElement>) => {
		const item = revealEndItem(event)

		if (item?.phase === 'closing') release(item.reactKey)
	}

	const aria = (item: GridGroupedWindowItem<T>) =>
		gridSemantics && item.position >= 0 ? ariaRowIndex(rowIndexOffset, item.position) : undefined

	return (
		<GridWindowBody<T>
			bodyRef={bodyRef}
			columns={columns}
			pinning={pinning}
			topSpacer={topSpacer}
			bottomSpacer={bottomSpacer}
			warming={items.length > 0 && virtualItems.length === 0}
			onTransitionEnd={onTransitionEnd}
		>
			{virtualItems.map((virtualItem) => {
				const item = items[virtualItem.index] as GridGroupedWindowItem<T>

				const color = colorOf(item.group)

				if (item.kind === 'group') {
					return (
						<GridGroupRow<T>
							key={item.reactKey}
							row={item.group}
							columns={columns}
							columnId={columnId}
							renderHeader={renderHeader}
							color={color}
							measureRef={measureRef}
							dataIndex={virtualItem.index}
							ariaRowIndex={aria(item)}
						/>
					)
				}

				if (item.kind === 'total') {
					return (
						<GridTotalRow<T>
							key={item.reactKey}
							columns={columns}
							rows={item.group.subRows.map((leaf) => leaf.original)}
							variant="group"
							expanded={item.phase === 'open'}
							density={density}
							color={color}
							measureRef={measureRef}
							dataIndex={virtualItem.index}
							ariaRowIndex={aria(item)}
						/>
					)
				}

				return (
					<GridGroupLeafRow<T>
						key={item.reactKey}
						{...leafProps(item.leaf, item.phase === 'open', color)}
						enter={motions.get(item.reactKey)?.phase === 'entering'}
						measureRef={measureRef}
						dataIndex={virtualItem.index}
						ariaRowIndex={aria(item)}
					/>
				)
			})}
		</GridWindowBody>
	)
}
