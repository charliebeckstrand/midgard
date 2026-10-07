import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen, ugoki } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor, disabled, fg } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, divider } = sen
const { collapse, css } = ugoki

const item = defineRecipe({
	base: [
		// Content in the item can read the `data-open` of the item through this group.
		'group/accordion-item',
		// The item rings while its own header button has keyboard focus. A nested
		// accordion is in the panel, so the focus of a nested header does not ring the
		// item. The variant is arbitrary because `not-has-[]` wraps its selector in
		// `:is()`, and `:is()` matches a panel anywhere above the button, not only in the item.
		'[&:has([data-slot=accordion-trigger]:focus-visible):not(:has([data-slot=accordion-panel]_[data-slot=accordion-trigger]:focus-visible))]:ring-2',
		'[&:has([data-slot=accordion-trigger]:focus-visible):not(:has([data-slot=accordion-panel]_[data-slot=accordion-trigger]:focus-visible))]:ring-blue-600',
		'[&:has([data-slot=accordion-trigger]:focus-visible):not(:has([data-slot=accordion-panel]_[data-slot=accordion-trigger]:focus-visible))]:ring-inset',
	],
	variant: {
		separated: ['overflow-hidden', rounded.lg, ...border.default],
		outline: ['first:rounded-t-[inherit]', 'last:rounded-b-[inherit]'],
		plain: '',
	},
	defaults: { variant: 'separated' },
})

/**
 * The box of an item header: the axis, the gap, the padding, and the text. The
 * skeleton header takes the same box, so the two boxes match.
 */
const header = ['w-full', flex.row, 'justify-between', dan.gap.scale.sm, 'p-4', size.md]

export const k = defineRecipe(
	{
		base: flex.col,
		variant: {
			separated: dan.gap.scale.xs,
			outline: ['overflow-hidden', rounded.lg, ...border.default, ...divider.between],
			plain: divider.between,
		},
		slots: {
			trigger: [
				...header,
				// The open look reads the `aria-expanded` of the button itself, and the
				// indicator reads it through this group. A button cannot hold a button, so
				// an open outer item does not give its look to a nested header.
				'group/accordion-trigger',
				text.muted,
				fg.hover,
				'text-start',
				...mode('aria-expanded:text-zinc-950', 'dark:aria-expanded:text-white'),
				'focus-visible:outline-none',
				...disabled,
				...cursor,
			],
			indicator: [
				'shrink-0',
				css.transform,
				css.duration,
				'group-aria-expanded/accordion-trigger:rotate-180',
			],
			// The panel adds nothing to the intrinsic width of the accordion. A host that
			// fits its content thus keeps one width while a section opens and closes, and
			// the text of an open panel wraps at that width. A block host sets the width
			// itself, so there nothing changes. The panel has no clip of its own: its
			// motion clips it only while its height moves.
			panel: 'contain-inline-size',
			body: ['px-4 pb-4 pt-0', size.md, text.muted],
		},
		defaults: { variant: 'separated' },
		skeleton: kokkaku.accordion,
	},
	{ item, motion: collapse.fade, header },
)

/** Recipe variant props for {@link Accordion} — the styling axes its kata exposes (`variant`), for consumers composing custom slots. */
export type AccordionVariants = Omit<VariantProps<typeof k>, 'variant'> & {
	/**
	 * How the items stand apart: as separate boxes, in one outlined box, or as
	 * plain rows with dividers.
	 * @defaultValue 'separated'
	 */
	variant?: VariantProps<typeof k>['variant']
}
/** Recipe variant props for an {@link Accordion} item — its styling axes (`variant`), for consumers composing custom slots. */
export type AccordionItemVariants = Omit<VariantProps<typeof item>, 'variant'> & {
	/** The style of the item, which matches the `variant` of its accordion. @defaultValue 'separated' */
	variant?: VariantProps<typeof item>['variant']
}
