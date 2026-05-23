import { defineRecipe, palette, type VariantPropsOf } from '../../core/recipe'
import { iro, ji, kokkaku, shaku } from '../kiso'

const { solid, soft, outline, plain } = iro.palette

export const k = defineRecipe(
	{
		base: ['group', 'inline-flex w-fit items-center', 'font-medium'],
		variant: {
			outline: 'ring-1 ring-inset',
		},
		size: {
			xs: [
				ji.xs,
				shaku.icon.xs,
				'gap-0.5',
				'py-[calc(--spacing(0.75)-1px)] px-[calc(--spacing(1.5)-1px)]',
			],
			sm: [
				ji.sm,
				shaku.icon.sm,
				'gap-0.75',
				'py-[calc(--spacing(1)-1px)] px-[calc(--spacing(2)-1px)]',
			],
			md: [
				ji.md,
				shaku.icon.md,
				'gap-1',
				'py-[calc(--spacing(1.25)-1px)] px-[calc(--spacing(2.5)-1px)]',
			],
			lg: [
				ji.lg,
				shaku.icon.lg,
				'gap-2',
				'py-[calc(--spacing(1.5)-1px)] px-[calc(--spacing(3)-1px)]',
			],
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
