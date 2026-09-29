'use client'

import { type ComponentProps, type TransitionEvent, useMemo, useRef } from 'react'
import type { PaletteColor } from '../../core/recipe'
import type { GridGroup, GridLeaf } from './engine/grid-group/tree'
import {
	type GridGroupedWindowItem,
	groupedWindowItems,
	groupKeyOf,
	leafItemKey,
	totalItemKey,
} from './engine/grid-items/items'
import { type GridWindowRowProps, itemAriaRowIndex } from './engine/grid-row/shell'
import { groupedCursorRows, useGridCursorOrder } from './grid-cursor-order'
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
	type GridMotionFlips,
	type GridMotionSource,
	useGridWindowMotion,
} from './use-grid-window-motion'

/** The expansion of the groups at one render: the group ids and whether each is open. @internal */
type GroupExpansion = { ids: string[]; open: boolean[] }

/** The open keys of a group's rows, in display order: its leaves, then its total. @internal */
function rowKeysOf<T>(group: GridGroup<T>, totaled: boolean): string[] {
	const keys = group.leaves.map((leaf) => leafItemKey(leaf.id))

	if (totaled) keys.push(totalItemKey(group.id))

	return keys
}

/**
 * Adds one group's toggle to `change`. An expand opens the group's rows, and
 * the rows that fit in one viewport enter. A collapse keeps each row in view
 * as a closing row, with its height. With no window, no row moves.
 *
 * @internal
 */
