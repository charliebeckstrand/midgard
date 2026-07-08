'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type Cell, flexRender, type Table } from '@tanstack/react-table'
import { GripVertical } from 'lucide-react'
import {
	type CSSProperties,
	Fragment,
	type HTMLAttributes,
	memo,
	type ReactElement,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useContext,
} from 'react'
import { Checkbox } from '../../components/checkbox'
import { Icon } from '../../components/icon'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { type CellTooltip, GridCellContent } from './grid-cell-content'
import { GridDetailRow, GridExpandToggle } from './grid-detail-row'
import { isFrozen } from './grid-pin-overrides'
import { pinnedClassName, pinnedOffsetStyle } from './grid-pinning'
import { columnShiftStyle, GridReorderContext } from './grid-reorder'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/**
 * Row-level event handler for {@link GridDataProps.onRowClick} and
 * {@link GridDataProps.onRowDoubleClick}: the row datum and the originating
 * pointer or keyboard event.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridRowClick<T> = (
	row: T,
	event: ReactMouseEvent<HTMLTableRowElement> | ReactKeyboardEvent<HTMLTableRowElement>,
) => void

/**
 * Context for a cell-level event ({@link GridDataProps.onCellClick} /
 * {@link GridDataProps.onCellDoubleClick}): the cell's column id and data
 * value alongside the owning row.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridCellClickContext<T> = {
	/** The owning row's datum. */
	row: T
	/** The owning row's key, from {@link GridDataProps.getKey}. */
	rowKey: string | number
	/** The clicked column's id. */
	columnId: string | number
	/**
	 * The cell's data value: the column's {@link GridColumn.value} accessor when
	 * set, else the row field named by the column id — the same resolution sort,
	 * filter, and export read. `undefined` when the column has neither.
	 */
	value: unknown
}

/**
 * Cell-level event handler for {@link GridDataProps.onCellClick} and
 * {@link GridDataProps.onCellDoubleClick}: the {@link GridCellClickContext}
 * and the originating pointer or keyboard event.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridCellClick<T> = (
	cell: GridCellClickContext<T>,
	event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
) => void

/**
 * Activates a keyboard-focused data cell (cell roving): fires the cell click
 * then the row click for the given context, matching the order a pointer click
 * fires them in. @internal
 */
export type GridCellRovingActivate<T> = (
	cell: GridCellClickContext<T>,
	event: ReactKeyboardEvent<HTMLElement>,
) => void

/**
 * A cell's data value: the column's {@link GridColumn.value} accessor when set,
 * else the row field named by the column id — the resolution sort, filter, and
 * export share. @internal
 */
export function cellValue<T>(col: GridColumn<T>, row: T): unknown {
	if (col.value) return col.value(row)

	return (row as Record<string | number, unknown>)[col.id]
}

/**
 * Resolves the data cell a row-level pointer event landed on: the closest
 * `td[data-grid-col]` names the column, matched back through the row's engine
 * cells. Non-data cells (selection, actions, drag handle, expander) resolve to
 * `null`, so cell-level events fire only for row content.
 *
 * @internal
 */
function resolveCellContext<T>(
	cells: Cell<T, unknown>[],
	row: T,
	rowKey: string | number,
	target: EventTarget | null,
): GridCellClickContext<T> | null {
	if (!(target instanceof Element)) return null

	const id = target.closest('td[data-grid-col]')?.getAttribute('data-grid-col')

	if (id == null) return null

	for (const cell of cells) {
		const col = cell.column.columnDef.meta?.gridColumn

		if (col && String(col.id) === id && isDataColumn(col)) {
			return { row, rowKey, columnId: col.id, value: cellValue(col, row) }
		}
	}

	return null
}

/**
 * The row's DOM handler for a click or double-click: a click on interactive
 * cell content defers to that content; otherwise the cell-level handler fires
 * first — when the event landed on a data cell — then the row-level one,
 * matching the DOM's inside-out event order. `undefined` when the row carries
 * neither, so an inert row attaches no handler.
 *
 * @internal
 */
