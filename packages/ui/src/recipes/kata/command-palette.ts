import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi } from '../kiso'

export const k = {
	group: 'py-1 first:pt-0 last:pb-0',
	title: ['p-2', ji.size.xs, iro.text.muted, ji.weight.medium],
	item: [
		'group/option',
		narabi.row,
		'w-full',
		'px-2',
		'gap-2',
		...hannou.item,
		...narabi.item,
		...mode('data-active:bg-zinc-950/5', 'dark:data-active:bg-white/5'),
	],
	label: 'truncate',
	description: [narabi.description, ji.size.xs, iro.text.muted],
	shortcut: 'ml-auto',
} as const