function groupToggle<T>(
	group: GridGroup<T>,
	open: boolean,
	change: GridMotionChange<string>,
	context: { view: GridWindowView | null; totaled: boolean; rowHeight: number },
): void {
	const { view } = context

	const keys = rowKeysOf(group, context.totaled)

	if (open) {
		change.opened.push(...keys)

		if (!view || view.edge(`group:${group.id}`) === 'above') return

		// The rows that fit in one viewport. Only these animate open.
		const bound = Math.ceil(view.viewport / Math.max(context.rowHeight, 1))

		change.entering.push(...keys.slice(0, bound))

		return
	}

	if (!view) return

	for (const key of keys) {
		const size = view.size(key)

		if (size !== undefined && view.edge(key) === 'in') change.closing.push([key, size])
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
	totaled: boolean,
	rowHeight: number,
): GridMotionSource<GridGroup<T>[], GroupExpansion, GridGroup<T>, string> {
	return {
		capture: (groups) => ({
			ids: groups.map((group) => group.id),
			open: groups.map((group) => group.expanded),
		}),
		same: (captured, groups) => {
			if (captured.ids.length !== groups.length) return false

			for (let index = 0; index < groups.length; index++) {
				const group = groups[index] as GridGroup<T>

				if (captured.ids[index] !== group.id) return false

				if (captured.open[index] !== group.expanded) return false
			}

			return true
		},
		flips: (previous, groups) => {
			const flips: GridMotionFlips<GridGroup<T>> = { opened: [], closed: [] }

			const was = new Map(previous.ids.map((id, index) => [id, previous.open[index]]))

			for (const group of groups) {
				const before = was.get(group.id)

				if (before === undefined || before === group.expanded) continue

				if (group.expanded) flips.opened.push(group)
				else flips.closed.push(group)
			}

			return flips
		},
		resolve: (flips, view) => {
			const change: GridMotionChange<string> = { opened: [], closing: [], entering: [] }

			const context = { view, totaled, rowHeight }

			for (const group of flips.opened) groupToggle(group, true, change, context)

			for (const group of flips.closed) groupToggle(group, false, change, context)

			return change
		},
	}
}

/** Props for {@link GridVirtualizedGroupedBody}. @internal */
type GridVirtualizedGroupedBodyProps<T> = {
	rowsProps: GridRowsProps<T>
	/** The groups, in display order. */
	groups: GridGroup<T>[]
	/** Opens or closes a group, by its id. */
	toggleGroup: (id: string) => void
	columnId: string | number
	renderHeader: GridGroupBy['renderHeader']
	/** Whether each group shows a total row. */
	totaled: boolean
	/** The row-manager overlay presentation (per-group color), or `null` when off. */
	presentation: GridRowGroupPresentation | null
	/** The leaf row props from the shared body wiring. */
	leafProps: (
		leaf: GridLeaf<T>,
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
	toggleGroup,
	columnId,
	renderHeader,
	totaled,
	presentation,
	leafProps,
	window,
}: GridVirtualizedGroupedBodyProps<T>) {
	const { visibleColumns: columns, pinning, gridSemantics, rowIndexOffset } = rowsProps

	// The last commit's window, which the motion reads when a group toggles.
	const record = useRef(NO_WINDOW_RECORD)

	const source = useMemo(
		() => groupMotionSource<T>(totaled, window.estimateSize),
		[totaled, window.estimateSize],
	)

	// The rows render from the applied groups, which trail a toggle by one
	// commit before the paint. That commit keeps every row as it was.
	const {
		applied: shown,
		motions,
		release,
	} = useGridWindowMotion(groups, source, record, window.scrollRef)

	// A toggle gives a new list of groups, so the item list rebuilds with it.
	const items = useMemo(
		() => groupedWindowItems(shown, { totaled, motions }),
		[shown, totaled, motions],
	)

	const { bodyRef, revealEndItem, virtualItems, topSpacer, bottomSpacer, measureRef } =
		useGridItemWindow(items, window, record)

	// The cursor walks the open rows. A scroll frame keeps the same order.
	const cursorOrder = useMemo(
		() => groupedCursorRows(shown, totaled, toggleGroup),
		[shown, totaled, toggleGroup],
	)

	useGridCursorOrder(cursorOrder)

	const colorOf = (group: GridGroup<T>) => presentation?.color(groupKeyOf(group))

	const onTransitionEnd = (event: TransitionEvent<HTMLTableSectionElement>) => {
		const item = revealEndItem(event)

		if (item?.phase === 'closing') release(item.reactKey)
	}

	const windowRow = (item: GridGroupedWindowItem<T>, index: number): GridWindowRowProps => ({
		ref: measureRef,
		'data-index': index,
		'aria-rowindex': itemAriaRowIndex(gridSemantics, rowIndexOffset, item.position),
	})

	return (
		<GridWindowBody<T>
			bodyRef={bodyRef}
			columns={columns}
			pinning={pinning}
			topSpacer={topSpacer}
			bottomSpacer={bottomSpacer}
			itemCount={items.length}
			windowCount={virtualItems.length}
			onTransitionEnd={onTransitionEnd}
		>
			{virtualItems.map((virtualItem) => {
				const item = items[virtualItem.index] as GridGroupedWindowItem<T>

				const color = colorOf(item.group)

				if (item.kind === 'group') {
					return (
						<GridGroupRow<T>
							key={item.reactKey}
							group={item.group}
							onToggle={toggleGroup}
							columns={columns}
							columnId={columnId}
							renderHeader={renderHeader}
							color={color}
							{...windowRow(item, virtualItem.index)}
						/>
					)
				}

				if (item.kind === 'total') {
					return (
						<GridTotalRow<T>
							key={item.reactKey}
							columns={columns}
							rows={item.rows}
							variant="group"
							expanded={item.phase === 'open'}
							color={color}
							navKey={item.reactKey}
							{...windowRow(item, virtualItem.index)}
						/>
					)
				}

				return (
					<GridGroupLeafRow<T>
						key={item.reactKey}
						{...leafProps(item.leaf, item.phase === 'open', color)}
						enter={motions.get(item.reactKey)?.phase === 'entering'}
						{...windowRow(item, virtualItem.index)}
					/>
				)
			})}
		</GridWindowBody>
	)
}
