import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, kokkaku, narabi, shaku } from '../kiso'

const { solid, soft, outline: outlinePalette, plain } = iro.palette
const { size, weight } = ji
const { g } = kasane.gap
const { px, py } = kasane.padding
const { rounded } = kasane.radius
const { inline } = narabi.flex
const { icon } = shaku

export const k = defineRecipe({
	base: ['group', inline, 'w-fit', weight.medium],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	size: {
		xs: [size.xs, icon.xs, g('0.5'), py('0.75'), px('1.5')],
		sm: [size.sm, icon.sm, g('0.5'), py('1'), px('2')],
		md: [size.md, icon.md, g('0.75'), py('1.25'), px('2.5')],
		lg: [size.lg, icon.lg, g('0.75'), py('1.5'), px('3')],
	},
	rounded: {
		...rounded,
		none: 'rounded-none',
		xl: 'rounded-xl',
	},
	palette: definePalette({
		solid: [solid.bg, solid.text],
		soft: [soft.bg, soft.text],
		outline: [outlinePalette.ring, outlinePalette.text],
		plain: plain.text,
	}),
	defaults: { variant: 'soft', color: 'zinc', size: 'md', rounded: 'md' },
	skeleton: kokkaku.badge,
})

export type BadgeVariants = VariantProps<typeof k>
