'use client'

import {
	Fragment,
	type TransitionEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useMediaQuery } from '../../hooks/use-media-query'
import { detailWindowItems, type GridDetailWindowItem } from './engine/grid-items/items'
import { ariaRowIndex } from './engine/grid-row/shell'
import { GridDetailRow } from './grid-detail-row'
import { type GridRowsProps, renderGridRow } from './grid-row'
import { GridWindowBody, GridWindowDropRow } from './grid-window-body'
import {
	type GridItemWindowOptions,
	type GridWindowSnapshot,
	NO_WINDOW_SNAPSHOT,
	useGridItemWindow,
} from './use-grid-item-window'

/**
 * The time in milliseconds after which a closing panel leaves the item list, if
 * no reveal lands first. A panel that leaves the window while it closes sends
 * no `transitionend`. The reveal itself takes 200 ms.
 */
const RELEASE_FALLBACK_MS = 1000

const NO_KEYS: ReadonlySet<string | number> = new Set()

/** The expandability of a row when the grid has no master-detail wiring. @internal */
const NEVER_EXPANDABLE = () => false

/**
 * The motion state of the windowed master-detail body.
 *
 * - `expanded` is the expanded-key set at the last render.
 * - `closing` holds the row keys of the panels that stay as items until their
 *   reveal lands.
 * - `dropping` holds the row keys of the panels that close at once. Each stays
 *   as an item for one commit, which sets its height to 0 and then drops it.
 * - `entering` holds the row keys of the panels that mount closed and open
 *   over the transition.
 *
 * @internal
 */
type DetailMotion = {
	expanded: ReadonlySet<string | number>
	closing: ReadonlySet<string | number>
	dropping: ReadonlySet<string | number>
	entering: ReadonlySet<string | number>
}

/**
 * Whether the rendered item with `key` has its `edge` at or below the visible
 * top edge. A change in the height of such an item does not move the offset.
 *
 * @internal
 */
function inView(snapshot: GridWindowSnapshot, key: string, edge: 'start' | 'end'): boolean {
	const item = snapshot.items.get(key)

	return item != null && item[edge] >= snapshot.viewTop
}

/** Whether two key sets hold the same keys. @internal */
function sameKeys(a: ReadonlySet<string | number>, b: ReadonlySet<string | number>): boolean {
	return a.size === b.size && [...a].every((key) => b.has(key))
}

/**
 * Finds the next motion state from a change in the expanded-key set, or `null`
 * when the set did not change. A panel that closes in view stays as an item
 * until its reveal lands. A panel that opens in view mounts closed and opens
 * over the transition. A panel above the viewport, or any panel under reduced
 * motion, opens and closes at once.
 *
 * @internal
 */
function nextDetailMotion(
	motion: DetailMotion,
	expanded: ReadonlySet<string | number>,
	args: { reducedMotion: boolean; snapshot: GridWindowSnapshot },
): DetailMotion | null {
	if (expanded === motion.expanded) return null

	const closing = new Set(motion.closing)

	const dropping = new Set(motion.dropping)

	const entering = new Set(motion.entering)

	// The panel animates only in view and without reduced motion.
	const animates = (key: string, edge: 'start' | 'end') =>
		!args.reducedMotion && inView(args.snapshot, key, edge)

	for (const key of motion.expanded) {
		if (expanded.has(key)) continue

		;(animates(`detail:${key}`, 'start') ? closing : dropping).add(key)
	}

	for (const key of expanded) {
		if (motion.expanded.has(key)) continue

		closing.delete(key)

		dropping.delete(key)

		// The panel starts at the end of its data row.
		if (animates(`row:${key}`, 'end')) entering.add(key)
	}

	// A new set with the same keys keeps the old state objects, so the item list
	// does not rebuild.
	return {
		expanded,
		closing: sameKeys(closing, motion.closing) ? motion.closing : closing,
		dropping: sameKeys(dropping, motion.dropping) ? motion.dropping : dropping,
		entering: sameKeys(entering, motion.entering) ? motion.entering : entering,
	}
}

/**
 * Tracks the open and close motion of the windowed master-detail body. It
 * adjusts its state during render, so the commit that a toggle starts already
 * holds the closing panels and the entering panels.
 *
 * @internal
 */
