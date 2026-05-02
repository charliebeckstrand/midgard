import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { iro, merge } from '../ryu/iro'
import { ji } from '../ryu/ji'

const { solid, soft, outline, plain } = iro.palette

const { color, compoundVariants } = colorVariants({
	solid: merge(solid.bg, solid.text),
	soft: merge(soft.bg, soft.text),
	outline: merge(outline.ring, outline.text),
	plain: plain.text,
})

const size = {
	xs: [
		'px-1 py-0.25',
		'gap-0.5',
		ji.size.xs,
		'data-[has-prefix]:has-[button]:pr-2',
		'data-[has-suffix]:has-[button]:pl-2',
	],
	sm: [
		'px-1.5 py-0.5',
		'gap-1',
		ji.size.sm,
		'data-[has-prefix]:has-[button]:pr-2.5',
		'data-[has-suffix]:has-[button]:pl-2.5',
	],
	md: [
		'px-2 py-1',
		'gap-1.5',
		ji.size.md,
		'data-[has-prefix]:has-[button]:pr-3',
		'data-[has-suffix]:has-[button]:pl-3',
	],
	lg: [
		'px-2.5 py-1.5',
		'gap-2',
		ji.size.lg,
		'data-[has-prefix]:has-[button]:pr-3.5',
		'data-[has-suffix]:has-[button]:pl-3.5',
	],
}

export const badge = tv({
	base: ['group', 'inline-flex w-fit items-center', 'font-medium'],
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
