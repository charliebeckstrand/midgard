'use client'

import { DndContext } from '@dnd-kit/core'
import {
	type ComponentProps,
	type CSSProperties,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type Ref,
	type RefObject,
	useCallback,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import type { HeadingLevel } from '../../components/heading'
import { cn, dataAttr } from '../../core'
import { useControllable, useDragCursor, useEscapeLayer, useResizeObserver } from '../../hooks'
import { useReportedChange } from '../../hooks/use-reported-change'
import { useStableEvent } from '../../hooks/use-stable-event'
import { k } from '../../recipes/kata/dashboard'
import type { AccessibleName } from '../../types'
import { noop } from '../../utilities'
import { flattenFragments, isElementOfType } from '../../utilities/children'
import type { QueryGroup } from '../query/engine/types'
import {
	type DashboardActions,
	DashboardActionsContext,
	DashboardStoreContext,
	DashboardTileRankContext,
	DashboardTitleLevelContext,
	useDashboardWidgets,
} from './context'
import { firstPaintRules } from './dashboard-first-paint'
import type { DashboardCommit } from './dashboard-gesture'
import { DashboardPlaceholder } from './dashboard-placeholder'
import { DashboardTile, type DashboardTileProps, DEFAULT_MIN_WIDTH } from './dashboard-tile'
import { DashboardTiles, findWidget } from './dashboard-tiles'
import {
	type DashboardCell,
	type DashboardLayoutItem,
	type DashboardTileDemands,
	DEFAULT_COLUMNS,
	mergeLayout,
	ROW_SUBDIVISION,
	sortByOrder,
	usableDemands,
} from './engine/dashboard-layout'
import type { DashboardSelection } from './engine/dashboard-scope'
import { createDashboardStore, type DashboardStore } from './engine/dashboard-store'
import type {
	DashboardFilterBinding,
	DashboardGestureEndEvent,
	DashboardGestureStartEvent,
	DashboardHandle,
	DashboardLayoutBinding,
	DashboardSelectionBinding,
	DashboardWidgetRegistry,
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
 *
 * The re-pack (`projected`) paints each shelf as one row of auto height, and
 * each tile takes its height from the row unit or from its content.
 */
function canvasStyle(columns: number, gap: number, projected: boolean): CSSProperties {
	return {
		margin: -gap / 2,
		gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
		gridAutoRows: projected ? 'auto' : 'var(--dashboard-row)',
		['--dashboard-row' as string]: `calc((100cqi + ${gap}px) / ${columns * ROW_SUBDIVISION})`,
		['--dashboard-gap' as string]: `${gap}px`,
		['--dashboard-columns' as string]: columns,
	}
}

/**
 * The children in one flat list, through each Fragment. Each element takes its
 * key from {@link flattenFragments}, so the key is unique in the list and stays
 * with the element when a keyed Fragment moves.
 */
function flattenBoardChildren(children: ReactNode): ReactNode[] {
	return flattenFragments(children).map(({ node, key }) =>
		isValidElement(node) ? cloneElement(node, { key }) : node,
	)
}

/** The tiles that the children of a board declare. */
type DeclaredTiles = {
	/** The demands of each tile, by id. */
	demands: Map<string, DashboardTileDemands>
	/** The ids of the tiles with `fitContent`. */
	fits: Set<string>
}

/**
 * The tiles that the children declare: each `DashboardTile` child, also inside a
 * Fragment, and each spec tile of a `DashboardTiles` child. A spec tile reads
 * the widget of its kind in `widgets`. A component that renders a tile hides its
 * id and its demands from the board. The same limit keeps that component in its
 * own slot of the reading order.
 */
function declaredTiles(
	children: ReactNode,
	widgets: DashboardWidgetRegistry['widgets'],
): DeclaredTiles {
	const declared: DeclaredTiles = { demands: new Map(), fits: new Set() }

	const add = (id: string, demands: DashboardTileDemands, fit: boolean | undefined) => {
		declared.demands.set(id, usableDemands(demands))

		if (fit === true) declared.fits.add(id)
	}

	for (const node of flattenBoardChildren(children)) {
		if (isElementOfType(node, DashboardTile)) {
			const { id, ratio, minWidth = DEFAULT_MIN_WIDTH, fitContent } = node.props

			add(id, { ratio, minWidth }, fitContent)
		}

		if (isElementOfType(node, DashboardTiles)) {
			for (const tile of node.props.tiles) {
				const widget = findWidget(widgets, tile.widget)

				// The props that `DashboardTiles` gives the tile of this kind.
				const minWidth = widget === undefined ? 0 : (widget.minWidth ?? DEFAULT_MIN_WIDTH)

				add(tile.id, { ratio: widget?.ratio, minWidth }, widget?.fitContent)
			}
		}
	}

	return declared
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
 * its row in markup order. The provider of each other element, such as a
 * component, is grouped. Each `DashboardTiles` and each tile in it then takes a
 * group of the slot when it mounts.
 */
function inReadingOrder(children: ReactNode, order: readonly string[]): ReactNode[] {
	const items = flattenBoardChildren(children)

	const slots = items.flatMap((child, index) =>
		isElementOfType(child, DashboardTile) ? [index] : [],
	)

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

		const isTile = isElementOfType(child, DashboardTile)

		const key = isTile ? `tile:${child.props.id}` : child.key

		return (
			<DashboardTileRankContext
				key={key}
				value={{ rank: [slot, 0, 0], grouped: !isTile && !isElementOfType(child, DashboardTiles) }}
			>
				{isTile ? cloneElement(child, { key }) : child}
			</DashboardTileRankContext>
		)
	})
}

/**
 * Props for {@link Dashboard}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), because the dashboard is a landmark region. The
 * `<section>` takes the rest. The board gives `ref`, `onDragStart`, and
 * `onDragEnd` a meaning of its own.
 */
export type DashboardProps = AccessibleName &
	Omit<ComponentProps<'section'>, 'ref' | 'onDragStart' | 'onDragEnd'> & {
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
		 * Turns on edit mode. The column guides show, each tile gets a drag grip and
		 * resize splitters, and the content of each tile goes inert. A drag starts only
		 * from the grip, so the rest of a tile keeps touch scrolling. Edit mode never
		 * changes a tile size, so no widget re-lays out on the switch. While the
		 * responsive projection is on screen, a drag reorders the tiles as a list, and
		 * the drop saves the new reading order. The re-pack shows no column guides
		 * and no resize splitters. When edit mode ends, or when the board unmounts, a
		 * live drag or resize ends as canceled.
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
		 * A negative value clamps to 0.
		 * @minimum 0
		 * @defaultValue 12
		 */
		gap?: number
		/**
		 * Heading level of each tile title. The dashboard shows no heading of its own,
		 * so set it one level below the heading above the dashboard on the page. The
		 * level also sets the weight of the title. Level 1 is bold, levels 2 and 3 are
		 * semibold, and levels 4 to 6 are medium. The size of the title stays the same
		 * at each level.
		 * @defaultValue 3
		 */
		titleLevel?: HeadingLevel
		/** Fires when a drag starts. */
		onDragStart?: (event: DashboardGestureStartEvent) => void
		/** Fires when a drag ends, with `canceled` when it changed nothing. */
		onDragEnd?: (event: DashboardGestureEndEvent) => void
		/** Fires when a pointer resize starts. */
		onResizeStart?: (event: DashboardGestureStartEvent) => void
		/** Fires when a pointer resize ends, with `canceled` when it changed nothing. */
		onResizeEnd?: (event: DashboardGestureEndEvent) => void
		/** Fires when a tile boundary catches an error, for a log or a report. */
		onTileError?: (id: string, error: unknown) => void
		/**
		 * Fires when the responsive projection changes: `true` when the board
		 * paints the re-pack, and `false` when the saved layout returns. In the
		 * re-pack, edit mode only reorders the tiles, so use it to hide a control that
		 * resizes a tile. The server and the first render cannot
		 * measure, so they report the saved layout, also where a container query
		 * paints the re-pack. The first call comes only after a measurement projects.
		 */
		onProjectedChange?: (projected: boolean) => void
		/** Receives the commands of the board, such as {@link DashboardHandle.tidy}. */
		ref?: Ref<DashboardHandle>
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
		 * order reads the children, then the `tiles` of each `DashboardTiles`. In one
		 * component, each `DashboardTiles` and each `DashboardTile` takes its place when
		 * it mounts, and the elements of one commit keep their markup order. An element
		 * that mounts after the others of its component goes after them. A reload gives
		 * the markup order only when they all mount in one commit. A new spec tile keeps
		 * its place in `tiles`.
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
 * The board is a CSS grid whose rows follow the container width. When the
 * container renders a tile under its `minWidth`, the board paints a re-pack of
 * the same layout, and it never saves the re-pack. The server cannot measure,
 * so the board writes each step of the re-pack as a container query. The first
 * paint is therefore the re-pack that the first measurement keeps, on a phone
 * and on a desktop alike.
 *
 * The re-pack holds for 24 px past the width at which each tile fits. A classic
 * scrollbar up to 24 px wide that comes and goes with the re-pack therefore
 * cannot switch the board on each frame. A wider scrollbar, such as a styled
 * `::-webkit-scrollbar`, can switch it. Give such a scroll box
 * `scrollbar-gutter: stable`.
 *
 * @remarks The board is a query container at the full width of its parent, so
 * its content gives it no width. Give it a parent with a definite width. In a
 * parent that sizes to its content, the board gets only the width that the
 * other content of that parent gives.
 *
 * The container queries read the demands of the tiles in the children of the
 * board, and the widget kinds of a `DashboardWidgetProvider` around the board.
 * A tile that a component renders and a tile with no saved entry take their
 * place in the re-pack only when the board measures. A tile with `fitContent`
 * takes the height of its content from the first paint. A tile whose widget
 * claims the height of its content takes it only after hydration, because the
 * widget claims in an effect.
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
	gap: rawGap = DEFAULT_GAP,
	titleLevel = 3,
	onDragStart,
	onDragEnd,
	onResizeStart,
	onResizeEnd,
	onTileError,
	onProjectedChange,
	ref,
	className,
	children,
	...props
}: DashboardProps) {
	const gap = Math.max(0, rawGap)

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

	const { widgets } = useDashboardWidgets()

	// The children and the layout of the mount. Both serve only the paint before the first
	// measurement, so a later change of either one needs no new read.
	const [declared] = useState(() => declaredTiles(children, widgets))

	const scope = useId()

	const [firstPaint] = useState(() =>
		firstPaintRules(scope, {
			layout: layoutValue ?? EMPTY_LAYOUT,
			...declared,
			columns,
			gap,
		}),
	)

	const [store] = useState(() =>
		createDashboardStore({
			columns,
			gap,
			editing,
			layout: layoutValue ?? EMPTY_LAYOUT,
			demands: new Map(),
			// Until the first tile registers, as on the server, the store counts these tiles as on the board.
			declared: new Set(declared.demands.keys()),
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

	// It reads the newest reporter, and its identity holds for the mount.
	const reportError = useStableEvent((id: string, error: unknown) => onTileError?.(id, error))

	const actions = useMemo<DashboardActions>(
		() => ({
			beginResize,
			resizeBy,
			cancelResize,
			setFilter: (next) => setFilterValue(next),
			updateSelections: (update) => setSelectionValue((prev) => update(prev ?? [])),
			reportError,
		}),
		[beginResize, resizeBy, cancelResize, setFilterValue, setSelectionValue, reportError],
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
	useDragCursor(dragging)

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

	return (
		<DashboardStoreContext value={store}>
			<DashboardActionsContext value={actions}>
				<DndContext {...dndContextProps}>
					<DashboardCanvas
						{...props}
						store={store}
						scope={scope}
						firstPaint={firstPaint}
						columns={columns}
						gap={gap}
						titleLevel={titleLevel}
						canvasRef={canvasRef}
						onProjectedChange={onProjectedChange}
						className={className}
					>
						{children}
					</DashboardCanvas>
				</DndContext>
			</DashboardActionsContext>
		</DashboardStoreContext>
	)
}

/** Props for {@link DashboardCanvas}. @internal */
type DashboardCanvasProps = Omit<ComponentProps<'section'>, 'ref'> & {
	store: DashboardStore
	/** The scope of the first paint rules. */
	scope: string
	firstPaint: string
	columns: number
	gap: number
	titleLevel: HeadingLevel
	canvasRef: RefObject<HTMLDivElement | null>
	onProjectedChange?: (projected: boolean) => void
}

/**
 * The section and the canvas of a {@link Dashboard}. It reads the flags of the
 * store that the canvas paints, so a change of a flag renders this part and not
 * the root. Each render of the root renders `DndContext`, which gives its
 * contexts new values. A new value makes each tile boundary that did not
 * hydrate yet hydrate at once, in one long task. The width of the canvas and the
 * re-pack change after hydration, so the root must not read them.
 *
 * @internal
 */
function DashboardCanvas({
	store,
	scope,
	firstPaint,
	columns,
	gap,
	titleLevel,
	canvasRef,
	onProjectedChange,
	className,
	children,
	...props
}: DashboardCanvasProps) {
	const readEditable = () => store.getView().editable

	const editable = useSyncExternalStore(store.subscribe, readEditable, readEditable)

	// A width of 0 is the server, or a container that does not render.
	const readMeasured = () => store.getState().width > 0

	const measured = useSyncExternalStore(store.subscribe, readMeasured, readMeasured)

	const readProjected = () => store.getView().projected

	const projected = useSyncExternalStore(store.subscribe, readProjected, readProjected)

	// The first render paints the saved layout, so the mount value is `false` and the
	// app hears only a change.
	useReportedChange(projected, onProjectedChange)

	const readOrder = () => store.getView().order

	const order = useSyncExternalStore(store.subscribe, readOrder, readOrder)

	const tiles = useMemo(() => inReadingOrder(children, order), [children, order])

	return (
		<section
			{...props}
			data-slot="dashboard"
			data-editing={dataAttr(editable)}
			data-dashboard={scope}
			// The focus lands here when a remove takes away the last tile.
			tabIndex={-1}
			className={cn('@container w-full', className)}
		>
			{firstPaint !== '' && <style>{firstPaint}</style>}

			<div
				ref={canvasRef}
				data-slot="dashboard-canvas"
				data-measured={dataAttr(measured)}
				style={canvasStyle(columns, gap, projected)}
				// The column guides belong to the saved layout, and not to the re-pack.
				className={k({ editable: editable && !projected }).base}
			>
				<DashboardTitleLevelContext value={titleLevel}>{tiles}</DashboardTitleLevelContext>

				<DashboardPlaceholder />
			</div>
		</section>
	)
}
