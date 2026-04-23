import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { iro, merge } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'

const { solid, soft, outline, plain } = iro.palette

const { color, compoundVariants } = colorVariants({
	solid: merge(solid.bg, solid.text),
	soft: merge(soft.bg, soft.text),
	outline: merge(outline.ring, outline.text),
	plain: plain.text,
})

const size = {
	xs: ['px-1 py-0.5', kumi.gap.xs, ji.size.xs, '*:data-[slot=icon]:size-3'],
	sm: ['px-1.5 py-0.5', kumi.gap.sm, ji.size.sm, '*:data-[slot=icon]:size-4'],
	md: ['px-2 py-0.5', kumi.gap.md, ji.size.md, '*:data-[slot=icon]:size-3.5'],
	lg: ['px-2.5 py-1', kumi.gap.lg, ji.size.lg, '*:data-[slot=icon]:size-4'],
}

export const badge = tv({
	base: ['group inline-flex w-fit items-center', 'font-medium'],
	variants: {
		variant: {
			solid: '',
			soft: '',
			outline: 'ring-1 ring-inset',
			plain: '',
		},
		color,
		size,
		rounded: {
			none: 'rounded-none',
			sm: 'rounded-sm',
			md: 'rounded-md',
			lg: 'rounded-lg',
			xl: 'rounded-xl',
			full: 'rounded-full',
		},
	},
	compoundVariants,
	defaultVariants: { variant: 'soft', color: 'zinc', size: 'md', rounded: 'md' },
})

export type BadgeVariants = VariantProps<typeof badge>
