import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys, compoundColors } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.badge

export const badgeVariants = cva(k.base, {
	variants: {
		variant: k.variant,
		color: colorKeys(k.colorSolid),
		size: k.size,
	},
	compoundVariants: compoundColors({
		solid: k.colorSolid,
		soft: k.colorSoft,
	}),
	defaultVariants: k.defaults,
})

export type BadgeVariants = VariantProps<typeof badgeVariants>
