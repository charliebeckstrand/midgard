'use client'

import { motion } from 'motion/react'
import { Fragment, memo, type ReactElement, use } from 'react'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridDetailExpansion } from './engine/grid-group/resolve'
import { detailOpen } from './engine/grid-items/items'
import { isNewRowAddColumn } from './engine/grid-new-row-column'
import { pinnedCellProps } from './engine/grid-pin/styles'
import {
	cellRowIndex,
	type GridCellClick,
	type GridCellRovingActivate,
	type GridRowClick,
} from './engine/grid-row/cell'
import {
	type GridWindowRowProps,
	rowClickableClass,
	rowShellProps,
	specialCellClass,
} from './engine/grid-row/shell'
import { GridDataCell } from './grid-data-cell'
import { GridDetailRow, GridExpandToggle } from './grid-detail-row'
import { GridReorderKitContext } from './grid-reorder'
import { type GridRowSortable, GridRowSpecialCell } from './grid-row-special-cell'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/**
 * Per-row wiring shared by the plain and virtualized bodies: the row/key/column
 * sources and the flags every {@link GridRow} reads. Both bodies extend this
 * with their own layout props and render rows through {@link renderGridRow}.
 *
 * @internal
 */
export type GridRowsProps<T> = {
	rows: readonly T[]
	rowKeys: (string | number)[]
	/**
	 * Each row's 0-based place in the view, while the cursor is on (empty
	 * otherwise). A grouped leaf reads it: the body order of its group can
	 * differ from the view order, and its cells key their cursor id on it.
	 */
	rowIndexMap: ReadonlyMap<T, number>
	/** Visible columns, in display order: each row renders its cells straight from these, and the loading/empty/spacer rows span them. */
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
	/** Renders each non-pinned data cell as a reordering cell that follows its header's shift through a CSS variable. */
	reorderable: boolean
	/**
	 * Whether rows are drag-reorderable right now. When true each row renders as a
	 * vertical sortable ({@link GridReorderableRow}) and its drag-handle column's
	 * grip is live. When false the grip (if any) is inert.
	 *
	 * @defaultValue false
	 */
	rowReorderActive: boolean
	/**
	 * Animate rows sliding to their sorted places — a Framer `layout` (FLIP) glide
	 * over each row's position change when a sort reorders the plain body. Resolved
	 * by {@link GridData}: opted in through {@link GridSort.animate} and already
	 * stood down under virtualization, grouping, and reduced motion, so a row
	 * honors it directly. @defaultValue false
	 */
	animateSortRows?: boolean
	/** Truncate overflowing cell content with an ellipsis and an on-hover tooltip. */
	truncate: boolean
	/** Frozen-column controls; pinned cells stick to an edge. `null` when none. */
	pinning: GridColumnPinning | null
	/** Under grid semantics (virtualization, pagination, or the navigable cursor), rows carry global `aria-rowindex`. */
	gridSemantics: boolean
	/** Global row-index base added to each rendered row's index: the page offset, plus one when a band row shows. */
	rowIndexOffset: number
	/**
	 * Master-detail wiring, or `null` when the grid isn't expandable: the
	 * expanded-key set, the per-row expandability predicate, the stable toggle,
	 * and the detail renderer. {@link renderGridRow} reads it to drive each
	 * expander cell and to append the detail panel row.
	 */
	expansion?: GridDetailExpansion<T> | null
}

/**
 * The window props of a data row. Its `aria-rowindex` comes from `rowIndex`,
 * which also sets the cell indexes. @internal
 */
type GridRowWindowProps = Pick<GridWindowRowProps, 'ref' | 'data-index'>

/**
 * Renders one engine row through {@link GridRow}, resolving its cells, key, and
 * per-row flags from the shared body wiring. `rowIndex` is the 1-based aria
 * position. It is set only under grid semantics. With `windowRow`, the row is
 * one item of a windowed master-detail body, and it renders without its detail
 * panel.
 *
 * @internal
 */
