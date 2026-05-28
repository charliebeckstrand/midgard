import { defineRecipe, palette, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, kokkaku, narabi, shaku } from '../kiso'

const { solid, soft, outline, plain } = iro.palette

export const k = defineRecipe({
	base: ['group', narabi.inlineRow, 'w-fit', ji.weight.medium],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	size: {
		xs: [ji.xs, shaku.icon.xs, kasane.g('0.5'), kasane.py('0.75'), kasane.px('1.5')],
		sm: [ji.sm, shaku.icon.sm, kasane.g('0.5'), kasane.py('1'), kasane.px('2')],
		md: [ji.md, shaku.icon.md, kasane.g('0.75'), kasane.py('1.25'), kasane.px('2.5')],
		lg: [ji.lg, shaku.icon.lg, kasane.g('0.75'), kasane.py('1.5'), kasane.px('3')],
	},
	rounded: {
		...kasane.rounded,
		none: 'rounded-none',
		xl: 'rounded-xl',
	},
	palette: palette({
		solid: [solid.bg, solid.text],
		soft: [soft.bg, soft.text],
		outline: [outline.ring, outline.text],
		plain: plain.text,
	}),
	defaults: { variant: 'soft', color: 'zinc', size: 'md', rounded: 'md' },
	skeleton: kokkaku.badge,
})

export type BadgeVariants = VariantProps<typeof k>
