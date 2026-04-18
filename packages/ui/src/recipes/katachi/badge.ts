import { tv, type VariantProps } from 'tailwind-variants'
import { colorMatrix } from '../../core/recipe'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { take } from '../take'

export const badge = tv({
	base: ['group inline-flex w-fit items-center', 'font-medium'],
	variants: {
		variant: {
			solid: [maru.roundedMd, 'border border-transparent'],
			soft: [maru.roundedMd, 'border border-transparent'],
			outline: [maru.roundedMd, 'border'],
			plain: [maru.roundedMd, 'border border-transparent'],
		},
		color: { zinc: '', red: '', amber: '', green: '', blue: '' },
		size: take.badge,
	},
	compoundVariants: [
		...colorMatrix('solid', nuri.solid),
		...colorMatrix('soft', nuri.soft),
		...colorMatrix('outline', nuri.outline),
		...colorMatrix('plain', nuri.text),
	],
	defaultVariants: { variant: 'soft', color: 'zinc', size: 'md' },
})

export type BadgeVariants = VariantProps<typeof badge>