export function rowPointerHandler<T>(args: {
	cells: Cell<T, unknown>[]
	row: T
	rowKey: string | number
	onRow: GridRowClick<T> | undefined
	onCell: GridCellClick<T> | undefined
}): ((event: ReactMouseEvent<HTMLTableRowElement>) => void) | undefined {
	const { cells, row, rowKey, onRow, onCell } = args

	if (!onRow && !onCell) return undefined

	return (event) => {
		if (fromInteractiveContent(event.target)) return

		if (onCell) {
			const cell = resolveCellContext(cells, row, rowKey, event.target)

			if (cell) onCell(cell, event)
		}

		onRow?.(row, event)
	}
}

/**
 * Interactive cell content that handles its own click, so a row-level
 * `onRowClick` defers to it rather than double-firing. @internal
 */
const INTERACTIVE_CELL_CONTENT =
	'a,button,input,select,textarea,label,[role="button"],[role="menuitem"],[role="checkbox"],[contenteditable="true"]'

/** Whether the event originated inside interactive cell content. @internal */
export function fromInteractiveContent(target: EventTarget | null): boolean {
	return target instanceof Element && target.closest(INTERACTIVE_CELL_CONTENT) != null
}

/**
 * Per-row wiring shared by the plain and virtualized bodies: the engine, the
 * row/key sources, and the flags every {@link GridRow} reads. Both bodies
 * extend this with their own layout props and render rows through
 * {@link renderGridRow}.
 *
 * @internal
 */
export type GridRowsProps<T> = {
	/** The engine; rows read their cells from it. */
	table: Table<T>
	rows: T[]
	rowKeys: (string | number)[]
	/** Visible columns, kept for the loading/empty/spacer column spans. */
	visibleColumns: GridColumn<T>[]
	rowLoading?: (row: T) => boolean
	rowClassName?: (row: T) => string | undefined
	rowLabel?: (row: T) => string
	/** Stable per-row click handler; rows are inert when omitted. */
	onRowClick?: GridRowClick<T>
	/** Stable data-cell click handler, fired ahead of {@link GridRowsProps.onRowClick} on the same click. */
	onCellClick?: GridCellClick<T>
	/** Stable per-row double-click handler. */
	onRowDoubleClick?: GridRowClick<T>
	/** Stable data-cell double-click handler, fired ahead of {@link GridRowsProps.onRowDoubleClick}. */
	onCellDoubleClick?: GridCellClick<T>
	/**
	 * Whether the rows are roving-tabindex items (row-mode keyboard navigation):
	 * each marks itself `data-roving` and lets the grid's roving hook own its
	 * `tabIndex`. @defaultValue false
	 */
	rowRoving?: boolean
	/**
	 * Whether each clickable row is a static Tab stop (`tabIndex=0`) — the legacy
	 * per-row model kept for the virtualized body, where roving stands down.
	 * @defaultValue false
	 */
	rowStaticStop?: boolean
	/**
	 * Whether the data cells are roving-tabindex items (cell-mode keyboard
	 * navigation): each marks itself `data-roving`, takes the focus ring, and
	 * activates on Enter / Space through {@link GridRowsProps.cellActivate}.
	 * @defaultValue false
	 */
	cellRoving?: boolean
	/** Stable focused-cell activation for cell roving — the cell click then the row click, matching a pointer click. */
	cellActivate?: GridCellRovingActivate<T>
	selection: Set<string | number>
	toggleRow: (key: string | number) => void
	/** Whether the grid renders a selection column, so each row exposes its `aria-selected` state. */
	selectable: boolean
	/** Registers each non-pinned data cell against the column sortable for whole-column reorder drags. */
	reorderable: boolean
	/**
	 * Whether rows are drag-reorderable right now. When true each row renders as a
	 * vertical sortable ({@link GridReorderableRow}) and its drag-handle column's
	 * grip is live; when false the grip (if any) is inert. @defaultValue false
	 */
	rowReorderActive: boolean
	/** Truncate overflowing cell content with an ellipsis and an on-hover tooltip. */
	truncate: boolean
	/**
	 * Per-visible-column width snapshot threaded to each cell's truncation
	 * re-measure: `undefined` while a column drags, the settled engine width
	 * otherwise (see {@link GridCellContent}). Indexed parallel to a row's
	 * visible cells.
	 */
	settleWidths: (number | undefined)[]
	/** Frozen-column controls; pinned cells stick to an edge. `null` when none. */
	pinning: GridColumnPinning | null
	/** When the rendered body is a window onto a larger set (virtualization/pagination), rows carry global `aria-rowindex`. */
	gridSemantics: boolean
	/** Global row-index base added to each rendered row's index (the page offset under pagination, else 0). */
	rowIndexOffset: number
	/**
	 * Master-detail wiring, or `null` when the grid isn't expandable: the
	 * expanded-key set, the per-row expandability predicate, the stable toggle,
	 * and the detail renderer. {@link renderGridRow} reads it to drive each
	 * expander cell and to append the detail panel row.
	 */
	expansion?: {
		expanded: Set<string | number>
		rowExpandable: (row: T) => boolean
		toggle: (key: string | number) => void
		render: (row: T) => ReactNode
	} | null
}

