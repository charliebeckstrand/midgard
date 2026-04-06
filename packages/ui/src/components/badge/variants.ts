import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.badge

type Variant = keyof typeof k.variant
type ColorMap = Record<string, string | string[]>

const variantBase = Object.fromEntries(
	Object.entries(k.variant).map(([key, { base }]) => [key, base]),
) as Record<Variant, string>

function badgeCompoundColors() {
	return (Object.keys(k.variant) as Variant[]).flatMap((variant) => {
		const { color } = k.variant[variant]

		return Object.entries(color as ColorMap).map(([c, classes]) => ({
			variant,
			color: c as keyof (typeof k.variant)['solid']['color'],
			className: classes as string | string[],
		}))
	})
}

export const badgeVariants = cva(k.base, {
	variants: {
		variant: variantBase,
		color: colorKeys(k.variant.solid.color),
		size: k.size,
	},
	compoundVariants: badgeCompoundColors(),
	defaultVariants: k.defaults,
})

export type BadgeVariants = VariantProps<typeof badgeVariants>
