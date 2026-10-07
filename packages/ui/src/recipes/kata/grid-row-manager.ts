/**
 * Row-manager kata: layout for the "Manage rows" editor — the vertical stack of
 * group zones and each zone's header (label, count, color menu). The drag grip
 * takes the `kata/grid-group` grip. Color is not here — a zone's tint comes from
 * the shared `kata/grid-group` `outline` (Card outline) — so this carries
 * only the flex layout.
 */
import { iro, ji, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { weight } = ji
const { flex } = narabi

/** The stack of the row-manager editor, and the list of its zones in it. */
const stack = [flex.col, dan.gap.scale.md]

export const k = {
	// Vertical stack of the group zones.
	base: stack,
	// The list of the group zones, with the gap of the stack.
	list: stack,
	zone: {
		// A group zone's row: the grip + label + count grouped at the leading edge,
		// the color Menu pushed to the trailing edge (`justify-between`).
		header: [flex.row, 'justify-between', dan.gap.scale.sm],
		// The leading group: the reorder grip, the label, and the count, sitting
		// together; `min-w-0` lets the label truncate rather than shove the count.
		main: [flex.row, dan.gap.scale.sm, 'min-w-0'],
		// The group label, beside the grip; truncates when long.
		label: ['min-w-0', 'truncate', weight.medium],
		// The row count, sitting right beside the label.
		count: [text.muted, 'tabular-nums', 'shrink-0'],
	},
} as const
