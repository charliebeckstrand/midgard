import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

export const k = {
	dropzone: [
		narabi.flex.col,
		'items-center justify-center',
		'gap-1',
		ji.size.md,
		iro.text.muted,
		kasane.radius.rounded.lg,
		sen.focus.ring,
		'border border-dashed',
		...mode('border-zinc-300', 'dark:border-zinc-700'),
		...hannou.cursor,
		...mode('hover:not-disabled:border-zinc-400', 'dark:hover:not-disabled:border-zinc-500'),
		...mode(
			'data-[drag-over]:border-blue-500 data-[drag-over]:bg-blue-50/50',
			'dark:data-[drag-over]:border-blue-400 dark:data-[drag-over]:bg-blue-950/20',
		),
		...hannou.disabled,
	],
	icon: 'shrink-0',
	label: [ji.weight.medium, iro.text.default],
	cursor: hannou.cursor,
} as const
