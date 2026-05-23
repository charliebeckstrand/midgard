import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { hannou, iro, ji, sen, ugoki } from '../kiso'

const item = defineRecipe({
	base: [
		'group/accordion-item',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-2',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-blue-500',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-inset',
	],
	variant: {
		separated: ['overflow-hidden', 'rounded-lg', ...sen.border],
		outline: ['first:rounded-t-[inherit]', 'last:rounded-b-[inherit]'],
		plain: '',
	},
	defaults: { variant: 'separated' },
})

export const k = defineRecipe(
	{
		base: 'flex flex-col',
		variant: {
			separated: 'gap-1',
			outline: [
				'overflow-hidden',
				'rounded-lg',
				...sen.border,
				'divide-y divide-zinc-950/10',
				'dark:divide-white/10',
			],
			plain: ['divide-y divide-zinc-950/10', 'dark:divide-white/10'],
		},
		slots: {
			trigger: [
				'w-full flex items-center justify-between',
				'gap-2',
				'p-4',
				ji.md,
				iro.text.muted,
				iro.text.hover,
				'text-left font-medium',
				'group-data-[open]/accordion-item:text-zinc-950',
				'dark:group-data-[open]/accordion-item:text-white',
				'focus-visible:outline-none',
				'disabled:opacity-50 disabled:cursor-not-allowed',
				...hannou.cursor,
			],
			indicator: [
				'shrink-0',
				ugoki.css.transform,
				ugoki.css.duration,
				'group-data-[open]/accordion-item:rotate-180',
			],
			panel: 'overflow-hidden',
			body: ['px-4 pb-4 pt-0', ji.md, iro.text.muted],
		},
		defaults: { variant: 'separated' },
	},
	{ item },
)

export type AccordionVariants = VariantPropsOf<typeof k>
export type AccordionItemVariants = VariantPropsOf<typeof item>
