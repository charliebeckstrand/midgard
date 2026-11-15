import { defineKata, mode } from '../../core/recipe'
import { dan, hannou, iro, ji, kasane, narabi, sen } from '../kiso'
import { button, input } from '../kumi/control'

const { cursor, disabled } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, focus } = sen

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
		...border.color.emphasis,
		...cursor,
		// The hover color outranks the `contrast-more:` step of the resting edge, so
		// the hover takes a step of its own, above the resting one.
		...mode(
			['hover:not-disabled:border-zinc-400', 'contrast-more:hover:not-disabled:border-zinc-950/70'],
			[
				'dark:hover:not-disabled:border-zinc-500',
				'dark:contrast-more:hover:not-disabled:border-white/70',
			],
		),
		// A drag over the zone takes the neutral step of a drop target, as the drop
		// targets of Kanban and QueryBuilder do: the edge of the hover and the tint
		// fill. Forced colors remove the fill, so there the zone draws an outline.
		...mode(
			[
				'data-drag-over:border-zinc-400 contrast-more:data-drag-over:border-zinc-950/70',
				'data-drag-over:bg-zinc-950/5',
			],
			[
				'dark:data-drag-over:border-zinc-500 dark:contrast-more:data-drag-over:border-white/70',
				'dark:data-drag-over:bg-white/10',
			],
		),
		'forced-colors:data-drag-over:outline-solid forced-colors:data-drag-over:outline-2',
		'forced-colors:data-drag-over:-outline-offset-2 forced-colors:data-drag-over:outline-[Highlight]',
		...disabled.base,
	],
	// Full-area picker trigger for the filled dropzone: a sibling of the `Reset`
	// button (never its parent, which would nest interactive controls), stacked
	// under the label/reset so those stay operable.
	overlay: ['absolute inset-0', rounded.lg, focus.ring, ...cursor],
	icon: 'shrink-0',
	label: ['font-medium', text.default],
	/**
	 * The unit of `FileUploadInput`, which extends the input group. The field is
	 * the display button (the `button` field of a trigger), which lays out its
	 * text as the text of an input.
	 */
	input: defineKata({ extends: input, slots: { field: button } }),
	/** The selection summary or the placeholder inside the display button. Block, so that the ellipsis paints. */
	value: 'block min-w-0 truncate',
	/** The placeholder inside the display button, in the shade of an input placeholder. */
	placeholder: text.muted,
} as const
