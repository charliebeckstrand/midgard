import { tv, type VariantProps } from 'tailwind-variants'
import { take } from '../../core/recipe'

export const kbd = tv({
	base: ['inline-flex items-center justify-center', ...take.mark.base],
	variants: {
		size: take.mark.size,
	},
	defaultVariants: { size: 'md' },
})

export type KbdVariants = VariantProps<typeof kbd>

export { kbd as kbdVariants }
