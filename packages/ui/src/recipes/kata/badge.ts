import { defineRecipe, palette, type VariantProps } from '../../core/recipe'
import { iro, ji, kasane, kokkaku, narabi, shaku } from '../kiso'

const { solid, soft, outline, plain } = iro.palette

export const k = defineRecipe({
	base: ['group', narabi.inlineRow, 'w-fit', ji.weight.medium],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	size: {
		xs: [
			ji.size.xs,
			shaku.icon.xs,
			kasane.gap.g('0.5'),
			kasane.padding.py('0.75'),
			kasane.padding.px('1.5'),
		],
		sm: [
			ji.size.sm,
			shaku.icon.sm,
			kasane.gap.g('0.5'),
			kasane.padding.py('1'),
			kasane.padding.px('2'),
		],
		md: [
			ji.size.md,
			shaku.icon.md,
			kasane.gap.g('0.75'),
			kasane.padding.py('1.25'),
			kasane.padding.px('2.5'),
		],
		lg: [
			ji.size.lg,
			shaku.icon.lg,
			kasane.gap.g('0.75'),
			kasane.padding.py('1.5'),
			kasane.padding.px('3'),
		],
	},
	rounded: {
		...kasane.radius.rounded,
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
