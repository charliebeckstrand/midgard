/**
 * Column-group band kata: layout for the header row of group bands the Grid
 * draws above its column headers. Color is not here — the band's tint comes from
 * the {@link Badge} it renders (standard + extended palette), so this surface
 * carries only the band's flex layout, the collapse toggle, and the separating
 * rule beneath the row.
 */
import { hannou, iro, kasane, narabi, omote, sen } from '../kiso'

const { fg } = hannou
const { text } = iro
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { focus } = sen

export const k = {
	// The group row's cells align their band vertically; no bottom rule — the
	// colored Badge alone sets the tier off from the column headers.
	cell: ['align-middle'],
	// A group band's row: the colored Badge, then the bare chevron toggle when
	// collapsible, then the `+N` count. `min-w-0` lets the Badge label truncate
	// within the band rather than overrun.
	band: [flex.inline, 'items-center', 'gap-1', 'min-w-0'],
	// The "+N" hidden-count shown on a collapsed band, beside the expand toggle.
	count: [text.muted, 'tabular-nums'],
	// Column-manager group editor: the create button, group zones, and column rows.
	manager: {
		// Vertical stack of the "New group" button, the group zones, and the column rows.
		root: [flex.col, 'gap-3'],
		// Zone shell: a bordered, rounded region a column can be dropped into; the
		// drop-over state lifts its border to signal the target.
		zone: {
			root: [flex.col, 'gap-1'],
			// A group zone's header row: the name Input, the color Listbox, and the
			// remove button, kept inline on one row.
			header: [flex.row, 'items-center', 'gap-2'],
			// The name Input grows to fill the header row; the color Listbox holds a
			// natural width beside it.
			name: 'grow',
			// The color Listbox's trigger: a fixed width so the name Input and Menu
			// have consistent width.
			color: 'shrink-0 w-32',
			// Empty-zone hint shown when a group has no columns yet.
			empty: [text.muted],
		},
		// One column row: the drag grip, the visibility checkbox + label, and the
		// move menu, in a line.
		row: {
			root: [flex.row, 'items-center', 'gap-2'],
			// The dragged row's overlay clone: an opaque, rounded, shadowed surface so it
			// reads as lifted above the dialog while it tracks the pointer.
			overlay: [bg.surface, rounded.md, 'shadow-lg'],
			// Drag grip: a grab-cursor handle, muted at rest, tinting on hover/focus.
			grip: [
				flex.inline,
				'shrink-0',
				text.muted,
				fg.hover,
				focus.ring,
				'cursor-grab',
				'select-none',
			],
		},
	},
} as const
