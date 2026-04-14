import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys, compoundColors } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.button

type Variant = keyof typeof k.variant
type Color = keyof (typeof k.variant)['solid']['color']

const variantBase = Object.fromEntries(
	Object.entries(k.variant).map(([key, { base }]) => [key, base]),
) as unknown as Record<Variant, string | readonly string[]>

const variantColors = Object.fromEntries(
	Object.entries(k.variant).map(([key, { color }]) => [key, color]),
) as Record<Variant, Record<Color, string | string[]>>

export const buttonVariants = cva(k.base, {
	variants: {
		variant: variantBase,
		color: colorKeys(k.variant.solid.color),
		size: k.size,
	},
	compoundVariants: compoundColors(variantColors),
	defaultVariants: k.defaults,
})

export const withIconStartSize = cva('', {
	variants: { size: k.withIcon.start },
	defaultVariants: { size: k.defaults.size },
})

export const withIconEndSize = cva('', {
	variants: { size: k.withIcon.end },
	defaultVariants: { size: k.defaults.size },
})

export const withKbdStartSize = cva('', {
	variants: { size: k.withKbd.start },
	defaultVariants: { size: k.defaults.size },
})

export const withKbdEndSize = cva('', {
	variants: { size: k.withKbd.end },
	defaultVariants: { size: k.defaults.size },
})

export const iconOnlySize = cva('p-0 gap-0', {
	variants: { size: k.iconOnly },
	defaultVariants: { size: k.defaults.size },
})

export type ButtonVariants = VariantProps<typeof buttonVariants>
