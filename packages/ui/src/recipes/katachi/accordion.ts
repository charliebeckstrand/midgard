import { tv, type VariantProps } from 'tailwind-variants'
import { kage } from '../kage'
import { maru } from '../maru'
import { nagare } from '../nagare'
import { sumi } from '../sumi'

export const accordion = tv({
	base: 'flex flex-col',
	variants: {
		variant: {
			separated: 'gap-2',
			bordered: [
				'overflow-hidden',
				maru.rounded,
				...kage.border,
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
			separated: ['overflow-hidden', maru.rounded, ...kage.border],
			bordered: '',
			plain: '',
		},
	},
	defaultVariants: { variant: 'separated' },
})

export const slots = {
	button: [
		'w-full flex items-center justify-between',
		'gap-3 px-4 py-3',
		'text-left text-sm/6 font-medium',
		sumi.textMuted,
		sumi.textHover,
		'group-data-[open]/accordion-item:text-zinc-950',
		'dark:group-data-[open]/accordion-item:text-white',
		'group-data-[open]/accordion-item:cursor-pointer',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	indicator: ['shrink-0', nagare.transform, 'group-data-[open]/accordion-item:rotate-180'],
	panel: 'overflow-hidden',
	body: ['px-4 pb-3 pt-0', 'text-sm/6', sumi.textMuted],
}

export type AccordionVariants = VariantProps<typeof accordion>
export type AccordionItemVariants = VariantProps<typeof accordionItem>
