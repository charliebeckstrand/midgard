import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys, compoundColors } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.button

export const buttonVariants = cva(k.base, {
	variants: {
		variant: k.variant,
		color: colorKeys(k.colorSolid),
		size: k.size,
	},
	compoundVariants: compoundColors({ solid: k.colorSolid, soft: k.colorSoft }),
	defaultVariants: k.defaults,
})

export const iconOnlySize = cva(k.iconOnlyBase, {
	variants: { size: k.iconOnly },
	defaultVariants: { size: 'md' },
})

export type ButtonVariants = VariantProps<typeof buttonVariants>
