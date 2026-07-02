'use client'

import { type Cell, flexRender } from '@tanstack/react-table'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import { Checkbox } from '../../components/checkbox'
import { Icon } from '../../components/icon'
import { cn, dataAttr } from '../../core'
import type { DensityLevel } from '../../providers/density'
import { k } from '../../recipes/kata/grid'
import { GridCellContent } from './grid-cell-content'
import { pinnedClassName, pinnedOffsetStyle } from './grid-pinning'
import { fromInteractiveContent, type GridRowClick, resolveCellTooltip } from './grid-row'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/** Zero cell padding as an inline style — highest specificity, so it clears the table's density projection on `td`. @internal */
const NO_PADDING = { padding: 0 } as const

/** A leaf cell's extra `<td>` width class and inner-wrapper layout class, by column kind. @internal */
function leafCellChrome<T>(col: GridColumn<T>): { td: string; inner: string } {
	if (col.selectable) return { td: 'w-px', inner: 'text-center [line-height:0]' }

	if (col.actions) return { td: 'w-px whitespace-nowrap', inner: '' }

	return { td: '', inner: '' }
}

/** Props for {@link GridGroupLeafRow}. @internal */
type GridGroupLeafRowProps<T> = {
	/** Whether the row's group is expanded — drives the open/collapsed reveal and hides it from AT when closed. */
	expanded: boolean
	cells: Cell<T, unknown>[]
	row: T
	rowKey: string | number
	selected: boolean
	toggleRow: (key: string | number) => void
	selectable: boolean
	rowLabel?: string
	onRowClick?: GridRowClick<T>
	truncate: boolean
	settleWidths: (number | undefined)[]
	pinning: GridColumnPinning | null
	density: DensityLevel
}

/** Resolves a leaf cell's inner content by column kind — checkbox, actions, inert drag grip, or the rendered value. @internal */
function leafCellInner<T>(args: {
	col: GridColumn<T>
	cell: Cell<T, unknown>
	row: T
	rowKey: string | number
	selected: boolean
	toggleRow: (key: string | number) => void
	rowLabel: string | undefined
	truncate: boolean
	settleKey: number | undefined
}): ReactNode {
	const { col, cell, row, rowKey, selected, toggleRow, rowLabel, truncate, settleKey } = args

	const name = rowLabel ?? `row ${rowKey}`

	// The drag handle is inert under grouping (row reorder stands down there).
	if (col.dragHandle) {
		return (
			<button
				type="button"
				disabled
				aria-label={`Reorder ${name}`}
				className={cn(k.rowReorder.handle.disabled)}
			>
				<Icon icon={<GripVertical />} />
			</button>
		)
	}

	if (col.selectable) {
		return (
			<Checkbox
				checked={selected}
				onChange={() => toggleRow(rowKey)}
				aria-label={`Select ${name}`}
			/>
		)
	}

	if (col.actions) return col.actions(row)

	const raw = col.cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null

	if (truncate && raw != null) {
		return (
			<GridCellContent
				content={raw}
				tooltip={resolveCellTooltip(col, row)}
				resizeSettleKey={settleKey}
			/>
		)
	}

	return raw
}

/** Props for {@link GridGroupLeafCell}. @internal */
type GridGroupLeafCellProps<T> = {
	col: GridColumn<T>
	cell: Cell<T, unknown>
	row: T
	rowKey: string | number
	selected: boolean
	toggleRow: (key: string | number) => void
	rowLabel: string | undefined
	truncate: boolean
	settleKey: number | undefined
	pinning: GridColumnPinning | null
	/** Whether this is the row's leftmost cell (it carries the group rail). */
	leading: boolean
	/** Whether the group is open, driving the cell's height reveal. */
	expanded: boolean
	/** Density padding class for the innermost content wrapper. */
	pad: string
}

/**
 * One collapsible leaf cell: the `<td>` sits at inline `padding: 0` so nothing
 * holds it open, and its content nests in a CSS grid whose single row tweens
 * `1fr`↔`0fr` (`data-open`) — the modern auto-height reveal, which collapses the
 * cell (and so the row) to nothing without JS measurement. `min-h-0` +
 * `overflow-hidden` on the clip lets the track shrink past the content; the
 * density padding rides the innermost wrapper so it collapses with the row.
 *
 * @internal
 */
function GridGroupLeafCell<T>({
	col,
	cell,
	row,
	rowKey,
	selected,
	toggleRow,
	rowLabel,
	truncate,
	settleKey,
	pinning,
	leading,
	expanded,
	pad,
}: GridGroupLeafCellProps<T>) {
	const chrome = leafCellChrome(col)

	return (
		<td
			data-grid-col={col.id}
			// The leftmost cell carries the group's rail, so it runs unbroken down the
			// group's leaf rows and joins the header's segment above.
			className={cn(
				leading && k.rowGroup.rail,
				chrome.td,
				pinnedClassName(pinning, col.id),
				col.className,
			)}
			style={{ ...NO_PADDING, ...pinnedOffsetStyle(pinning, col.id) }}
		>
			<div className={cn(k.rowGroup.reveal)} data-open={dataAttr(expanded)}>
				<div className={cn(k.rowGroup.revealClip)}>
					<div className={cn(pad, chrome.inner)}>
						{leafCellInner({
							col,
							cell,
							row,
							rowKey,
							selected,
							toggleRow,
							rowLabel,
							truncate,
							settleKey,
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
 * {@link GridGroupLeafCell}), so the row grows and shrinks with its group over a
 * CSS transition — reliable in a `<table>` where a JS height tween on a `<td>` is
 * not, and honouring `prefers-reduced-motion` through `motion-reduce`. The row
 * stays mounted whatever the group's expansion; a closed group's leaves are
 * `inert` and hidden from assistive tech. Kept apart from the plain
 * {@link GridRow} so the non-grouped hot path stays untouched.
 *
 * @internal
 */
export function GridGroupLeafRow<T>({
	expanded,
	cells,
	row,
	rowKey,
	selected,
	toggleRow,
	selectable,
	rowLabel,
	onRowClick,
	truncate,
	settleWidths,
	pinning,
	density,
}: GridGroupLeafRowProps<T>) {
	const pad = k.rowGroup.revealPad({ density })

	return (
		<tr
			data-grid-row={String(rowKey)}
			data-selected={dataAttr(selected)}
			aria-selected={selectable ? selected : undefined}
			data-clickable={dataAttr(onRowClick != null)}
			// A collapsed group's leaves are visually clipped to nothing; take them out
			// of the tab order and the accessibility tree too (WCAG 1.3.1 / 2.4.3).
			aria-hidden={expanded ? undefined : true}
			inert={!expanded}
			tabIndex={onRowClick && expanded ? 0 : undefined}
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
			className={cn(onRowClick && k.row.clickable)}
		>
			{cells.map((cell, colIdx) => {
				const col = cell.column.columnDef.meta?.gridColumn

				if (!col) return null

				return (
					<GridGroupLeafCell<T>
						key={col.id}
						col={col}
						cell={cell}
						row={row}
						rowKey={rowKey}
						selected={selected}
						toggleRow={toggleRow}
						rowLabel={rowLabel}
						truncate={truncate}
						settleKey={settleWidths[colIdx]}
						pinning={pinning}
						leading={colIdx === 0}
						expanded={expanded}
						pad={pad}
					/>
				)
			})}
		</tr>
	)
}
