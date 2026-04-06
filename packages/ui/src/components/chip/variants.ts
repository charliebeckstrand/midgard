import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.chip

type Variant = 'solid' | 'soft' | 'outline' | 'plain'
type Color = 'zinc' | 'red' | 'amber' | 'green' | 'blue'
type ColorMap = Partial<Record<Color, string | readonly string[]>>

/** Generate compound variants for variant × active × color. */
function chipColors(variant: Variant, active: boolean, colorMap: ColorMap) {
	return Object.entries(colorMap).map(([color, classes]) => ({
		variant: variant as Variant,
		active,
		color: color as Color,
		className: classes as string | string[],
	}))
}

export const chipVariants = cva(k.base, {
	variants: {
		variant: k.variant,
		color: colorKeys(k.colorSoft),
		active: k.active,
		size: k.size,
	},
	compoundVariants: [
		// solid → solid colors, active gets lighter bg
		...chipColors('solid', false, k.colorSolid),
		...chipColors('solid', true, k.colorSolid),
		...chipColors('solid', true, k.colorSolidActive),
		// soft + inactive → soft colors, active → solid
		...chipColors('soft', false, k.colorSoft),
		...chipColors('soft', true, k.colorSolid),
		// outline + inactive → colored border
		...chipColors('outline', false, k.colorOutline),
		// outline + active → solid fill + matching border
		...chipColors('outline', true, k.colorSolid),
		...chipColors('outline', true, k.colorOutlineOnly),
		// plain → colored text + hover bg, active → soft tint
		...chipColors('plain', false, k.colorText),
		...chipColors('plain', true, k.colorSoft),
	],
	defaultVariants: k.defaults,
})

export type ChipVariants = VariantProps<typeof chipVariants>
