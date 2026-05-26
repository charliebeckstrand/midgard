import { hannou, iro, ji, narabi } from '../kiso'

const base = [
	...hannou.item,
	'group/option grid w-full items-baseline',
	'grid-cols-[1fr_--spacing(5)] sm:grid-cols-[1fr_--spacing(4)]',
	'rounded-lg',
	'data-active:bg-zinc-950/5',
	'dark:data-active:bg-white/5',
	'group-data-editing/combobox:only-of-type:bg-zinc-950/5',
	'dark:group-data-editing/combobox:only-of-type:bg-white/5',
]

const size = {
	sm: ['gap-2 px-2 py-1', ji.sm],
	md: ['gap-3 px-2.5 py-1.5', ji.md],
	lg: ['gap-3 px-3 py-2.5', ji.lg],
} as const

export const k = {
	base,
	size,
	content: ['flex min-w-0 items-center', narabi.item],
	label: 'truncate group-data-selected/option:font-bold',
	description: [narabi.description, iro.text.muted],
} as const
