'use client'

import type { Row } from '@tanstack/react-table'
import {
	type ComponentProps,
	type RefObject,
	type TransitionEvent,
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
import { GridWindowBody } from './grid-window-body'
import {
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

const NO_ENTERING: ReadonlySet<string> = new Set()

/**
 * The motion state of the windowed grouped body.
 *
 * - `expanded` is the expansion of each group at the last render.
 * - `closing` holds, for each collapsing group, the open keys of the rows that
 *   stay as items until their reveal lands.
 * - `entering` holds the open keys of the rows that mount closed and open over
 *   the transition.
 *
 * @internal
 */
type GroupMotion = {
	expanded: ReadonlyMap<string, boolean>
	closing: ReadonlyMap<string, ReadonlySet<string>>
	entering: ReadonlySet<string>
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
}

/**
 * Applies one group's toggle to the closing and entering sets. A collapse keeps
 * the group's rows that the last window rendered. An expand makes the first
 * rows that fit in one viewport enter. Reduced motion keeps no closing rows and
 * makes no row enter.
 *
 * @internal
 */
function applyGroupToggle<T>(
	group: Row<T>,
	open: boolean,
	sets: { closing: Map<string, ReadonlySet<string>>; entering: Set<string> },
	args: GroupMotionArgs,
): void {
	sets.closing.delete(group.id)

	if (args.reducedMotion) return

	const keys = rowKeysOf(group, args.totalled)

	if (open) {
		// The rows that fit in one viewport. Only these animate open.
		const bound = Math.ceil(args.snapshot.viewport / Math.max(args.rowHeight, 1))

		for (const key of keys.slice(0, bound)) sets.entering.add(key)

		return
	}

	const shown = new Set(keys.filter((key) => args.snapshot.items.has(key)))

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

	const sets = { closing: new Map(motion.closing), entering: new Set(motion.entering) }

	for (const group of groups) {
		const was = motion.expanded.get(group.id)

		const now = expanded.get(group.id) === true

		if (was !== undefined && was !== now) applyGroupToggle(group, now, sets, args)
	}

	return { expanded, ...sets }
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
		entering: NO_ENTERING,
	}))

	const next = nextGroupMotion(motion, groups, {
		totalled: args.totalled,
		reducedMotion,
		snapshot: args.snapshot.current,
		rowHeight: args.rowHeight,
	})

	if (next) setMotion(next)

	// The entering rows mounted in the commit that the expand started. A row that
	// mounts later, as the reader scrolls, mounts open.
	useEffect(() => {
		if (motion.entering.size > 0) setMotion((current) => ({ ...current, entering: NO_ENTERING }))
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

	return { motion, release }
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
 * rendered rows as items until their reveal lands. Each takes a virtual key of
 * its own meanwhile, so the open height stays cached. The React key stays the open key, so
 * each row keeps its node and its transition. An expand makes only the rows
 * that fit in one viewport mount closed and open over the transition. The
 * other rows mount open. Reduced motion keeps neither.
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

	const { motion, release } = useGroupMotion(groups, {
		totalled,
		snapshot,
		rowHeight: window.estimateSize,
	})

	// The engine can keep the group rows when a group toggles, so the list also
	// rebuilds on each new expansion snapshot.
	const { expanded, closing } = motion

	const items = useMemo(() => {
		void expanded

		return groupedWindowItems(groups, { totalled, closing })
	}, [groups, totalled, closing, expanded])

	const { bodyRef, revealEndIndex, virtualItems, topSpacer, bottomSpacer, measureRef } =
		useGridItemWindow(items, window, snapshot)

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
