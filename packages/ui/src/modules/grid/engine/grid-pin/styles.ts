import type { CSSProperties } from 'react'
import { cn } from '../../../../core'
import { k } from '../../../../recipes/kata/grid'
import type { GridColumnPinning } from '../grid-table/pinning-view'

/**
 * Inline sticky offset for a pinned cell, or `undefined` when the column
 * scrolls. A `'left'` pin names the inline start, and a `'right'` pin the inline
 * end. The offset is therefore `insetInlineStart` or `insetInlineEnd`. A
 * right-to-left grid then sticks a left pin to its physical right edge. Each
 * offset is the summed width of the frozen columns between the cell and that
 * edge. Pairs with
 * {@link pinnedClassName}, which carries the `position: sticky` itself.
 *
 * The offset is the committed one. When an offset moves, the grid writes the new
 * offset to the cells that carry {@link pinnedCellAttribute}. A cell with this
 * style must therefore carry that attribute too.
 *
 * @internal
 */
export function pinnedOffsetStyle(
	pinning: GridColumnPinning | null,
	id: string | number,
): CSSProperties | undefined {
	const frozen = pinning?.column(id)

	const offset = pinning?.offset(id)

	if (!frozen || offset === undefined) return undefined

	return frozen.side === 'left' ? { insetInlineStart: offset } : { insetInlineEnd: offset }
}

/**
 * The value of the `data-grid-pin` attribute for a frozen cell: its column id,
 * or `undefined` when the column scrolls. The grid finds the cells of a moved
 * column through it, and writes their new offset without a render.
 *
 * @internal
 */
export function pinnedCellAttribute(
	pinning: GridColumnPinning | null,
	id: string | number,
): string | undefined {
	return pinning?.column(id) ? String(id) : undefined
}

/**
 * Sticky, opaque-surface, boundary-border, and boundary-shadow classes for a
 * pinned cell, or `''` when the column scrolls. Only the innermost column of each
 * frozen group (the one at the scroll-facing boundary) carries the edge border
 * and the separating shadow. That border is at the inline end for a left
 * (start) group, and at the inline start for a right (end) group. The columns
 * behind it get just the sticky surface. The engine's left/right sections
 * combine pinned and locked columns, so the boundary resolves across whichever mix
 * is frozen. `header` selects the header layer (above the sticky head).
 *
 * @internal
 */
export function pinnedClassName(
	pinning: GridColumnPinning | null,
	id: string | number,
	options: { header?: boolean } = {},
): string {
	const frozen = pinning?.column(id)

	if (!frozen) return ''

	const { side, boundary } = frozen

	const sideBorder = boundary && (side === 'left' ? k.pinned.border.end : k.pinned.border.start)

	const edge = boundary && (side === 'left' ? k.pinned.edge.start : k.pinned.edge.end)

	return cn(options.header ? k.pinned.head : k.pinned.cell, sideBorder, edge)
}

/**
 * The pinned chrome of a body cell: its classes, its sticky-offset style, and
 * the value of its `data-grid-pin` attribute. Each part is empty when the cell
 * scrolls.
 *
 * @internal
 */
export type PinnedCellChrome = {
	className: string
	style: CSSProperties | undefined
	pin: string | undefined
}

/**
 * The pinned chrome a body cell merges: the sticky/boundary classes joined with
 * the column's own `className`, and the sticky-offset style. It also gives the
 * `pin` value for the `data-grid-pin` attribute of the cell. One call per cell
 * in place of the chrome every renderer repeated.
 *
 * @internal
 */
export function pinnedCellProps(
	pinning: GridColumnPinning | null,
	col: { id: string | number; className?: string },
): PinnedCellChrome {
	return {
		className: cn(pinnedClassName(pinning, col.id), col.className),
		style: pinnedOffsetStyle(pinning, col.id),
		pin: pinnedCellAttribute(pinning, col.id),
	}
}

/** The chrome of a cell that scrolls. @internal */
const NO_PIN: PinnedCellChrome = { className: '', style: undefined, pin: undefined }

/**
 * The pinned chrome of one cell that spans a run of columns, such as the label
 * cell of an aggregate row. When all the columns of the run freeze to one edge,
 * the cell sticks to that edge. It takes the sticky offset of the column at the
 * edge, and the boundary classes of the column that faces the scroll. Otherwise
 * the cell scrolls, and the chrome is empty. The column's own `className` does
 * not apply, because the cell is not the cell of one column.
 *
 * @internal
 */
export function pinnedSpanProps(
	pinning: GridColumnPinning | null,
	columns: readonly { id: string | number }[],
): PinnedCellChrome {
	const first = columns[0]

	const last = columns[columns.length - 1]

	const side = first && pinning?.column(first.id)?.side

	if (!first || !last || !side) return NO_PIN

	if (columns.some((col) => pinning?.column(col.id)?.side !== side)) return NO_PIN

	// A left run sticks at its first column and faces the scroll with its last.
	// A right run is the mirror.
	const [edge, face] = side === 'left' ? [first, last] : [last, first]

	return {
		className: pinnedClassName(pinning, face.id),
		style: pinnedOffsetStyle(pinning, edge.id),
		pin: pinnedCellAttribute(pinning, edge.id),
	}
}

/**
 * The header-cell counterpart of {@link pinnedCellProps}: the header-layer
 * pinned classes joined with the column's `headerClassName`, and the fixed
 * width (when set) merged under the sticky offset. It also gives the `pin`
 * value.
 *
 * @internal
 */
export function pinnedHeaderProps(
	pinning: GridColumnPinning | null,
	column: { id: string | number; headerClassName?: string },
	width: string | number | undefined,
): { className: string; style: CSSProperties; pin: string | undefined } {
	return {
		className: cn(pinnedClassName(pinning, column.id, { header: true }), column.headerClassName),
		style: {
			...(width !== undefined ? { width } : null),
			...pinnedOffsetStyle(pinning, column.id),
		},
		pin: pinnedCellAttribute(pinning, column.id),
	}
}
