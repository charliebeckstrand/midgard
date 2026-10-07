/**
 * Column-group band kata: layout for the header row of group bands the Grid
 * draws above its column headers. The band's label tint comes from the
 * {@link Badge} it renders (standard + extended palette). This surface carries
 * the band's flex layout, the `+N` count, and the underline rule with its fills
 * (`rule.color`, `rule.neutral`). It also carries the column-manager group
 * editor (`manager`) and its Card outline colors (`outline`).
 */
import type { PaletteColor } from '../../core/recipe'
import { hannou, iro, kasane, narabi, omote, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { fg, grab } = hannou
const { text } = iro
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { focus } = sen

/** The stack of the column-manager group editor, and the list of its zones in it. */
const managerStack = [flex.col, dan.gap.scale.md]

/**
 * The fill for a group's 2px underline rule, keyed by {@link PaletteColor} so a
 * band reads `rule.color[group.color]`. Full literals for Tailwind's scanner; the
 * `-600` shade reads over both light and dark surfaces.
 */
const bandColor: Record<PaletteColor, string> = {
	zinc: 'bg-zinc-600',
	red: 'bg-red-600',
	amber: 'bg-amber-600',
	green: 'bg-green-600',
	blue: 'bg-blue-600',
	rose: 'bg-rose-600',
	violet: 'bg-violet-600',
	sky: 'bg-sky-600',
}

/**
 * The neutral fill for a colorless group's underline rule, the band analog of a
 * colorless row group's gray rail. An uncolored (or color-cleared) group therefore
 * keeps its underline in gray rather than dropping it. Full literals for Tailwind's scanner.
 */
const bandNeutral = 'bg-zinc-950/10 dark:bg-white/15'

/**
 * The outline color for a group's editor Card, keyed by {@link PaletteColor} so a
 * zone reads `outline[group.color]`. `!` forces it over the Card's default
 * neutral outline; full literals for Tailwind's scanner.
 */
const outline: Record<PaletteColor, string> = {
	zinc: '!outline-zinc-600',
	red: '!outline-red-600',
	amber: '!outline-amber-600',
	green: '!outline-green-600',
	blue: '!outline-blue-600',
	rose: '!outline-rose-600',
	violet: '!outline-violet-600',
	sky: '!outline-sky-600',
}

export const k = {
	// Outline color for a group's editor Card in its color (see {@link outline}).
	outline,
	// The group row's cells align their band vertically; no bottom rule — the
	// colored Badge alone sets the tier off from the column headers.
	cell: ['align-middle'],
	// A group band's cell content: the Badge row above the colored rule, stacked so
	// the rule spans the cell's content width — inset by the header's cell padding,
	// so it lines up with the column titles and leaves a gap between groups.
	content: [flex.col, dan.gap.scale.sm],
	// A group's 2px underline rule: a rounded bar spanning the band content width,
	// under the Badge. Every group draws it. A colored group takes `color`, and a
	// colorless group takes `neutral`.
	rule: {
		base: ['h-0.5', rounded.full],
		// Fill for a group's underline rule in its color (see {@link bandColor}).
		color: bandColor,
		// Neutral fill for a colorless group's underline rule (see {@link bandNeutral}).
		neutral: bandNeutral,
	},
	band: {
		// A group band's row: the colored Badge, then the bare chevron toggle when
		// collapsible, then the `+N` count. `min-w-0` lets the Badge label truncate
		// within the band rather than overrun.
		row: [flex.inline, dan.gap.scale.xs, 'min-w-0'],
		// The fold caret. An open group points it to the inline end, and a folded
		// group to the inline start. The glyphs are physical, so a right-to-left
		// grid mirrors them.
		caret: 'rtl:-scale-x-100',
	},
	// The "+N" hidden-count shown on a collapsed band, beside the expand toggle.
	count: [text.muted, 'tabular-nums'],
	// Column-manager group editor: the create button, group zones, and column rows.
	manager: {
		// Vertical stack of the "New group" button, the group zones, and the column rows.
		base: managerStack,
		// The list of the group zones, with the gap of the stack.
		groups: managerStack,
		// Zone shell: a column stack inside the zone's Card, which a column can be
		// dropped into. The Card draws the outline, and a colored group tints it
		// (see {@link outline}). The zone has no drop-over style.
		zone: {
			// The gap also caps the hit areas (`TouchTarget`), so the move buttons of
			// two adjacent rows do not overlap.
			base: [flex.col, dan.gap.scale.xs, ...dan.gap.touch.y.xs],
			// A group zone's header row: the reorder handle, the name Input, the color
			// Menu, and the remove button, on one row.
			header: [flex.row, dan.gap.scale.sm],
			// The name Input grows to fill the header row. The color Menu keeps its
			// natural width.
			name: 'grow',
			// Empty-zone hint shown when a group has no columns yet.
			empty: [text.muted],
		},
		// One column row: the drag grip, the visibility checkbox + label, and the
		// move menu, in a line.
		row: {
			base: [flex.row, dan.gap.scale.sm],
			// The checkbox Control grows to fill the row, pushing the move menu (or,
			// on the overlay, the row's own right edge) flush against it.
			control: 'grow',
			// The dragged row's overlay clone: an opaque, rounded, shadowed surface so it
			// reads as lifted above the dialog while it tracks the pointer.
			overlay: [bg.surface, rounded.md, 'shadow-lg'],
			// Drag grip: a grab-cursor handle, muted at rest, tinting on hover/focus.
			grip: [flex.inline, 'shrink-0', text.muted, fg.hover, focus.ring, ...grab.default],
		},
	},
} as const
