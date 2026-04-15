import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

export const k = katachi.accordion

export const accordionVariants = cva(k.base, {
	variants: {
		variant: {
			separated: k.variant.separated,
			bordered: k.variant.bordered,
			plain: k.variant.plain,
		},
	},
	defaultVariants: k.defaults,
})

export const accordionItemVariants = cva(k.item.base, {
	variants: {
		variant: {
			separated: k.item.separated,
			bordered: k.item.bordered,
			plain: k.item.plain,
		},
	},
	defaultVariants: k.defaults,
})

export type AccordionVariants = VariantProps<typeof accordionVariants>
export type AccordionItemVariants = VariantProps<typeof accordionItemVariants>
