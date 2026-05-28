import { mode } from '../../core/recipe'
import { iro, ji, kasane, narabi, sen } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { border } = sen

export const k = {
	base: [flex.col, 'gap-3 p-3', border.default, rounded.lg],
	group: 'flex flex-col gap-3',
	groupNested: ['p-3', ...mode('bg-zinc-50', 'dark:bg-zinc-900/40'), border.default, rounded.lg],
	rule: ['p-2', border.default, rounded.lg],
	rowRemove: 'flex-none',
	separator: [size.xs, weight.medium, ...text.muted, 'uppercase'],
	actions: 'flex items-center gap-2',
} as const
