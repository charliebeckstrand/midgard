import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen, ugoki } from '../kiso'

const item = defineRecipe({
	base: [
		'group/accordion-item',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-2',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-blue-500',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-inset',
	],
	variant: {
		separated: ['overflow-hidden', kasane.rounded.lg, ...sen.border.default],
		outline: ['first:rounded-t-[inherit]', 'last:rounded-b-[inherit]'],
		plain: '',
	},
	defaults: { variant: 'separated' },
})

export const k = defineRecipe(
	{
		base: narabi.col,
		variant: {
			separated: 'gap-1',
			outline: [
				'overflow-hidden',
				kasane.rounded.lg,
				...sen.border.default,
				...sen.divider.between,
			],
			plain: sen.divider.between,
		},
		slots: {
			trigger: [
				'w-full',
				narabi.row,
				'justify-between',
				'gap-2',
				'p-4',
				ji.size.md,
				iro.text.muted,
				hannou.text.hover,
				'text-left',
				ji.weight.medium,
				...mode(
					'group-data-[open]/accordion-item:text-zinc-950',
					'dark:group-data-[open]/accordion-item:text-white',
				),
				'focus-visible:outline-none',
				...hannou.disabled,
				...hannou.cursor,
			],
			indicator: [
				'shrink-0',
				ugoki.css.transform,
				ugoki.css.duration,
				'group-data-[open]/accordion-item:rotate-180',
			],
			panel: 'overflow-hidden',
			body: ['px-4 pb-4 pt-0', ji.size.md, iro.text.muted],
		},
		defaults: { variant: 'separated' },
	},
	{ item },
)

export type AccordionVariants = VariantProps<typeof k>
export type AccordionItemVariants = VariantProps<typeof item>
