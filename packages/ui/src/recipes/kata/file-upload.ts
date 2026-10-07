import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

export const k = {
	/** The row of `FileUploadButton`: the trigger and the `Reset` button beside it. */
	button: ['inline-flex', dan.gap.scale.sm],
	dropzone: [
		flex.col,
		'items-center justify-center',
		dan.gap.scale.xs,
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
			'data-drag-over:border-blue-500 data-drag-over:bg-blue-50/50',
			'dark:data-drag-over:border-blue-400 dark:data-drag-over:bg-blue-950/20',
		),
		...disabled,
	],
	// Full-area picker trigger for the filled dropzone: a sibling of the `Reset`
	// button (never its parent, which would nest interactive controls), stacked
	// under the label/reset so those stay operable.
	overlay: ['absolute inset-0', rounded.lg, focus.ring, ...cursor],
	icon: 'shrink-0',
	label: [weight.medium, text.default],
	/** The display button of `FileUploadInput`. It lays out its text as the text of an input. */
	field: 'flex items-center text-start',
	/** The selection summary or the placeholder inside the display button. Block, so that the ellipsis paints. */
	value: 'block min-w-0 truncate',
	/** The placeholder inside the display button, in the shade of an input placeholder. */
	placeholder: text.muted,
	cursor,
} as const
