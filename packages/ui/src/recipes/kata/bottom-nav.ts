import { hannou, iro, ji, omote, sen } from '../kiso'

export const k = {
	base: [
		'sticky inset-x-0 bottom-0 z-40',
		'flex items-stretch justify-around',
		sen.divider,
		omote.surface,
	],
	item: [
		'group relative',
		'flex flex-1 flex-col items-center justify-center',
		'py-4',
		'gap-1',
		ji.sm,
		iro.text.muted,
		iro.text.hover,
		'font-medium',
		sen.focus.inset,
		...hannou.cursor,
	],
	current: [iro.text.default],
	indicator: [
		'inset-x-4 bottom-auto top-0',
		'h-0.5',
		'rounded-full',
		'bg-zinc-950',
		'dark:bg-white',
	],
}
