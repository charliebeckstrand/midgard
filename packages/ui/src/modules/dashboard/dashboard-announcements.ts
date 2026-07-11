/**
 * Pure builders for the dashboard's drag and resize announcements (WCAG
 * 4.1.3): the strings dnd-kit's live region speaks as a tile lifts, moves,
 * drops, or cancels, and a keyboard resize commits. Kept pure and separate
 * from the hooks so the wording is unit-testable without a gesture.
 */

import type { LayoutCell } from './dashboard-layout'

/** A cell's spoken position: 1-based column and row over the grid's span. @internal */
function describePosition(cell: LayoutCell, columns: number): string {
	return `column ${cell.x + 1} of ${columns}, row ${cell.y + 1}`
}

/**
 * The announcement for a tile lifting: `Picked up tile Revenue, column 3 of
 * 24, row 5.` The name is the tile's id until a label registry earns its
 * place.
 *
 * @internal
 */
export function describeDragStart(id: string, cell: LayoutCell, columns: number): string {
	return `Picked up tile ${id}, ${describePosition(cell, columns)}.`
}

/**
 * The announcement while a lifted tile moves: `Tile Revenue over Orders,
 * drop to reorder.` for an in-row shift or `…drop to swap.` for a cross-row
 * trade while a partner is on the table, else its would-be landing spot.
 *
 * @internal
 */
export function describeDragMove(
	id: string,
	cell: LayoutCell,
	columns: number,
	partner?: { id: string; shift: boolean },
): string {
	if (partner !== undefined) {
		return `Tile ${id} over ${partner.id}, drop to ${partner.shift ? 'reorder' : 'swap'}.`
	}

	return `Tile ${id} moved to ${describePosition(cell, columns)}.`
}

/** The announcement for a settled drop: `Tile Revenue dropped at column 3 of 24, row 5.` @internal */
export function describeDragEnd(id: string, cell: LayoutCell, columns: number): string {
	return `Tile ${id} dropped at ${describePosition(cell, columns)}.`
}

/** The announcement for a reverted drag: `Tile Revenue returned to column 3 of 24, row 5.` @internal */
export function describeDragCancel(id: string, cell: LayoutCell, columns: number): string {
	return `Tile ${id} returned to ${describePosition(cell, columns)}.`
}

/**
 * The announcement for a settled resize (a keyboard resize commits per
 * arrow press): `Tile Revenue resized to 12 columns by 8 rows.`
 *
 * @internal
 */
export function describeResize(id: string, cell: LayoutCell): string {
	return `Tile ${id} resized to ${cell.w} ${cell.w === 1 ? 'column' : 'columns'} by ${cell.h} ${
		cell.h === 1 ? 'row' : 'rows'
	}.`
}
