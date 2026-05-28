import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi } from '../kiso'

const { text } = iro
const { radius } = kasane
const { flex, description } = narabi

const base = [
	...hannou.item,
	'group/option grid w-full items-baseline',
	'grid-cols-[1fr_--spacing(5)] sm:grid-cols-[1fr_--spacing(4)]',
	radius.rounded.lg,
	...mode('data-active:bg-zinc-950/5', 'dark:data-active:bg-white/5'),
	...mode(
		'group-data-editing/combobox:only-of-type:bg-zinc-950/5',
		'dark:group-data-editing/combobox:only-of-type:bg-white/5',
	),
]

const size = {
	sm: ['gap-2 px-2 py-1', ji.size.sm],
	md: ['gap-3 px-2.5 py-1.5', ji.size.md],
	lg: ['gap-3 px-3 py-2.5', ji.size.lg],
} as const

export const k = {
	base,
	size,
	content: [flex.row, 'min-w-0', narabi.item],
	label: 'truncate group-data-selected/option:font-bold',
	description: [description, text.muted],
} as const
