/**
 * Column-group band kata: layout for the header row of group bands the Grid
 * draws above its column headers. Color is not here — the band's tint comes from
 * the {@link Badge} it renders (standard + extended palette), so this surface
 * carries only the band's flex layout, the collapse toggle, and the separating
 * rule beneath the row.
 */
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, focus } = sen

export const k = {
	// The group row's cells carry a bottom rule so the band reads as a distinct
	// tier above the column headers, and vertical-middle alignment so a lone Badge
	// centers in the band.
	cell: ['align-middle', 'border-b', ...border.subtleColor],
	// A group band's content: the colored Badge and, when collapsible, the toggle.
	// `min-w-0` lets the Badge label truncate within the band rather than overrun.
	band: [flex.inline, 'items-center', 'gap-1', 'min-w-0'],
	// Collapse/expand toggle on a collapsible band: an icon button, muted at rest,
	// tinting on hover/focus like the header's other affordances.
	toggle: [flex.inline, 'shrink-0', text.muted, fg.hover, focus.ring, cursor, 'select-none'],
	// The "+N" hidden-count shown on a collapsed band, beside the expand toggle.
	count: [size.xs, text.muted, 'tabular-nums'],
	// Column-manager group editor: the create button, group zones, and column rows.
	manager: {
		// Vertical stack of the "New group" action and the zones beneath it.
		root: [flex.col, 'gap-3'],
		// Zone shell: a bordered, rounded region a column can be dropped into; the
		// drop-over state lifts its border to signal the target.
		zone: [flex.col, 'gap-1', 'p-2', 'border', ...border.subtleColor, rounded.md],
		zoneOver: border.emphasisColor,
		// A group zone's header row: the name Input, the color Listbox, and the
		// remove button, laid out inline and wrapping on a narrow dialog.
		zoneHeader: [flex.row, 'items-center', 'gap-2', 'flex-wrap'],
		// The name Input grows to fill the header row; the color Listbox holds a
		// natural width beside it.
		nameField: 'grow',
		colorField: 'w-40',
		// The ungrouped pool's heading — a muted label, not an editable field.
		poolLabel: [size.sm, text.muted, 'px-1'],
		// Empty-zone hint shown when a group has no columns yet.
		empty: [size.sm, text.muted, 'px-1', 'py-2'],
		// One column row: the drag grip, the visibility checkbox + label, and the
		// move menu, in a line.
		row: [flex.row, 'items-center', 'gap-2', 'px-1', 'py-0.5'],
		// Drag grip: a grab-cursor handle, muted at rest, tinting on hover/focus.
		grip: [flex.inline, 'shrink-0', text.muted, fg.hover, focus.ring, 'cursor-grab', 'select-none'],
		// The row's move menu trigger and the remove button, styled like the grip.
		action: [flex.inline, 'shrink-0', text.muted, fg.hover, focus.ring, cursor, 'select-none'],
		// A small color dot shown in the color Listbox options and trigger.
		swatch: ['inline-block', 'size-3', rounded.full],
	},
} as const
