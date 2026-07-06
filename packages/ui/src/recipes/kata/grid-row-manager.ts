/**
 * Row-manager kata: layout for the "Manage rows" editor — the vertical stack of
 * group zones and each zone's header (drag grip, label, count, color menu). Color
 * is not here — a zone's tint comes from the shared `kata/grid-group` `cardOutline`
 * (Card outline) — so this carries only the flex layout.
 */
import { hannou, iro, narabi, sen } from '../kiso'

const { fg } = hannou
const { text } = iro
const { flex } = narabi
const { focus } = sen

export const k = {
	// Vertical stack of the group zones.
	root: [flex.col, 'gap-3'],
	zone: {
		// A group zone's row: the grip + label + count grouped at the leading edge,
		// the color Menu pushed to the trailing edge (`justify-between`).
		header: [flex.row, 'items-center', 'justify-between', 'gap-2'],
		// The leading group: the reorder grip, the label, and the count, sitting
		// together; `min-w-0` lets the label truncate rather than shove the count.
		main: [flex.row, 'items-center', 'gap-2', 'min-w-0'],
		// The group label, beside the grip; truncates when long.
		label: ['min-w-0', 'truncate', 'font-medium'],
		// The row count, sitting right beside the label.
		count: [text.muted, 'tabular-nums', 'shrink-0'],
		// The color Menu trigger: holds its natural width at the trailing edge.
		color: 'shrink-0',
		// Group-reorder grip: a grab-cursor handle, muted at rest, tinting on hover/focus.
		grip: [flex.inline, 'shrink-0', text.muted, fg.hover, focus.ring, 'cursor-grab', 'select-none'],
	},
} as const
