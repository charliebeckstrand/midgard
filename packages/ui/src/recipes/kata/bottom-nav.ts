import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, omote, sen } from '../kiso'

export const k = {
	base: [
		'sticky inset-x-0 bottom-0 z-40',
		'flex items-stretch justify-around',
		sen.divider.top,
		omote.bg.surface,
	],
	item: [
		'group relative',
		'flex flex-1 flex-col items-center justify-center',
		'py-4',
		'gap-1',
		ji.size.sm,
		iro.text.muted,
		hannou.text.hover,
		ji.weight.medium,
		sen.focus.inset,
		...hannou.cursor,
	],
	current: [iro.text.default],
	indicator: [
		'inset-x-4 bottom-auto top-0',
		'h-0.5',
		...mode('bg-zinc-950', 'dark:bg-white'),
		kasane.rounded.full,
	],
} as const
