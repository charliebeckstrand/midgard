import { tv, type VariantProps } from 'tailwind-variants'

export const statusDot = tv({
	base: 'inline-block rounded-full',
	variants: {
		variant: {
			solid: 'bg-current',
			outline: 'border-2 border-current bg-white dark:bg-zinc-900',
		},
		status: {
			inactive: 'text-zinc-300 dark:text-zinc-400',
			active: 'text-green-500',
			info: 'text-blue-500',
			warning: 'text-amber-500',
			error: 'text-red-500',
		},
		pulse: {
			true: 'animate-pulse',
			false: '',
		},
		size: {
			xs: 'size-1.5',
			sm: 'size-2',
			md: 'size-2.5',
			lg: 'size-3',
			xl: 'size-4',
		},
	},
	defaultVariants: {
		variant: 'solid',
		status: 'inactive',
		size: 'md',
	},
})

export type StatusDotVariants = VariantProps<typeof statusDot>

/** Kept for the `kata` barrel — not consumed directly. */
export const status = { dot: statusDot }
