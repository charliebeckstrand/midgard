/**
 * Command-palette kata: object-literal surface for `<CommandPalette>`'s grouped
 * result listbox. Static slots only, no variants axis — `group` / `list` (the
 * listbox, hidden when empty), the peer-driven `empty` status, plus `title`,
 * `item`, `label`, `description`, and `shortcut` for each result row.
 */
import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex, description } = narabi

export const k = {
	group: 'flex flex-col gap-0.5 first:pt-0 last:pb-0',
	// Inner listbox: collapses when empty. `peer` drives the sibling `empty` slot below.
	list: ['peer', 'empty:hidden'],
	// Sibling no-results status: a persistent `<output>` (role=status) shown
	// when the listbox peer is `:empty`, announcing zero-result queries.
	empty: ['hidden peer-empty:block', 'p-2', size.sm, text.muted],
	title: ['p-2', size.xs, text.muted, weight.medium],
	item: [
		'group/option',
		flex.row,
		'w-full',
		'px-2',
		'gap-2',
		...hannou.item,
		...narabi.item,
		...mode('data-active:bg-zinc-950/5', 'dark:data-active:bg-white/5'),
		// Deepen the wash when the active row is also hovered, so the
		// keyboard-roved item stays distinguishable under the pointer. The
		// `not-disabled:not-data-disabled` guards mirror `hannou.tint` to
		// out-specify its hover rule (otherwise the shared /5 wash wins).
		...mode(
			'not-disabled:not-data-disabled:data-active:hover:bg-zinc-950/10',
			'dark:not-disabled:not-data-disabled:data-active:hover:bg-white/10',
		),
	],
	label: 'truncate',
	description: [description, size.xs, text.muted],
	shortcut: 'ml-auto',
} as const
