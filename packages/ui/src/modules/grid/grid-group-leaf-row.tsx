'use client'

import { type ComponentProps, memo, type ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { MountHold } from '../../primitives/mount'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { NO_PADDING } from './engine/grid-constants'
import type { GridLeaf } from './engine/grid-group/tree'
import { isNewRowAddColumn } from './engine/grid-new-row-column'
import { pinnedCellProps } from './engine/grid-pin/styles'
import {
	cellPropsAt,
	type GridCellClick,
	type GridCellRovingActivate,
	type GridIndexedColumn,
	type GridRowClick,
} from './engine/grid-row/cell'
import {
	cellRovingAttrs,
	type GridWindowRowProps,
	rowClickableClass,
	rowShellProps,
} from './engine/grid-row/shell'
import { cellBody } from './grid-cell-content'
import type { GridRowsProps } from './grid-row'
import { GridRowSpecialCell } from './grid-row-special-cell'
import type { GridColumn } from './types'
import { useGridNavContext } from './use-grid-navigation'
import { useGridRevealHold } from './use-grid-reveal-hold'
import type { GridColumnPinning } from './use-grid-table'

/**
 * A leaf cell's `<td>` class by column kind: the kata class of the selection or
 * the actions cell, as on a flat row. The reveal wrappers inherit its alignment.
 * @internal
 */
function leafCellClass<T>(col: GridColumn<T>): string | undefined {
	if (col.selectable) return k.cell.select

	if (col.actions && !isNewRowAddColumn(col.id)) return k.cell.actions

	return undefined
}

/** Props for {@link GridGroupLeafRow}. @internal */
type GridGroupLeafRowProps<T> = {
	/** Whether the row's group is expanded — drives the open/collapsed reveal and hides it from AT when closed. */
	expanded: boolean
	/** The row's 0-based place in the view, which a cursor cell reads (see {@link GridIndexedColumn}). */
	rowIndex: number
	/** The visible columns, in render order. */
	columns: GridColumn<T>[]
	row: T
	rowKey: string | number
	selected: boolean
	toggleRow: (key: string | number) => void
	selectable: boolean
	rowLabel?: string
	onRowClick?: GridRowClick<T>
	onCellClick?: GridCellClick<T>
	onRowDoubleClick?: GridRowClick<T>
	onCellDoubleClick?: GridCellClick<T>
	/** Whether the leaf row is a roving-tabindex item (row-mode keyboard nav). @defaultValue false */
	rowRoving?: boolean
	/** Whether the leaf's data cells are roving-tabindex items (cell-mode keyboard nav). @defaultValue false */
	cellRoving?: boolean
	/** Stable focused-cell activation for cell roving (see {@link GridRowsProps.cellActivate}). */
	cellActivate?: GridCellRovingActivate<T>
	truncate: boolean
	pinning: GridColumnPinning | null
	/** The group's overlay color, coloring each leaf's leading rail; `undefined` keeps it neutral. */
	color?: PaletteColor
	/**
	 * Whether an open leaf mounts at the closed track and then opens over the
	 * transition. A windowed body sets it on the leaves that fit in one viewport
	 * when their group expands. A leaf that is already mounted ignores it.
	 * @defaultValue false
	 */
	enter?: boolean
	/**
	 * The row's level in a treegrid. A client-grouped body sets it, and a
	 * treegrid exposes it as `aria-level`. Manual grouping leaves it unset.
	 */
	level?: number
} & GridWindowRowProps

/** Resolves a leaf cell's inner content: an inert grip, the checkbox, the actions, or the rendered value. @internal */
function leafCellInner<T>(args: {
	col: GridIndexedColumn<T>
	row: T
	rowIndex: number
	rowKey: string | number
	selected: boolean
	toggleRow: (key: string | number) => void
	rowLabel: string | undefined
	truncate: boolean
}): ReactNode {
	const { col, row, rowIndex, rowKey, selected, toggleRow, rowLabel, truncate } = args

	// The Add column of the new-row slot is empty in a leaf row.
	if (isNewRowAddColumn(col.id)) return null

	// Row reorder stands down under grouping, so the leaf gives no sortable and
	// its grip is inert.
	if (col.dragHandle || col.selectable || col.actions) {
		return (
			<GridRowSpecialCell
				col={col}
				row={row}
				rowKey={rowKey}
				selected={selected}
				toggleRow={toggleRow}
				rowLabel={rowLabel}
			/>
		)
	}

	// The column renders the cell as a flat row does.
	return cellBody(col, row, rowIndex, truncate)
}

/** Props for {@link GridGroupLeafCell}. @internal */
type GridGroupLeafCellProps<T> = {
	col: GridIndexedColumn<T>
	row: T
	rowIndex: number
	rowKey: string | number
	selected: boolean
	toggleRow: (key: string | number) => void
	rowLabel: string | undefined
	truncate: boolean
	pinning: GridColumnPinning | null
	/** Whether this is the row's first cell (it carries the group rail). */
	leading: boolean
	/** The group's overlay color, coloring the leading rail; `undefined` keeps it neutral. */
	color?: PaletteColor
	/** Whether the cell's height reveal renders open — the row's reveal hold, not `expanded`. */
	open: boolean
	/** Density padding class for the innermost content wrapper. */
	pad: string
	/** Whether this data cell is a roving-tabindex item (cell-mode keyboard nav). @defaultValue false */
	cellRoving?: boolean
	/** Stable focused-cell activation for cell roving. */
	cellActivate?: GridCellRovingActivate<T>
	/** The 1-based `aria-colindex`, set when the row carries an `aria-rowindex`. */
	colIndex?: number
}

/**
 * One collapsible leaf cell. The `<td>` sits at inline `padding: 0`, so nothing
 * holds it open. Its content nests in a CSS grid whose single row tweens
 * `1fr`↔`0fr` (`data-open`). That is the modern auto-height reveal, which
 * collapses the cell (and so the row) to nothing without JS measurement. `min-h-0` +
 * `overflow-hidden` on the clip lets the track shrink past the content; the
 * density padding rides the innermost wrapper so it collapses with the row.
 *
 * @internal
 */
function GridGroupLeafCell<T>({
	col,
	row,
	rowIndex,
	rowKey,
	selected,
	toggleRow,
	rowLabel,
	truncate,
	pinning,
	leading,
	color,
	open,
	pad,
	cellRoving = false,
	cellActivate,
	colIndex,
}: GridGroupLeafCellProps<T>) {
	// Only data cells rove; the non-data columns (selection, actions, drag handle,
	// expander) stay plain. `cellRovingAttrs` returns the marker + Enter/Space activation.
	const dataCell = isDataColumn(col)

	const pinned = pinnedCellProps(pinning, col)

	// The column's own cell props, such as the cursor's id and role, as on a flat row.
	const extra = cellPropsAt(col, row, rowIndex)

	const roving = cellRovingAttrs({
		cellRoving: cellRoving && dataCell,
		cellActivate,
		col,
		row,
		rowKey,
		keyDown: extra?.onKeyDown,
	})

	return (
		<td
			{...extra}
			// Marks a data cell, as on a flat row. The cell menu, the cell click, and
			// the autosizer read it, so a non-data cell carries none.
			data-grid-col={dataCell ? col.id : undefined}
			aria-colindex={colIndex}
			{...roving}
			// The first cell carries the group's rail, so it runs unbroken down the
			// group's leaf rows and joins the header's segment above — in the group's
			// color when the row manager assigns one, else the neutral tint.
			className={cn(
				cellRoving && dataCell && k.cell.rovable,
				leading && k.row.group.rail.padded,
				leading && color && k.row.group.rail.color[color],
				leafCellClass(col),
				pinned.className,
				extra?.className,
			)}
			style={{ ...extra?.style, ...NO_PADDING, ...pinned.style }}
			data-grid-pin={pinned.pin}
		>
			<div className={cn(k.row.group.reveal.track)} data-open={dataAttr(open)}>
				<div className={cn(k.row.group.reveal.clip)}>
					<div className={cn(pad)}>
						{leafCellInner({
							col,
							row,
							rowIndex,
							rowKey,
							selected,
							toggleRow,
							rowLabel,
							truncate,
						})}
					</div>
				</div>
			</div>
		</td>
	)
}

/**
 * A collapsible group leaf row: an ordinary `<tr>` whose every cell nests its
 * content in a CSS `grid-template-rows: 1fr↔0fr` reveal (see
 * {@link GridGroupLeafCell}). The row therefore grows and shrinks with its group
 * over a CSS transition. That is reliable in a `<table>` where a JS height tween
 * on a `<td>` is not, and it honors `prefers-reduced-motion` through
 * `motion-reduce`. The row
 * stays mounted whatever the group's expansion; a closed group's leaves are
 * `inert` and hidden from assistive tech. Kept apart from the plain
 * {@link GridRow} so the non-grouped hot path stays untouched.
 *
 * @internal
 */
function GridGroupLeafRowImpl<T>({
	expanded,
	rowIndex,
	columns,
	row,
	rowKey,
	selected,
	toggleRow,
	selectable,
	rowLabel,
	onRowClick,
	onCellClick,
	onRowDoubleClick,
	onCellDoubleClick,
	rowRoving = false,
	cellRoving = false,
	cellActivate,
	truncate,
	pinning,
	color,
	enter = false,
	level,
	...windowRow
}: GridGroupLeafRowProps<T>) {
	const pad = k.row.group.reveal.pad

	// The cursor makes a client-grouped grid a treegrid, which reads the level.
	const tree = useGridNavContext().enabled

	// Rests the row once its reveal has shrunk to nothing, so a collapsed group's
	// leaves stop riding the visible commit. A windowed leaf that enters mounts
	// at the closed track and opens over the transition.
	const reveal = useGridRevealHold(expanded, enter)

	return (
		<MountHold hold={reveal.hold} name="grid-group-leaf-row">
			<tr
				{...windowRow}
				// The shared row shell (attributes, pointer handlers, Enter / Space
				// activation). Row-mode roving marks an expanded leaf an item the roving
				// hook owns the `tabIndex` of; a collapsed leaf is `inert` and excluded
				// by the selector, so roving is gated on expansion here.
				{...rowShellProps({
					columns,
					row,
					rowKey,
					selected,
					selectable,
					rowRoving: rowRoving && expanded,
					onRowClick,
					onCellClick,
					onRowDoubleClick,
					onCellDoubleClick,
				})}
				// A collapsed group's leaves are visually clipped to nothing; take them out
				// of the tab order and the accessibility tree too (WCAG 1.3.1 / 2.4.3).
				// These cover the collapse from its first frame; the hold above covers
				// its cost from the last one, once the reveal has finished shrinking.
				aria-hidden={expanded ? undefined : true}
				aria-level={tree ? level : undefined}
				inert={!expanded}
				onTransitionEnd={reveal.onTransitionEnd}
				// Row roving hands the `tabIndex` to the roving hook; without it a clickable
				// expanded leaf stays a static stop, and cell roving leaves the row unfocusable.
				tabIndex={rowRoving ? undefined : onRowClick && !cellRoving && expanded ? 0 : undefined}
				className={cn(
					rowClickableClass({ onRowClick, onCellClick, onRowDoubleClick, onCellDoubleClick }),
				)}
			>
				{columns.map((col, colIdx) => {
					return (
						<GridGroupLeafCell<T>
							key={col.id}
							col={col}
							row={row}
							rowIndex={rowIndex}
							rowKey={rowKey}
							selected={selected}
							toggleRow={toggleRow}
							rowLabel={rowLabel}
							truncate={truncate}
							pinning={pinning}
							leading={colIdx === 0}
							color={color}
							open={reveal.open}
							pad={pad}
							cellRoving={cellRoving}
							cellActivate={cellActivate}
							colIndex={windowRow['aria-rowindex'] !== undefined ? colIdx + 1 : undefined}
						/>
					)
				})}
			</tr>
		</MountHold>
	)
}

/**
 * Memoized {@link GridGroupLeafRowImpl}. A body render, or a window step, that leaves the leaf's props as they were renders neither the leaf nor its cells, as {@link GridRow} holds a flat row. @internal
 */
export const GridGroupLeafRow = memo(GridGroupLeafRowImpl) as typeof GridGroupLeafRowImpl

/**
 * The {@link GridGroupLeafRow} prop block the client-grouped and manual-grouped
 * bodies share. It is the leaf's identity/selection wiring from the shared body
 * props, plus the caller's expansion state. Under client grouping it also
 * carries the group color.
 *
 * @internal
 */
export function leafRowProps<T>(
	props: GridRowsProps<T>,
	leaf: GridLeaf<T>,
	args: {
		expanded: boolean
		color?: PaletteColor
		/** The leaf's treegrid level; the client-grouped body sets it. */
		level?: number
	},
): ComponentProps<typeof GridGroupLeafRowImpl<T>> {
	return {
		expanded: args.expanded,
		columns: props.visibleColumns,
		row: leaf.row,
		rowIndex: props.rowIndexMap.get(leaf.row) ?? -1,
		rowKey: leaf.key,
		selected: props.selection.has(leaf.key),
		toggleRow: props.toggleRow,
		selectable: props.selectable,
		rowLabel: props.rowLabel?.(leaf.row),
		onRowClick: props.onRowClick,
		onCellClick: props.onCellClick,
		onRowDoubleClick: props.onRowDoubleClick,
		onCellDoubleClick: props.onCellDoubleClick,
		rowRoving: props.rowRoving,
		cellRoving: props.cellRoving,
		cellActivate: props.cellActivate,
		truncate: props.truncate,
		pinning: props.pinning,
		color: args.color,
		level: args.level,
	}
}
