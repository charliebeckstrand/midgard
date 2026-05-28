import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight } = ji
const { radius } = kasane
const { flex } = narabi
const { focus } = sen

export const k = {
	dropzone: [
		flex.col,
		'items-center justify-center',
		'gap-1',
		size.md,
		text.muted,
		radius.rounded.lg,
		focus.ring,
		'border border-dashed',
		...mode('border-zinc-300', 'dark:border-zinc-700'),
		...cursor,
		...mode('hover:not-disabled:border-zinc-400', 'dark:hover:not-disabled:border-zinc-500'),
		...mode(
			'data-[drag-over]:border-blue-500 data-[drag-over]:bg-blue-50/50',
			'dark:data-[drag-over]:border-blue-400 dark:data-[drag-over]:bg-blue-950/20',
		),
		...disabled,
	],
	icon: 'shrink-0',
	label: [weight.medium, text.default],
	cursor,
} as const
