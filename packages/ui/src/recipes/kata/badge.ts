import { defineRecipe, palette, type VariantPropsOf } from '../../core/recipe'
import { iro, ji, kasane, kokkaku, shaku } from '../kiso'

const { solid, soft, outline, plain } = iro.palette

export const k = defineRecipe(
	{
		base: ['group', 'inline-flex w-fit items-center', 'font-medium'],
		variant: {
			outline: 'ring-1 ring-inset',
		},
		size: {
			xs: [ji.xs, shaku.icon.xs, 'gap-0.5', kasane.py('0.75'), kasane.px('1.5')],
			sm: [ji.sm, shaku.icon.sm, 'gap-0.75', kasane.py('1'), kasane.px('2')],
			md: [ji.md, shaku.icon.md, 'gap-1', kasane.py('1.25'), kasane.px('2.5')],
			lg: [ji.lg, shaku.icon.lg, 'gap-2', kasane.py('1.5'), kasane.px('3')],
		},
		rounded: {
			none: 'rounded-none',
			sm: 'rounded-sm',
			md: 'rounded-md',
			lg: 'rounded-lg',
			xl: 'rounded-xl',
			full: 'rounded-full',
		},
		palette: palette({
			solid: [solid.bg, solid.text],
			soft: [soft.bg, soft.text],
			outline: [outline.ring, outline.text],
			plain: plain.text,
		}),
		defaults: { variant: 'soft', color: 'zinc', size: 'md', rounded: 'md' },
	},
	{
		skeleton: kokkaku.badge,
	},
)

export type BadgeVariants = VariantPropsOf<typeof k>
