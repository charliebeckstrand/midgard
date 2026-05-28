import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi, sen, ugoki } from '../kiso'

export const k = {
	base: 'group/collapse',
	trigger: [
		narabi.inlineRow,
		'gap-2',
		ji.size.md,
		iro.text.muted,
		hannou.text.hover,
		...mode(
			'group-data-[open]/collapse:text-zinc-950',
			'dark:group-data-[open]/collapse:text-white',
		),
		sen.focus.ring,
		...hannou.disabled,
		...hannou.cursor,
	],
	panel: 'overflow-hidden',
	motion: ugoki.collapse,
} as const
