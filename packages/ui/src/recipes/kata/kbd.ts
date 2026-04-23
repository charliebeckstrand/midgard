import { tv, type VariantProps } from 'tailwind-variants'
import { kumi } from '../kumi'
import { take } from '../take'

export const kbd = tv({
	base: ['inline-flex', kumi.center, ...take.mark.base, take.mark.margin],
	variants: {
		size: take.mark.size,
	},
	defaultVariants: { size: 'md' },
})

export type KbdVariants = VariantProps<typeof kbd>
