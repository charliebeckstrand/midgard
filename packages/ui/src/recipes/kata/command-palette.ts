import { hannou, iro, ji, narabi } from '..'

export const k = {
	group: 'py-1 first:pt-0 last:pb-0',
	title: ['p-2', ji.size.xs, iro.text.muted, 'font-medium'],
	item: [
		'group/option flex w-full items-center',
		'px-2',
		'gap-sm',
		...hannou.item,
		...narabi.item,
		'data-active:bg-zinc-950/5',
		'dark:data-active:bg-white/5',
	],
	label: 'truncate',
	description: [narabi.description, ji.size.xs, iro.text.muted],
	shortcut: 'ml-auto',
}
