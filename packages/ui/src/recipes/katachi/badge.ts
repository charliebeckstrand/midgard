import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nuri } from '../nuri'

const { color, compoundVariants } = colorVariants({
	solid: nuri.solid,
	soft: nuri.soft,
	outline: nuri.outline,
	plain: nuri.text,
})

// Compact density — tighter padding + smaller icon than core density.
const size = {
	xs: ['px-1 py-0.5', kumi.gap.xs, ji.size.xs, '*:data-[slot=icon]:size-3'],
	sm: ['px-1.5 py-0.5', kumi.gap.sm, ji.size.sm, '*:data-[slot=icon]:size-4'],
	md: ['px-2 py-0.5', kumi.gap.md, ji.size.md, '*:data-[slot=icon]:size-3.5'],
	lg: ['px-2.5 py-1', kumi.gap.lg, ji.size.lg, '*:data-[slot=icon]:size-4'],
}

export const badge = tv({
	base: ['group inline-flex w-fit items-center', 'font-medium'],
	variants: {
		variant: {
			solid: [maru.roundedMd, 'border border-transparent'],
			soft: [maru.roundedMd, 'border border-transparent'],
			outline: [maru.roundedMd, 'border'],
			plain: [maru.roundedMd, 'border border-transparent'],
		},
		color,
		size,
	},
	compoundVariants,
	defaultVariants: { variant: 'soft', color: 'zinc', size: 'md' },
})

export type BadgeVariants = VariantProps<typeof badge>
