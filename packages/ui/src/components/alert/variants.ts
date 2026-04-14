import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys, compoundColors } from '../../core'
import { katachi } from '../../recipes'

export const k = katachi.alert

type Variant = keyof typeof k.variant
type Color = keyof (typeof k.variant)['solid']['color']

const variantBase = Object.fromEntries(
	Object.entries(k.variant).map(([key, { base }]) => [key, base]),
) as unknown as Record<Variant, string | readonly string[]>

const variantColors = Object.fromEntries(
	Object.entries(k.variant).map(([key, { color }]) => [key, color]),
) as Record<Variant, Record<Color, string | string[]>>

export const alertVariants = cva(k.base, {
	variants: {
		variant: variantBase,
		color: colorKeys(k.variant.solid.color),
	},
	compoundVariants: compoundColors(variantColors),
	defaultVariants: k.defaults,
})

export type AlertVariants = VariantProps<typeof alertVariants>
