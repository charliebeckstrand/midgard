import { tv, type VariantProps } from 'tailwind-variants'
import { kage } from '../kage'

export const gridDivider = tv({
	base: 'border-0 border-t col-span-full',
	variants: {
		soft: {
			true: [...kage.borderSubtle],
			false: [...kage.border],
		},
	},
	defaultVariants: { soft: false },
})

export type GridDividerVariants = VariantProps<typeof gridDivider>

/** Kept for the `katachi` barrel — not consumed directly. */
export const grid = { divider: gridDivider }
