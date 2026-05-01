import { tv, type VariantProps } from 'tailwind-variants'
import { take } from '../ryu/take'

export const kbd = tv({
	base: ['inline-flex', 'items-center justify-center', ...take.mark.base],
	variants: {
		size: take.mark.size,
	},
	defaultVariants: { size: 'md' },
})

export type KbdVariants = VariantProps<typeof kbd>
