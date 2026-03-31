import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../core'

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

export type PlaceholderProps = PlaceholderVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function Placeholder({ variant, className, ...props }: PlaceholderProps) {
	return (
		<div
			data-slot="placeholder"
			aria-hidden="true"
			className={cn(placeholderVariants({ variant }), className)}
			{...props}
		/>
	)
}
