import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../../core/recipe'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { take } from '../take'

const { color, compoundVariants } = iro({
	solid: nuri.solid,
	soft: nuri.soft,
	outline: nuri.outline,
	plain: nuri.text,
})

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
		size: take.badge,
	},
	compoundVariants,
	defaultVariants: { variant: 'soft', color: 'zinc', size: 'md' },
})

export type BadgeVariants = VariantProps<typeof badge>
