import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

export const k = {
	dropzone: [
		flex.col,
		'items-center justify-center',
		'gap-1',
		// Inner padding so a selection's filename doesn't hug the dashed edges.
		'px-4',
		size.md,
		text.muted,
		rounded.lg,
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
	// Full-area picker trigger for the filled dropzone: a sibling of the `Reset`
	// button (never its parent, which would nest interactive controls), stacked
	// under the label/reset so those stay operable.
	overlay: ['absolute inset-0', rounded.lg, focus.ring, ...cursor],
	icon: 'shrink-0',
	label: [weight.medium, text.default],
	cursor,
} as const
