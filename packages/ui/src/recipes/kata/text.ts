import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../ryu/iro'

export const text = tv({
	variants: {
		variant: {
			default: [...iro.text.default],
			muted: [...iro.text.muted],
			error: iro.text.error,
		},
		color: {
			current: 'text-current dark:text-current',
			zinc: 'text-zinc-600 dark:text-zinc-400',
			red: 'text-red-600 dark:text-red-500',
			amber: 'text-amber-500 dark:text-amber-400',
			green: 'text-green-600 dark:text-green-500',
			blue: 'text-blue-600 dark:text-blue-500',
		},
	},
	defaultVariants: { variant: 'default' },
})

export type TextVariants = VariantProps<typeof text>