/**
 * Renders one engine row through {@link GridRow}, resolving its cells, key, and
 * per-row flags from the shared body wiring. `rowIndex` is the 1-based aria
 * position, set only when the body is virtualized.
 *
 * @internal
 */
export function renderGridRow<T>(
	props: GridRowsProps<T>,
	row: T,
	dataRowIndex: number,
	rowIndex?: number,
): ReactElement {
	// `rowKeys` is built parallel to `rows` (see `Grid`), so the index is always present.
	const key = props.rowKeys[dataRowIndex] as string | number

	// Master-detail state for this row: whether it may expand and whether it is
	// open. Both flow to the row as primitives so the memoized row still holds.
	const expandable = props.expansion?.rowExpandable(row) ?? false

	const expanded = expandable && (props.expansion?.expanded.has(key) ?? false)

	const rowProps = {
		cells: props.table.getRow(String(key)).getVisibleCells(),
		row,
		rowKey: key,
		loading: props.rowLoading?.(row) ?? false,
		className: props.rowClassName?.(row),
		rowLabel: props.rowLabel?.(row),
		onRowClick: props.onRowClick,
		onCellClick: props.onCellClick,
		onRowDoubleClick: props.onRowDoubleClick,
		onCellDoubleClick: props.onCellDoubleClick,
		rowRoving: props.rowRoving,
		rowStaticStop: props.rowStaticStop,
		cellRoving: props.cellRoving,
		cellActivate: props.cellActivate,
		selected: props.selection.has(key),
		toggleRow: props.toggleRow,
		selectable: props.selectable,
		reorderable: props.reorderable,
		truncate: props.truncate,
		settleWidths: props.settleWidths,
		pinning: props.pinning,
		dataRowIndex,
		rowIndex,
		expanded,
		rowExpandable: expandable,
		toggleExpand: props.expansion?.toggle,
	} satisfies GridRowProps<T>

	// A row-reorderable grid renders each row as a vertical dnd-kit sortable; the
	// plain memoized row otherwise (its drag-handle cell, if any, stays inert).
	const rowNode = props.rowReorderActive ? (
		<GridReorderableRow<T> key={key} {...rowProps} />
	) : (
		<GridRow<T> key={key} {...rowProps} />
	)

	// An expandable grid follows each row with its master-detail panel row, which
	// stays mounted and reveals open/closed from `expanded` (see `GridDetailRow`).
	if (!props.expansion) return rowNode

	return (
		<Fragment key={key}>
			{rowNode}
			<GridDetailRow rowKey={key} colSpan={props.visibleColumns.length} expanded={expanded}>
				{props.expansion.render(row)}
			</GridDetailRow>
		</Fragment>
	)
}

