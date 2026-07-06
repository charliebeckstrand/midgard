/**
 * Row-manager kata: layout for the "Manage rows" editor — the vertical stack of
 * group zones, each zone's header (drag grip, label, count, color menu), and its
 * leaf rows. Color is not here — a zone's tint comes from the shared
 * `kata/grid-group` `cardOutline` (Card outline) and the leaf rows ride the
 * `components/list` surface — so this carries only the flex layout.
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
		// A group zone's header row: the reorder grip, the label + count, then the
		// color Menu pushed to the trailing edge.
		header: [flex.row, 'items-center', 'gap-2'],
		// The group label + count, growing to push the color control to the edge.
		label: ['grow', 'min-w-0', 'truncate', 'font-medium'],
		// The leaf count beside the label.
		count: [text.muted, 'tabular-nums', 'shrink-0'],
		// The color Menu trigger: a natural width beside the growing label.
		color: 'shrink-0',
		// Empty-group hint shown when a group has no leaves (all filtered out).
		empty: [text.muted],
		// Group-reorder grip: a grab-cursor handle, muted at rest, tinting on hover/focus.
		grip: [flex.inline, 'shrink-0', text.muted, fg.hover, focus.ring, 'cursor-grab', 'select-none'],
	},
	// A leaf row inside a zone's List: the label grows so the auto grip sits flush.
	leaf: {
		label: ['grow', 'min-w-0', 'truncate'],
	},
} as const