export function renderGridRow<T>(
	props: GridRowsProps<T>,
	row: T,
	dataRowIndex: number,
	rowIndex?: number,
	windowRow?: GridRowWindowProps,
): ReactElement {
	// `rowKeys` is built parallel to `rows` (see `Grid`), so the index is always present.
	const key = props.rowKeys[dataRowIndex] as string | number

	// Master-detail state for this row: whether it can expand and whether it is
	// open. Both flow to the row as primitives so the memoized row still holds.
	const expandable = props.expansion?.rowExpandable(row) ?? false

	const expanded = props.expansion ? detailOpen(row, key, props.expansion) : false

	const rowProps = {
		columns: props.visibleColumns,
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
		pinning: props.pinning,
		animateSortRows: props.animateSortRows,
		dataRowIndex,
		rowIndex,
		expanded,
		rowExpandable: expandable,
		toggleExpand: props.expansion?.toggle,
		// A plain body keeps each panel mounted, and a windowed body mounts one only
		// while it is open, so the expander names a panel only when one is there.
		detailPanelId:
			props.expansion && (!windowRow || expanded) ? props.expansion.panelId(key) : undefined,
		...windowRow,
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
	// A windowed body renders the panel as an item of its own. A row that
	// `rowExpandable` rejects gets no panel, so `render` never sees it.
	if (!props.expansion || windowRow || !expandable) return rowNode

	return (
		<Fragment key={key}>
			{rowNode}
			<GridDetailRow<T>
				rowKey={key}
				panelId={props.expansion.panelId(key)}
				row={row}
				render={props.expansion.render}
				colSpan={props.visibleColumns.length}
				expanded={expanded}
			/>
		</Fragment>
	)
}

/** Props for {@link GridRow}. @internal */
export type GridRowProps<T> = {
	row: T
	rowKey: string | number
	/**
	 * The visible columns, in display order. The row renders one cell per entry
	 * straight from the column's declaration (`cell` / `selectable` / `actions` /
	 * …). No engine row or cell objects sit in between. That layer once forced a
	 * `Row` per data row on grids no transform had touched. Passed in (not
	 * derived) so the memoized row re-renders when the visible set changes.
	 */
	columns: GridColumn<T>[]
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
	 * When true, each non-pinned data cell renders as a reordering cell. It follows
	 * its header's shift through a CSS variable, so the whole column drags as one.
	 * @defaultValue false
	 */
	reorderable?: boolean
	/**
	 * Truncate overflowing cell content to one line with an ellipsis and a
	 * tooltip; a column's {@link GridColumn.cellTooltip} customizes or disables
	 * the tooltip.
	 */
	truncate: boolean
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
	 * 1-based position in the full row set (header = 1, or 2 below a band row).
	 * Set under grid semantics: virtualization, pagination, or the navigable
	 * cursor. Assistive
	 * tech then reports position in the full set, not the rendered slice.
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
	 * {@link GridReorderableRow}). `undefined` for a plain row, whose drag-handle
	 * cell (if any) then renders an inert grip.
	 *
	 * @internal
	 */
	sortable?: GridRowSortable
	/**
	 * Whether this row animates to its sorted place (a Framer `layout` FLIP) when
	 * a sort reorders it. Ignored on a drag-reorder node
	 * ({@link GridRowProps.sortable}), which drives its own transform. Threaded
	 * from {@link GridRowsProps.animateSortRows}.
	 * @defaultValue false
	 */
	animateSortRows?: boolean
	/**
	 * This row's master-detail open state, read by an {@link GridColumn.expander}
	 * cell's chevron. @defaultValue false
	 */
	expanded?: boolean
	/**
	 * Whether this row can expand — a grid with an `expandable` binding and a row
	 * the binding accepts. An expander cell on a row this rejects stays a quiet
	 * rail. Passed as a primitive (not an object) so the memoized row holds.
	 * @defaultValue false
	 */
	rowExpandable?: boolean
	/** Stable master-detail toggle from the expansion hook; safe through `memo`. @internal */
	toggleExpand?: (key: string | number) => void
	/** The id of the row's mounted detail panel, for the expander's `aria-controls`. */
	detailPanelId?: string
} & GridRowWindowProps

/**
 * A `TableRow` that can carry Framer's `layout` prop. A sort-animated row thus
 * FLIPs from its old slot to its new one when a sort reorders it (see
 * {@link GridRowProps.animateSortRows}). `motion.create` wraps the primitive
 * rather than a bare `motion.tr` so the row keeps `TableRow`'s base styling and
 * `data-slot`. @internal
 */
const MotionTableRow = motion.create(TableRow)

/**
 * One data row: maps `columns` to cells: drag handle, selection checkbox,
 * expander, actions, or `cell` content.
 *
 * @internal
 */
