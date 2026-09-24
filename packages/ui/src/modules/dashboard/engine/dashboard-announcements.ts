/**
 * The live-region text for the dashboard gestures. Each function is pure, so a
 * test reads the exact sentence that a screen reader speaks.
 */

import type { DashboardDragKind } from './dashboard-drag'
import type { DashboardCell } from './dashboard-layout'

/** The position of a cell in words: its first column and its width in columns. */
export function describeCell(cell: DashboardCell, columns: number): string {
	return `column ${cell.x + 1} of ${columns}, row ${cell.y + 1}, ${cell.w} columns wide`
}

/** The text when a drag lifts a tile. */
export function describeDragStart(label: string, cell: DashboardCell, columns: number): string {
	return `Picked up ${label} at ${describeCell(cell, columns)}. Use the arrow keys to move it. Press Space to drop it, or Escape to cancel.`
}

/** The text when a drag previews a new place, or no change. */
export function describeDragMove(
	label: string,
	cell: DashboardCell | null,
	columns: number,
	kind: DashboardDragKind | null,
	partner: string | null,
): string {
	if (cell === null || kind === null) return `${label} cannot go here. A drop now changes nothing.`

	const place = describeCell(cell, columns)

	if (kind === 'swap' && partner !== null) return `${label} swaps with ${partner}, to ${place}.`

	if (kind === 'shift' && partner !== null)
		return `${label} moves before or after ${partner}, to ${place}.`

	return `${label} moves to ${place}.`
}

/** The text when a drop commits, or changes nothing. */
export function describeDragEnd(
	label: string,
	cell: DashboardCell,
	columns: number,
	moved: boolean,
): string {
	return moved
		? `Dropped ${label} at ${describeCell(cell, columns)}.`
		: `Dropped ${label}. The board did not change.`
}

/** The text when a drag cancels. */
export function describeDragCancel(label: string, cell: DashboardCell, columns: number): string {
	return `Canceled. ${label} returned to ${describeCell(cell, columns)}.`
}

/** The text when a tile action removes a tile. */
export function describeRemove(label: string): string {
	return `Removed ${label}.`
}

/** The text when a tile action duplicates a tile. */
export function describeDuplicate(label: string): string {
	return `Duplicated ${label}.`
}

/** The text when a tidy packs the board, or finds nothing to move. */
export function describeTidy(moved: number): string {
	if (moved === 0) return 'The board is already tidy.'

	return `Tidied the board. Moved ${moved} ${moved === 1 ? 'tile' : 'tiles'} up.`
}
