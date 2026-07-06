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
		// A group zone's header row: the reorder grip, the label + count sitting
		// together, then the color Menu pushed to the trailing edge.
		header: [flex.row, 'items-center', 'gap-2'],
		// The group label, kept beside the grip; truncates when long rather than
		// pushing the count away.
		label: ['min-w-0', 'truncate', 'font-medium'],
		// The row count, sitting right beside the label.
		count: [text.muted, 'tabular-nums', 'shrink-0'],
		// The color Menu trigger: pushed to the trailing edge, holding its natural width.
		color: ['ml-auto', 'shrink-0'],
		// Group-reorder grip: a grab-cursor handle, muted at rest, tinting on hover/focus.
		grip: [flex.inline, 'shrink-0', text.muted, fg.hover, focus.ring, 'cursor-grab', 'select-none'],
	},
} as const