/**
 * The dnd-kit sortable bindings a {@link GridReorderableRow} threads into its
 * row: the `<tr>` node ref and lifted transform/transition style, plus the
 * activator ref, attributes, and listeners the drag-handle grip carries. @internal
 */
export type GridRowSortable = {
	setNodeRef: (node: HTMLElement | null) => void
	setActivatorNodeRef: (node: HTMLElement | null) => void
	attributes: DraggableAttributes
	listeners: DraggableSyntheticListeners
	style: CSSProperties
	dragging: boolean
}

/** Props for {@link GridRow}. @internal */
type GridRowProps<T> = {
	row: T
	rowKey: string | number
	/**
	 * This row's visible cells from the engine (`row.getVisibleCells()`), rendered
	 * through `flexRender`. Passed in (not pulled off a stable `table`) so the
	 * memoized row re-renders when the cell set changes — the array's identity
	 * shifts on a column-def rebuild but holds across cursor navigation.
	 */
	cells: Cell<T, unknown>[]
	loading: boolean
	className: string | undefined
	/** Human-readable name for the selection checkbox ("Select {label}"); falls back to the row key. */
	rowLabel?: string
	/**
	 * This row's selected state. Passed as a prop, not read from context;
	 * `memo` re-renders only this row when its selection flips.
	 */
	selected: boolean
	/** Stable reference from the selection hook, safe to pass through `memo`. */
	toggleRow: (key: string | number) => void
	/**
	 * Whether the grid renders a selection column. When true the row's `<tr>`
	 * carries `aria-selected`; a grid with no selection column omits it rather
	 * than asserting selectability on rows that can't be selected.
	 */
	selectable: boolean
	/**
	 * When true, each non-pinned data cell registers against the table's column
	 * sortable (matching its header's id) so the whole column drags as one.
	 * @defaultValue false
	 */
	reorderable?: boolean
	/**
	 * Truncate overflowing cell content to one line with an ellipsis and a
	 * tooltip; a column's {@link GridColumn.cellTooltip} customizes or disables
	 * the tooltip.
	 */
	truncate: boolean
	/** Per-visible-column settled width snapshot, indexed parallel to this row's cells (see {@link GridRowsProps.settleWidths}). */
	settleWidths: (number | undefined)[]
	/** Invoked when the row is clicked or activated by keyboard; `undefined` makes the row inert. */
	onRowClick?: GridRowClick<T>
	/** Invoked when one of the row's data cells is clicked, ahead of {@link GridRowProps.onRowClick}. */
	onCellClick?: GridCellClick<T>
	/** Invoked when the row is double-clicked. */
	onRowDoubleClick?: GridRowClick<T>
	/** Invoked when one of the row's data cells is double-clicked, ahead of {@link GridRowProps.onRowDoubleClick}. */
	onCellDoubleClick?: GridCellClick<T>
	/** Whether the row is a roving-tabindex item (row-mode keyboard nav); the grid's roving hook owns its `tabIndex`. @defaultValue false */
	rowRoving?: boolean
	/** Whether the row is a static Tab stop (`tabIndex=0`), the legacy per-row model kept for the virtualized body. @defaultValue false */
	rowStaticStop?: boolean
	/** Whether the row's data cells are roving-tabindex items (cell-mode keyboard nav). @defaultValue false */
	cellRoving?: boolean
	/** Stable focused-cell activation for cell roving (see {@link GridRowsProps.cellActivate}). */
	cellActivate?: GridCellRovingActivate<T>
	/**
	 * 1-based position in the full row set (header = 1). Set when the rendered
	 * body is a window onto a larger set — virtualization or pagination — so
	 * assistive tech reports position in the full set, not the rendered slice.
	 * Omitted for a plain, whole-set table.
	 */
	rowIndex?: number
	/**
	 * 0-based index into the full `rows` array, surfaced as `data-row-index`.
	 * Keyboard bridges resolve a `<tr>` to its data row through it; under
	 * virtualization, spacer rows and windowing make physical DOM position
	 * diverge from data order.
	 */
	dataRowIndex: number
	/** Frozen-column controls; pinned cells stick to an edge over the scrolling ones. `null` when none. */
	pinning: GridColumnPinning | null
	/**
	 * dnd-kit sortable bindings when this row is a live drag-reorder node (set by
	 * {@link GridReorderableRow}); `undefined` for a plain row, whose drag-handle
	 * cell (if any) then renders an inert grip. @internal
	 */
	sortable?: GridRowSortable
	/**
	 * This row's master-detail open state, read by an {@link GridColumn.expander}
	 * cell's chevron. @defaultValue false
	 */
	expanded?: boolean
	/**
	 * Whether this row may expand — a grid with an `expandable` binding and a row
	 * the binding accepts. An expander cell on a row this rejects stays a quiet
	 * rail. Passed as a primitive (not an object) so the memoized row holds.
	 * @defaultValue false
	 */
	rowExpandable?: boolean
	/** Stable master-detail toggle from the expansion hook; safe through `memo`. @internal */
	toggleExpand?: (key: string | number) => void
}

