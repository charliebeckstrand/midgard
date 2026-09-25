import type { CSSProperties } from 'react'
import { cn } from '../../../../core'
import { k } from '../../../../recipes/kata/grid'
import type { GridColumnPinning } from '../../use-grid-table'
import { pinOffsetVar } from './layout'

/**
 * Inline sticky offset for a pinned cell, or `undefined` when the column
 * scrolls. A `'left'` pin names the inline start, and a `'right'` pin the inline
 * end. The offset is therefore `insetInlineStart` or `insetInlineEnd`. A
 * right-to-left grid then sticks a left pin to its physical right edge. Each
 * offset is the summed width of the frozen columns between the cell and that
 * edge. The offset is a CSS variable that the grid sets on the `<table>` (see
 * `frozenOffsetVars`). A width change therefore moves it, and the cell does
 * not render again. Pairs with {@link pinnedClassName}, which carries the
 * `position: sticky` itself.
 *
 * @internal
 */
export function pinnedOffsetStyle(
	pinning: GridColumnPinning | null,
	id: string | number,
): CSSProperties | undefined {
	const frozen = pinning?.column(id)

	if (!frozen) return undefined

	const offset = `var(${pinOffsetVar(frozen.side, frozen.slot)})`

	return frozen.side === 'left' ? { insetInlineStart: offset } : { insetInlineEnd: offset }
}

/**
 * Sticky, opaque-surface, boundary-border, and boundary-shadow classes for a
 * pinned cell, or `''` when the column scrolls. Only the innermost column of each
 * frozen group — the one at the scroll-facing boundary — carries the edge border
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
 * The pinned chrome a body cell merges: the sticky/boundary classes joined with
 * the column's own `className`, and the sticky-offset style. One call per cell
 * in place of the class/style pair every renderer repeated.
 *
 * @internal
 */
export function pinnedCellProps(
	pinning: GridColumnPinning | null,
	col: { id: string | number; className?: string },
): { className: string; style: CSSProperties | undefined } {
	return {
		className: cn(pinnedClassName(pinning, col.id), col.className),
		style: pinnedOffsetStyle(pinning, col.id),
	}
}

/**
 * The header-cell counterpart of {@link pinnedCellProps}: the header-layer
 * pinned classes joined with the column's `headerClassName`, and the fixed
 * width (when set) merged under the sticky offset.
 *
 * @internal
 */
export function pinnedHeaderProps(
	pinning: GridColumnPinning | null,
	column: { id: string | number; headerClassName?: string },
	width: string | number | undefined,
): { className: string; style: CSSProperties } {
	return {
		className: cn(pinnedClassName(pinning, column.id, { header: true }), column.headerClassName),
		style: {
			...(width !== undefined ? { width } : null),
			...pinnedOffsetStyle(pinning, column.id),
		},
	}
}
