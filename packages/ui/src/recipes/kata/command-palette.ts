/**
 * Command-palette kata: object-literal surface for `<CommandPalette>`'s grouped
 * result listbox. Static slots only, no variants axis: `group` / `list` (the
 * listbox, hidden when empty), and the `empty` status. `title` is
 * the group heading. Each result row adds `item`, `label`, `text`, `description`,
 * and `shortcut`.
 */
import { mode } from '../../core/recipe'
import { hannou, iro, ji, kara, narabi, shaku } from '../kiso'
import { dan } from '../kiso/dan'
import { panel } from '../kiso/panel'

const { on, text } = iro
const { size, weight } = ji
const { flex, description } = narabi

export const k = {
	// A group after any sibling takes the slot gap of the panel, which is the
	// space between the search input and the first group. Each heading
	// therefore has the same space above it.
	group: ['flex flex-col gap-0.5', panel.layout.gap.above],
	// Inner listbox: collapses when empty. `kara` adds the virtualized case,
	// which `:empty` alone cannot see.
	list: ['empty:hidden', kara.list],
	// Sibling no-results status: a persistent `<output>` (role=status). It never
	// hides, because a live region speaks only while it is in the accessibility
	// tree. The palette writes its text on zero results. The padding applies only
	// while the block holds the text, so the empty region takes no space.
	empty: ['block', 'not-empty:p-2', size.sm, text.muted],
	title: ['p-2', size.xs, text.muted, weight.medium],
	item: [
		'group/option',
		flex.row,
		'w-full',
		'px-2',
		'py-2.5 sm:py-1.5',
		dan.gap.scale.sm,
		...hannou.item,
		...narabi.item,
		// The chrome of a row is fixed, so its icon is fixed at `md` too.
		shaku.icon.slot.md,
		...hannou.active,
		// Deepen the wash when the active row is also hovered, so the
		// keyboard-roved item stays distinguishable under the pointer. The
		// `not-disabled:not-data-disabled` guards mirror `hannou.tint` to
		// out-specify its hover rule (otherwise the shared /5 wash wins). Inside a
		// glass parent, the hover wash and the active wash are both 10%. The step
		// there doubles to 20%, and the glass group out-specifies `glassItem`.
		...mode(
			'not-disabled:not-data-disabled:data-active:hover:bg-zinc-950/10 group-data-glass/glass:not-disabled:not-data-disabled:data-active:hover:bg-zinc-950/20',
			'dark:not-disabled:not-data-disabled:data-active:hover:bg-white/10 dark:group-data-glass/glass:not-disabled:not-data-disabled:data-active:hover:bg-white/20',
		),
	],
	label: 'truncate',
	// A column that stacks a label over its description.
	text: narabi.text,
	// `on.wash.muted`, not `muted`: `hannou.item` / `hannou.active` ground a hovered
	// or roved row on the tint wash, which `muted` is not legal over. See `iro/ramp.ts`.
	description: [description, size.xs, on.wash.muted],
	shortcut: 'ms-auto',
} as const
