import { tv, type VariantProps } from 'tailwind-variants'
import { sumi } from '../sumi'
import { take } from '../take'

export const statValue = tv({
	base: ['font-semibold tracking-tight tabular-nums', ...sumi.text],
	variants: {
		size: {
			sm: take.text['2xl'],
			md: take.text['3xl'],
			lg: take.text['4xl'],
		},
	},
	defaultVariants: { size: 'md' },
})

export const statDelta = tv({
	base: ['inline-flex items-center', take.text.sm, take.gap.sm, 'font-medium tabular-nums'],
	variants: {
		trend: {
			up: 'text-green-600 dark:text-green-500',
			down: 'text-red-600 dark:text-red-500',
			neutral: [...sumi.textMuted],
		},
	},
	defaultVariants: { trend: 'neutral' },
})

export type StatValueVariants = VariantProps<typeof statValue>
export type StatDeltaVariants = VariantProps<typeof statDelta>

export const slots = {
	base: ['flex flex-col', take.gap.sm],
	label: [take.text.sm, ...sumi.textMuted, 'font-medium'],
	description: [take.text.sm, ...sumi.textMuted],
}

/** Kept for the `katachi` barrel — not consumed directly. */
export const stat = {
	value: statValue,
	delta: statDelta,
	...slots,
}