/**
 * Resolves a column's truncation tooltip: `auto` (the cell's own content) when
 * the column declares no `cellTooltip`, a `custom` node when it returns one, or
 * `none` when it returns null/undefined.
 *
 * @internal
 */
export function resolveCellTooltip<T>(col: GridColumn<T>, row: T): CellTooltip {
	if (col.cellTooltip == null) return { kind: 'auto' }

	const node = col.cellTooltip(row)

	return node == null ? { kind: 'none' } : { kind: 'custom', node }
}

/**
 * One data row: maps `columns` to cells (selection checkbox, actions, or `cell`
 * content).
 *
 * @internal
 */
function GridRowImpl<T>({
	row,
	rowKey,
	cells,
	loading,
	className,
	rowLabel,
	selected,
	toggleRow,
	selectable,
	reorderable = false,
	truncate,
	settleWidths,
	onRowClick,
	onCellClick,
	onRowDoubleClick,
	onCellDoubleClick,
	rowRoving = false,
	rowStaticStop = false,
	cellRoving = false,
	cellActivate,
	rowIndex,
	dataRowIndex,
	pinning,
	sortable,
	expanded = false,
	rowExpandable = false,
	toggleExpand,
}: GridRowProps<T>) {
	return (
		<TableRow
			// The `<tr>` is the row's dnd-kit sortable node when reorderable; its
			// transform/transition ride the inline style, and `data-dragging` lifts it.
			ref={sortable?.setNodeRef}
			style={sortable?.style}
			data-dragging={sortable ? dataAttr(sortable.dragging) : undefined}
			// Selectable rows expose their checkbox state to assistive tech; a grid
			// with no selection column omits the attribute entirely.
			aria-selected={selectable ? selected : undefined}
			data-selected={dataAttr(selected)}
			data-row-index={dataRowIndex}
			data-grid-row={String(rowKey)}
			data-clickable={dataAttr(onRowClick != null)}
			// Row-mode roving marks the row an item the grid's roving hook owns the
			// `tabIndex` of; the cell-mode/inert cases leave it off.
			data-roving={dataAttr(rowRoving)}
			aria-rowindex={rowIndex}
			// A clickable row activates on Enter / Space; a click on interactive cell
			// content defers to that content. Activation from the keyboard is gated to
			// the row itself so inner controls keep their own Enter / Space behaviour.
			// The click and double-click handlers each fire their cell-level
			// counterpart first, then the row-level one (see `rowPointerHandler`).
			//
			// Focusability: a row-roving row omits `tabIndex` so the roving hook can
			// own it (one row at `0`, the rest `-1`); the virtualized body keeps the
			// legacy static per-row stop; cell roving and the navigable cursor leave
			// the row unfocusable (the cells / the table hold focus).
			tabIndex={rowRoving ? undefined : rowStaticStop ? 0 : undefined}
			onClick={rowPointerHandler({ cells, row, rowKey, onRow: onRowClick, onCell: onCellClick })}
			onDoubleClick={rowPointerHandler({
				cells,
				row,
				rowKey,
				onRow: onRowDoubleClick,
				onCell: onCellDoubleClick,
			})}
			onKeyDown={
				onRowClick
					? (event) => {
							if (
								(event.key === 'Enter' || event.key === ' ') &&
								event.target === event.currentTarget
							) {
								event.preventDefault()

								onRowClick(row, event)
							}
						}
					: undefined
			}
			// A clickable row carries the pointer cursor and a keyboard focus ring (see
			// `k.row.clickable`); its hover wash is the shared `<Table hover>` variant
			// that `GridData` enables for any row- or cell-level click handler.
			className={cn(
				loading && k.row.loading,
				(onRowClick || onCellClick || onRowDoubleClick || onCellDoubleClick) && k.row.clickable,
				sortable && k.rowReorder.dragging,
				className,
			)}
		>
			{cells.map((cell, colIdx) => {
				// Every engine column carries its source column on `meta`; the guard
				// narrows the optional type (it is always set in `toColumnDef`).
				const col = cell.column.columnDef.meta?.gridColumn

				if (!col) return null

				// Cell column indices accompany aria-rowindex under virtualization
				// (rowIndex is only set then).
				const colIndex = rowIndex !== undefined ? colIdx + 1 : undefined

				if (col.dragHandle) {
					return (
						<TableCell
							key={col.id}
							aria-colindex={colIndex}
							className={cn(k.rowReorder.cell, pinnedClassName(pinning, col.id), col.className)}
							style={pinnedOffsetStyle(pinning, col.id)}
						>
							<GridRowDragHandle sortable={sortable} rowLabel={rowLabel} rowKey={rowKey} />
						</TableCell>
					)
				}

				if (col.selectable) {
					return (
						<TableCell
							key={col.id}
							aria-colindex={colIndex}
							className={cn(k.cell.select, pinnedClassName(pinning, col.id), col.className)}
							style={pinnedOffsetStyle(pinning, col.id)}
						>
							<Checkbox
								checked={selected}
								onChange={() => toggleRow(rowKey)}
								aria-label={`Select ${rowLabel ?? `row ${rowKey}`}`}
							/>
						</TableCell>
					)
				}

				if (col.expander) {
					return (
						<TableCell
							key={col.id}
							aria-colindex={colIndex}
							className={cn(k.cell.expander, pinnedClassName(pinning, col.id), col.className)}
							style={pinnedOffsetStyle(pinning, col.id)}
						>
							{toggleExpand && (
								<GridExpandToggle
									expanded={expanded}
									expandable={rowExpandable}
									rowKey={rowKey}
									rowLabel={rowLabel}
									toggle={toggleExpand}
								/>
							)}
						</TableCell>
					)
				}

				if (col.actions) {
					return (
						<TableCell
							key={col.id}
							aria-colindex={colIndex}
							className={cn(k.cell.actions, pinnedClassName(pinning, col.id), col.className)}
							style={pinnedOffsetStyle(pinning, col.id)}
						>
							{col.actions(row)}
						</TableCell>
					)
				}

				return (
					<GridDataCell<T>
						key={col.id}
						cell={cell}
						col={col}
						row={row}
						rowKey={rowKey}
						colIndex={colIndex}
						columnIndex={colIdx}
						reorderable={reorderable}
						truncate={truncate}
						resizeSettleKey={settleWidths[colIdx]}
						pinning={pinning}
						cellRoving={cellRoving}
						cellActivate={cellActivate}
					/>
				)
			})}
		</TableRow>
	)
}

