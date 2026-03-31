import { cn } from '../../core'
import { type PlaceholderVariants, placeholderVariants } from './variants'

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
