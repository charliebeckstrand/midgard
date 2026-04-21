import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { omote } from '../omote'
import { sawari } from '../sawari'
import { sen } from '../sen'
import { take } from '../take'
import { yasumi } from '../yasumi'

const { color, compoundVariants } = colorVariants({
	solid: nuri.buttonSolid,
	soft: nuri.buttonSoft,
	outline: nuri.buttonOutline,
	plain: nuri.buttonPlain,
	ghost: nuri.buttonGhost,
	glass: nuri.buttonPlain,
})

// Button size — border-compensated padding + gap + text + icon + spinner gap per step.
const size = {
	xs: [
		'px-[calc(--spacing(1)-1px)] py-[calc(--spacing(1)-1px)]',
		kumi.gap.xs,
		ji.size.xs,
		take.icon.xs,
		'has-[[data-slot=spinner]]:gap-1',
	],
	sm: [
		'px-[calc(--spacing(1.5)-1px)] py-[calc(--spacing(1.5)-1px)]',
		kumi.gap.sm,
		ji.size.sm,
		take.icon.sm,
		'has-[[data-slot=spinner]]:gap-1.5',
	],
	md: [
		'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(2)-1px)]',
		kumi.gap.md,
		ji.size.md,
		take.icon.md,
		'has-[[data-slot=spinner]]:gap-2',
	],
	lg: [
		'px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(2.5)-1px)]',
		kumi.gap.lg,
		ji.size.lg,
		take.icon.lg,
		'has-[[data-slot=spinner]]:gap-2.5',
	],
}

// Asymmetric padding opposite the icon to balance visual weight.
const withIconStart = {
	xs: 'pr-[calc(--spacing(1.5)-1px)]',
	sm: 'pr-[calc(--spacing(2)-1px)]',
	md: 'pr-[calc(--spacing(3)-1px)]',
	lg: 'pr-[calc(--spacing(4)-1px)]',
}
const withIconEnd = {
	xs: 'pl-[calc(--spacing(1.5)-1px)]',
	sm: 'pl-[calc(--spacing(2)-1px)]',
	md: 'pl-[calc(--spacing(3)-1px)]',
	lg: 'pl-[calc(--spacing(4)-1px)]',
}

// Asymmetric padding opposite a Kbd child — half the icon offset.
const withKbdStart = {
	xs: 'pr-[calc(--spacing(1)-1px)]',
	sm: 'pr-[calc(--spacing(1.5)-1px)]',
	md: 'pr-[calc(--spacing(2)-1px)]',
	lg: 'pr-[calc(--spacing(3)-1px)]',
}
const withKbdEnd = {
	xs: 'pl-[calc(--spacing(1)-1px)]',
	sm: 'pl-[calc(--spacing(1.5)-1px)]',
	md: 'pl-[calc(--spacing(2)-1px)]',
	lg: 'pl-[calc(--spacing(3)-1px)]',
}

export const button = tv({
	base: [
		'relative isolate',
		'inline-flex',
		kumi.center,
		'w-fit',
		'shrink-0',
		'font-semibold',
		maru.rounded,
		ki.inset,
		...yasumi.disabled,
		sawari.cursor,
		'border',
	],
	variants: {
		variant: {
			solid: [...sen.borderTransparent],
			soft: [...sen.borderTransparent],
			outline: [...sen.borderStrong],
			plain: [...sen.borderTransparent],
			ghost: [...sen.borderTransparent],
			glass: [...sen.borderTransparent, ...omote.glass],
		},
		color,
		size,
	},
	compoundVariants,
	defaultVariants: { variant: 'solid', color: 'zinc', size: 'md' },
})

export const withIconStartSize = tv({
	variants: { size: withIconStart },
	defaultVariants: { size: 'md' },
})

export const withIconEndSize = tv({
	variants: { size: withIconEnd },
	defaultVariants: { size: 'md' },
})

export const withKbdStartSize = tv({
	variants: { size: withKbdStart },
	defaultVariants: { size: 'md' },
})

export const withKbdEndSize = tv({
	variants: { size: withKbdEnd },
	defaultVariants: { size: 'md' },
})

export type ButtonVariants = VariantProps<typeof button>
export type WithIconStartSizeVariants = VariantProps<typeof withIconStartSize>
export type WithIconEndSizeVariants = VariantProps<typeof withIconEndSize>
export type WithKbdStartSizeVariants = VariantProps<typeof withKbdStartSize>
export type WithKbdEndSizeVariants = VariantProps<typeof withKbdEndSize>