export function GridRowImpl<T>({
	row,
	rowKey,
	columns,
	loading,
	className,
	rowLabel,
	selected,
	toggleRow,
	selectable,
	reorderable = false,
	truncate,
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
	animateSortRows = false,
	expanded = false,
	rowExpandable = false,
	toggleExpand,
	detailPanelId,
	ref,
	'data-index': dataIndex,
}: GridRowProps<T>) {
	// A sort-animated row renders through `MotionTableRow`, so Framer's `layout`
	// FLIPs it from its old slot to its new one when a sort reorders the rows. A
	// drag-reorder node (`sortable`) never animates: it drives its own dnd-kit
	// transform, and row reorder is gated to unsorted grids anyway. Reduced motion
	// is resolved out upstream (see `GridData`), so the flag alone decides here.
	const animate = animateSortRows && sortable == null

	// One element, chosen per row. `layout` / `transition` stay `undefined` on the
	// plain row — React drops undefined props, so nothing lands on a static `<tr>`.
	const Row = (animate ? MotionTableRow : TableRow) as typeof MotionTableRow

	return (
		<Row
			layout={animate ? 'position' : undefined}
			transition={animate ? k.motion.sort : undefined}
			// The `<tr>` is the row's dnd-kit sortable node when reorderable; its
			// transform/transition ride the inline style, and `data-dragging` lifts it.
			// A windowed master-detail body measures the row. Row reorder, which
			// owns the node ref of a sortable row, stands down under a window.
			ref={sortable?.setNodeRef ?? ref}
			data-index={dataIndex}
			style={sortable?.style}
			data-dragging={sortable ? dataAttr(sortable.dragging) : undefined}
			// The shared row shell: identifying/state attributes, pointer handlers
			// (cell-level first, then row-level), and Enter / Space activation gated
			// to the row itself (see `rowShellProps`).
			{...rowShellProps({
				columns,
				row,
				rowKey,
				selected,
				selectable,
				rowRoving,
				onRowClick,
				onCellClick,
				onRowDoubleClick,
				onCellDoubleClick,
			})}
			data-row-index={dataRowIndex}
			aria-rowindex={rowIndex}
			// Focusability: a row-roving row omits `tabIndex` so the roving hook can
			// own it (one row at `0`, the rest `-1`); the virtualized body keeps the
			// legacy static per-row stop; cell roving and the navigable cursor leave
			// the row unfocusable (the cells / the table hold focus).
			tabIndex={rowRoving ? undefined : rowStaticStop ? 0 : undefined}
			// A clickable row carries the pointer cursor and a keyboard focus ring (see
			// `k.row.clickable`); its hover wash is the shared `<Table hover>` variant
			// that `GridData` enables for any row- or cell-level click handler.
			className={cn(
				loading && k.row.loading,
				rowClickableClass({ onRowClick, onCellClick, onRowDoubleClick, onCellDoubleClick }),
				sortable && k.row.reorder.dragging,
				className,
			)}
		>
			{columns.map((col, colIdx) => {
				// Cell column indices accompany `aria-rowindex`, which grid semantics
				// set (rowIndex is only set then).
				const colIndex = rowIndex !== undefined ? colIdx + 1 : undefined

				const specialClass = specialCellClass(col)

				if (specialClass) {
					const pinned = pinnedCellProps(pinning, col)

					return (
						<TableCell
							key={col.id}
							aria-colindex={colIndex}
							className={cn(specialClass, pinned.className)}
							style={pinned.style}
							data-grid-pin={pinned.pin}
						>
							{col.expander ? (
								toggleExpand && (
									<GridExpandToggle
										expanded={expanded}
										expandable={rowExpandable}
										rowKey={rowKey}
										rowLabel={rowLabel}
										toggle={toggleExpand}
										panelId={detailPanelId}
									/>
								)
							) : (
								<GridRowSpecialCell
									col={col}
									row={row}
									rowKey={rowKey}
									selected={selected}
									toggleRow={toggleRow}
									rowLabel={rowLabel}
									sortable={sortable}
								/>
							)}
						</TableCell>
					)
				}

				// The Add column of the new-row slot is empty in a data row, so its
				// cell reads no editing session.
				if (isNewRowAddColumn(col.id)) {
					return <TableCell key={col.id} aria-colindex={colIndex} className={cn(k.cell.actions)} />
				}

				return (
					<GridDataCell<T>
						key={col.id}
						col={col}
						row={row}
						rowIndex={cellRowIndex(col, dataRowIndex)}
						rowKey={rowKey}
						colIndex={colIndex}
						columnIndex={colIdx}
						reorderable={reorderable}
						truncate={truncate}
						pinning={pinning}
						cellRoving={cellRoving}
						cellActivate={cellActivate}
					/>
				)
			})}
		</Row>
	)
}

/** Memoized {@link GridRowImpl}; re-renders a row only when its own props change. @internal */
export const GridRow = memo(GridRowImpl) as typeof GridRowImpl

/** Does nothing with a node, for the static bindings. @internal */
const ignoreNode = () => {}

/** The style of a row at rest. @internal */
const REST_STYLE = {}

/**
 * The bindings of a row before the drag and drop module is loaded: a row at
 * rest, which no drag can start. Its grip has the layout of a live grip.
 *
 * @internal
 */
const STATIC_ROW_SORTABLE: GridRowSortable = {
	setNodeRef: ignoreNode,
	setActivatorNodeRef: ignoreNode,
	attributes: undefined,
	listeners: undefined,
	style: REST_STYLE,
	dragging: false,
}

/**
 * A drag-reorderable body row. It renders the sortable row of the drag and drop
 * module when that module is loaded (see {@link GridReorderKitContext}), else
 * the same row at rest, with the same layout.
 *
 * @internal
 */
function GridReorderableRowImpl<T>(props: GridRowProps<T>) {
	const kit = use(GridReorderKitContext)

	if (kit) return <kit.SortableRow<T> {...props} />

	return <GridRowImpl<T> {...props} sortable={STATIC_ROW_SORTABLE} />
}

/** Memoized {@link GridReorderableRowImpl}. @internal */
const GridReorderableRow = memo(GridReorderableRowImpl) as typeof GridReorderableRowImpl
