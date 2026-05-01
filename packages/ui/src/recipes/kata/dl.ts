import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { sen } from '../ryu/sen'

export const dl = tv({
	base: ji.size.sm,
	variants: {
		orientation: {
			horizontal: 'grid grid-cols-1 sm:grid-cols-[min(50%,--spacing(56))_auto]',
			vertical: 'flex flex-col',
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

export const dlTerm = tv({
	base: [iro.text.muted, 'font-medium'],
	variants: {
		orientation: {
			horizontal: [
				'col-start-1',
				'border-t first:border-none',
				...sen.borderSubtleColor,
				'sm:py-2 pt-2 pr-2',
			],
			vertical: 'pt-4 first:pt-0',
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

export const dlDetails = tv({
	base: iro.text.default,
	variants: {
		orientation: {
			horizontal: [...sen.borderSubtleColor, 'sm:border-t sm:py-2 pb-2', 'sm:nth-2:border-none'],
			vertical: 'pt-1',
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

export type DlVariants = VariantProps<typeof dl>
export type DlTermVariants = VariantProps<typeof dlTerm>
export type DlDetailsVariants = VariantProps<typeof dlDetails>
