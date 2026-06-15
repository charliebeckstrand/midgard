import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen, ugoki } from '../kiso'

const { cursor, disabled, fg } = hannou
const { text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, divider } = sen
const { css } = ugoki

const item = defineRecipe({
	base: [
		'group/accordion-item',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-2',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-blue-500',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-inset',
	],
	variant: {
		separated: ['overflow-hidden', rounded.lg, ...border.default],
		outline: ['first:rounded-t-[inherit]', 'last:rounded-b-[inherit]'],
		plain: '',
	},
	defaults: { variant: 'separated' },
})

export const k = defineRecipe(
	{
		base: flex.col,
		variant: {
			separated: 'gap-1',
			outline: ['overflow-hidden', rounded.lg, ...border.default, ...divider.between],
			plain: divider.between,
		},
		slots: {
			trigger: [
				'w-full',
				flex.row,
				'justify-between',
				'gap-2',
				'p-4',
				size.md,
				text.muted,
				fg.hover,
				'text-left',
				...mode(
					'group-data-[open]/accordion-item:text-zinc-950',
					'dark:group-data-[open]/accordion-item:text-white',
				),
				'focus-visible:outline-none',
				...disabled,
				...cursor,
			],
			indicator: [
				'shrink-0',
				css.transform,
				css.duration,
				'group-data-[open]/accordion-item:rotate-180',
			],
			panel: 'overflow-hidden',
			body: ['px-4 pb-4 pt-0', size.md, text.muted],
		},
		defaults: { variant: 'separated' },
	},
	{ item },
)

/** Recipe variant props for {@link Accordion} — the styling axes its kata exposes (`variant`), for consumers composing custom slots. */
export type AccordionVariants = VariantProps<typeof k>
/** Recipe variant props for an {@link Accordion} item — its styling axes (`variant`), for consumers composing custom slots. */
export type AccordionItemVariants = VariantProps<typeof item>
