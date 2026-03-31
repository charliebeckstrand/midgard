import { cva, type VariantProps } from 'class-variance-authority'

export const placeholderVariants = cva(['animate-pulse bg-zinc-200 dark:bg-zinc-700'], {
	variants: {
		variant: {
			line: 'h-4 w-full rounded',
			circle: 'rounded-full',
			rect: 'w-full rounded-lg',
		},
	},
	defaultVariants: {
		variant: 'line',
	},
})

export type PlaceholderVariants = VariantProps<typeof placeholderVariants>
