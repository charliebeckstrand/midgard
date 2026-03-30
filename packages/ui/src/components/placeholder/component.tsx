import { cn } from '../../core'
import { placeholderVariants, type PlaceholderVariants } from './variants'

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
