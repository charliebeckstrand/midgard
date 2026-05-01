import { tv, type VariantProps } from 'tailwind-variants'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { omote } from '../omote'
import { sawari } from '../sawari'
import { sen } from '../sen'

export const segmentControl = tv({
	base: ['inline-flex items-center', maru.rounded.lg, ...omote.tint],
	variants: {
		size: {
			sm: ['p-0.5', ...kumi.gap.sm],
			md: ['p-1', ...kumi.gap.md],
			lg: ['p-1', ...kumi.gap.lg],
		},
	},
	defaultVariants: { size: 'md' },
})

export const segmentItem = tv({
	base: [
		'flex',
		'items-center justify-center',
		'font-medium select-none whitespace-nowrap',
		maru.rounded.lg,
		sen.focus.indicator,
		sen.focus.ring,
		...sawari.disabled,
		...sawari.cursor,
		'outline-none',
	],
	variants: {
		size: {
			sm: ['px-2.5 py-1', ...ji.size.xs],
			md: ['px-3 py-1.5', ...ji.size.sm],
			lg: ['px-4 py-2', ...ji.size.md],
		},
	},
	defaultVariants: { size: 'md' },
})

export type SegmentControlVariants = VariantProps<typeof segmentControl>
export type SegmentItemVariants = VariantProps<typeof segmentItem>

export const slots = {
	indicator: ['bg-white', 'dark:bg-zinc-600'],
}

/** Kept for the `kata` barrel — read by `tabs` and other consumers. */
export const segment = {
	control: segmentControl,
	item: segmentItem,
	indicator: slots.indicator,
}
