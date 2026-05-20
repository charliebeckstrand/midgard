import { hannou, iro, ji, sen } from '../../core/recipe'

export const k = {
	base: 'group/collapse',
	trigger: [
		'inline-flex items-center',
		'gap-sm',
		ji.size.md,
		iro.text.muted,
		iro.text.hover,
		'group-data-[open]/collapse:text-zinc-950',
		'dark:group-data-[open]/collapse:text-white',
		sen.focus.ring,
		'disabled:opacity-50 disabled:cursor-not-allowed',
		...hannou.cursor,
	],
	panel: 'overflow-hidden',
}
