import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex, description } = narabi

export const k = {
	group: 'py-1 first:pt-0 last:pb-0',
	// Inner listbox: collapses when it has no options so the empty-state status
	// shows in its place. `peer` drives the sibling `empty` slot below.
	list: ['peer', 'empty:hidden'],
	// Sibling no-results status: a persistent `<output>` (role=status) hidden
	// until the listbox peer is `:empty`, so a query that matches nothing is
	// announced rather than silent.
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
	],
	label: 'truncate',
	description: [description, size.xs, text.muted],
	shortcut: 'ml-auto',
} as const
