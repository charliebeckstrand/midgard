import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys, compoundColors } from '../../core'
import { katachi, nuri, take } from '../../recipes'

export const badgeVariants = cva(
	['group inline-flex items-center gap-x-1.5 font-medium', katachi.icon],
	{
		variants: {
			variant: {
				solid: 'rounded-md',
				soft: 'rounded-md',
			},
			color: colorKeys(nuri.badgeSolid),
			size: take.badge,
		},
		compoundVariants: compoundColors({
			solid: nuri.badgeSolid,
			soft: nuri.badgeSoft,
		}),
		defaultVariants: {
			variant: 'soft',
			color: 'zinc',
			size: 'md',
		},
	},
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
