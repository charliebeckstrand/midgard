'use client'

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type Cell, flexRender, type Table } from '@tanstack/react-table'
import { GripVertical } from 'lucide-react'
import {
	type CSSProperties,
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
import { type CellTooltip, GridCellContent } from './grid-cell-content'
import { isFrozen } from './grid-pin-overrides'
import { pinnedClassName, pinnedOffsetStyle } from './grid-pinning'
import { columnShiftStyle, GridReorderContext } from './grid-reorder'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/**
 * Row-click handler: the row datum and the originating pointer or keyboard
 * event. @internal
 */
export type GridRowClick<T> = (
	row: T,
	event: ReactMouseEvent<HTMLTableRowElement> | ReactKeyboardEvent<HTMLTableRowElement>,
) => void

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

	const rowProps = {
		cells: props.table.getRow(String(key)).getVisibleCells(),
		row,
		rowKey: key,
		loading: props.rowLoading?.(row) ?? false,
		className: props.rowClassName?.(row),
		rowLabel: props.rowLabel?.(row),
		onRowClick: props.onRowClick,
		selected: props.selection.has(key),
		toggleRow: props.toggleRow,
		selectable: props.selectable,
		reorderable: props.reorderable,
		truncate: props.truncate,
		settleWidths: props.settleWidths,
		pinning: props.pinning,
		dataRowIndex,
		rowIndex,
	} satisfies GridRowProps<T>

	// A row-reorderable grid renders each row as a vertical dnd-kit sortable; the
	// plain memoized row otherwise (its drag-handle cell, if any, stays inert).
	return props.rowReorderActive ? (
		<GridReorderableRow<T> key={key} {...rowProps} />
	) : (
		<GridRow<T> key={key} {...rowProps} />
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
	rowIndex,
	dataRowIndex,
	pinning,
	sortable,
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
			aria-rowindex={rowIndex}
			// A clickable row is keyboard-focusable and activates on Enter / Space;
			// a click on interactive cell content defers to that content. Activation
			// from the keyboard is gated to the row itself so inner controls keep
			// their own Enter / Space behaviour.
			tabIndex={onRowClick ? 0 : undefined}
			onClick={
				onRowClick
					? (event) => {
							if (!fromInteractiveContent(event.target)) onRowClick(row, event)
						}
					: undefined
			}
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
			// that `GridData` enables for a row-click handler.
			className={cn(
				loading && k.rowLoading,
				onRowClick && k.row.clickable,
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
							className={cn(k.selectCell, pinnedClassName(pinning, col.id), col.className)}
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

				if (col.actions) {
					return (
						<TableCell
							key={col.id}
							aria-colindex={colIndex}
							className={cn(k.actionsCell, pinnedClassName(pinning, col.id), col.className)}
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
						colIndex={colIndex}
						columnIndex={colIdx}
						reorderable={reorderable}
						truncate={truncate}
						resizeSettleKey={settleWidths[colIdx]}
						pinning={pinning}
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
			<button type="button" disabled aria-label={label} className={cn(k.rowReorder.handleDisabled)}>
				<Icon icon={<GripVertical />} />
			</button>
		)
	}

	return (
		<button
			type="button"
			ref={sortable.setActivatorNodeRef}
			data-dragging={dataAttr(sortable.dragging)}
			className={cn(k.rowReorder.handle)}
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
	colIndex: number | undefined
	/** 0-based visible column index, matching the header's, so a reorder drag keys the body shift the same way. */
	columnIndex: number
	reorderable: boolean
	truncate: boolean
	/** This column's settled width snapshot; re-renders the cell to re-measure overflow when a resize settles (see {@link GridCellContent}). */
	resizeSettleKey: number | undefined
	pinning: GridColumnPinning | null
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
	colIndex,
	columnIndex,
	reorderable,
	truncate,
	resizeSettleKey,
	pinning,
}: GridDataCellProps<T>) {
	const cellExtra = col.cellProps?.(row)

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
				className={col.className}
				cellProps={cellExtra}
			>
				{content}
			</GridReorderableCell>
		)
	}

	return (
		<TableCell
			aria-colindex={colIndex}
			{...cellExtra}
			data-grid-col={col.id}
			className={cn(pinnedClassName(pinning, col.id), col.className, cellExtra?.className)}
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
