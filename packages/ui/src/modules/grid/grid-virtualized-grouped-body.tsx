'use client'

import type { Row } from '@tanstack/react-table'
import {
	type ComponentProps,
	type RefObject,
	type TransitionEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { PaletteColor } from '../../core/recipe'
import { useMediaQuery } from '../../hooks/use-media-query'
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
import { GridWindowBody, GridWindowDropRow } from './grid-window-body'
import {
	aboveViewport,
	type GridItemWindowOptions,
	type GridWindowSnapshot,
	NO_WINDOW_SNAPSHOT,
	useGridItemWindow,
} from './use-grid-item-window'
import type { GridRowGroupPresentation } from './use-grid-row-manager'

/**
 * The time in milliseconds after which closing rows leave the item list, if no
 * reveal lands first. A row that leaves the window while it closes sends no
 * `transitionend`. The reveal itself takes 200 ms.
 */
const RELEASE_FALLBACK_MS = 1000

const NO_CLOSING: ReadonlyMap<string, ReadonlySet<string>> = new Map()

const NO_KEYS: ReadonlySet<string> = new Set()

/**
 * The motion state of the windowed grouped body.
 *
 * - `expanded` is the expansion of each group at the last render.
 * - `closing` holds, for each collapsing group, the open keys of the rows that
 *   stay as items until their reveal lands.
 * - `dropping` holds the ids of the collapsed groups whose other rows drop in
 *   the next commit (see `useGridItemWindow`).
 * - `entering` holds the open keys of the rows that mount closed and open over
 *   the transition.
 * - `anchoring` asks the window to hold the first row in view still, because an
 *   expand can insert rows above it.
 *
 * @internal
 */
type GroupMotion = {
	expanded: ReadonlyMap<string, boolean>
	closing: ReadonlyMap<string, ReadonlySet<string>>
	dropping: ReadonlySet<string>
	entering: ReadonlySet<string>
	anchoring: boolean
}

/** The sets that {@link applyGroupToggle} writes. @internal */
type GroupMotionSets = {
	closing: Map<string, ReadonlySet<string>>
	dropping: Set<string>
	entering: Set<string>
}

/** The expansion of each group, by group id. @internal */
function expansionOf<T>(groups: Row<T>[]): Map<string, boolean> {
	return new Map(groups.map((group) => [group.id, group.getIsExpanded()]))
}

/** The open keys of a group's rows, in display order: its leaves, then its total. @internal */
function rowKeysOf<T>(group: Row<T>, totalled: boolean): string[] {
	const keys = group.subRows.map((leaf) => leafItemKey(leaf.id))

	if (totalled) keys.push(totalItemKey(group.id))

	return keys
}

/** What {@link nextGroupMotion} reads besides the state and the groups. @internal */
type GroupMotionArgs = {
	totalled: boolean
	reducedMotion: boolean
	snapshot: GridWindowSnapshot
	rowHeight: number
	/** Whether the item with a key ended above the viewport in the last commit. */
	above: (key: string) => boolean
}

/** Whether the rendered item with `key` started at or below the visible top edge. @internal */
function inView(snapshot: GridWindowSnapshot, key: string): boolean {
	const item = snapshot.items.get(key)

	return item != null && item.start >= snapshot.viewTop
}

/**
 * Applies one group's toggle to the motion sets.
 *
 * - A collapse keeps the group's rows in view as closing rows. Every other row
 *   drops, so a row above the viewport goes to 0 pixels before it leaves.
 * - An expand below the viewport top makes the first rows that fit in one
 *   viewport enter.
 * - An expand of a group whose header is above the viewport inserts its rows
 *   above the viewport. They do not animate, and the anchor step of the window
 *   holds the rows in view still.
 * - Reduced motion keeps no closing rows and makes no row enter.
 *
 * @internal
 */
function applyGroupToggle<T>(
	group: Row<T>,
	open: boolean,
	sets: GroupMotionSets,
	args: GroupMotionArgs,
): void {
	sets.closing.delete(group.id)

	sets.dropping.delete(group.id)

	const keys = rowKeysOf(group, args.totalled)

	if (open) {
		if (args.reducedMotion || args.above(`group:${group.id}`)) return

		// The rows that fit in one viewport. Only these animate open.
		const bound = Math.ceil(args.snapshot.viewport / Math.max(args.rowHeight, 1))

		for (const key of keys.slice(0, bound)) sets.entering.add(key)

		return
	}

	sets.dropping.add(group.id)

	if (args.reducedMotion) return

	const shown = new Set(keys.filter((key) => inView(args.snapshot, key)))

	if (shown.size > 0) sets.closing.set(group.id, shown)
}

/**
 * Finds the next motion state from a change in group expansion, or `null` when
 * no group changed. See {@link applyGroupToggle} for each toggle.
 *
 * @internal
 */
function nextGroupMotion<T>(
	motion: GroupMotion,
	groups: Row<T>[],
	args: GroupMotionArgs,
): GroupMotion | null {
	const expanded = expansionOf(groups)

	const changed =
		expanded.size !== motion.expanded.size ||
		groups.some((group) => motion.expanded.get(group.id) !== expanded.get(group.id))

	if (!changed) return null

	const sets: GroupMotionSets = {
		closing: new Map(motion.closing),
		dropping: new Set(motion.dropping),
		entering: new Set(motion.entering),
	}

	for (const group of groups) {
		const was = motion.expanded.get(group.id)

		const now = expanded.get(group.id) === true

		if (was !== undefined && was !== now) applyGroupToggle(group, now, sets, args)
	}

	// An expand can insert rows above the first row in view.
	const anchoring = groups.some(
		(group) => motion.expanded.get(group.id) === false && expanded.get(group.id) === true,
	)

	return { expanded, ...sets, anchoring: motion.anchoring || anchoring }
}

/**
 * Tracks the collapse and expand motion of the windowed grouped body. It
 * adjusts its state during render, so the commit that a toggle starts already
 * holds the closing rows and the entering rows.
 *
 * @internal
 */
function useGroupMotion<T>(
	groups: Row<T>[],
	args: { totalled: boolean; snapshot: RefObject<GridWindowSnapshot>; rowHeight: number },
) {
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

	const [motion, setMotion] = useState<GroupMotion>(() => ({
		expanded: expansionOf(groups),
		closing: NO_CLOSING,
		dropping: NO_KEYS,
		entering: NO_KEYS,
		anchoring: false,
	}))

	const next = nextGroupMotion(motion, groups, {
		totalled: args.totalled,
		reducedMotion,
		snapshot: args.snapshot.current,
		rowHeight: args.rowHeight,
		above: aboveViewport(args.snapshot.current),
	})

	if (next) setMotion(next)

	// The entering rows mounted in the commit that the expand started. A row that
	// mounts later, as the reader scrolls, mounts open.
	useEffect(() => {
		if (motion.entering.size > 0) setMotion((current) => ({ ...current, entering: NO_KEYS }))
	}, [motion.entering])

	// A closing row that left the window sends no `transitionend`.
	useEffect(() => {
		if (motion.closing.size === 0) return

		const timer = setTimeout(
			() => setMotion((current) => ({ ...current, closing: NO_CLOSING })),
			RELEASE_FALLBACK_MS,
		)

		return () => clearTimeout(timer)
	}, [motion.closing])

	const release = (groupId: string) =>
		setMotion((current) => {
			if (!current.closing.has(groupId)) return current

			const closing = new Map(current.closing)

			closing.delete(groupId)

			return { ...current, closing }
		})

	const dropped = useCallback(() => setMotion((current) => ({ ...current, dropping: NO_KEYS })), [])

	const anchored = useCallback(() => setMotion((current) => ({ ...current, anchoring: false })), [])

	return { motion, release, dropped, anchored }
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
 * the group goes through the drop step of `useGridItemWindow`. A row above the
 * viewport then goes to 0 pixels before it leaves, so the rows in view hold
 * still.
 *
 * An expand makes only the rows that fit in one viewport mount closed and open
 * over the transition. The other rows mount open. An expand also runs the
 * anchor step, so rows inserted above the viewport do not move the rows in
 * view. Reduced motion keeps no closing rows and makes no row enter.
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
	const snapshot = useRef(NO_WINDOW_SNAPSHOT)

	const { motion, release, dropped, anchored } = useGroupMotion(groups, {
		totalled,
		snapshot,
		rowHeight: window.estimateSize,
	})

	// The engine can keep the group rows when a group toggles, so the list also
	// rebuilds on each new expansion snapshot.
	const { expanded, closing, dropping, anchoring } = motion

	const items = useMemo(() => {
		void expanded

		return groupedWindowItems(groups, { totalled, closing, dropping })
	}, [groups, totalled, closing, dropping, expanded])

	const { bodyRef, revealEndIndex, virtualItems, topSpacer, bottomSpacer, measureRef } =
		useGridItemWindow(items, window, snapshot, {
			dropped: dropping.size > 0 ? dropped : null,
			anchored: anchoring ? anchored : null,
		})

	const colorOf = (group: Row<T>) =>
		presentation?.color(group.getGroupingValue(String(columnId)) as string | number)

	const onTransitionEnd = (event: TransitionEvent<HTMLTableSectionElement>) => {
		const index = revealEndIndex(event)

		const item = index == null ? undefined : items[index]

		if (item && item.kind !== 'group' && item.closing) release(item.group.id)
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

				if (item.dropping) {
					return (
						<GridWindowDropRow
							key={item.reactKey}
							dataIndex={virtualItem.index}
							colSpan={columns.length}
						/>
					)
				}

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
							expanded={!item.closing}
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
						{...leafProps(item.leaf, !item.closing, color)}
						enter={motion.entering.has(item.reactKey)}
						measureRef={measureRef}
						dataIndex={virtualItem.index}
						ariaRowIndex={aria(item)}
					/>
				)
			})}
		</GridWindowBody>
	)
}
