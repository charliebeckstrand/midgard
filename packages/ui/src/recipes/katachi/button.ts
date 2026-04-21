import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { iro, merge } from '../iro'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { take } from '../take'
import { yasumi } from '../yasumi'

const { solid, soft, outline, plain } = iro.palette
const { inherit } = iro.text

export const buttonSolid = { ...merge(solid.bg, solid.text, solid.hover), inherit }
export const buttonSoft = { ...merge(soft.bg, soft.text, soft.hover), inherit }
export const buttonOutline = { ...merge(outline.ring, outline.text, outline.hover), inherit }
export const buttonPlain = { ...merge(plain.text, plain.hover), inherit }
export const buttonGhost = { ...plain.text, inherit }

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
		kumi.gap[0.5],
		'py-[calc(--spacing(1)-1px)]',
		'px-[calc(--spacing(1.5)-1px)]',
	],
	sm: [
		ji.size.sm,
		take.icon.sm,
		kumi.gap[0.75],
		'py-[calc(--spacing(1.5)-1px)]',
		'px-[calc(--spacing(2.25)-1px)]',
	],
	md: [
		ji.size.md,
		take.icon.md,
		kumi.gap.sm,
		'py-[calc(--spacing(2)-1px)]',
		'px-[calc(--spacing(3)-1px)]',
	],
	lg: [
		ji.size.lg,
		take.icon.lg,
		kumi.gap[1.5],
		'py-[calc(--spacing(2.5)-1px)]',
		'px-[calc(--spacing(3.75)-1px)]',
	],
}

export const button = tv({
	base: [
		'relative isolate',
		'inline-flex',
		kumi.center,
		kumi.gap.sm,
		'w-fit',
		'shrink-0',
		'font-semibold',
		maru.rounded.lg,
		ki.inset,
		...yasumi.disabled,
		sawari.cursor,
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