/** Memoized {@link GridRowImpl}; re-renders a row only when its own props change. @internal */
export const GridRow = memo(GridRowImpl) as typeof GridRowImpl

/**
 * A drag-reorderable body row: registers the `<tr>` as a vertical dnd-kit
 * sortable keyed by its row key, composes the lift transform/transition, and
 * threads the activator ref and listeners down to its drag-handle grip. Unlike
 * {@link useSortableItem}, the dragged row stays visible (no `<DragOverlay>`) and
 * lifts in place via {@link k.rowReorder.dragging}.
 *
 * @internal
 */
function GridReorderableRowImpl<T>(props: GridRowProps<T>) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: String(props.rowKey) })

	const sortable: GridRowSortable = {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		style: { transform: CSS.Transform.toString(transform), transition },
		dragging: isDragging,
	}

	return <GridRowImpl<T> {...props} sortable={sortable} />
}

/** Memoized {@link GridReorderableRowImpl}. @internal */
const GridReorderableRow = memo(GridReorderableRowImpl) as typeof GridReorderableRowImpl

/** Props for {@link GridRowDragHandle}. @internal */
type GridRowDragHandleProps = {
	/** The row's sortable bindings when reordering is live; `undefined` renders an inert grip. */
	sortable: GridRowSortable | undefined
	rowLabel: string | undefined
	rowKey: string | number
}

