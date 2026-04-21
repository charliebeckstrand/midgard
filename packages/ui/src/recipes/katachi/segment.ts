import { tv, type VariantProps } from 'tailwind-variants'
import { ji } from '../ji'
import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { omote } from '../omote'
import { yasumi } from '../yasumi'

export const segmentControl = tv({
	base: ['inline-flex items-center', maru.rounded, ...omote.tint],
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
		kumi.center,
		'font-medium select-none whitespace-nowrap',
		maru.rounded,
		ki.indicator,
		ki.ring,
		...yasumi.disabled,
		'cursor-default',
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
	indicator: ['bg-white', 'dark:bg-zinc-600', kage.sm],
}

/** Kept for the `katachi` barrel — read by `tabs` and other consumers. */
export const segment = {
	control: segmentControl,
	item: segmentItem,
	indicator: slots.indicator,
}
