import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { kumi } from '../ryu/kumi'

export const statValue = tv({
	base: ['font-semibold tracking-tight tabular-nums', ...iro.text.default],
	variants: {
		size: {
			sm: ji.size['2xl'],
			md: ji.size['3xl'],
			lg: ji.size['4xl'],
		},
	},
	defaultVariants: { size: 'md' },
})

export const statDelta = tv({
	base: ['inline-flex items-center', ji.size.sm, kumi.gap.sm, 'font-medium tabular-nums'],
	variants: {
		trend: {
			up: 'text-green-600 dark:text-green-500',
			down: 'text-red-600 dark:text-red-500',
			neutral: [...iro.text.muted],
		},
	},
	defaultVariants: { trend: 'neutral' },
})

export type StatValueVariants = VariantProps<typeof statValue>
export type StatDeltaVariants = VariantProps<typeof statDelta>

export const slots = {
	base: ['flex flex-col', kumi.gap.sm],
	label: [ji.size.sm, ...iro.text.muted, 'font-medium'],
	description: [ji.size.sm, ...iro.text.muted],
}
