import { hannou, iro, ji, sen, ugoki } from '../kiso'

export const k = {
	base: 'group/collapse',
	trigger: [
		'inline-flex items-center',
		'gap-2',
		ji.md,
		iro.text.muted,
		hannou.text.hover,
		'group-data-[open]/collapse:text-zinc-950',
		'dark:group-data-[open]/collapse:text-white',
		sen.focus.ring,
		...hannou.disabled,
		...hannou.cursor,
	],
	panel: 'overflow-hidden',
	motion: ugoki.collapse,
}