/**
 * The grip in a {@link GridColumn.dragHandle} cell. When the row is reorderable
 * it carries the sortable's activator ref, attributes, and pointer/keyboard
 * listeners; otherwise it renders disabled — present for layout, inert because a
 * manual order isn't meaningful right now (a column sort, a filtered view, …).
 *
 * @internal
 */
function GridRowDragHandle({ sortable, rowLabel, rowKey }: GridRowDragHandleProps) {
	const label = `Reorder ${rowLabel ?? `row ${rowKey}`}`

	if (!sortable) {
		return (
			<button
				type="button"
				disabled
				aria-label={label}
				className={cn(k.rowReorder.handle.disabled)}
			>
				<Icon icon={<GripVertical />} />
			</button>
		)
	}

	return (
		<button
			type="button"
			ref={sortable.setActivatorNodeRef}
			data-dragging={dataAttr(sortable.dragging)}
			className={cn(k.rowReorder.handle.root)}
			aria-label={label}
			{...sortable.attributes}
			{...sortable.listeners}
		>
			<Icon icon={<GripVertical />} />
		</button>
	)
}

/** Props for {@link GridDataCell}. @internal */
type GridDataCellProps<T> = {
	cell: Cell<T, unknown>
	col: GridColumn<T>
	row: T
	/** The owning row's key, carried so cell roving can build the {@link GridCellClickContext}. */
	rowKey: string | number
	colIndex: number | undefined
	/** 0-based visible column index, matching the header's, so a reorder drag keys the body shift the same way. */
	columnIndex: number
	reorderable: boolean
	truncate: boolean
	/** This column's settled width snapshot; re-renders the cell to re-measure overflow when a resize settles (see {@link GridCellContent}). */
	resizeSettleKey: number | undefined
	pinning: GridColumnPinning | null
	/** Whether the cell is a roving-tabindex item (cell-mode keyboard nav): the focus ring, and Enter / Space activation. @defaultValue false */
	cellRoving?: boolean
	/** Stable focused-cell activation for cell roving (see {@link GridRowsProps.cellActivate}). */
	cellActivate?: GridCellRovingActivate<T>
}

/**
 * The roving attributes a focusable data cell carries in cell mode: the
 * `data-roving` marker the grid's roving hook seats a `tabIndex` on, and an
 * Enter / Space handler that activates the cell — gated to the cell itself so an
 * inner control keeps its own key behaviour. `null` outside cell roving. @internal
 */
export function cellRovingAttrs<T>(args: {
	cellRoving: boolean
	cellActivate: GridCellRovingActivate<T> | undefined
	col: GridColumn<T>
	row: T
	rowKey: string | number
}): {
	'data-roving': '' | undefined
	onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
} | null {
	const { cellRoving, cellActivate, col, row, rowKey } = args

	if (!cellRoving) return null

	return {
		'data-roving': dataAttr(true),
		onKeyDown: (event) => {
			if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
				event.preventDefault()

				cellActivate?.({ row, rowKey, columnId: col.id, value: cellValue(col, row) }, event)
			}
		},
	}
}

