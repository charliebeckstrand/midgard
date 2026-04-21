import { tv, type VariantProps } from 'tailwind-variants'
import { sen } from '../sen'

export const gridDivider = tv({
	base: 'border-0 border-t col-span-full',
	variants: {
		soft: {
			true: [...sen.borderSubtle],
			false: [...sen.border],
		},
	},
	defaultVariants: { soft: false },
})

export type GridDividerVariants = VariantProps<typeof gridDivider>

/** Kept for the `katachi` barrel — not consumed directly. */
export const grid = { divider: gridDivider }
