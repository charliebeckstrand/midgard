'use client'

import { DndContext } from '@dnd-kit/core'
import {
	Children,
	type CSSProperties,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { cn, dataAttr } from '../../core'
import { useControllable, useResizeObserver } from '../../hooks'
import { k } from '../../recipes/kata/dashboard'
import type { AccessibleName } from '../../types'
import type { QueryGroup } from '../query/engine/types'
import { type DashboardActions, DashboardActionsContext, DashboardStoreContext } from './context'
import { DashboardPlaceholder } from './dashboard-placeholder'
import { DashboardTile, type DashboardTileProps } from './dashboard-tile'
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
	DashboardLayoutBinding,
	DashboardSelectionBinding,
} from './types'
import { useDashboardDrag } from './use-dashboard-drag'
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

/**
 * The children with each direct `DashboardTile` in reading order. The tiles
 * trade their slots among themselves, and each other child keeps its slot. Each
 * tile takes a key from its id, so a move keeps its state. React focuses a moved
 * element again after the commit, so a move keeps the focus too.
 */
function inReadingOrder(children: ReactNode, order: readonly string[]): ReactNode[] {
	const items = Children.toArray(children)

	const slots = items.flatMap((child, index) => (isTileElement(child) ? [index] : []))

	const tiles = sortByOrder(
		slots.map((slot) => items[slot] as ReactElement<DashboardTileProps>),
		order,
		(tile) => tile.props.id,
	)

	slots.forEach((slot, index) => {
		const tile = tiles[index]

		if (tile !== undefined) items[slot] = cloneElement(tile, { key: `tile:${tile.props.id}` })
	})

	return items
}

/**
 * Props for {@link Dashboard}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), because the dashboard is a landmark region.
 */
export type DashboardProps = AccessibleName & {
	/**
	 * The saved layout. It fires once for each committed gesture. Omit it to let the
	 * dashboard hold the layout, and each tile with no entry takes a new row.
	 */
	layout?: DashboardLayoutBinding
	/** The filter that the app owns. The tiles read it through the scope hooks. */
	filter?: DashboardFilterBinding
	/** The cross-filter selections that the tiles make. Bind it to save or reset them. */
	selection?: DashboardSelectionBinding
	/**
	 * Edit mode. The column guides show, each tile gets a drag grip and resize
	 * splitters, and the content of each tile goes inert. Edit mode never changes
	 * a tile size, so no widget re-lays out on the switch. While the responsive
	 * projection is on screen, edit mode stands down, because a gesture edits the
	 * saved layout and not the re-pack.
	 * @defaultValue false
	 */
	editing?: boolean
	/**
	 * The column count. The default divides into halves, thirds, quarters, sixths,
	 * and eighths.
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
	className?: string
	/**
	 * The tiles: `DashboardTile` elements and `DashboardTiles`, in any order. The
	 * board renders the tiles in reading order, by row and then by column. In
	 * edit mode the markup holds still, and the new order takes effect when edit
	 * mode ends.
	 */
	children?: ReactNode
}

/**
 * A board of tiles that arranges widgets and shares one filter scope between
 * them. The dashboard imports no widget, and no widget needs dashboard code:
 * each `DashboardTile` owns its chrome, and the scope hooks carry the filter.
 *
 * The board never moves a tile by itself. A drag moves a tile into free cells,
 * or it reorders it against an equal tile; anything else is blocked. A resize
 * grows a tile until it meets a neighbour or an edge. What you save is what
 * renders, gaps included.
 *
 * The board is a CSS grid whose rows follow the container width. The server
 * therefore renders each tile at its saved cell, with no measurement. When the
 * container renders a tile under its `minWidth`, the board paints a re-pack of
 * the same layout, and it never saves the re-pack.
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
			width: 0,
			gesture: null,
			filter: filterValue,
			selections: selectionValue ?? EMPTY_SELECTIONS,
		}),
	)

	useLayoutEffect(() => store.setState({ columns, gap, editing }), [store, columns, gap, editing])

	useLayoutEffect(
		() => store.setState({ layout: layoutValue ?? EMPTY_LAYOUT }),
		[store, layoutValue],
	)

	useLayoutEffect(() => store.setState({ filter: filterValue }), [store, filterValue])

	useLayoutEffect(
		() => store.setState({ selections: selectionValue ?? EMPTY_SELECTIONS }),
		[store, selectionValue],
	)

	// A commit bumps this count. The effect below ends the settle phase once the
	// committed layout has arrived — or, for a controlled layout that the app
	// declined, once the render shows that it did not change.
	const [settled, setSettled] = useState(0)

	const handled = useRef(0)

	useLayoutEffect(() => {
		if (settled === handled.current) return

		handled.current = settled

		store.setState({ layout: layoutValue ?? EMPTY_LAYOUT, gesture: null })
	}, [store, settled, layoutValue])

	const commit = useCallback(
		(cells: readonly DashboardCell[]) => {
			const { layout: saved, demands } = store.getState()

			const next = mergeLayout(saved, cells, demands)

			setLayoutValue(next)

			setSettled((count) => count + 1)

			return next
		},
		[store, setLayoutValue],
	)

	const containerRef = useRef<HTMLElement>(null)

	const canvasRef = useRef<HTMLDivElement>(null)

	// The canvas is the measured box: it spans the container plus the two outer
	// half-gutters, so its width divides into the true column pitch.
	useResizeObserver(
		canvasRef,
		useCallback(() => {
			const width = canvasRef.current?.clientWidth ?? 0

			if (width !== store.getState().width) store.setState({ width })
		}, [store]),
	)

	const dndContextProps = useDashboardDrag({ store, canvasRef, commit, onDragStart, onDragEnd })

	const { beginResize, resizeBy } = useDashboardResize({
		store,
		canvasRef,
		commit,
		onResizeStart,
		onResizeEnd,
	})

	const reporter = useRef(onTileError)

	reporter.current = onTileError

	const actions = useMemo<DashboardActions>(
		() => ({
			beginResize,
			resizeBy,
			setFilter: (next) => setFilterValue(next),
			updateSelections: (update) => setSelectionValue((current) => update(current ?? [])),
			reportError: (id, error) => reporter.current?.(id, error),
		}),
		[beginResize, resizeBy, setFilterValue, setSelectionValue],
	)

	// The root reads one flag, so a preview never renders the root again.
	const readEditable = () => store.getView().editable

	const editable = useSyncExternalStore(store.subscribe, readEditable, readEditable)

	const readOrder = () => store.getView().order

	const order = useSyncExternalStore(store.subscribe, readOrder, readOrder)

	const tiles = useMemo(() => inReadingOrder(children, order), [children, order])

	return (
		<DashboardStoreContext value={store}>
			<DashboardActionsContext value={actions}>
				<DndContext {...dndContextProps}>
					<section
						ref={containerRef}
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

							<DashboardPlaceholder gap={gap} />
						</div>
					</section>
				</DndContext>
			</DashboardActionsContext>
		</DashboardStoreContext>
	)
}
