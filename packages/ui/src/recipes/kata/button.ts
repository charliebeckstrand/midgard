import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { iro, merge } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
import { take } from '../ryu/take'
import { tsunagi } from '../ryu/tsunagi'

const { solid, soft, outline, plain } = iro.palette
const { inherit } = iro.text

const buttonSolid = { ...merge(solid.bg, solid.text, solid.hover), inherit }
// Re-exported for the calendar kata, which reuses the soft button colour matrix.
export const buttonSoft = { ...merge(soft.bg, soft.text, soft.hover), inherit }
const buttonOutline = { ...merge(outline.ring, outline.text, outline.hover), inherit }
const buttonPlain = { ...merge(plain.text, plain.hover), inherit }
const buttonGhost = { ...plain.text, inherit }

const { color, compoundVariants } = colorVariants({
	solid: buttonSolid,
	soft: buttonSoft,
	outline: buttonOutline,
	plain: buttonPlain,
	ghost: buttonGhost,
	glass: buttonPlain,
})

const size = {
	xs: [
		ji.size.xs,
		take.icon.xs,
		'gap-0.5',
		'p-[calc(--spacing(1.5)-1px)]',
		'data-[has-children]:py-[calc(--spacing(1)-1px)]',
	],
	sm: [
		ji.size.sm,
		take.icon.sm,
		'gap-0.75',
		'p-[calc(--spacing(2)-1px)]',
		'data-[has-children]:py-[calc(--spacing(1.5)-1px)]',
	],
	md: [
		ji.size.md,
		take.icon.md,
		'gap-xs',
		'p-[calc(--spacing(2.5)-1px)]',
		'data-[has-children]:py-[calc(--spacing(2)-1px)]',
	],

	lg: [
		ji.size.lg,
		take.icon.lg,
		'gap-1.25',
		'p-[calc(--spacing(3)-1px)]',
		'data-[has-children]:py-[calc(--spacing(2.5)-1px)]',
	],
}

export const button = tv({
	base: [
		'relative isolate',
		'inline-flex items-center justify-center',
		'w-fit',
		'shrink-0',
		'font-semibold',
		'rounded-lg',
		sen.focus.inset,
		...sawari.disabled,
		...sawari.cursor,
		...tsunagi.base,
	],
	variants: {
		variant: {
			solid: '',
			soft: '',
			outline: 'ring-1 ring-inset',
			plain: '',
			ghost: '',
			glass: '',
		},
		color,
		size,
	},
	compoundVariants,
	defaultVariants: { variant: 'solid', color: 'zinc', size: 'md' },
})

export type ButtonVariants = VariantProps<typeof button>
