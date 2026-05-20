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
	base: [
		'group/accordion-item',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-2',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-blue-500',
		'has-[[data-slot=accordion-trigger]:focus-visible]:ring-inset',
	],
	variants: {
		variant: {
			separated: ['overflow-hidden', 'rounded-lg', ...sen.border],
			outline: ['first:rounded-t-[inherit]', 'last:rounded-b-[inherit]'],
			plain: '',
		},
	},
	defaultVariants: { variant: 'separated' },
})

export const slots = {
	trigger: [
		'w-full flex items-center justify-between',
		'gap-sm',
		'p-4',
		ji.size.md,
		iro.text.muted,
		iro.text.hover,
		'text-left font-medium',
		'group-data-[open]/accordion-item:text-zinc-950',
		'dark:group-data-[open]/accordion-item:text-white',
		'focus-visible:outline-none',
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
	body: ['px-4 pb-4 pt-0', ji.size.md, iro.text.muted],
}

export type AccordionVariants = VariantProps<typeof accordion>
export type AccordionItemVariants = VariantProps<typeof accordionItem>

export { accordion as accordionVariants, accordionItem as accordionItemVariants, slots as k }
