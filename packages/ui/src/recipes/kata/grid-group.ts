/**
 * Column-group band kata: layout for the header row of group bands the Grid
 * draws above its column headers. Color is not here — the band's tint comes from
 * the {@link Badge} it renders (standard + extended palette), so this surface
 * carries only the band's flex layout, the collapse toggle, and the separating
 * rule beneath the row.
 */
import type { PaletteColor } from '../../core/recipe'
import { hannou, iro, kasane, narabi, omote, sen } from '../kiso'

const { fg } = hannou
const { text } = iro
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { focus } = sen

/**
 * The fill for a group's 2px underline rule, keyed by {@link PaletteColor} so a
 * band reads `bandColor[group.color]`. Full literals for Tailwind's scanner; the
 * `-600` shade reads over both light and dark surfaces.
 */
const bandColor: Record<PaletteColor, string> = {
	zinc: 'bg-zinc-600',
	red: 'bg-red-600',
	amber: 'bg-amber-600',
	green: 'bg-green-600',
	blue: 'bg-blue-600',
	mist: 'bg-mist-600',
	rose: 'bg-rose-600',
	violet: 'bg-violet-600',
	sky: 'bg-sky-600',
}

/**
 * The outline color for a group's editor Card, keyed by {@link PaletteColor} so a
 * zone reads `cardOutline[group.color]`. `!` forces it over the Card's default
 * neutral outline; full literals for Tailwind's scanner.
 */
const cardOutline: Record<PaletteColor, string> = {
	zinc: '!outline-zinc-600',
	red: '!outline-red-600',
	amber: '!outline-amber-600',
	green: '!outline-green-600',
	blue: '!outline-blue-600',
	mist: '!outline-mist-600',
	rose: '!outline-rose-600',
	violet: '!outline-violet-600',
	sky: '!outline-sky-600',
}

export const k = {
	// Outline color for a group's editor Card in its color (see {@link cardOutline}).
	cardOutline,
	// Fill for a group's underline rule in its color (see {@link bandColor}).
	bandColor,
	// The group row's cells align their band vertically; no bottom rule — the
	// colored Badge alone sets the tier off from the column headers.
	cell: ['align-middle'],
	// A group band's cell content: the Badge row above the colored rule, stacked so
	// the rule spans the cell's content width — inset by the header's cell padding,
	// so it lines up with the column titles and leaves a gap between groups.
	content: [flex.col, 'gap-2'],
	// A colored group's 2px underline rule: a rounded bar spanning the band content
	// width, under the Badge. Only a group with a `color` draws it.
	rule: ['h-0.5', rounded.full],
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
			// The checkbox Control grows to fill the row, pushing the move menu (or,
			// on the overlay, the row's own right edge) flush against it.
			control: 'grow',
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
