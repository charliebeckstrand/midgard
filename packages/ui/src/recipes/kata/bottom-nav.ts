import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, omote, sen } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { bg } = omote
const { divider, focus } = sen

export const k = {
	base: [
		'sticky inset-x-0 bottom-0 z-40',
		'flex items-stretch justify-around',
		divider.top,
		bg.surface,
	],
	item: [
		'group relative',
		'flex flex-1 flex-col items-center justify-center',
		'py-4',
		'gap-1',
		size.sm,
		text.muted,
		fg.hover,
		weight.medium,
		focus.inset,
		...cursor,
	],
	current: [text.default],
	indicator: [
		'inset-x-4 bottom-auto top-0',
		'h-0.5',
		...mode('bg-zinc-950', 'dark:bg-white'),
		rounded.full,
	],
} as const
