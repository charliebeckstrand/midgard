import { tv, type VariantProps } from 'tailwind-variants'
import { sumi } from '../sumi'

export const statValue = tv({
	base: ['font-semibold tracking-tight tabular-nums', ...sumi.text],
	variants: {
		size: {
			sm: 'text-2xl/8',
			md: 'text-3xl/9',
			lg: 'text-4xl/10',
		},
	},
	defaultVariants: { size: 'md' },
})

export const statDelta = tv({
	base: 'inline-flex items-center gap-1 text-sm/5 font-medium tabular-nums',
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
	base: 'flex flex-col gap-1',
	label: ['text-sm/5 font-medium', ...sumi.textMuted],
	description: ['text-sm/5', ...sumi.textMuted],
}

/** Kept for the `katachi` barrel — not consumed directly. */
export const stat = {
	value: statValue,
	delta: statDelta,
	...slots,
}
