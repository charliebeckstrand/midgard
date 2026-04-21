import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nagare } from '../nagare'
import { sen } from '../sen'

export const accordion = tv({
	base: 'flex flex-col',
	variants: {
		variant: {
			separated: kumi.gap.sm,
			bordered: [
				'overflow-hidden',
				maru.rounded,
				...sen.border,
				'divide-y divide-zinc-950/10',
				'dark:divide-white/10',
			],
			plain: ['divide-y divide-zinc-950/10', 'dark:divide-white/10'],
		},
	},
	defaultVariants: { variant: 'separated' },
})

export const accordionItem = tv({
	base: 'group/accordion-item',
	variants: {
		variant: {
			separated: ['overflow-hidden', maru.rounded, ...sen.border],
			bordered: '',
			plain: '',
		},
	},
	defaultVariants: { variant: 'separated' },
})

export const slots = {
	button: [
		'w-full flex items-center justify-between',
		'p-4',
		kumi.gap.md,
		ji.size.sm,
		iro.text.muted,
		iro.text.hover,
		'text-left font-medium',
		'group-data-[open]/accordion-item:text-zinc-950',
		'dark:group-data-[open]/accordion-item:text-white',
		'group-data-[open]/accordion-item:cursor-pointer',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	indicator: ['shrink-0', nagare.transform, 'group-data-[open]/accordion-item:rotate-180'],
	panel: 'overflow-hidden',
	body: ['px-4 pb-4 pt-0', ji.size.sm, iro.text.muted],
}

export type AccordionVariants = VariantProps<typeof accordion>
export type AccordionItemVariants = VariantProps<typeof accordionItem>
