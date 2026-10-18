/**
 * The live-region text for the dashboard gestures. Each function is pure, so a
 * test reads the exact sentence that a screen reader speaks. Each takes the
 * intl of the reader and speaks in its language.
 */

import { defineMessages } from '../../../primitives/intl/intl-messages'
import type { IntlShape } from '../../../primitives/intl/types'
import type { DashboardDragKind } from './dashboard-drag'
import type { DashboardCell } from './dashboard-layout'

// The values of a message that names a tile at a cell.
type TileAtCell = { item: string; cell: string }

const messages = defineMessages<{
	cell: { column: number; columns: number; row: number; width: number }
	dragStart: TileAtCell
	cannotGo: { item: string }
	swaps: TileAtCell & { partner: string }
	shifts: TileAtCell & { partner: string }
	moves: TileAtCell
	droppedAt: TileAtCell
	droppedUnchanged: { item: string }
	canceled: TileAtCell
	removed: { item: string }
	duplicated: { item: string }
	tidied: { moved: number }
}>({
	cell: {
		id: 'ui.dashboard.cell',
		defaultMessage:
			'column {column} of {columns}, row {row}, {width, plural, one {# column} other {# columns}} wide',
		description:
			'The place of a dashboard tile: its first column, the count of columns, its row, and its width.',
	},
	dragStart: {
		id: 'ui.dashboard.dragStart',
		defaultMessage:
			'Picked up {item} at {cell}. Use the arrow keys to move it. Press Space to drop it, or Escape to cancel.',
		description:
			'Spoken when the reader picks up a dashboard tile. The cell is the place of the tile.',
	},
	cannotGo: {
		id: 'ui.dashboard.cannotGo',
		defaultMessage: '{item} cannot go here. A drop now changes nothing.',
		description: 'Spoken while a dragged tile is over a place where it cannot go.',
	},
	swaps: {
		id: 'ui.dashboard.swaps',
		defaultMessage: '{item} swaps with {partner}, to {cell}.',
		description:
			'Spoken while a dragged tile is over a place where a drop swaps it with another tile.',
	},
	shifts: {
		id: 'ui.dashboard.shifts',
		defaultMessage: '{item} moves before or after {partner}, to {cell}.',
		description:
			'Spoken while a dragged tile is over a place where a drop moves it next to another tile.',
	},
	moves: {
		id: 'ui.dashboard.moves',
		defaultMessage: '{item} moves to {cell}.',
		description: 'Spoken while a dragged tile is over an empty place.',
	},
	droppedAt: {
		id: 'ui.dashboard.droppedAt',
		defaultMessage: 'Dropped {item} at {cell}.',
		description: 'Spoken when a dragged tile drops at a new place.',
	},
	droppedUnchanged: {
		id: 'ui.dashboard.droppedUnchanged',
		defaultMessage: 'Dropped {item}. The board did not change.',
		description: 'Spoken when a dragged tile drops and nothing moves.',
	},
	canceled: {
		id: 'ui.dashboard.canceled',
		defaultMessage: 'Canceled. {item} returned to {cell}.',
		description: 'Spoken when a canceled drag puts a tile back at its place.',
	},
	removed: {
		id: 'ui.dashboard.removed',
		defaultMessage: 'Removed {item}.',
		description: 'Spoken when a tile action removes a tile.',
	},
	duplicated: {
		id: 'ui.dashboard.duplicated',
		defaultMessage: 'Duplicated {item}.',
		description: 'Spoken when a tile action makes a copy of a tile.',
	},
	tidied: {
		id: 'ui.dashboard.tidied',
		defaultMessage:
			'{moved, plural, =0 {The board is already tidy.} one {Tidied the board. Moved # tile up.} other {Tidied the board. Moved # tiles up.}}',
		description: 'Spoken when a tidy packs the board. The count is the number of tiles that moved.',
	},
})

/** The position of a cell in words: its first column and its width in columns. */
function describeCell(intl: IntlShape, cell: DashboardCell, columns: number): string {
	return intl.formatMessage(messages.cell, {
		column: cell.x + 1,
		columns,
		row: cell.y + 1,
		width: cell.w,
	})
}

/** The text when a drag lifts a tile. */
export function describeDragStart(
	intl: IntlShape,
	label: string,
	cell: DashboardCell,
	columns: number,
): string {
	return intl.formatMessage(messages.dragStart, {
		item: label,
		cell: describeCell(intl, cell, columns),
	})
}

/** The text when a drag previews a new place, or no change. */
export function describeDragMove(
	intl: IntlShape,
	label: string,
	cell: DashboardCell | null,
	columns: number,
	kind: DashboardDragKind | null,
	partner: string | null,
): string {
	if (cell === null || kind === null) return intl.formatMessage(messages.cannotGo, { item: label })

	const place = describeCell(intl, cell, columns)

	if (kind === 'swap' && partner !== null) {
		return intl.formatMessage(messages.swaps, { item: label, partner, cell: place })
	}

	if (kind === 'shift' && partner !== null) {
		return intl.formatMessage(messages.shifts, { item: label, partner, cell: place })
	}

	return intl.formatMessage(messages.moves, { item: label, cell: place })
}

/** The text when a drop commits, or changes nothing. */
export function describeDragEnd(
	intl: IntlShape,
	label: string,
	cell: DashboardCell,
	columns: number,
	moved: boolean,
): string {
	return moved
		? intl.formatMessage(messages.droppedAt, {
				item: label,
				cell: describeCell(intl, cell, columns),
			})
		: intl.formatMessage(messages.droppedUnchanged, { item: label })
}

/** The text when a drag cancels. */
export function describeDragCancel(
	intl: IntlShape,
	label: string,
	cell: DashboardCell,
	columns: number,
): string {
	return intl.formatMessage(messages.canceled, {
		item: label,
		cell: describeCell(intl, cell, columns),
	})
}

/** The text when a tile action removes a tile. */
export function describeRemove(intl: IntlShape, label: string): string {
	return intl.formatMessage(messages.removed, { item: label })
}

/** The text when a tile action duplicates a tile. */
export function describeDuplicate(intl: IntlShape, label: string): string {
	return intl.formatMessage(messages.duplicated, { item: label })
}

/** The text when a tidy packs the board, or finds nothing to move. */
export function describeTidy(intl: IntlShape, moved: number): string {
	return intl.formatMessage(messages.tidied, { moved })
}
