import { tv, type VariantProps } from 'tailwind-variants'

export const spinner = tv({
	base: 'inline-block shrink-0 animate-spin',
	variants: {
		size: {
			xs: 'size-3',
			sm: 'size-4',
			md: 'size-5',
			lg: 'size-6',
			xl: 'size-8',
		},
		color: {
			current: 'text-current',
			zinc: 'text-zinc-600 dark:text-zinc-400',
			red: 'text-red-600 dark:text-red-500',
			amber: 'text-amber-500',
			green: 'text-green-600 dark:text-green-500',
			blue: 'text-blue-600 dark:text-blue-500',
		},
	},
	defaultVariants: { size: 'md', color: 'current' },
})

export type SpinnerVariants = VariantProps<typeof spinner>