/**
 * One data cell: renders its content through the engine (`flexRender`), wrapping
 * it in the truncation reveal unless the grid opts out, then in a reorder-aware
 * `<td>`. A column with no `cell` yields null content and stays bare.
 *
 * @internal
 */
function GridDataCellImpl<T>({
	cell,
	col,
	row,
	rowKey,
	colIndex,
	columnIndex,
	reorderable,
	truncate,
	resizeSettleKey,
	pinning,
	cellRoving = false,
	cellActivate,
}: GridDataCellProps<T>) {
	const cellExtra = col.cellProps?.(row)

	// Cell-mode roving: the focus ring plus the marker/activation attributes,
	// applied to whichever `<td>` this cell renders (reorder-aware or plain).
	const roving = cellRovingAttrs({ cellRoving, cellActivate, col, row, rowKey })

	const rovingClass = cellRoving ? k.cell.rovable : undefined

	// Render only columns that declare a `cell`; a bare accessor column stays empty
	// rather than falling back to TanStack's default value renderer.
	const rawContent = col.cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null

	const content =
		truncate && rawContent != null ? (
			<GridCellContent
				content={rawContent}
				tooltip={resolveCellTooltip(col, row)}
				resizeSettleKey={resizeSettleKey}
			/>
		) : (
			rawContent
		)

	if (reorderable && !isFrozen(col)) {
		return (
			<GridReorderableCell
				id={col.id}
				columnIndex={columnIndex}
				colIndex={colIndex}
				className={cn(rovingClass, col.className)}
				cellProps={roving ? { ...cellExtra, ...roving } : cellExtra}
			>
				{content}
			</GridReorderableCell>
		)
	}

	return (
		<TableCell
			aria-colindex={colIndex}
			{...cellExtra}
			{...roving}
			data-grid-col={col.id}
			className={cn(
				rovingClass,
				pinnedClassName(pinning, col.id),
				col.className,
				cellExtra?.className,
			)}
			style={{ ...cellExtra?.style, ...pinnedOffsetStyle(pinning, col.id) }}
		>
			{content}
		</TableCell>
	)
}

/**
 * Memoized {@link GridDataCellImpl}: when a row re-renders, only the cells whose
 * own props (cell, column, row, pinning) changed re-render, so a row-level change
 * (selection, truncation) doesn't re-run `flexRender` and `cellProps` for every
 * cell in the row. @internal
 */
const GridDataCell = memo(GridDataCellImpl) as typeof GridDataCellImpl

/** Props for {@link GridReorderableCell}. @internal */
type GridReorderableCellProps = {
	id: string | number
	/** 0-based visible column index keying the CSS-variable shift its header writes. */
	columnIndex: number
	colIndex: number | undefined
	className: string | undefined
	cellProps: Omit<HTMLAttributes<HTMLTableCellElement>, 'children'> | undefined
	children: ReactNode
}

/**
 * Body cell for a reordering column. It no longer registers a sortable of its
 * own — that put the column's header id on every body row, a duplicate-id churn
 * dnd-kit re-measures over. Instead the whole column glides via the CSS variable
 * its header writes (see {@link columnShiftStyle}), and this cell only reflects
 * the dragged-column lift from {@link GridReorderContext} — a value that
 * flips just at drag start and end, so a drag re-renders it twice, never per move.
 *
 * @internal
 */
const GridReorderableCell = memo(function GridReorderableCell({
	id,
	columnIndex,
	colIndex,
	className,
	cellProps,
	children,
}: GridReorderableCellProps) {
	const dragging = useContext(GridReorderContext) === String(id)

	return (
		<TableCell
			aria-colindex={colIndex}
			{...cellProps}
			data-dragging={dataAttr(dragging)}
			data-grid-col={id}
			className={cn(k.reorder.cell, k.reorder.shift, className, cellProps?.className)}
			style={{ ...cellProps?.style, ...columnShiftStyle(columnIndex) }}
		>
			{children}
		</TableCell>
	)
})
