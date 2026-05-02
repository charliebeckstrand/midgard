import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
import { ugoki } from '../ryu/ugoki'

export const accordion = tv({
	base: 'flex flex-col',
	variants: {
		variant: {
			separated: 'gap-xs',
			outline: [
				'overflow-hidden',
				'rounded-lg',
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
			separated: ['overflow-hidden', 'rounded-lg', ...sen.border],
			outline: '',
			plain: '',
		},
	},
	defaultVariants: { variant: 'separated' },
})

export const slots = {
	button: [
		'w-full flex items-center justify-between',
		'p-4',
		'gap-sm',
		ji.size.sm,
		iro.text.muted,
		iro.text.hover,
		'text-left font-medium',
		'group-data-[open]/accordion-item:text-zinc-950',
		'dark:group-data-[open]/accordion-item:text-white',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
		'disabled:opacity-50 disabled:cursor-not-allowed',
		...sawari.cursor,
	],
	indicator: [
		'shrink-0',
		ugoki.css.transform,
		ugoki.css.duration,
		'group-data-[open]/accordion-item:rotate-180',
	],
	panel: 'overflow-hidden',
	body: ['px-4 pb-4 pt-0', ji.size.sm, iro.text.muted],
}

export type AccordionVariants = VariantProps<typeof accordion>
export type AccordionItemVariants = VariantProps<typeof accordionItem>
