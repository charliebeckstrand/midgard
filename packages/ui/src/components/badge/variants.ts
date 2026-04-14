import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys, compoundColors } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.badge

type Variant = keyof typeof k.variant
type Color = keyof (typeof k.variant)['solid']['color']

const variantBase = Object.fromEntries(
	Object.entries(k.variant).map(([key, { base }]) => [key, base]),
) as unknown as Record<Variant, string | readonly string[]>

const variantColors = Object.fromEntries(
	Object.entries(k.variant).map(([key, { color }]) => [key, color]),
) as Record<Variant, Record<Color, string | string[]>>

export const badgeVariants = cva(k.base, {
	variants: {
		variant: variantBase,
		color: colorKeys(k.variant.solid.color),
		size: k.size,
	},
	compoundVariants: compoundColors(variantColors),
	defaultVariants: k.defaults,
})

export type BadgeVariants = VariantProps<typeof badgeVariants>
