import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.chip

type Variant = keyof typeof k.variant
type Color = keyof (typeof k.variant)['solid']['color']
type ColorMap = Record<Color, string | readonly string[]>

/** Generates compound variants for every variant, active state, and color. */
function chipCompoundColors() {
	return (Object.keys(k.variant) as Variant[]).flatMap((variant) => {
		const { color, active } = k.variant[variant]

		return [
			...toCompound(variant, false, color as ColorMap),
			...toCompound(variant, true, active as ColorMap),
		]
	})
}

function toCompound(variant: Variant, active: boolean, colorMap: ColorMap) {
	return (Object.keys(colorMap) as Color[]).map((color) => ({
		variant,
		active,
		color,
		className: colorMap[color] as string | string[],
	}))
}

const variantBase = Object.fromEntries(
	Object.entries(k.variant).map(([key, { base }]) => [key, base]),
) as Record<Variant, string>

export const chipVariants = cva(k.base, {
	variants: {
		variant: variantBase,
		color: colorKeys(k.variant.solid.color),
		active: { true: '', false: '' },
		size: k.size,
	},
	compoundVariants: chipCompoundColors(),
	defaultVariants: k.defaults,
})

export type ChipVariants = VariantProps<typeof chipVariants>
