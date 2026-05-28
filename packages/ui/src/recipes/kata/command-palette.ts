import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex } = narabi

export const k = {
	group: 'py-1 first:pt-0 last:pb-0',
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
	description: [narabi.description, size.xs, text.muted],
	shortcut: 'ml-auto',
} as const
