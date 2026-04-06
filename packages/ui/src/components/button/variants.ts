import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.button

type Variant = keyof typeof k.variant
type ColorMap = Record<string, string | string[]>

const variantBase = Object.fromEntries(
	Object.entries(k.variant).map(([key, { base }]) => [key, base]),
) as unknown as Record<Variant, string | readonly string[]>

function buttonCompoundColors() {
	return (Object.keys(k.variant) as Variant[]).flatMap((variant) => {
		const v = k.variant[variant]
		if (!('color' in v)) return []
		return Object.entries(v.color as ColorMap).map(([c, classes]) => ({
			variant,
			color: c as keyof (typeof k.variant)['solid']['color'],
			className: classes as string | string[],
		}))
	})
}

export const buttonVariants = cva(k.base, {
	variants: {
		variant: variantBase,
		color: colorKeys(k.variant.solid.color),
		size: k.size,
	},
	compoundVariants: buttonCompoundColors(),
	defaultVariants: k.defaults,
})

export const iconOnlySize = cva(k.iconOnlyBase, {
	variants: { size: k.iconOnly },
	defaultVariants: { size: 'md' },
})

export type ButtonVariants = VariantProps<typeof buttonVariants>
