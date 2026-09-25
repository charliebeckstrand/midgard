'use client'

import { DndContext } from '@dnd-kit/core'
import {
	Children,
	type CSSProperties,
	cloneElement,
	Fragment,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type Ref,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { cn, dataAttr } from '../../core'
import { useControllable, useEscapeLayer, useGrabbingCursor, useResizeObserver } from '../../hooks'
import { k } from '../../recipes/kata/dashboard'
import type { AccessibleName } from '../../types'
import { noop } from '../../utilities'
import type { QueryGroup } from '../query/engine/types'
import {
	type DashboardActions,
	DashboardActionsContext,
	DashboardStoreContext,
	DashboardTileRankContext,
} from './context'
import type { DashboardCommit } from './dashboard-gesture'
import { DashboardPlaceholder } from './dashboard-placeholder'
import { DashboardTile, type DashboardTileProps } from './dashboard-tile'
import { DashboardTiles, type DashboardTilesProps } from './dashboard-tiles'
import {
	type DashboardCell,
	type DashboardLayoutItem,
	DEFAULT_COLUMNS,
	mergeLayout,
	ROW_SUBDIVISION,
	sortByOrder,
} from './engine/dashboard-layout'
import type { DashboardSelection } from './engine/dashboard-scope'
import { createDashboardStore } from './engine/dashboard-store'
import type {
	DashboardFilterBinding,
	DashboardGestureEndEvent,
	DashboardGestureStartEvent,
	DashboardHandle,
	DashboardLayoutBinding,
	DashboardSelectionBinding,
} from './types'
import { useDashboardDrag } from './use-dashboard-drag'
import { useDashboardHandle } from './use-dashboard-handle'
import { useDashboardResize } from './use-dashboard-resize'

/** The default gutter between tiles, in px. */
const DEFAULT_GAP = 12

/** The empty layout, shared so that an unset binding never changes identity. */
const EMPTY_LAYOUT: readonly DashboardLayoutItem[] = []

/** The empty selection list, shared for the same reason. */
const EMPTY_SELECTIONS: readonly DashboardSelection[] = []

/**
 * The inline style of the canvas. Each tile insets half the gutter on each side,
 * so the canvas reaches half a gutter past the container on each side. The outer
 * cards then line up with the content around the dashboard. The row unit divides
 * that wider span, so a row stays a quarter of the column pitch.
 */
function canvasStyle(columns: number, gap: number): CSSProperties {
	return {
		margin: -gap / 2,
		gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
		gridAutoRows: `calc((100cqi + ${gap}px) / ${columns * ROW_SUBDIVISION})`,
		['--dashboard-gap' as string]: `${gap}px`,
		['--dashboard-columns' as string]: columns,
	}
}

/** Whether a child is a `DashboardTile` element, which the reading order can place. */
function isTileElement(child: unknown): child is ReactElement<DashboardTileProps> {
	return isValidElement<DashboardTileProps>(child) && child.type === DashboardTile
}

/** Whether a child is a `DashboardTiles` element, whose spec tiles the board can name. */
function isSpecTilesElement(child: unknown): child is ReactElement<DashboardTilesProps> {
	return isValidElement<DashboardTilesProps>(child) && child.type === DashboardTiles
}

/**
 * The children in one flat list, through each Fragment. Each element takes a key
 * that is unique in the list, and that stays with the element.
 *
 * @remarks
 * `Children.toArray` escapes each key, so a key of the app never meets the key
 * of an index. A Fragment adds its own key to the key of each child. A keyed
 * Fragment therefore keeps the state of its children when it moves.
 */
function flattenBoardChildren(children: ReactNode, prefix = ''): ReactNode[] {
	return Children.toArray(children).flatMap((child) => {
		if (!isValidElement(child)) return [child]

		const key = `${prefix}${child.key}`

		// `Children.toArray` escapes each colon in a key of the app, and each of its keys
		// starts with a period. Thus a colon meets a period only at the join of a Fragment path.
		if (child.type === Fragment) {
			return flattenBoardChildren((child.props as { children?: ReactNode }).children, `${key}:`)
		}

		return [cloneElement(child, { key })]
	})
}

/**
 * The ids of the tiles that the children declare: each `DashboardTile` child,
 * also inside a Fragment, and each spec tile of a `DashboardTiles` child. A
 * component that renders a tile hides its id from the board. The same limit
 * keeps that component in its own slot of the reading order.
 */
function declaredTiles(children: ReactNode): Set<string> {
	const ids = new Set<string>()

	for (const node of flattenBoardChildren(children)) {
		if (isTileElement(node)) ids.add(node.props.id)

		if (isSpecTilesElement(node)) for (const tile of node.props.tiles) ids.add(tile.id)
	}

	return ids
}

/**
 * The children with each `DashboardTile` in reading order, also a tile inside a
 * Fragment. The tiles trade their slots among themselves, and each other child
 * keeps its slot. Each tile takes a key from its id, so a move keeps its state.
 * React focuses a moved element again after the commit, so a move keeps the focus too.
 *
 * @remarks
 * The children flatten through each Fragment, and each other element takes a key
 * from its Fragment path. A component that renders a tile keeps its own slot.
 *
 * Each element goes inside a rank provider with its slot in the markup, and not
 * with the slot that the reading order gives it. A tile with no entry thus takes
 * its row in markup order.
 */
function inReadingOrder(children: ReactNode, order: readonly string[]): ReactNode[] {
	const items = flattenBoardChildren(children)

	const slots = items.flatMap((child, index) => (isTileElement(child) ? [index] : []))

	// The markup slot of each tile, in reading order.
	const sources = sortByOrder(
		slots,
		order,
		(slot) => (items[slot] as ReactElement<DashboardTileProps>).props.id,
	)

	// The markup slot of the element that each slot of the result holds.
	const from = new Map(slots.map((slot, index) => [slot, sources[index] ?? slot]))

	return items.map((_, index) => {
		const slot = from.get(index) ?? index

		const child = items[slot]

		if (!isValidElement(child)) return child

		const tile = isTileElement(child)

		const key = tile ? `tile:${child.props.id}` : child.key

		return (
			<DashboardTileRankContext key={key} value={[slot, 0]}>
				{tile ? cloneElement(child, { key }) : child}
			</DashboardTileRankContext>
		)
	})
}

/**
 * Props for {@link Dashboard}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), because the dashboard is a landmark region.
 */
export type DashboardProps = AccessibleName & {
	/**
	 * The saved layout. It fires once for each committed change: a drop, a pointer
	 * resize, a keyboard resize step, or a tidy that moves a tile. Omit it to let
	 * the dashboard hold the layout, and each tile with no entry takes a new row.
	 * Apply each value in the same event, as {@link DashboardLayoutBinding} says.
	 */
	layout?: DashboardLayoutBinding
	/** The filter that the app owns. The tiles read it through the scope hooks. */
	filter?: DashboardFilterBinding
	/**
	 * The cross-filter selections that the tiles make. Bind it to save or reset
	 * them. Read a saved value through `parseDashboardSelection`, which drops each
	 * malformed selection.
	 */
	selection?: DashboardSelectionBinding
	/**
	 * Edit mode. The column guides show, each tile gets a drag grip and resize
	 * splitters, and the content of each tile goes inert. Edit mode never changes
	 * a tile size, so no widget re-lays out on the switch. While the responsive
	 * projection is on screen, edit mode stands down, because a gesture edits the
	 * saved layout and not the re-pack. When edit mode ends or stands down, or when
	 * the board unmounts, a live drag or resize ends as canceled.
	 * @defaultValue false
	 */
	editing?: boolean
	/**
	 * The column count. The default divides into halves, thirds, quarters, sixths,
	 * and eighths. A saved entry that does not fit the count clamps into it. When
	 * the clamp puts a tile on another tile, the tile takes a new row under the
	 * lowest tile. The next commit saves that place.
	 * @defaultValue 24
	 */
	columns?: number
	/**
	 * The gutter between tiles, in px. Each tile insets half of it on each side.
	 * @defaultValue 12
	 */
	gap?: number
	/** Receives the start of each drag. */
	onDragStart?: (event: DashboardGestureStartEvent) => void
	/** Receives the end of each drag, with `canceled` when it changed nothing. */
	onDragEnd?: (event: DashboardGestureEndEvent) => void
	/** Receives the start of each pointer resize. */
	onResizeStart?: (event: DashboardGestureStartEvent) => void
	/** Receives the end of each pointer resize, with `canceled` when it changed nothing. */
	onResizeEnd?: (event: DashboardGestureEndEvent) => void
	/** Receives each error that a tile boundary catches, for a log or a report. */
	onTileError?: (id: string, error: unknown) => void
	/** Receives the commands of the board, such as {@link DashboardHandle.tidy}. */
	ref?: Ref<DashboardHandle>
	className?: string
	/**
	 * The tiles: `DashboardTile` elements and `DashboardTiles`, in any order. The
	 * board renders the tiles in reading order, by row and then by column. In
	 * edit mode the markup holds still, and the new order takes effect when edit
	 * mode ends.
	 *
	 * @remarks
	 * The order reaches each `DashboardTile` child, also inside a Fragment. A
	 * component that renders a tile keeps its own slot. `DashboardTiles` orders
	 * only its own tiles, so a board with JSX tiles and spec tiles orders each group apart.
	 *
	 * The tiles with no layout entry take their new rows in markup order. That
	 * order reads the children, then the `tiles` of each `DashboardTiles`. The
	 * tiles that one component renders take their rows in mount order.
	 */
	children?: ReactNode
}

/**
 * A board of tiles that arranges widgets and shares one filter scope between
 * them. The dashboard imports no widget, and no widget needs dashboard code:
 * each `DashboardTile` owns its chrome, and the scope hooks carry the filter.
 *
 * The board never moves a tile by itself. A drag moves a tile into free cells,
 * or it reorders it against an equal tile. Else the tile snaps to the nearest
 * free cell, and a drop changes nothing only when that cell is its start cell.
 * A resize grows a tile until it meets a neighbor or an edge. What you save is
 * what renders, gaps included. To close the gaps, call `tidy` on the `ref`
 * ({@link DashboardHandle}).
 *
 * One gesture owns the board at a time, so the board refuses a second gesture
 * until the first one ends. Escape cancels a live gesture, and a dialog, sheet,
 * or drawer around the board stays open.
 *
 * The board is a CSS grid whose rows follow the container width. The server
 * therefore renders each tile at its saved cell, with no measurement. When the
 * container renders a tile under its `minWidth`, the board paints a re-pack of
 * the same layout, and it never saves the re-pack.
 *
 * The re-pack holds for 24 px past the width at which each tile fits. A classic
 * scrollbar up to 24 px wide that comes and goes with the re-pack therefore
 * cannot switch the board on each frame. A wider scrollbar, such as a styled
 * `::-webkit-scrollbar`, can switch it. Give such a scroll box
 * `scrollbar-gutter: stable`.
 *
 * @example
 * ```tsx
 * <Dashboard aria-label="Sales" editing={editing} layout={{ value: layout, onValueChange: setLayout }}>
 *   <DashboardTile id="revenue" title="Revenue" ratio={16 / 9}>
 *     <RevenueChart />
 *   </DashboardTile>
 * </Dashboard>
 * ```
 */
export function Dashboard({
	layout,
	filter,
	selection,
	editing = false,
	columns = DEFAULT_COLUMNS,
	gap = DEFAULT_GAP,
	onDragStart,
	onDragEnd,
	onResizeStart,
	onResizeEnd,
	onTileError,
	ref,
	className,
	children,
	...label
}: DashboardProps) {
	const [layoutValue, setLayoutValue] = useControllable<DashboardLayoutItem[]>({
		value: layout?.value,
		defaultValue: layout?.defaultValue,
		onValueChange: (next) => layout?.onValueChange?.(next ?? []),
	})

	const [filterValue, setFilterValue] = useControllable<QueryGroup>({
		value: filter?.value,
		defaultValue: filter?.defaultValue,
		onValueChange: (next) => {
			if (next != null) filter?.onValueChange?.(next)
		},
	})

	const [selectionValue, setSelectionValue] = useControllable<DashboardSelection[]>({
		value: selection?.value,
		defaultValue: selection?.defaultValue,
		onValueChange: (next) => selection?.onValueChange?.(next ?? []),
	})

	const [store] = useState(() =>
		createDashboardStore({
			columns,
			gap,
			editing,
			layout: layoutValue ?? EMPTY_LAYOUT,
			demands: new Map(),
			// Until the first tile registers, as on the server, the store counts these tiles as on the board.
			declared: declaredTiles(children),
			width: 0,
			gesture: null,
			filter: filterValue,
			selections: selectionValue ?? EMPTY_SELECTIONS,
		}),
	)

	// On an unmount, this cleanup runs first and closes the store, so each tile that
	// unregisters after it wakes no reader. When the effects mount again, as under
	// StrictMode, the tiles register before the board, and the open catches up.
	useLayoutEffect(() => {
		store.open()

		return store.close
	}, [store])

	useLayoutEffect(() => store.setState({ columns, gap, editing }), [store, columns, gap, editing])

	// A commit bumps this count. The effect below writes each new layout into the
	// store. After a commit, the same write also ends the settle phase. The render
	// then holds the committed layout, or the layout that stays when a controlled
	// app declined it.
	const [settled, setSettled] = useState(0)

	const handled = useRef(0)

	useLayoutEffect(() => {
		const settling = settled !== handled.current

		handled.current = settled

		store.setState({ layout: layoutValue ?? EMPTY_LAYOUT, ...(settling ? { gesture: null } : {}) })
	}, [store, settled, layoutValue])

	useLayoutEffect(() => store.setState({ filter: filterValue }), [store, filterValue])

	useLayoutEffect(
		() => store.setState({ selections: selectionValue ?? EMPTY_SELECTIONS }),
		[store, selectionValue],
	)

	const controlled = layout?.value !== undefined

	const commit = useCallback(
		(cells: readonly DashboardCell[]): DashboardCommit => {
			const { layout: saved, demands } = store.getState()

			const next = mergeLayout(saved, cells, demands)

			// The count goes up first, so an onValueChange that throws still ends the settle phase.
			setSettled((count) => count + 1)

			try {
				setLayoutValue(next)
			} catch (error) {
				// useControllable writes its own state before it calls onValueChange. So an
				// uncontrolled board keeps the layout, and a controlled board keeps its value.
				return controlled
					? { layout: saved, kept: false, failure: { error } }
					: { layout: next, kept: true, failure: { error } }
			}

			return { layout: next, kept: true }
		},
		[store, setLayoutValue, controlled],
	)

	const canvasRef = useRef<HTMLDivElement>(null)

	// The canvas is the measured box: it spans the container plus the two outer
	// half-gutters, so its width divides into the true column pitch.
	useResizeObserver(canvasRef, () => {
		const width = canvasRef.current?.clientWidth ?? 0

		if (width !== store.getState().width) store.setState({ width })
	})

	const { context: dndContextProps, cancelDrag } = useDashboardDrag({
		store,
		canvasRef,
		commit,
		onDragStart,
		onDragEnd,
	})

	const { beginResize, resizeBy, cancelResize } = useDashboardResize({
		store,
		canvasRef,
		commit,
		onResizeStart,
		onResizeEnd,
	})

	useDashboardHandle({ ref, store, commit })

	const reporter = useRef(onTileError)

	reporter.current = onTileError

	const actions = useMemo<DashboardActions>(
		() => ({
			beginResize,
			resizeBy,
			cancelResize,
			setFilter: (next) => setFilterValue(next),
			updateSelections: (update) => setSelectionValue((current) => update(current ?? [])),
			reportError: (id, error) => reporter.current?.(id, error),
		}),
		[beginResize, resizeBy, cancelResize, setFilterValue, setSelectionValue],
	)

	// The root reads flags only, so a preview never renders the root again.
	const readEditable = () => store.getView().editable

	const editable = useSyncExternalStore(store.subscribe, readEditable, readEditable)

	// The store gesture owns the drag. The dnd-kit drag of a tile can outlive the
	// gesture after an edit exit, and the tile can unmount before the drag ends.
	const readDragging = () => store.getState().gesture?.kind === 'drag'

	const dragging = useSyncExternalStore(store.subscribe, readDragging, readDragging)

	// The layer only takes the press from the surfaces under it. dnd-kit cancels the drag.
	useEscapeLayer({ open: dragging, onDismiss: noop })

	// dnd-kit sets no cursor, so the element under the pointer sets it. The rule
	// holds the closed hand on the whole page until the drop or the cancel.
	useGrabbingCursor(dragging)

	// A gesture needs edit mode, and its listeners outlive the splitter and the
	// board. So an edit exit or an unmount ends a live gesture as canceled.
	useLayoutEffect(() => {
		const cancel = () => {
			cancelResize()

			cancelDrag()
		}

		if (!editable) cancel()

		return cancel
	}, [editable, cancelResize, cancelDrag])

	const readOrder = () => store.getView().order

	const order = useSyncExternalStore(store.subscribe, readOrder, readOrder)

	const tiles = useMemo(() => inReadingOrder(children, order), [children, order])

	return (
		<DashboardStoreContext value={store}>
			<DashboardActionsContext value={actions}>
				<DndContext {...dndContextProps}>
					<section
						data-slot="dashboard"
						data-editing={dataAttr(editable)}
						// The focus lands here when a remove takes away the last tile.
						tabIndex={-1}
						{...label}
						className={cn('@container w-full', className)}
					>
						<div
							ref={canvasRef}
							data-slot="dashboard-canvas"
							style={canvasStyle(columns, gap)}
							className={cn(k.canvas({ editable }))}
						>
							{tiles}

							<DashboardPlaceholder />
						</div>
					</section>
				</DndContext>
			</DashboardActionsContext>
		</DashboardStoreContext>
	)
}
