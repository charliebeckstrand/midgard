import { tv, type VariantProps } from 'tailwind-variants'
import { sen } from '../ryu/sen'

export const gridDivider = tv({
	base: 'border-t col-span-full',
	variants: {
		soft: {
			true: [...sen.borderSubtleColor],
			false: [...sen.borderColor],
		},
	},
	defaultVariants: { soft: false },
})

export type GridDividerVariants = VariantProps<typeof gridDivider>

/** Kept for the `kata` barrel — not consumed directly. */
export const grid = { divider: gridDivider }
