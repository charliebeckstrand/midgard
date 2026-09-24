'use client'

import { Fragment, type TransitionEvent, useMemo, useRef } from 'react'
import { detailWindowItems, type GridDetailWindowItem } from './engine/grid-items/items'
import { ariaRowIndex } from './engine/grid-row/shell'
import { GridDetailRow } from './grid-detail-row'
import { type GridRowsProps, renderGridRow } from './grid-row'
import { GridWindowBody } from './grid-window-body'
import {
	type GridItemWindowOptions,
	NO_WINDOW_RECORD,
	useGridItemWindow,
} from './use-grid-item-window'
import {
	type GridMotionChange,
	type GridMotionSource,
	useGridWindowMotion,
} from './use-grid-window-motion'

type Keys = ReadonlySet<string | number>

const NO_KEYS: Keys = new Set()

/** The expandability of a row when the grid has no master-detail wiring. @internal */
const NEVER_EXPANDABLE = () => false

/**
 * The toggle mapping of the master-detail body, for {@link useGridWindowMotion}.
 * The snapshot is the expanded-key set itself.
 *
 * - A panel that closes in view stays as a closing item until its reveal lands.
 * - A panel that opens below the top edge mounts closed and opens over the
 *   transition. Its row must not end above the view.
 * - A panel above the view opens and closes at once, because each frame of its
 *   reveal would move the rows in view.
 * - Reduced motion keeps no closing panel and makes no panel enter.
 *
 * @internal
 */
const detailMotionSource: GridMotionSource<Keys, Keys, string | number> = {
	capture: (expanded) => expanded,
	same: (captured, expanded) => captured === expanded,
	toggle: (previous, expanded, { view, reducedMotion }) => {
		const change: GridMotionChange<string | number> = { opened: [], closing: [], entering: [] }

		for (const key of previous) {
			if (expanded.has(key) || reducedMotion) continue

			const size = view().size(`detail:${key}`)

			if (size !== undefined && view().edge(`detail:${key}`) === 'in') {
				change.closing.push([key, size])
			}
		}

		for (const key of expanded) {
			if (previous.has(key)) continue

			change.opened.push(key)

			// The panel starts at the end of its data row.
			const edge = reducedMotion ? undefined : view().edge(`row:${key}`)

			if (edge === 'in' || edge === 'top') change.entering.push(key)
		}

		return change
	},
}

/** Props for {@link GridVirtualizedDetailBody}. @internal */
type GridVirtualizedDetailBodyProps<T> = GridRowsProps<T> & GridItemWindowOptions

/**
 * The master-detail body over a measured window. Each data row is an item, and
 * each open detail panel is an item after its row. It renders only the items in
 * view plus overscan, and each row measures its own height.
 *
 * @remarks A closed panel is not an item, so it has no node and it keeps no
 * state. A panel guesses 0 pixels until it measures. A panel that opens or
 * closes in view animates. A panel above the view opens and closes at once,
 * because each frame of its reveal would move the rows in view. The start
 * anchor of the window holds the rows in view still for an insert or a
 * removal above them.
 *
 * Each exposed row carries `aria-rowindex` over the item list. A closing panel
 * is hidden from assistive tech, and it carries no index.
 *
 * @internal
 */
export function GridVirtualizedDetailBody<T>(props: GridVirtualizedDetailBodyProps<T>) {
	const { rows, rowKeys, expansion, visibleColumns: columns, pinning } = props

	const record = useRef(NO_WINDOW_RECORD)

	const expanded = expansion?.expanded ?? NO_KEYS

	const { motions, release } = useGridWindowMotion(
		expanded,
		detailMotionSource,
		record,
		props.scrollRef,
	)

	const rowExpandable = expansion?.rowExpandable

	const items = useMemo(
		() =>
			detailWindowItems({
				rows,
				rowKeys,
				expansion: { expanded, rowExpandable: rowExpandable ?? NEVER_EXPANDABLE },
				motions,
			}),
		[rows, rowKeys, expanded, rowExpandable, motions],
	)

	const { bodyRef, revealEndItem, virtualItems, topSpacer, bottomSpacer, measureRef } =
		useGridItemWindow(items, props, record)

	const onTransitionEnd = (event: TransitionEvent<HTMLTableSectionElement>) => {
		const item = revealEndItem(event)

		if (item?.phase === 'closing') release(rowKeys[item.dataIndex] as string | number)
	}

	const aria = (item: GridDetailWindowItem) =>
		props.gridSemantics && item.position >= 0
			? ariaRowIndex(props.rowIndexOffset, item.position)
			: undefined

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
				const item = items[virtualItem.index] as GridDetailWindowItem

				const row = rows[item.dataIndex] as T

				const rowKey = rowKeys[item.dataIndex] as string | number

				// A prefixed key, because a consumer key can look like a panel key.
				if (item.kind === 'row') {
					return (
						<Fragment key={item.reactKey}>
							{renderGridRow(props, row, item.dataIndex, aria(item), {
								measureRef,
								itemIndex: virtualItem.index,
							})}
						</Fragment>
					)
				}

				return (
					<GridDetailRow
						key={item.reactKey}
						rowKey={rowKey}
						colSpan={columns.length}
						expanded={item.phase === 'open'}
						enter={motions.get(rowKey)?.phase === 'entering'}
						measureRef={measureRef}
						dataIndex={virtualItem.index}
						ariaRowIndex={aria(item)}
					>
						{expansion?.render(row)}
					</GridDetailRow>
				)
			})}
		</GridWindowBody>
	)
}
