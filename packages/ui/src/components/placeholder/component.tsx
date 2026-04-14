import { cn } from '../../core'
import { k } from './variants'

export type PlaceholderProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * A pulsing shape with skeleton styling. The default silhouette is a line
 * (`h-4 w-full`); pass className to make it a circle, rectangle, or any
 * other shape. For dynamic, component-shaped skeletons, wrap components in
 * `<Skeleton>` instead.
 */
export function Placeholder({ className, ...props }: PlaceholderProps) {
	return (
		<div
			data-slot="placeholder"
			aria-hidden="true"
			className={cn(k.base, className)}
			{...props}
		/>
	)
}
