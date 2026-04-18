import { tv, type VariantProps } from 'tailwind-variants'
import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { omote } from '../omote'
import { take } from '../take'
import { yasumi } from '../yasumi'

export const segmentControl = tv({
	base: ['inline-flex items-center', maru.rounded, ...omote.tint],
	variants: {
		size: {
			sm: ['p-0.5', ...take.gap.sm],
			md: ['p-1', ...take.gap.md],
			lg: ['p-1', ...take.gap.lg],
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
			sm: ['px-2.5 py-1', ...take.text.xs],
			md: ['px-3 py-1.5', ...take.text.sm],
			lg: ['px-4 py-2', ...take.text.md],
		},
	},
	defaultVariants: { size: 'md' },
})

export type SegmentControlVariants = VariantProps<typeof segmentControl>
export type SegmentItemVariants = VariantProps<typeof segmentItem>

export const slots = {
	indicator: ['bg-white', 'dark:bg-zinc-600', kage.shadow],
}

/** Kept for the `katachi` barrel — read by `tabs` and other consumers. */
export const segment = {
	control: segmentControl,
	item: segmentItem,
	indicator: slots.indicator,
}