function useDetailMotion(
	expanded: ReadonlySet<string | number>,
	snapshot: { current: GridWindowSnapshot },
) {
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

	const [motion, setMotion] = useState<DetailMotion>(() => ({
		expanded,
		closing: NO_KEYS,
		dropping: NO_KEYS,
		entering: NO_KEYS,
	}))

	const next = nextDetailMotion(motion, expanded, { reducedMotion, snapshot: snapshot.current })

	if (next) setMotion(next)

	// The entering panels mounted in the commit that the toggle started.
	useEffect(() => {
		if (motion.entering.size > 0) setMotion((current) => ({ ...current, entering: NO_KEYS }))
	}, [motion.entering])

	// A closing panel that left the window sends no `transitionend`.
	useEffect(() => {
		if (motion.closing.size === 0) return

		const timer = setTimeout(
			() => setMotion((current) => ({ ...current, closing: NO_KEYS })),
			RELEASE_FALLBACK_MS,
		)

		return () => clearTimeout(timer)
	}, [motion.closing])

	const release = (key: string | number) =>
		setMotion((current) => {
			if (!current.closing.has(key)) return current

			const closing = new Set(current.closing)

			closing.delete(key)

			return { ...current, closing }
		})

	const dropped = useCallback(() => setMotion((current) => ({ ...current, dropping: NO_KEYS })), [])

	return { motion, release, dropped }
}

/** Props for {@link GridVirtualizedDetailBody}. @internal */
type GridVirtualizedDetailBodyProps<T> = GridRowsProps<T> & GridItemWindowOptions

/**
 * The master-detail body over a measured window. Each data row is an item, and
 * each open detail panel is an item after its row. It renders only the items in
 * view plus overscan, and each row measures its own height.
 *
 * @remarks A closed panel is not an item, so it has no node and it keeps no
 * state. A panel guesses 0 pixels until it measures. A panel that opens above
 * the viewport is an insert, which does not move the scroll offset. The resize
 * that follows its first measurement moves it. A panel that opens or closes
 * in view animates. A panel above the viewport opens and closes at once, because
 * each frame of its reveal would move the rows in view.
 *
 * A removal is not a resize either. A panel that closes at once therefore stays
 * as a dropping item for one commit. The drop step of `useGridItemWindow` sets
 * it to 0 pixels before it leaves. The panel renders as an empty row in
 * that commit, so no reveal starts.
 *
 * Each exposed row carries `aria-rowindex` over the item list. A closing panel
 * is hidden from assistive tech, and it carries no index.
 *
 * @internal
 */
export function GridVirtualizedDetailBody<T>(props: GridVirtualizedDetailBodyProps<T>) {
	const { rows, rowKeys, expansion, visibleColumns: columns, pinning } = props

	const snapshot = useRef(NO_WINDOW_SNAPSHOT)

	const expanded = expansion?.expanded ?? NO_KEYS

	const { motion, release, dropped } = useDetailMotion(expanded, snapshot)

	const rowExpandable = expansion?.rowExpandable

	const items = useMemo(
		() =>
			detailWindowItems({
				rows,
				rowKeys,
				expansion: { expanded, rowExpandable: rowExpandable ?? NEVER_EXPANDABLE },
				closing: motion.closing,
				dropping: motion.dropping,
			}),
		[rows, rowKeys, expanded, rowExpandable, motion.closing, motion.dropping],
	)

	const { bodyRef, revealEndIndex, virtualItems, topSpacer, bottomSpacer, measureRef } =
		useGridItemWindow(items, props, snapshot, {
			dropped: motion.dropping.size > 0 ? dropped : null,
			anchored: null,
		})

	const onTransitionEnd = (event: TransitionEvent<HTMLTableSectionElement>) => {
		const index = revealEndIndex(event)

		const item = index == null ? undefined : items[index]

		if (item?.closing && !item.dropping) release(rowKeys[item.dataIndex] as string | number)
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

				if (item.dropping) {
					return (
						<GridWindowDropRow
							key={item.reactKey}
							dataIndex={virtualItem.index}
							colSpan={columns.length}
						/>
					)
				}

				return (
					<GridDetailRow
						key={item.reactKey}
						rowKey={rowKey}
						colSpan={columns.length}
						expanded={!item.closing}
						enter={motion.entering.has(rowKey)}
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
