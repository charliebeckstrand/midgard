/**
 * Command-palette kata: the unit of the grouped result listbox of
 * `<CommandPalette>`, with no axes. The root slot `base` is the scroll body
 * that holds the listbox, which hides while the listbox holds no result.
 * `group` holds the rows of a group, `title` is the
 * heading of a group, and `empty` is the no-results status. `item` is the unit
 * of a result row, which extends the item group.
 */
import { defineKata, mode } from '../../core/recipe'
import { iro, ji, narabi, shaku } from '../kiso'
import { item } from '../kumi/item'
import { gap } from '../kumi/panel'

const { text } = iro
const { size, weight } = ji
const { flex } = narabi

/** The result row: an icon, a label, and a shortcut on one line. */
const row = defineKata({
	extends: item,
	base: [
		flex.row,
		'w-full',
		'px-2',
		'py-2.5 sm:py-1.5',
		...narabi.item,
		// The chrome of a row is fixed, so its icon and its gap are fixed at `md`
		// too.
		shaku.icon.slot.md,
		'gap-2',
		// Deepen the wash when the active row is also hovered, so the
		// keyboard-roved item stays distinguishable under the pointer. The
		// `not-disabled:not-data-disabled` guards mirror `hannou.tint` to
		// out-specify its hover rule (otherwise the shared /5 wash wins). Inside a
		// glass parent, the hover wash and the active wash are both 10%. The step
		// there doubles to 20%, and the glass group out-specifies `tint.glass.base`.
		...mode(
			'not-disabled:not-data-disabled:data-active:hover:bg-zinc-950/10 group-data-glass/glass:not-disabled:not-data-disabled:data-active:hover:bg-zinc-950/20',
			'dark:not-disabled:not-data-disabled:data-active:hover:bg-white/10 dark:group-data-glass/glass:not-disabled:not-data-disabled:data-active:hover:bg-white/20',
		),
	],
	slots: { description: size.xs },
})

export const k = defineKata(
	{
		// The body of the listbox: collapses while it holds no result, so that it
		// adds no gap of the panel under the search input. A result is an option,
		// or a `VirtualOptions` wrapper with items, as the palette counts it. The
		// rule reads the presence of a result and not `:empty` on the listbox:
		// WebKit does not match `:has()` again when a `:empty` inside it changes,
		// so the body stayed hidden after the first rows came.
		base: 'not-has-[[role=option],[data-slot=virtual-options]:not([data-empty])]:hidden',
		slots: {
			// A group after any sibling takes the slot gap of the panel, which is the
			// space between the search input and the first group. Each heading
			// therefore has the same space above it.
			group: [flex.col, 'gap-0.5', gap.above],
			title: ['p-2', size.xs, text.muted, weight.medium],
			// The no-results status after the body: a persistent `<output>`
			// (role=status). It never hides, because a live region speaks only while it
			// is in the accessibility tree. The palette writes its text on zero results.
			// While it holds no text, it is out of the flow, so it adds no gap of the
			// panel.
			empty: ['block', 'empty:sr-only', 'not-empty:p-2', size.sm, text.muted],
		},
	},
	{
		item: row,
	},
)
