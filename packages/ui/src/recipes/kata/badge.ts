import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, kokkaku, narabi, shaku } from '../kiso'

const { palette } = iro
const { size, weight } = ji
const { gap, padding, radius } = kasane
const { flex } = narabi
const { icon } = shaku

export const k = defineRecipe({
	base: ['group', flex.inline, 'w-fit', weight.medium],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	size: {
		xs: [size.xs, icon.xs, gap.g('0.5'), padding.py('0.75'), padding.px('1.5')],
		sm: [size.sm, icon.sm, gap.g('0.5'), padding.py('1'), padding.px('2')],
		md: [size.md, icon.md, gap.g('0.75'), padding.py('1.25'), padding.px('2.5')],
		lg: [size.lg, icon.lg, gap.g('0.75'), padding.py('1.5'), padding.px('3')],
	},
	rounded: {
		...radius.rounded,
		none: 'rounded-none',
		xl: 'rounded-xl',
	},
	palette: definePalette({
		solid: [palette.solid.bg, palette.solid.text],
		soft: [palette.soft.bg, palette.soft.text],
		outline: [palette.outline.ring, palette.outline.text],
		plain: palette.plain.text,
	}),
	defaults: { variant: 'soft', color: 'zinc', size: 'md', rounded: 'md' },
	skeleton: kokkaku.badge,
})

export type BadgeVariants = VariantProps<typeof k>
