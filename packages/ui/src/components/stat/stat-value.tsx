import { cn } from '../../core'
import { type StatValueVariants, statValueVariants } from './variants'

export type StatValueProps = StatValueVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StatValue({ size, className, children, ...props }: StatValueProps) {
	return (
		<div data-slot="stat-value" className={cn(statValueVariants({ size }), className)} {...props}>
			{children}
		</div>
	)
}
